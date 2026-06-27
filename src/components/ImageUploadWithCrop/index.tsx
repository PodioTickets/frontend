"use client";

import "react-easy-crop/react-easy-crop.css";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/Button";
import type { EventImageSpec } from "@/lib/eventImageSpecs";
import { getCroppedImageFile } from "@/utils/cropImage";
import { cn } from "@/utils/cn";

const DEFAULT_ACCEPT = "image/jpeg,image/jpg,image/png,image/gif,image/webp";

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

function zoomToPercent(z: number) {
  return ((z - ZOOM_MIN) / (ZOOM_MAX - ZOOM_MIN)) * 100;
}

export type ImageUploadWithCropRef = {
  /** Abre o seletor de arquivo; após escolher, abre o fluxo de corte. */
  open: () => void;
  /** Abre direto o cortador com um arquivo (ex.: arrastar e soltar). */
  openWithFile: (file: File) => void;
};

export type ImageUploadWithCropProps = {
  spec: EventImageSpec;
  onCropped: (file: File) => void;
  /** Prefixo do nome do arquivo gerado (ex.: banner, card). */
  outputBaseName?: string;
  maxFileSizeMb?: number;
  accept?: string;
  modalTitle?: string;
  className?: string;
  /** `round` = máscara circular (perfil / logo). */
  cropShape?: "rect" | "round";
  /** Validação de arquivo (tipo/tamanho) antes de abrir o corte. */
  onInvalidFile?: (message: string) => void;
  /** Falha ao gerar o recorte (canvas / blob). */
  onCropFailed?: (message: string) => void;
};

function validateImageFile(
  file: File,
  maxFileSizeMb: number
): string | null {
  const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
  if (!validTypes.includes(file.type)) {
    return "Formato inválido. Use JPG, PNG, GIF ou WebP.";
  }
  if (file.size > maxFileSizeMb * 1024 * 1024) {
    return `Arquivo muito grande. Máximo de ${maxFileSizeMb}MB.`;
  }
  return null;
}

