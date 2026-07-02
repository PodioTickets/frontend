"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { EventCard } from "@/components/Event/Card";
import { EventPublicInfoCardDesktop } from "@/components/Event/EventPublicInfoCard";
import type { Event } from "@/interfaces/event";
import { userService, organizerService } from "@/services";
import { surfaceHeader } from "@/lib/authSurface";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { cn } from "@/utils/cn";
import toast from "react-hot-toast";

// ─── helpers ────────────────────────────────────────────────────────────────

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

/**
 * Placeholder de card na prévia da listagem — espelha a MOLDURA do `EventCard`
 * (mesma borda/sombra/aspect-square + blocos de texto) só que em estado de
 * carregamento. Serve pra contextualizar o card real (centralizado) como ele
 * aparece cercado por outros na listagem/carrossel, sem inventar dados falsos.
 */
function EventCardSkeleton() {
  return (
    <div
      aria-hidden
      className="flex w-full flex-col overflow-hidden rounded-lg border border-[#cecece] bg-[#f9f9f9] shadow-[0_2px_6px_0_rgba(17,17,17,0.3)]"
    >
      <div className="aspect-square w-full shrink-0 animate-pulse bg-gray-4" />
      {/* Título (1 linha) + local (row de ícone = 20px) → espelha a altura exata
          da seção equivalente do EventCard. */}
      <div className="flex flex-col gap-3 border-b border-[#d9d9d9] px-3 pb-3 pt-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-gray-4" />
        <div className="flex h-5 items-center">
          <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-4" />
        </div>
      </div>
      {/* Organizador + data (duas rows de ícone = 20px cada) + tag de status. */}
      <div className="flex flex-col gap-4 pt-3">
        <div className="flex flex-col gap-3 px-3">
          <div className="flex h-5 items-center gap-1">
            <div className="size-5 shrink-0 animate-pulse rounded-full bg-gray-4" />
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-gray-4" />
          </div>
          <div className="flex h-5 items-center">
            <div className="h-3.5 w-1/2 animate-pulse rounded bg-gray-4" />
          </div>
        </div>
        <div className="flex items-center">
          <div className="h-11 w-32 animate-pulse rounded-tr-[16px] bg-gray-4" />
        </div>
      </div>
    </div>
  );
}

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
  /**
   * Redes sociais VIVAS do form — sobrepostas no card da prévia pra os ícones
   * refletirem o que o organizador acabou de editar (o `previewEvent` pode estar
   * stale). Vazio ("") reflete remoção; ausente cai no valor do evento base.
   */
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    youtube?: string;
    tiktok?: string;
    website?: string;
  };
  /** Organizer preview data */
  organizer: BannerSectionOrganizerData;
  /**
   * Evento real (contexto de edição) usado como BASE da prévia — garante que os
   * cards renderizados sejam os MESMOS de produção (organizador/datas/status
   * corretos). Ausente no fluxo "novo evento" → cai num sintético com os campos
   * do form. Os valores vivos do form e a imagem em preview são sobrepostos.
   */
  previewEvent?: Event | null;
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
  socialLinks,
  organizer,
  previewEvent,
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

  /**
   * `event` que alimenta os cards REAIS (EventCard + EventPublicInfoCardDesktop)
   * na prévia. Em edição parte do evento real (organizador/datas/status corretos);
   * no fluxo "novo" cai num sintético com defaults. Sempre sobrepõe os valores
   * VIVOS do form e a imagem em PREVIEW (data: URL durante o upload).
   */
  const cardEvent = useMemo(() => {
    const base = (previewEvent ?? {}) as Record<string, unknown>;
    return {
      // EDIÇÃO: herda TODOS os campos reais (zipCode, neighborhood, redes sociais,
      // isSuspended, etc.) que o EventPublicInfoCardDesktop usa. NOVO: base vazio →
      // tudo vem dos defaults/overlays abaixo.
      ...base,
      id: (base.id as string) ?? "preview",
      slug: (base.slug as string) ?? "preview",
      status: (base.status as string) ?? "PUBLISHED",
      hasRegistrationSlotsAvailable:
        (base.hasRegistrationSlotsAvailable as boolean) ?? true,
      // Fallback de organizador (fluxo novo): o logo já vem como URL completa em
      // `organizer.logoSrc`; getAvatarUrl é idempotente para URLs http(s).
      organizer:
        base.organizer ??
        (base.organization
          ? undefined
          : { id: "org-preview", name: organizer.name, user: { avatarUrl: organizer.logoSrc } }),
      // Valores vivos do form (refletem edições não salvas); fallback ao base.
      name: eventName || (base.name as string) || "Nome do evento",
      city: city || (base.city as string) || "",
      state: state || (base.state as string) || "",
      location: street || (base.location as string) || "",
      eventDate: eventDate || (base.eventDate as string) || "",
      // Imagem do card/banner: preview vivo > já salvo > evento base.
      logoUrl: cardPreview || cardImageUrl || (base.logoUrl as string) || "",
      bannerUrl: bannerPreview || bannerUrl || (base.bannerUrl as string) || "",
      // Redes sociais VIVAS do form (fallback ao evento base). Fazem os ícones
      // aparecerem na prévia do banner refletindo a edição atual.
      instagram: socialLinks?.instagram ?? (base.instagram as string) ?? "",
      facebook: socialLinks?.facebook ?? (base.facebook as string) ?? "",
      youtube: socialLinks?.youtube ?? (base.youtube as string) ?? "",
      tiktok: socialLinks?.tiktok ?? (base.tiktok as string) ?? "",
      website: socialLinks?.website ?? (base.website as string) ?? "",
    } as unknown as Event;
  }, [
    previewEvent,
    eventName,
    city,
    state,
    street,
    eventDate,
    cardPreview,
    cardImageUrl,
    bannerPreview,
    bannerUrl,
    organizer.name,
    organizer.logoSrc,
    socialLinks?.instagram,
    socialLinks?.facebook,
    socialLinks?.youtube,
    socialLinks?.tiktok,
    socialLinks?.website,
  ]);

  const uploadImageFile = useCallback(async (file: File): Promise<string> => {
    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");

    const fd = new FormData();
    fd.append("file", file);
    // Auth por cookie httpOnly: `credentials: "include"`; 401 cai no !ok abaixo.
    // `X-PT-Surface` declara a superfície (fetch cru não passa pelo ApiClient).
    const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
      method: "POST",
      credentials: "include",
      headers: surfaceHeader(),
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
          <div className="flex flex-col gap-6 md:gap-[52px] flex-1 min-w-0 max-w-full w-full">
            {bannerPreview ? (
              <div className="relative w-full aspect-342/134 md:aspect-880/400 max-w-full rounded-lg md:rounded-2xl overflow-hidden shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
                <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" sizes="(max-width:768px) 100vw, 625px" unoptimized={bannerPreview.startsWith("data:")} />
              </div>
            ) : (
              <div className="w-full aspect-342/134 md:aspect-880/400 max-w-full bg-gray-4 rounded-lg md:rounded-2xl" />
            )}
            <div className="hidden md:flex flex-col gap-4">
              <div className="bg-gray-8 h-4 w-full rounded" />
              {[100, 80, 60, 40, 20, 10].map((w, i) => (
                <div key={i} className="bg-gray-4 h-2 rounded" style={{ width: `${w}%` }} />
              ))}
            </div>
          </div>

          <div className="w-auto md:w-72 flex flex-col gap-4 shrink-0 xl:sticky xl:top-4 mx-auto xl:mx-0">
            {/* Card lateral REAL da página pública do evento (events/[slug]) — em
                modo prévia (sem checkout) e APAGADO (cinza), igual à prévia de
                tópicos: só o título fica nítido/selecionável. */}
            <EventPublicInfoCardDesktop event={cardEvent} isPreview mutedPreview />
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
    <div className="flex w-full flex-col gap-5">
      <p className="text-gray-12 text-[20px] font-bold font-manrope leading-[1.1]">Prévia</p>
      {/* Fileira responsiva: o do MEIO é o card REAL (mesmo das listas/busca, em
          modo prévia — sem navegação e aceitando a imagem em upload `data:`); os
          outros são skeletons só pra contextualizar como aparece cercado. Contagem
          por breakpoint: 1 no mobile (só o real), 3 no md, 5 no xl. Como `hidden`
          remove o item do fluxo flex, os `flex-1` visíveis se redistribuem sozinhos. */}
      <div className="flex items-start justify-center gap-4 md:justify-start">
        {[0, 1, 2, 3, 4].map((i) => {
          // 0/4 = pontas (só xl); 1/3 = intermediários (md+); 2 = real (sempre).
          const visibility =
            i === 2 ? "" : i === 1 || i === 3 ? "hidden md:block" : "hidden xl:block";
          return (
            <div
              key={i}
              className={cn(
                "min-w-0 flex-1",
                // No mobile só o card real aparece; limita a largura pra não esticar
                // ocupando a linha inteira. A partir do md volta a dividir igual.
                i === 2 && "max-w-[280px] md:max-w-none",
                visibility,
              )}
            >
              {i === 2 ? (
                <EventCard event={cardEvent} preview />
              ) : (
                <EventCardSkeleton />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div className="flex w-full max-w-7xl flex-col gap-6 mx-auto md:px-0">
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
