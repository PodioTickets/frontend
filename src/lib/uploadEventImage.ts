import { surfaceHeader } from "@/lib/authSurface";

/**
 * Sobe uma imagem do evento (banner) para o storage e devolve a URL pública.
 * Auth por cookie httpOnly (`credentials: "include"`); `X-PT-Surface` declara a
 * superfície (fetch cru não passa pelo ApiClient). Quem chama persiste a URL no evento.
 */
export async function uploadEventImage(file: File): Promise<string> {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

  const fd = new FormData();
  fd.append("file", file);
  const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
    method: "POST",
    credentials: "include",
    headers: surfaceHeader(),
    body: fd,
  });

  let result: Record<string, unknown> = {};
  try {
    result = JSON.parse(await response.text()) as Record<string, unknown>;
  } catch {
    /* corpo vazio/não-JSON: tratado abaixo */
  }

  if (!response.ok) {
    throw new Error(
      (result.message as string) ||
        (result.error as { message?: string })?.message ||
        "Erro ao fazer upload",
    );
  }

  const nested = result.data as Record<string, unknown> | undefined;
  const url: string | undefined =
    (result.imageUrl as string) ||
    (result.url as string) ||
    (nested?.url as string) ||
    (nested?.imageUrl as string) ||
    Object.values(result).find(
      (v): v is string => typeof v === "string" && (v.startsWith("http") || v.startsWith("/")),
    );

  if (!url) throw new Error("Resposta do servidor inválida — URL não encontrada");
  return url.startsWith("http") ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
}
