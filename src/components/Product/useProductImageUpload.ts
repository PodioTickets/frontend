import { useCallback, useRef, useState } from "react";
import type { ImageUploadWithCropRef } from "@/components/ImageUploadWithCrop";

/**
 * Estado e handlers de upload/galeria de imagens do produto (`CreateProductModal`).
 * Extraído no Bloco 3 (Fase 2). Dono de `productImages`/`primaryImageIndex` +
 * os refs do crop; expõe os setters pra que a hidratação/reset do formulário
 * (ainda no componente) populem/limpem as imagens.
 *
 * - `handleProductCropped`: recebe o arquivo recortado → dataURL; substitui no
 *   índice alvo (`cropTargetIndexRef`) ou anexa; a 1ª foto vira primária.
 * - `handleDrop`/`handleDragOver`: arrastar-e-soltar abre o cropper.
 */
export function useProductImageUpload() {
  const [productImages, setProductImages] = useState<string[]>([]);
  const [primaryImageIndex, setPrimaryImageIndex] = useState(0);
  const productCropRef = useRef<ImageUploadWithCropRef>(null);
  /** null = adicionar nova foto; number = substituir foto naquele índice */
  const cropTargetIndexRef = useRef<number | null>(null);

  const handleProductCropped = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const targetIndex = cropTargetIndexRef.current;
      setProductImages((prev) => {
        if (targetIndex !== null && targetIndex < prev.length) {
          const updated = [...prev];
          updated[targetIndex] = dataUrl;
          return updated;
        }
        return [...prev, dataUrl];
      });
      if (targetIndex === null) {
        // Nova foto: tornar primária se for a primeira
        setProductImages((prev) => {
          if (prev.length === 1) setPrimaryImageIndex(0);
          return prev;
        });
      }
      cropTargetIndexRef.current = null;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      cropTargetIndexRef.current = null;
      productCropRef.current?.openWithFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return {
    productImages,
    setProductImages,
    primaryImageIndex,
    setPrimaryImageIndex,
    productCropRef,
    cropTargetIndexRef,
    handleProductCropped,
    handleDrop,
    handleDragOver,
  };
}