export const ImageUploadWithCrop = forwardRef<ImageUploadWithCropRef, ImageUploadWithCropProps>(
  function ImageUploadWithCrop(
    {
      spec,
      onCropped,
      outputBaseName = "imagem",
      maxFileSizeMb = 10,
      accept = DEFAULT_ACCEPT,
      modalTitle = "Ajustar e encaixar imagem",
      className,
      cropShape = "rect",
      onInvalidFile,
      onCropFailed,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [open, setOpen] = useState(false);
    // O modal vai via portal pro `document.body` (escapa ancestrais com `transform`,
    // ex.: o DrawerContent do vaul, onde `position: fixed` ficaria preso ao painel).
    // `mounted` evita o portal no SSR (sem `document`).
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [applying, setApplying] = useState(false);
    const zoomTrackRef = useRef<HTMLDivElement>(null);
    const zoomDraggingRef = useRef(false);
    const zoomWasDraggingRef = useRef(false);

    const setZoomFromClientX = useCallback((clientX: number) => {
      const el = zoomTrackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const p = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const raw = ZOOM_MIN + (p / 100) * (ZOOM_MAX - ZOOM_MIN);
      const stepped = Math.round(raw * 100) / 100;
      setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, stepped)));
    }, []);

    useEffect(() => {
      if (!open) return;

      const onMouseMove = (e: MouseEvent) => {
        if (!zoomDraggingRef.current) return;
        e.preventDefault();
        setZoomFromClientX(e.clientX);
      };

      const onTouchMove = (e: TouchEvent) => {
        if (!zoomDraggingRef.current || e.touches.length === 0) return;
        e.preventDefault();
        setZoomFromClientX(e.touches[0].clientX);
      };

      const endDrag = () => {
        if (zoomDraggingRef.current) {
          zoomWasDraggingRef.current = true;
          zoomDraggingRef.current = false;
          document.body.style.userSelect = "";
          setTimeout(() => {
            zoomWasDraggingRef.current = false;
          }, 150);
        }
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", endDrag);
      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", endDrag);

      return () => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", endDrag);
        document.removeEventListener("touchmove", onTouchMove);
        document.removeEventListener("touchend", endDrag);
        document.body.style.userSelect = "";
      };
    }, [open, setZoomFromClientX]);

    const closeModal = useCallback(() => {
      setImageSrc((prev) => {
        if (prev?.startsWith("blob:")) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      setOpen(false);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }, []);

    const startWithFile = useCallback(
      (file: File): string | null => {
        const err = validateImageFile(file, maxFileSizeMb);
        if (err) {
          onInvalidFile?.(err);
          return err;
        }
        setImageSrc((prev) => {
          if (prev?.startsWith("blob:")) {
            URL.revokeObjectURL(prev);
          }
          return URL.createObjectURL(file);
        });
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setOpen(true);
        return null;
      },
      [maxFileSizeMb, onInvalidFile]
    );

    useImperativeHandle(
      ref,
      () => ({
        open: () => inputRef.current?.click(),
        openWithFile: (file: File) => {
          startWithFile(file);
        },
      }),
      [startWithFile]
    );

    const onCropComplete = useCallback((_: Area, pixels: Area) => {
      setCroppedAreaPixels(pixels);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const err = startWithFile(file);
      if (err && inputRef.current) {
        inputRef.current.value = "";
      }
    };

    const handleApply = async () => {
      if (!imageSrc || !croppedAreaPixels) return;
      setApplying(true);
      try {
        const file = await getCroppedImageFile(imageSrc, croppedAreaPixels, {
          fileName: `${outputBaseName}-${Date.now()}.png`,
          mimeType: "image/png",
          targetWidth: spec.outputWidth,
          targetHeight: spec.outputHeight,
        });
        onCropped(file);
        closeModal();
      } catch (e) {
        console.error(e);
        onCropFailed?.("Não foi possível processar o recorte da imagem.");
      } finally {
        setApplying(false);
      }
    };

    useEffect(() => {
      if (!open) return;
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }, [open]);

    return (
      <div className={cn(className)}>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleInputChange}
        />

        {open && imageSrc && mounted ? createPortal(
          <div
            className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/70"
            // `pointerEvents: auto` reativa a interação quando renderizado dentro de
            // um Radix Dialog modal (vaul Drawer), que põe `pointer-events: none` fora
            // do seu content. Sem isso, o crop abre mas não dá pra mexer.
            style={{ pointerEvents: "auto" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-crop-title"
          >
            <div className="bg-gray-2 rounded-2xl border border-gray-6 shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
              <div className="px-5 pt-5 pb-3 border-b border-gray-6 shrink-0">
                <h2
                  id="image-crop-title"
                  className="text-gray-12 text-lg font-bold font-manrope leading-tight pr-8"
                >
                  {modalTitle}
                </h2>
                <p className="text-gray-11 text-sm font-family-dm-sans mt-1">
                  Arraste para posicionar e use o zoom para encaixar na área.
                </p>
              </div>

              <div className="relative w-full h-[min(42vh,320px)] min-h-[220px] bg-gray-5 shrink-0">
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={spec.aspect}
                  cropShape={cropShape}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                  showGrid={false}
                  objectFit="contain"
                />
              </div>

              <div className="px-5 py-4 flex flex-col gap-3 border-t border-gray-6 shrink-0">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-11 text-xs font-family-dm-sans">Zoom</span>
                    <span className="text-gray-12 text-sm font-semibold font-manrope tabular-nums">
                      {Math.round(zoom * 100)}%
                    </span>
                  </div>
                  <div
                    ref={zoomTrackRef}
                    className="relative h-10 w-full cursor-pointer py-2 select-none"
                    onClick={(e) => {
                      if (zoomWasDraggingRef.current) return;
                      if ((e.target as HTMLElement).closest("[data-zoom-thumb]")) return;
                      setZoomFromClientX(e.clientX);
                    }}
                  >
                    <div className="absolute top-1/2 left-0 w-full h-px -translate-y-1/2 rounded-full bg-gray-4" />
                    <div
                      className="absolute top-1/2 left-0 h-px -translate-y-1/2 rounded-full bg-primary-12"
                      style={{ width: `${zoomToPercent(zoom)}%` }}
                    />
                    <div
                      data-zoom-thumb
                      role="slider"
                      tabIndex={0}
                      aria-valuemin={ZOOM_MIN}
                      aria-valuemax={ZOOM_MAX}
                      aria-valuenow={zoom}
                      aria-label="Zoom da imagem"
                      className="absolute top-1/2 z-20 flex size-6 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center rounded-full bg-primary-12 shadow-lg outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-primary-12 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-2 active:scale-95 active:cursor-grabbing"
                      style={{
                        left: `clamp(0.75rem, ${zoomToPercent(zoom)}%, calc(100% - 0.75rem))`,
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        zoomDraggingRef.current = true;
                        document.body.style.userSelect = "none";
                      }}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        zoomDraggingRef.current = true;
                        document.body.style.userSelect = "none";
                      }}
                      onKeyDown={(e) => {
                        const step = 0.05;
                        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
                          e.preventDefault();
                          setZoom((z) =>
                            Math.min(ZOOM_MAX, Math.round((z + step) * 100) / 100)
                          );
                        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
                          e.preventDefault();
                          setZoom((z) =>
                            Math.max(ZOOM_MIN, Math.round((z - step) * 100) / 100)
                          );
                        } else if (e.key === "Home") {
                          e.preventDefault();
                          setZoom(ZOOM_MIN);
                        } else if (e.key === "End") {
                          e.preventDefault();
                          setZoom(ZOOM_MAX);
                        }
                      }}
                    >
                      <div className="size-2.5 rounded-full bg-white" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] font-family-dm-sans text-gray-11">
                    <span>100%</span>
                    <span>300%</span>
                  </div>
                </div>
                <div className="flex gap-3 justify-end pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    disabled={applying}
                    className="border-gray-6 text-gray-12"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void handleApply()}
                    disabled={applying || !croppedAreaPixels}
                  >
                    {applying ? "Gerando..." : "Aplicar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        ) : null}
      </div>
    );
  }
);

ImageUploadWithCrop.displayName = "ImageUploadWithCrop";
