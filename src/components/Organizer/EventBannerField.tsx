"use client";

import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";

/**
 * Bloco "Banner do evento" da etapa Página. Com imagem (Figma 8248:176606): imagem +
 * "Alterar imagem"; sem imagem (Figma 8214:176910): caixa tracejada (clique ou arraste).
 * Proporção do banner = a de produção (1660 × 930), não a do mock. Só escolhe/recorta:
 * o arquivo fica PENDENTE e quem chama sobe no "Salvar alterações" (junto com os tópicos).
 */
export function EventBannerField({
  bannerUrl,
  pendingFile,
  onPendingFileChange,
}: {
  bannerUrl?: string | null;
  pendingFile: File | null;
  onPendingFileChange: (file: File | null) => void;
}) {
  const cropRef = useRef<ImageUploadWithCropRef>(null);
  // URL temporária da imagem recortada (ainda não enviada); liberada ao trocar/desmontar.
  const pendingPreview = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );
  useEffect(() => () => {
    if (pendingPreview) URL.revokeObjectURL(pendingPreview);
  }, [pendingPreview]);

  const src = pendingPreview || bannerUrl || "";

  return (
    <section className="flex w-full flex-col gap-6 pb-12 md:pb-20">
      <div className="flex flex-col gap-3">
        <h2 className="font-manrope text-xl font-bold leading-[1.1] text-gray-12">Banner do evento</h2>
        <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11 md:text-base">
          Imagem grande no topo da página do evento
        </p>
      </div>

      {src ? (
        <div className="flex w-full max-w-[477px] flex-col items-end gap-3">
          <div className="relative aspect-1660/930 w-full overflow-hidden rounded-xl">
            <Image
              src={src}
              alt="Banner do evento"
              fill
              className="object-cover"
              sizes="(max-width:768px) 100vw, 477px"
              unoptimized={src.startsWith("blob:")}
            />
          </div>
          {pendingFile && (
            <p className="self-start font-family-dm-sans text-sm leading-[1.3] text-gray-11">
              Nova imagem selecionada. Salve as alterações para publicar.
            </p>
          )}
          <button
            type="button"
            onClick={() => cropRef.current?.open()}
            className="flex h-11 items-center justify-center rounded-lg border border-gray-6 bg-gray-1 px-6 font-family-dm-sans text-base font-bold leading-[1.3] text-gray-12 transition-colors hover:bg-gray-3"
          >
            Alterar imagem
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => cropRef.current?.open()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];
            if (file?.type.startsWith("image/")) cropRef.current?.openWithFile(file);
          }}
          className="flex aspect-1660/930 w-full max-w-[360px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-gray-6 p-4 text-center transition-colors hover:border-primary-8"
        >
          <Plus className="size-7 text-gray-12" strokeWidth={1.5} />
          <span className="font-family-dm-sans text-sm leading-[1.3] text-gray-12">
            Tamanho recomendado: 1660 × 930 px
          </span>
          <span className="font-family-dm-sans text-sm font-bold leading-[1.3] text-primary-11">
            Arraste uma imagem para este campo
            <br />
            ou clique aqui
          </span>
        </button>
      )}

      <ImageUploadWithCrop
        ref={cropRef}
        spec={EVENT_IMAGE_SPECS.banner}
        outputBaseName="banner"
        modalTitle="Ajustar banner do evento"
        onCropped={(file) => onPendingFileChange(file)}
        onInvalidFile={(msg) => toast.error(msg)}
        onCropFailed={(msg) => toast.error(msg)}
      />
    </section>
  );
}
