"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { userService, organizerService } from "@/services";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import toast from "react-hot-toast";

// ─── helpers ────────────────────────────────────────────────────────────────

function formatDate(dateString: string) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

function formatOrgDocument(raw: string | null | undefined): { label: string; formatted: string } | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 14) {
    return { label: "CNPJ", formatted: digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") };
  }
  if (digits.length === 11) {
    return { label: "CPF", formatted: digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") };
  }
  return { label: "Documento", formatted: raw.trim() };
}

function StatusPill({ done }: { done: boolean }) {
  if (done) {
    return (
      <span className="rounded-full bg-primary-3 px-4 py-2 text-base font-medium font-family-dm-sans leading-[1.3] text-primary-12 shrink-0">
        Concluído
      </span>
    );
  }
  return (
    <span className="rounded-full bg-yellow-3 px-4 py-2 text-base font-medium font-family-dm-sans leading-[1.3] text-yellow-12 shrink-0">
      Pendente
    </span>
  );
}

const uploadSvg = (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" aria-hidden>
    <path d="M10 3.33325V13.3333M10 13.3333L6.66667 9.99992M10 13.3333L13.3333 9.99992M3.33333 13.3333V15.8333C3.33333 16.7538 4.07952 17.5 5 17.5H15C15.9205 17.5 16.6667 16.7538 16.6667 15.8333V13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ─── types ───────────────────────────────────────────────────────────────────

export interface BannerSectionOrganizerData {
  name: string;
  logoSrc: string | null;
  showLegalSubtitle?: boolean;
  legalName?: string | null;
  /** Raw document string (CPF/CNPJ) — formatted internally. */
  document?: string | null;
}

interface BannerSectionProps {
  /** Current saved banner URL */
  bannerUrl?: string;
  /** Current saved card image URL */
  cardImageUrl?: string;
  /** Event preview data */
  eventName?: string;
  eventDate?: string;
  street?: string;
  city?: string;
  state?: string;
  /** Organizer preview data */
  organizer: BannerSectionOrganizerData;
  /**
   * Called after image is uploaded to storage.
   * Parent is responsible for persisting to the event (updateEvent).
   */
  onBannerUploaded: (url: string) => Promise<void>;
  onCardUploaded: (url: string) => Promise<void>;
  /**
   * When provided, card accordion shows "Confirmar e próximo" button.
   * Called after card is saved (or if card already saved).
   */
  onNext?: () => Promise<void>;
  nextLoading?: boolean;
}

// ─── component ───────────────────────────────────────────────────────────────

export function BannerSection({
  bannerUrl,
  cardImageUrl,
  eventName,
  eventDate,
  street,
  city,
  state,
  organizer,
  onBannerUploaded,
  onCardUploaded,
  onNext,
  nextLoading = false,
}: BannerSectionProps) {
  const [bannerPreview, setBannerPreview] = useState(bannerUrl ?? "");
  const [cardPreview, setCardPreview] = useState(cardImageUrl ?? "");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [selectedCardFile, setSelectedCardFile] = useState<File | null>(null);
  const [expandedBanner, setExpandedBanner] = useState(true);
  const [expandedCard, setExpandedCard] = useState(false);
  const bannerCropRef = useRef<ImageUploadWithCropRef>(null);
  const cardCropRef = useRef<ImageUploadWithCropRef>(null);

  useEffect(() => { if (bannerUrl) setBannerPreview(bannerUrl); }, [bannerUrl]);
  useEffect(() => { if (cardImageUrl) setCardPreview(cardImageUrl); }, [cardImageUrl]);

  const eventLocation = street && city && state ? `${street}, ${city}, ${state}` : "";
  const listingLocation = city && state ? `${city}, ${state}` : eventLocation;
  const orgDocDisplay = formatOrgDocument(organizer.document);

  const uploadImageFile = useCallback(async (file: File): Promise<string> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
    const apiClient = (userService as unknown as { apiClient?: { getAccessToken: () => string | null } }).apiClient;
    const token = apiClient?.getAccessToken();
    if (!token) throw new Error("Sessão expirada. Faça login novamente.");

    const fd = new FormData();
    fd.append("file", file);
    const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });

    let result: Record<string, unknown> = {};
    try { result = JSON.parse(await response.text()) as Record<string, unknown>; } catch { /* empty */ }

    if (!response.ok) {
      throw new Error(
        (result.message as string) ||
        ((result.error as { message?: string })?.message) ||
        "Erro ao fazer upload"
      );
    }

    const nested = result.data as Record<string, unknown> | undefined;
    let url: string | undefined =
      (result.imageUrl as string) || (result.url as string) ||
      (nested?.url as string) || (nested?.imageUrl as string) ||
      Object.values(result).find((v): v is string => typeof v === "string" && (v.startsWith("http") || v.startsWith("/")));

    if (!url) throw new Error("Resposta do servidor inválida — URL não encontrada");
    return url.startsWith("http") ? url : `${apiUrl}${url.startsWith("/") ? "" : "/"}${url}`;
  }, []);

  const applyCroppedBanner = useCallback((file: File) => {
    setSelectedBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setBannerPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const applyCroppedCard = useCallback((file: File) => {
    setSelectedCardFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setCardPreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleBannerUpload = async (): Promise<boolean> => {
    if (!selectedBannerFile) {
      toast.error("Por favor, selecione uma imagem antes de continuar");
      return false;
    }
    setUploadingBanner(true);
    try {
      const url = await uploadImageFile(selectedBannerFile);
      await onBannerUploaded(url);
      setSelectedBannerFile(null);
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer upload do banner");
      return false;
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleCardUpload = async (): Promise<boolean> => {
    if (!selectedCardFile) {
      toast.error("Selecione uma imagem para a pré-visualização");
      return false;
    }
    setUploadingCard(true);
    try {
      const url = await uploadImageFile(selectedCardFile);
      await onCardUploaded(url);
      setSelectedCardFile(null);
      return true;
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer upload da imagem");
      return false;
    } finally {
      setUploadingCard(false);
    }
  };

  const handleBannerStepNext = async () => {
    if (selectedBannerFile) {
      const ok = await handleBannerUpload();
      if (ok) { setExpandedBanner(false); setExpandedCard(true); }
      return;
    }
    if (bannerUrl || bannerPreview) {
      setExpandedBanner(false);
      setExpandedCard(true);
      return;
    }
    toast.error("Selecione e ajuste o banner antes de continuar.");
  };

  const handleConfirmCardAndNext = async () => {
    if (selectedCardFile) {
      const ok = await handleCardUpload();
      if (!ok) return;
    } else if (!cardImageUrl && !cardPreview) {
      toast.error("Selecione e envie a imagem de pré-visualização.");
      return;
    }
    if (onNext) await onNext();
  };

  const bannerDone = Boolean(bannerUrl) && !selectedBannerFile;
  const cardDone = Boolean(cardImageUrl) && !selectedCardFile;

  const renderBannerUpload = () =>
    bannerPreview ? (
      <div className="border-2 border-gray-6 border-dashed rounded-xl p-4 md:p-6 flex flex-col gap-6 md:flex-row md:items-center w-full max-w-full md:max-w-[710px] md:mx-auto">
        <div className="relative rounded-2xl shrink-0 size-[128px] overflow-hidden mx-auto md:mx-0">
          <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" unoptimized={bannerPreview.startsWith("data:")} />
        </div>
        <div className="flex flex-1 flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-4">
            <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">Tamanho recomendado: 880 x 400 px</p>
            <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.3]">Use uma arte com boa resolução e pouco texto, para ficar legível em diferentes telas.</p>
          </div>
          <button type="button" onClick={() => bannerCropRef.current?.open()} className="border-[1.5px] border-gray-6 rounded-lg h-11 flex gap-2 items-center justify-center px-6 hover:bg-gray-3 transition-colors w-full md:w-fit">
            {uploadSvg}
            <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">Alterar imagem</p>
          </button>
        </div>
      </div>
    ) : (
      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) bannerCropRef.current?.openWithFile(f); }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[240px] md:min-h-[300px] cursor-pointer hover:border-primary-8 transition-colors w-full max-w-full md:max-w-[710px] md:mx-auto"
        onClick={() => bannerCropRef.current?.open()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bannerCropRef.current?.open(); } }}
      >
        <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3]">Arraste uma imagem para este campo ou clique aqui</p>
        <div className="flex flex-col gap-4 items-center text-center">
          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">Tamanho recomendado: 880 × 400 px</p>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">Use uma arte com boa resolução e pouco texto, para ficar legível em diferentes telas.</p>
        </div>
      </div>
    );

  const renderBannerPreviewBlock = () => (
    <div className="flex flex-col gap-5 items-stretch w-full">
      <div className="flex flex-col gap-5 rounded-lg border border-gray-6 bg-gray-1 p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">Prévia</h2>
        <div className="flex gap-8 items-start w-full flex-col xl:flex-row xl:justify-center">
          <div className="flex flex-col gap-6 md:gap-[52px] flex-1 min-w-0 max-w-[625px] w-full">
            {bannerPreview ? (
              <div className="relative w-full aspect-342/134 md:aspect-880/400 max-w-[625px] rounded-lg md:rounded-2xl overflow-hidden shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
                <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" sizes="(max-width:768px) 100vw, 625px" unoptimized={bannerPreview.startsWith("data:")} />
              </div>
            ) : (
              <div className="w-full aspect-342/134 md:aspect-880/400 max-w-[625px] bg-gray-4 rounded-lg md:rounded-2xl" />
            )}
            <div className="hidden md:flex flex-col gap-4">
              <div className="bg-gray-8 h-4 w-full rounded" />
              {[100, 80, 60, 40, 20, 10].map((w, i) => (
                <div key={i} className="bg-gray-4 h-2 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>

          <div className="w-72 flex flex-col gap-4 shrink-0 xl:sticky xl:top-4 mx-auto xl:mx-0">
            <div className="bg-gray-2 flex flex-col gap-4 p-4 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
              <h3 className="text-gray-12 text-base font-extrabold font-manrope leading-[1.1]">{eventName || "Nome do evento"}</h3>
              <div className="flex flex-col gap-3">
                {eventLocation && (
                  <div className="flex gap-2 items-center">
                    <LocationIcon className="size-4 text-gray-12 shrink-0" />
                    <p className="text-gray-12 text-sm font-medium font-family-dm-sans leading-[1.3] flex-1">{eventLocation}</p>
                  </div>
                )}
                {eventDate && (
                  <div className="flex gap-2 items-center">
                    <CalendarIcon className="size-4 text-gray-12 shrink-0" />
                    <p className="text-gray-12 text-sm font-medium font-family-dm-sans leading-[1.3]">{formatDate(eventDate)}</p>
                  </div>
                )}
                <div className="bg-gray-3 border border-gray-6 rounded-lg p-3 flex flex-col gap-3">
                  <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">Organizador</p>
                  <div className="flex gap-2 items-center">
                    {organizer.logoSrc ? (
                      <ImageWithInitialFallback src={organizer.logoSrc} alt={organizer.name} name={organizer.name} width={32} height={32} className="size-8 rounded-full shrink-0 object-cover" fallbackId="org-logo" />
                    ) : null}
                    <div className="flex flex-col min-w-0">
                      <p className="text-gray-12 text-sm font-semibold font-family-dm-sans leading-[1.3] truncate">{organizer.name}</p>
                      {organizer.showLegalSubtitle && organizer.legalName ? (
                        <p className="text-gray-11 text-xs font-family-dm-sans leading-[1.3] truncate" title={organizer.legalName}>{organizer.legalName}</p>
                      ) : null}
                      {orgDocDisplay ? (
                        <p className="text-gray-11 text-xs font-family-dm-sans leading-[1.3]">{orgDocDisplay.label}: {orgDocDisplay.formatted}</p>
                      ) : null}
                    </div>
                  </div>
                  <Button variant="outline" disabled className="w-full h-10 text-xs text-gray-12 border-gray-6">
                    <MessageIcon className="size-4" />
                    Falar com organizador
                  </Button>
                </div>
              </div>
              <Button className="w-full h-10 text-sm" disabled>Inscrever-se</Button>
            </div>
            <div className="hidden md:flex flex-col items-center justify-center gap-3">
              <Button variant="outline" disabled className="h-10 text-sm text-gray-11 border-gray-6">
                <ShareIcon className="size-4" />
                Compartilhar
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCardUpload = () =>
    cardPreview ? (
      <div className="border-2 border-gray-6 border-dashed rounded-xl p-6 flex gap-6 items-center w-full">
        <div className="relative rounded-xl shrink-0 size-[128px] overflow-hidden bg-gray-4">
          <Image src={cardPreview} alt="Pré-visualização" fill className="object-cover" unoptimized={cardPreview.startsWith("data:")} />
        </div>
        <div className="flex flex-1 flex-col gap-6 items-start justify-center min-w-0">
          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] w-full">Tamanho recomendado: 300 × 300 px (quadrado)</p>
          <button type="button" onClick={() => cardCropRef.current?.open()} className="border border-gray-6 rounded-lg h-11 flex items-center justify-center px-6 hover:bg-gray-3 transition-colors">
            <span className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">Alterar imagem</span>
          </button>
        </div>
      </div>
    ) : (
      <div
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) cardCropRef.current?.openWithFile(f); }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[200px] cursor-pointer hover:border-primary-8 transition-colors w-full"
        onClick={() => cardCropRef.current?.open()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cardCropRef.current?.open(); } }}
      >
        <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3] text-center">Arraste uma imagem ou clique para enviar</p>
        <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center">Tamanho recomendado: 300 × 300 px (quadrado)</p>
      </div>
    );

  const renderCardListingPreview = () => (
    <div className="flex flex-col gap-5 w-full max-w-[401px] mx-auto md:mx-0">
      <p className="text-gray-12 text-[20px] font-bold font-manrope leading-[1.1]">Prévia</p>
      <div className="bg-gray-2 rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] overflow-hidden flex flex-col w-full">
        <div className="relative w-full aspect-square bg-gray-4">
          {cardPreview ? <Image src={cardPreview} alt="" fill className="object-cover rounded-t-lg" sizes="300px" unoptimized={cardPreview.startsWith("data:")} /> : null}
        </div>
        <div className="border-b border-gray-6 flex flex-col gap-3 pt-4 pb-3 px-3">
          <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1] truncate">{eventName || "Nome do evento"}</p>
          {listingLocation ? (
            <div className="flex gap-1 items-center min-w-0">
              <LocationIcon className="size-5 text-gray-12 shrink-0" />
              <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3] truncate">{listingLocation}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 pt-3 w-full">
          <div className="flex flex-col gap-3 px-3">
            <div className="flex gap-1 items-center min-w-0">
              {organizer.logoSrc ? (
                <ImageWithInitialFallback src={organizer.logoSrc} alt={organizer.name} name={organizer.name} width={20} height={20} className="size-5 rounded-full shrink-0 object-cover" fallbackId="org-logo-card" />
              ) : (
                <div className="size-5 rounded-full bg-gray-6 shrink-0" />
              )}
              <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3] truncate">{organizer.name}</p>
            </div>
            {eventDate ? (
              <div className="flex gap-1 items-center">
                <CalendarIcon className="size-5 text-gray-12 shrink-0" />
                <p className="text-gray-12 text-base font-normal font-family-dm-sans">{formatDate(eventDate)}</p>
              </div>
            ) : null}
          </div>
          <div className="flex w-full justify-start pr-3">
            <div className="inline-flex items-center gap-1 border-t border-r border-primary-6 bg-[#c4e8d1] rounded-tr-2xl px-3 py-3">
              <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
                <div className="bg-primary-12 rounded-full size-1" />
              </div>
              <p className="text-primary-12 text-sm font-semibold font-family-dm-sans leading-[1.3] whitespace-nowrap">Inscrições abertas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex w-full max-w-[1059px] flex-col gap-6 md:mx-auto md:px-0">
        {/* Banner accordion */}
        <div className="border border-gray-6 rounded-2xl overflow-hidden bg-gray-1">
          <button
            type="button"
            onClick={() => setExpandedBanner((v) => !v)}
            className="w-full flex flex-col gap-5 border-b border-gray-6 px-4 py-5 text-left hover:bg-gray-2/40 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex flex-1 min-w-0 flex-col gap-3">
              <h2 className="text-gray-12 text-base font-bold font-manrope leading-[1.1] md:text-[20px]">Banner principal do evento</h2>
              <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] md:text-base">Imagem grande no topo da página do evento</p>
            </div>
            <div className="flex items-end justify-between gap-3 shrink-0 sm:items-center sm:justify-end">
              <StatusPill done={bannerDone} />
              <ArrowButton isOpen={expandedBanner} />
            </div>
          </button>

          {expandedBanner && (
            <div className="flex flex-col gap-8 px-4 pb-8 pt-5 md:gap-11 md:pb-7 md:pt-6">
              {renderBannerUpload()}
              {renderBannerPreviewBlock()}
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={() => void handleBannerStepNext()}
                  disabled={
                    uploadingBanner ||
                    (onNext
                      ? !selectedBannerFile && !bannerUrl && !bannerPreview
                      : !selectedBannerFile)
                  }
                  className="h-12 px-6 text-base font-bold font-manrope rounded-lg md:h-10 md:px-4 md:text-sm"
                >
                  {uploadingBanner ? "Enviando..." : onNext ? "Próximo" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Card accordion */}
        <div className="border border-gray-6 rounded-xl overflow-hidden bg-gray-1">
          <button
            type="button"
            onClick={() => setExpandedCard((v) => !v)}
            className="w-full flex flex-col gap-5 border-b border-gray-6 px-4 py-5 text-left hover:bg-gray-2/40 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex flex-1 min-w-0 flex-col gap-3">
              <h2 className="text-gray-12 text-base font-bold font-manrope leading-[1.1] md:text-[20px]">Imagem de pré-visualização</h2>
              <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] md:text-base">Aparece no card do evento na listagem e compartilhamentos</p>
            </div>
            <div className="flex items-center justify-between gap-3 shrink-0 sm:justify-end">
              <StatusPill done={cardDone} />
              <ArrowButton isOpen={expandedCard} />
            </div>
          </button>

          {expandedCard && (
            <div className="flex flex-col gap-8 px-4 pb-8 pt-5 md:gap-11 md:pb-7 md:pt-5">
              <div className="flex flex-col gap-6 w-full">
                {renderCardUpload()}
                {renderCardListingPreview()}
              </div>
              <div className="flex justify-end w-full">
                <Button
                  type="button"
                  onClick={() => void handleConfirmCardAndNext()}
                  disabled={
                    uploadingCard ||
                    nextLoading ||
                    (onNext
                      ? !selectedCardFile && !cardImageUrl && !cardPreview
                      : !selectedCardFile)
                  }
                  className="h-12 px-6 text-base font-bold font-manrope md:h-10 md:text-sm"
                >
                  {uploadingCard || nextLoading ? "Salvando..." : onNext ? "Confirmar e próximo" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImageUploadWithCrop ref={bannerCropRef} spec={EVENT_IMAGE_SPECS.banner} outputBaseName="banner" modalTitle="Ajustar banner do evento" onCropped={applyCroppedBanner} onInvalidFile={(msg) => toast.error(msg)} onCropFailed={(msg) => toast.error(msg)} />
      <ImageUploadWithCrop ref={cardCropRef} spec={EVENT_IMAGE_SPECS.card} outputBaseName="card" modalTitle="Ajustar imagem do card" onCropped={applyCroppedCard} onInvalidFile={(msg) => toast.error(msg)} onCropFailed={(msg) => toast.error(msg)} />
    </>
  );
}
