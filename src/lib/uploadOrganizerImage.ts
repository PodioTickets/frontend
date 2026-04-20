import { userService } from "@/services";

export function getOrganizerApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
}

export function getOrganizerAccessToken(): string | null {
  const apiClient = (
    userService as unknown as {
      apiClient?: { getAccessToken: () => string | null };
    }
  ).apiClient;
  return apiClient?.getAccessToken() ?? null;
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const parts = dataUrl.split(",");
  const mime =
    parts[0].match(/:(.*?);/)?.[1] || "application/octet-stream";
  const bstr = atob(parts[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
}

/**
 * Redimensiona apenas se as dimensões forem absurdamente grandes (> 4000px).
 * Nunca recomprime por peso — a qualidade do arquivo original é preservada.
 * Saída sempre PNG (lossless). Arquivos dentro do limite passam sem qualquer processamento.
 */
export async function maybeDownscaleImageFileForUpload(
  file: File,
  options?: { maxDimension?: number },
): Promise<File> {
  const maxDim = options?.maxDimension ?? 4000;

  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= 0 || h <= 0 || Math.max(w, h) <= maxDim) {
        resolve(file);
        return;
      }

      const scale = maxDim / Math.max(w, h);
      const tw = Math.max(1, Math.round(w * scale));
      const th = Math.max(1, Math.round(h * scale));

      const canvas = document.createElement("canvas");
      canvas.width = tw;
      canvas.height = th;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, tw, th);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const base = file.name.replace(/\.[^.]+$/, "") || "image";
          resolve(new File([blob], `${base}.png`, { type: "image/png" }));
        },
        "image/png",
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
    img.src = objectUrl;
  });
}

export async function uploadOrganizerImage(file: File): Promise<string> {
  const apiUrl = getOrganizerApiUrl();
  const token = getOrganizerAccessToken();
  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  const formDataUpload = new FormData();
  formDataUpload.append("file", file);

  const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formDataUpload,
  });

  let result: Record<string, unknown> = {};
  try {
    const text = await response.text();
    result = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    result = {};
  }

  if (!response.ok) {
    const msg =
      (result.message as string) ||
      ((result.error as { message?: string })?.message as string) ||
      "Erro ao fazer upload";
    throw new Error(msg);
  }

  const dataNested = result.data as Record<string, unknown> | undefined;
  let imageUrl: string | undefined =
    (result.imageUrl as string) ||
    (result.url as string) ||
    (dataNested?.url as string) ||
    (dataNested?.imageUrl as string);

  if (!imageUrl) {
    imageUrl = Object.values(result).find(
      (v): v is string =>
        typeof v === "string" && (v.startsWith("http") || v.startsWith("/")),
    );
  }

  if (!imageUrl) {
    throw new Error("Resposta do servidor inválida — URL da imagem não encontrada");
  }

  return imageUrl.startsWith("http")
    ? imageUrl
    : `${apiUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
}

/**
 * Troca todo `img[src^="data:"]` por URL do CDN/API (deduplica data URLs iguais).
 */
export async function replaceDataUrlImagesInContainer(
  root: HTMLElement,
): Promise<void> {
  const imgs = root.querySelectorAll('img[src^="data:"]');
  if (imgs.length === 0) return;

  const cache = new Map<string, string>();
  let serial = 0;

  for (const node of imgs) {
    const img = node as HTMLImageElement;
    const src = img.getAttribute("src") || "";
    if (!src.startsWith("data:")) continue;

    try {
      let url = cache.get(src);
      if (!url) {
        const file = dataUrlToFile(src, `topic-inline-${serial}.jpg`);
        const prepared = await maybeDownscaleImageFileForUpload(file);
        url = await uploadOrganizerImage(prepared);
        cache.set(src, url);
        serial += 1;
      }
      img.setAttribute("src", url);
    } catch (e) {
      console.warn("[replaceDataUrlImagesInContainer] upload failed:", e);
    }
  }
}
