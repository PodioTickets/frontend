import type { Area } from "react-easy-crop";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (e) => reject(e));
    image.crossOrigin = "anonymous";
    image.src = src;
  });
}

export type CroppedImageOptions = {
  fileName: string;
  /** Padrão: image/jpeg (boa compressão para fotos de evento). */
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  quality?: number;
  targetWidth: number;
  targetHeight: number;
};

/**
 * Recorta a região indicada e redimensiona para as dimensões de saída (canvas).
 */
export async function getCroppedImageFile(
  imageSrc: string,
  pixelCrop: Area,
  opts: CroppedImageOptions
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = opts.targetWidth;
  canvas.height = opts.targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D não disponível");
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    opts.targetWidth,
    opts.targetHeight
  );

  const mime = opts.mimeType ?? "image/jpeg";
  const quality = mime === "image/jpeg" ? (opts.quality ?? 0.92) : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Não foi possível gerar a imagem cortada"));
          return;
        }
        resolve(new File([blob], opts.fileName, { type: mime }));
      },
      mime,
      quality
    );
  });
}
