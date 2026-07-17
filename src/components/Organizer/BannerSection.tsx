"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { EventPublicInfoCardDesktop } from "@/components/Event/EventPublicInfoCard";
import type { Event } from "@/interfaces/event";
import { surfaceHeader } from "@/lib/authSurface";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
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
  /** Event preview data */
  eventName?: string;
  eventDate?: string;
  /**
   * Janela de inscrições em ISO (instante UTC — compor com
   * `composeRegistrationDateTime`). Alimentam a linha "Inscrições até" do card e o
   * estado do CTA ("Inscrições abrem em…"/"encerradas").
   *
   * Necessárias no fluxo NOVO, que não tem `previewEvent`: sem elas o card cai no
   * `base` vazio, `registrationEndDate` fica `undefined` e a linha "Inscrições até"
   * some da prévia (a de `eventDate` é incondicional). Na EDIÇÃO podem ser omitidas
   * — chegam pelo `previewEvent`.
   */
  registrationStartDate?: string;
  registrationEndDate?: string;
  street?: string;
  /** Nome do local (POI escolhido no mapa) — 1ª parte do endereço do card, igual à tela pública. */
  locationName?: string;
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
  /**
   * When provided, o botão do banner vira "Próximo" e chama `onNext` após salvar
   * (ou se o banner já estiver salvo). A "imagem do card" foi descontinuada — todo
   * o app exibe o BANNER, então esta é a única etapa de imagem do evento.
   */
  onNext?: () => Promise<void>;
  nextLoading?: boolean;
}

// ─── component ───────────────────────────────────────────────────────────────

export function BannerSection({
  bannerUrl,
  eventName,
  eventDate,
  registrationStartDate,
  registrationEndDate,
  street,
  locationName,
  city,
  state,
  socialLinks,
  organizer,
  previewEvent,
  onBannerUploaded,
  onNext,
  nextLoading = false,
}: BannerSectionProps) {
  const [bannerPreview, setBannerPreview] = useState(bannerUrl ?? "");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [expandedBanner, setExpandedBanner] = useState(true);
  const bannerCropRef = useRef<ImageUploadWithCropRef>(null);

  useEffect(() => { if (bannerUrl) setBannerPreview(bannerUrl); }, [bannerUrl]);

  /**
   * `event` que alimenta o card REAL (EventPublicInfoCardDesktop) na prévia. Em
   * edição parte do evento real (organizador/datas/status corretos); no fluxo
   * "novo" cai num sintético com defaults. Sempre sobrepõe os valores VIVOS do
   * form e a imagem em PREVIEW (data: URL durante o upload).
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
      // `locationName` alimenta a 1ª parte do endereço do card ("Local, Cidade, UF"),
      // igual à tela pública. Valor vivo do form > evento base.
      locationName: locationName || (base.locationName as string) || "",
      eventDate: eventDate || (base.eventDate as string) || "",
      // Janela de inscrições: valor vivo do form (fluxo NOVO) > evento base (edição).
      // Sem isto o fluxo novo não tem `registrationEndDate` e o card esconde a linha
      // "Inscrições até".
      registrationStartDate:
        registrationStartDate || (base.registrationStartDate as string) || "",
      registrationEndDate:
        registrationEndDate || (base.registrationEndDate as string) || "",
      // Imagem do evento = BANNER: preview vivo > já salvo > evento base.
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
    locationName,
    eventDate,
    registrationStartDate,
    registrationEndDate,
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

  /**
   * Etapa ÚNICA de imagem do evento (banner). Salva o arquivo selecionado (se
   * houver) e então avança via `onNext`. Se o banner já está salvo e nada mudou,
   * só avança.
   */
  const handleBannerStepNext = async () => {
    if (selectedBannerFile) {
      const ok = await handleBannerUpload();
      if (!ok) return;
    } else if (!bannerUrl && !bannerPreview) {
      toast.error("Selecione e ajuste o banner antes de continuar.");
      return;
    }
    if (onNext) await onNext();
  };

  const bannerDone = Boolean(bannerUrl) && !selectedBannerFile;

  const renderBannerUpload = () =>
    bannerPreview ? (
      <div className="border-2 border-gray-6 border-dashed rounded-xl p-4 md:p-6 flex flex-col gap-6 md:flex-row md:items-center w-full max-w-full md:max-w-[710px] md:mx-auto">
        <div className="relative rounded-2xl shrink-0 w-[128px] aspect-1660/930 overflow-hidden mx-auto md:mx-0">
          <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" unoptimized={bannerPreview.startsWith("data:")} />
        </div>
        <div className="flex flex-1 flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-4">
            <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">Tamanho recomendado: 1660 x 930 px</p>
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
          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">Tamanho recomendado: 1660 × 930 px</p>
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
              <div className="relative w-full aspect-1660/930 max-w-full rounded-lg md:rounded-2xl overflow-hidden shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
                <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" sizes="(max-width:768px) 100vw, 625px" unoptimized={bannerPreview.startsWith("data:")} />
              </div>
            ) : (
              <div className="w-full aspect-1660/930 max-w-full bg-gray-4 rounded-lg md:rounded-2xl" />
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

  return (
    <>
      <div className="flex w-full max-w-7xl flex-col gap-6 mx-auto md:px-0">
        {/* Banner accordion — etapa ÚNICA de imagem do evento (card descontinuado). */}
        <div className="border border-gray-6 rounded-2xl overflow-hidden bg-gray-1">
          <button
            type="button"
            onClick={() => setExpandedBanner((v) => !v)}
            className="w-full flex flex-col gap-5 border-b border-gray-6 px-4 py-5 text-left hover:bg-gray-2/40 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex flex-1 min-w-0 flex-col gap-3">
              <h2 className="text-gray-12 text-base font-bold font-manrope leading-[1.1] md:text-[20px]">Banner principal do evento</h2>
              <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] md:text-base">Imagem grande no topo da página do evento (também usada no card da listagem e nos compartilhamentos)</p>
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
                    nextLoading ||
                    (onNext
                      ? !selectedBannerFile && !bannerUrl && !bannerPreview
                      : !selectedBannerFile)
                  }
                  className="h-12 px-6 text-base font-bold font-manrope rounded-lg md:h-10 md:px-4 md:text-sm"
                >
                  {uploadingBanner || nextLoading ? "Enviando..." : onNext ? "Próximo" : "Salvar"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ImageUploadWithCrop ref={bannerCropRef} spec={EVENT_IMAGE_SPECS.banner} outputBaseName="banner" modalTitle="Ajustar banner do evento" onCropped={applyCroppedBanner} onInvalidFile={(msg) => toast.error(msg)} onCropFailed={(msg) => toast.error(msg)} />
    </>
  );
}
