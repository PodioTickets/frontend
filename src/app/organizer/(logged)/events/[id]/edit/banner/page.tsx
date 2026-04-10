"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { userService, organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import Image from "next/image";
import toast from "react-hot-toast";
import { organizerEventEditClientPage } from "@/lib/organizerAudit";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import type { Event } from "@/interfaces/event";
import { getEventOrganizer } from "@/utils/organization";
import { getAvatarUrl } from "@/utils/avatar";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";

function formatOrgDocumentForDisplay(raw: string | null | undefined): {
  label: string;
  formatted: string;
} | null {
  if (!raw?.trim()) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 14) {
    return {
      label: "CNPJ",
      formatted: digits.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        "$1.$2.$3/$4-$5"
      ),
    };
  }
  if (digits.length === 11) {
    return {
      label: "CPF",
      formatted: digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4"),
    };
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
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
    aria-hidden
  >
    <path
      d="M10 3.33325V13.3333M10 13.3333L6.66667 9.99992M10 13.3333L13.3333 9.99992M3.33333 13.3333V15.8333C3.33333 16.7538 4.07952 17.5 5 17.5H15C15.9205 17.5 16.6667 16.7538 16.6667 15.8333V13.3333"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default function EditBannerPage() {
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const params = useParams();
  const eventId = params.id as string;
  const { formData, updateFormData, event } = useEditEvent();
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [cardPreview, setCardPreview] = useState<string>("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingCard, setUploadingCard] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const [selectedCardFile, setSelectedCardFile] = useState<File | null>(null);
  const bannerCropRef = useRef<ImageUploadWithCropRef>(null);
  const cardCropRef = useRef<ImageUploadWithCropRef>(null);
  const [expandedBanner, setExpandedBanner] = useState(true);
  const [expandedCard, setExpandedCard] = useState(false);

  const uploadImageFile = useCallback(async (file: File): Promise<string> => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
    const apiClient = (
      userService as unknown as { apiClient?: { getAccessToken: () => string | null } }
    ).apiClient;
    const token = apiClient?.getAccessToken();
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
          typeof v === "string" && (v.startsWith("http") || v.startsWith("/"))
      );
    }

    if (!imageUrl) {
      throw new Error("Resposta do servidor inválida — URL não encontrada");
    }

    return imageUrl.startsWith("http")
      ? imageUrl
      : `${apiUrl}${imageUrl.startsWith("/") ? "" : "/"}${imageUrl}`;
  }, []);

  useEffect(() => {
    if (formData.bannerUrl) {
      setBannerPreview(formData.bannerUrl);
    }
  }, [formData.bannerUrl]);

  useEffect(() => {
    if (formData.cardImageUrl) {
      setCardPreview(formData.cardImageUrl);
    }
  }, [formData.cardImageUrl]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      bannerCropRef.current?.openWithFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleCardDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) {
      cardCropRef.current?.openWithFile(file);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const applyCroppedBanner = useCallback((file: File) => {
    setSelectedBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const applyCroppedCard = useCallback((file: File) => {
    setSelectedCardFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCardPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleBannerUpload = async (): Promise<boolean> => {
    if (!selectedBannerFile) {
      toast.error("Por favor, selecione uma imagem antes de continuar");
      return false;
    }

    setUploadingBanner(true);
    try {
      const fullUrl = await uploadImageFile(selectedBannerFile);
      updateFormData({ bannerUrl: fullUrl });

      await organizerService.updateEvent(
        eventId,
        { bannerUrl: fullUrl },
        { clientPage: organizerEventEditClientPage(eventId, "banner") }
      );

      toast.success("Banner enviado com sucesso!");
      setSelectedBannerFile(null);
      return true;
    } catch (error: unknown) {
      console.error("Error uploading banner:", error);
      const message = error instanceof Error ? error.message : "Erro ao fazer upload do banner";
      toast.error(message);
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
      const fullUrl = await uploadImageFile(selectedCardFile);
      updateFormData({ cardImageUrl: fullUrl });

      await organizerService.updateEvent(
        eventId,
        { cardImageUrl: fullUrl },
        { clientPage: organizerEventEditClientPage(eventId, "banner") }
      );

      toast.success("Imagem de pré-visualização enviada!");
      setSelectedCardFile(null);
      return true;
    } catch (error: unknown) {
      console.error("Error uploading card image:", error);
      const message =
        error instanceof Error ? error.message : "Erro ao fazer upload da imagem";
      toast.error(message);
      return false;
    } finally {
      setUploadingCard(false);
    }
  };

  const handleBack = () => {
    orgNav.push(`/organizer/events/${eventId}/edit`);
  };

  /** Salva o banner se houver arquivo pendente; não navega. Abre o bloco do card em seguida. */
  const handleBannerStepNext = async () => {
    if (selectedBannerFile) {
      const ok = await handleBannerUpload();
      if (ok) {
        setExpandedBanner(false);
        setExpandedCard(true);
      }
      return;
    }

    if (formData.bannerUrl) {
      setExpandedBanner(false);
      setExpandedCard(true);
      return;
    }

    toast.error("Selecione e ajuste o banner antes de continuar.");
  };

  const handleConfirmCardAndNext = async () => {
    if (selectedCardFile) {
      await handleCardUpload();
      return;
    }
  };

  const eventLocation =
    formData.street && formData.city && formData.state
      ? `${formData.street}, ${formData.city}, ${formData.state}`
      : "";

  const listingLocation =
    formData.city && formData.state
      ? `${formData.city}, ${formData.state}`
      : eventLocation || "";

  const organizerPreview = event ? getEventOrganizer(event as Event) : null;
  const org = event?.organization;

  const orgName = organizerPreview?.name?.trim() || "Organização";
  const orgLogoSrc = organizerPreview?.logoUrl
    ? getAvatarUrl(organizerPreview.logoUrl)
    : null;

  const orgTradeName = org?.tradeName?.trim() ?? null;
  const orgLegalName = org?.name?.trim() ?? null;
  const orgShowLegalSubtitle = Boolean(
    orgTradeName && orgLegalName && orgTradeName !== orgLegalName
  );

  const orgDocDisplay = formatOrgDocumentForDisplay(org?.document);

  const bannerDone = Boolean(formData.bannerUrl) && !selectedBannerFile;
  const cardDone = Boolean(formData.cardImageUrl) && !selectedCardFile;

  const editHref = organizerExternalHref(
    `/organizer/events/${eventId}/edit`,
    appSurface,
  );

  const renderBannerUpload = () =>
    bannerPreview ? (
      <div className="border-2 border-gray-6 border-dashed rounded-xl p-4 md:p-6 flex flex-col gap-6 md:flex-row md:items-center w-full max-w-full md:max-w-[710px] md:mx-auto">
        <div className="relative rounded-2xl shrink-0 size-[128px] overflow-hidden mx-auto md:mx-0">
          <Image src={bannerPreview} alt="Banner preview" fill className="object-cover" />
        </div>
        <div className="flex flex-1 flex-col gap-6 min-w-0">
          <div className="flex flex-col gap-4">
            <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
              Tamanho recomendado: 880 × 400 px
            </p>
            <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.3]">
              Use uma arte com boa resolução e pouco texto, para ficar legível em diferentes telas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => bannerCropRef.current?.open()}
            className="border-[1.5px] border-gray-6 rounded-lg h-11 flex gap-2 items-center justify-center px-6 hover:bg-gray-3 transition-colors w-full md:w-fit"
          >
            {uploadSvg}
            <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">
              Alterar imagem
            </p>
          </button>
        </div>
      </div>
    ) : (
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[240px] md:min-h-[300px] cursor-pointer hover:border-primary-8 transition-colors w-full max-w-full md:max-w-[710px] md:mx-auto"
        onClick={() => bannerCropRef.current?.open()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            bannerCropRef.current?.open();
          }
        }}
      >
        <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3]">
          Arraste uma imagem para este campo ou clique aqui
        </p>
        <div className="flex flex-col gap-4 items-center text-center">
          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
            Tamanho recomendado: 880 × 400 px
          </p>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
            Use uma arte com boa resolução e pouco texto, para ficar legível em diferentes telas.
          </p>
        </div>
      </div>
    );

  const renderBannerPreviewBlock = () => (
    <div className="flex flex-col gap-5 items-stretch w-full">
      <div className="flex flex-col gap-5 rounded-lg border border-gray-6 bg-gray-1 p-4 md:rounded-none md:border-0 md:bg-transparent md:p-0">
        <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
          Prévia
        </h2>
        <div className="flex gap-8 items-start w-full flex-col xl:flex-row xl:justify-center">
          <div className="flex flex-col gap-6 md:gap-[52px] flex-1 min-w-0 w-full">
            {bannerPreview ? (
              <div className="relative aspect-342/134 md:aspect-880/400 w-full rounded-lg md:rounded-2xl overflow-hidden shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                  sizes="100%"
                />
              </div>
            ) : (
              <div className="w-full aspect-342/134 md:aspect-880/400 bg-gray-4 rounded-lg md:rounded-2xl" />
            )}

            <div className="hidden md:flex flex-col gap-4">
              <div className="bg-gray-8 h-4 w-full rounded" />
              <div className="bg-gray-4 h-2 w-full rounded" />
              <div className="bg-gray-4 h-2 w-[80%] max-w-[501px] rounded" />
              <div className="bg-gray-4 h-2 w-[60%] max-w-[377px] rounded" />
              <div className="bg-gray-4 h-2 w-[40%] max-w-[253px] rounded" />
              <div className="bg-gray-4 h-2 w-[20%] max-w-[129px] rounded" />
              <div className="bg-gray-4 h-2 w-[10%] max-w-[65px] rounded" />
            </div>
          </div>

          <div className="w-72 flex flex-col gap-4 shrink-0 xl:sticky xl:top-4 mx-auto xl:mx-0">
            <div className="bg-gray-2 flex flex-col gap-4 p-4 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
              <h3 className="text-gray-12 text-base font-extrabold font-manrope leading-[1.1]">
                {formData.name || "Nome do evento"}
              </h3>

              <div className="flex flex-col gap-3">
                {eventLocation && (
                  <div className="flex gap-2 items-center">
                    <LocationIcon className="size-4 text-gray-12 shrink-0" />
                    <p className="text-gray-12 text-sm font-medium font-family-dm-sans leading-[1.3] flex-1">
                      {eventLocation}
                    </p>
                  </div>
                )}

                {formData.eventDate && (
                  <div className="flex gap-2 items-center">
                    <CalendarIcon className="size-4 text-gray-12 shrink-0" />
                    <p className="text-gray-12 text-sm font-medium font-family-dm-sans leading-[1.3]">
                      {formatDate(formData.eventDate)}
                    </p>
                  </div>
                )}

                <div className="bg-gray-3 border border-gray-6 rounded-lg p-3 flex flex-col gap-3">
                  <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
                    Organizador
                  </p>
                  <div className="flex gap-2 items-center">
                    {orgLogoSrc ? (
                      <ImageWithInitialFallback
                        src={orgLogoSrc}
                        alt={orgName}
                        name={orgName}
                        width={32}
                        height={32}
                        className="size-8 rounded-full shrink-0 object-cover"
                        fallbackId="org-logo"
                      />
                    ) : null}
                    <div className="flex flex-col min-w-0">
                      <p className="text-gray-12 text-sm font-semibold font-family-dm-sans leading-[1.3] truncate">
                        {orgName}
                      </p>
                      {orgShowLegalSubtitle ? (
                        <p
                          className="text-gray-11 text-xs font-family-dm-sans leading-[1.3] truncate"
                          title={orgLegalName ?? undefined}
                        >
                          {orgLegalName}
                        </p>
                      ) : null}
                      {orgDocDisplay ? (
                        <p className="text-gray-11 text-xs font-family-dm-sans leading-[1.3]">
                          {orgDocDisplay.label}: {orgDocDisplay.formatted}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <Button variant="outline" disabled className="w-full h-10 text-xs text-gray-12 border-gray-6">
                    <MessageIcon className="size-4" />
                    Falar com organizador
                  </Button>
                </div>
              </div>

              <Button className="w-full h-10 text-sm" disabled>
                Inscrever-se
              </Button>
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
          <Image src={cardPreview} alt="Pré-visualização" fill className="object-cover" />
        </div>
        <div className="flex flex-1 flex-col gap-6 items-start justify-center min-w-0">
          <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] w-full">
            Tamanho recomendado: 300 × 300 px (quadrado)
          </p>
          <button
            type="button"
            onClick={() => cardCropRef.current?.open()}
            className="border border-gray-6 rounded-lg h-11 flex items-center justify-center px-6 hover:bg-gray-3 transition-colors"
          >
            <span className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">
              Alterar imagem
            </span>
          </button>
        </div>
      </div>
    ) : (
      <div
        onDrop={handleCardDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[200px] cursor-pointer hover:border-primary-8 transition-colors w-full"
        onClick={() => cardCropRef.current?.open()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            cardCropRef.current?.open();
          }
        }}
      >
        <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3] text-center">
          Arraste uma imagem ou clique para enviar
        </p>
        <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] text-center">
          Tamanho recomendado: 300 x 300 px (quadrado)
        </p>
      </div>
    );

  const renderCardListingPreview = () => (
    <div className="flex flex-col gap-5 w-full max-w-[401px] mx-auto md:mx-0">
      <p className="text-gray-12 text-[20px] font-bold font-manrope leading-[1.1]">Prévia</p>
      <div className="bg-gray-2 rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] overflow-hidden flex flex-col w-full">
        <div className="relative w-full aspect-square bg-gray-4">
          {cardPreview ? (
            <Image src={cardPreview} alt="" fill className="object-cover rounded-t-lg" sizes="300px" />
          ) : null}
        </div>
        <div className="border-b border-gray-6 flex flex-col gap-3 pt-4 pb-3 px-3">
          <p className="text-gray-12 text-base font-bold font-manrope leading-[1.1] truncate">
            {formData.name || "Nome do evento"}
          </p>
          {listingLocation ? (
            <div className="flex gap-1 items-center min-w-0">
              <LocationIcon className="size-5 text-gray-12 shrink-0" />
              <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3] truncate">
                {listingLocation}
              </p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-4 pt-3 w-full">
          <div className="flex flex-col gap-3 px-3">
            <div className="flex gap-1 items-center min-w-0">
              {orgLogoSrc ? (
                <ImageWithInitialFallback
                  src={orgLogoSrc}
                  alt={orgName}
                  name={orgName}
                  width={20}
                  height={20}
                  className="size-5 rounded-full shrink-0 object-cover"
                  fallbackId="org-logo"
                />
              ) : (
                <div className="size-5 rounded-full bg-gray-6 shrink-0" />
              )}
              <p className="text-gray-12 text-base font-normal font-family-dm-sans leading-[1.3] truncate">
                {orgName}
              </p>
            </div>
            {formData.eventDate ? (
              <div className="flex gap-1 items-center">
                <CalendarIcon className="size-5 text-gray-12 shrink-0" />
                <p className="text-gray-12 text-base font-normal font-family-dm-sans">
                  {formatDate(formData.eventDate)}
                </p>
              </div>
            ) : null}
          </div>
          <div className="flex w-full justify-start pr-3">
            <div className="inline-flex items-center gap-1 border-t border-r border-primary-6 bg-[#c4e8d1] rounded-tr-2xl px-3 py-3">
              <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
                <div className="bg-primary-12 rounded-full size-1" />
              </div>
              <p className="text-primary-12 text-sm font-semibold font-family-dm-sans leading-[1.3] whitespace-nowrap">
                Inscrições abertas
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-w-0 bg-gray-2 pb-28 md:bg-transparent md:pb-20">
      <div className="md:hidden sticky top-0 z-20 bg-gray-2 border-b border-gray-6 -mx-4 px-4">
        <div className="flex h-[52px] items-center gap-1">
          <Link
            href={editHref}
            className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={false} />
          </Link>
          <h1 className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
            Banners do evento
          </h1>
        </div>
      </div>

      <p className="pt-4 pb-2 text-base text-gray-11 font-family-dm-sans leading-[1.3] md:hidden">
        Imagens principais do evento para os participantes visualizarem
      </p>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col items-stretch gap-6 px-0 md:items-center md:gap-9 md:px-0">
        <div className="hidden md:flex flex-col gap-4 items-center w-full">
          <div className="flex gap-3 items-center flex-wrap justify-center">
            <button
              type="button"
              onClick={handleBack}
              className="border border-gray-6 rounded-[52px] cursor-pointer size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1] text-center">
              Banner principal do evento
            </h1>
          </div>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] text-center max-w-[640px]">
            Essa é a imagem grande que aparece no topo da página do seu evento
          </p>
        </div>

        <div className="flex w-full max-w-[1059px] flex-col gap-6 md:mx-auto md:px-0">
          {/* Accordion — banner */}
          <div className="border border-gray-6 rounded-2xl overflow-hidden bg-gray-1">
            <button
              type="button"
              onClick={() => setExpandedBanner((v) => !v)}
              className="w-full flex flex-col gap-5 border-b border-gray-6 px-4 py-5 text-left hover:bg-gray-2/40 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="flex flex-1 min-w-0 flex-col gap-3">
                <h2 className="text-gray-12 text-base font-bold font-manrope leading-[1.1] md:text-[20px]">
                  Banner principal do evento
                </h2>
                <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] md:text-base">
                  Imagem grande no topo da página do evento
                </p>
              </div>
              <div className="flex items-end justify-between gap-3 shrink-0 sm:items-center sm:justify-end">
                <StatusPill done={bannerDone} />
                <ArrowButton isOpen={expandedBanner} />
              </div>
            </button>

            {expandedBanner ? (
              <div className="flex flex-col gap-8 px-4 pb-8 pt-5 md:gap-11 md:pb-7 md:pt-6">
                {renderBannerUpload()}
                {renderBannerPreviewBlock()}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    onClick={() => void handleBannerStepNext()}
                    disabled={uploadingBanner}
                    className="h-12 px-6 text-base font-bold font-manrope rounded-lg md:h-10 md:px-4 md:text-sm"
                  >
                    {uploadingBanner ? "Enviando..." : "Próximo"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Accordion — imagem de pré-visualização (card de listagem) */}
          <div className="border border-gray-6 rounded-xl overflow-hidden bg-gray-1">
            <button
              type="button"
              onClick={() => setExpandedCard((v) => !v)}
              className="w-full flex flex-col gap-5 border-b border-gray-6 px-4 py-5 text-left hover:bg-gray-2/40 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-3"
            >
              <div className="flex flex-1 min-w-0 flex-col gap-3">
                <h2 className="text-gray-12 text-base font-bold font-manrope leading-[1.1] md:text-[20px]">
                  Imagem de pré-visualização
                </h2>
                <p className="text-gray-11 text-sm font-normal font-family-dm-sans leading-[1.3] md:text-base">
                  Aparece no card do evento na listagem e compartilhamentos
                </p>
              </div>
              <div className="flex items-center justify-between gap-3 shrink-0 sm:justify-end">
                <StatusPill done={cardDone} />
                <ArrowButton isOpen={expandedCard} />
              </div>
            </button>

            {expandedCard ? (
              <div className="flex flex-col gap-8 px-4 pb-8 pt-5 md:gap-11 md:pb-7 md:pt-5">
                <div className="flex flex-col gap-6 w-full">
                  {renderCardUpload()}
                  {renderCardListingPreview()}
                </div>
                <div className="flex justify-end w-full">
                  <Button
                    type="button"
                    onClick={() => void handleConfirmCardAndNext()}
                    disabled={uploadingCard}
                    className="h-12 px-6 text-base font-bold font-manrope md:h-10 md:text-sm"
                  >
                    {uploadingCard ? "Enviando..." : "Confirmar e próximo"}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <ImageUploadWithCrop
        ref={bannerCropRef}
        spec={EVENT_IMAGE_SPECS.banner}
        outputBaseName="banner"
        modalTitle="Ajustar banner do evento"
        onCropped={applyCroppedBanner}
        onInvalidFile={(msg) => toast.error(msg)}
        onCropFailed={(msg) => toast.error(msg)}
      />
      <ImageUploadWithCrop
        ref={cardCropRef}
        spec={EVENT_IMAGE_SPECS.card}
        outputBaseName="card"
        modalTitle="Ajustar imagem do card"
        onCropped={applyCroppedCard}
        onInvalidFile={(msg) => toast.error(msg)}
        onCropFailed={(msg) => toast.error(msg)}
      />
    </div>
  );
}
