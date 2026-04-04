"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { MessageIcon } from "@/components/Icons/MessageIcon";
import Image from "next/image";
import toast from "react-hot-toast";
import { ShareIcon } from "@/components/Icons/ShareIcon";
import { ArrowRightIcon } from "lucide-react";
import { organizerNewEventClientPage } from "@/lib/organizerAudit";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { Loading } from "@/components/Loading";

export default function BannerPage() {
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const { isAuthenticated, user } = useAuth();
  const { formData, updateFormData } = useCreateEvent();
  const [bannerPreview, setBannerPreview] = useState<string>("");
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [selectedBannerFile, setSelectedBannerFile] = useState<File | null>(null);
  const bannerCropRef = useRef<ImageUploadWithCropRef>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => {
      setAuthChecked(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      const hasToken = userService.isAuthenticated();
      if (!hasToken) {
        orgNav.push("/organizer/login");
      }
    }
  }, [authChecked, isAuthenticated, router]);

  // Verificar se tem evento criado
  useEffect(() => {
    if (authChecked && !formData.createdEventId) {
      orgNav.push("/organizer/events/new/information");
    }
  }, [authChecked, formData.createdEventId, router]);

  // Carregar preview do banner se já existir
  useEffect(() => {
    if (formData.bannerUrl) {
      setBannerPreview(formData.bannerUrl);
    }
  }, [formData.bannerUrl]);

  const applyCroppedBanner = useCallback((file: File) => {
    setSelectedBannerFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setBannerPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

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

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleBannerUpload = async () => {
    if (!selectedBannerFile) {
      toast.error("Por favor, selecione uma imagem antes de continuar");
      return;
    }

    setUploadingBanner(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", selectedBannerFile);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
      const apiClient = (userService as any).apiClient;
      const token = apiClient?.getAccessToken();

      const response = await fetch(`${apiUrl}/api/v1/upload/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - browser will set it automatically with boundary
        },
        body: formDataUpload,
      });

      // Log response for debugging
      console.log("Banner upload response status:", response.status, response.statusText);

      let result;
      try {
        const text = await response.text();
        console.log("Banner upload raw response:", text);
        result = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        result = {};
      }

      // Log full result for debugging
      console.log("Banner upload parsed result:", result);

      if (!response.ok) {
        const errorMessage = result.message || result.error?.message || "Erro ao fazer upload";
        console.error("Banner upload error:", {
          status: response.status,
          statusText: response.statusText,
          result,
        });
        throw new Error(errorMessage);
      }

      // Handle banner upload response - try multiple possible formats
      // Backend might return:
      // - { success: true, imageUrl: "..." }
      // - { url: "..." }
      // - { imageUrl: "..." }
      // - { data: { url: "..." } }
      const imageUrl = result.imageUrl || result.url || result.data?.url || result.data?.imageUrl;

      if (imageUrl) {
        const fullUrl = imageUrl.startsWith("http")
          ? imageUrl
          : `${apiUrl}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        updateFormData({ bannerUrl: fullUrl });

        if (formData.createdEventId) {
          try {
            await organizerService.updateEvent(
              formData.createdEventId,
              { bannerUrl: fullUrl },
              { clientPage: organizerNewEventClientPage("banner") }
            );
          } catch (updateError) {
            console.error("Error updating event with banner:", updateError);
          }
        }

        toast.success("Banner enviado com sucesso!");
        setSelectedBannerFile(null);
      } else {
        // If upload was successful (status 200/201) but no URL in response, 
        // check if file was actually uploaded by checking response structure
        console.warn("Banner upload response missing URL, but status was OK:", result);

        // If response indicates success but no URL, maybe the backend returns differently
        if (response.status === 200 || response.status === 201) {
          // Try to extract URL from any field
          const possibleUrl = Object.values(result).find((v: any) =>
            typeof v === 'string' && (v.startsWith('http') || v.startsWith('/'))
          ) as string | undefined;

          if (possibleUrl) {
            const fullUrl = possibleUrl.startsWith("http")
              ? possibleUrl
              : `${apiUrl}${possibleUrl.startsWith('/') ? '' : '/'}${possibleUrl}`;
            updateFormData({ bannerUrl: fullUrl });

            if (formData.createdEventId) {
              try {
                await organizerService.updateEvent(
                  formData.createdEventId,
                  { bannerUrl: fullUrl },
                  { clientPage: organizerNewEventClientPage("banner") }
                );
              } catch (updateError) {
                console.error("Error updating event with banner:", updateError);
              }
            }

            toast.success("Banner enviado com sucesso!");
            setSelectedBannerFile(null);
            return;
          }
        }

        console.error("Banner upload response missing URL:", result);
        throw new Error(result.message || "Resposta do servidor inválida - URL não encontrada");
      }
    } catch (error: any) {
      console.error("Error uploading banner:", error);
      toast.error(error.message || "Erro ao fazer upload do banner");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleBack = () => {
    orgNav.push("/organizer/events/new/information");
  };

  const handleNext = async () => {
    // Se já tem bannerUrl salvo, apenas navega
    if (formData.bannerUrl && !selectedBannerFile) {
      orgNav.push("/organizer/events/new/preview");
      return;
    }

    // Se tem arquivo selecionado mas não foi feito upload, faz upload primeiro
    if (selectedBannerFile) {
      await handleBannerUpload();
      // Aguarda um pouco para garantir que o upload foi processado
      setTimeout(() => {
        orgNav.push("/organizer/events/new/preview");
      }, 500);
      return;
    }

    toast.error("Por favor, selecione uma imagem antes de continuar");
  };

  const eventLocation =
    formData.street && formData.city && formData.state
      ? `${formData.street}, ${formData.city}, ${formData.state}`
      : "";

  return (
    <div className="bg-gray-2 flex-1 pb-44 px-5 md:px-[124px] mt-10">
      <div className="max-w-[1060px] mx-auto flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-col gap-4 items-center">
          <div className="flex gap-3 items-center">
            <button
              onClick={handleBack}
              className="border border-gray-6 rounded-[52px] cursor-pointer size-9 flex items-center justify-center hover:bg-gray-3 transition-colors rotate-180"
            >
              <ArrowButton isOpen={false} />
            </button>
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
              Banner principal do evento
            </h1>
          </div>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] text-center">
            Essa é a imagem grande que aparece no topo da página do seu evento
          </p>
        </div>

        {/* Upload Area and Preview */}
        <div className="flex flex-col gap-11 items-center">
          {/* Upload Field */}
          {bannerPreview ? (
            <div className="border-2 border-gray-6 border-dashed rounded-xl p-6 flex gap-6 items-center w-[710px]">
              <div className="relative rounded-2xl shrink-0 size-[128px] overflow-hidden">
                <Image
                  src={bannerPreview}
                  alt="Banner preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                    Tamanho recomendado: 880 × 400 px
                  </p>
                  <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                    Use uma arte com boa resolução e pouco texto, para ficar
                    legível em diferentes telas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => bannerCropRef.current?.open()}
                  className="border-[1.5px] border-gray-6 rounded-lg h-11 flex gap-2 items-center justify-center px-6 hover:bg-gray-3 transition-colors"
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path
                      d="M10 3.33325V13.3333M10 13.3333L6.66667 9.99992M10 13.3333L13.3333 9.99992M3.33333 13.3333V15.8333C3.33333 16.7538 4.07952 17.5 5 17.5H15C15.9205 17.5 16.6667 16.7538 16.6667 15.8333V13.3333"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">
                    Trocar imagem
                  </p>
                </button>
              </div>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[300px] cursor-pointer hover:border-primary-8 transition-colors w-[710px]"
              onClick={() => bannerCropRef.current?.open()}
            >
              <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3]">
                Arraste uma imagem para este campo ou clique aqui
              </p>
              <div className="flex flex-col gap-4 items-center text-center">
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                  Tamanho recomendado: 880 × 400 px
                </p>
                <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                  Use uma arte com boa resolução e pouco texto, para ficar
                  legível em diferentes telas.
                </p>
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="flex flex-col gap-5 items-center w-full">
            <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
              Prévia
            </h2>
            <div className="flex gap-8 items-start w-full">
              {/* Left: Banner Preview and Content Placeholders */}
              <div className="flex flex-col gap-[52px] flex-1">
                {/* Banner Preview */}
                {bannerPreview ? (
                  <div className="relative w-[625px] max-w-full aspect-880/400 rounded-2xl overflow-hidden shadow-[0px_8px_16px_0px_rgba(17,17,17,0.5)]">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                      sizes="625px"
                    />
                  </div>
                ) : (
                  <div className="w-[625px] max-w-full aspect-880/400 bg-gray-4 rounded-2xl" />
                )}

                {/* Content Preview Placeholder */}
                <div className="flex flex-col gap-4">
                  <div className="bg-gray-8 h-4 w-full rounded" />
                  <div className="bg-gray-4 h-2 w-full rounded" />
                  <div className="bg-gray-4 h-2 w-[501px] rounded" />
                  <div className="bg-gray-4 h-2 w-[377px] rounded" />
                  <div className="bg-gray-4 h-2 w-[253px] rounded" />
                  <div className="bg-gray-4 h-2 w-[129px] rounded" />
                  <div className="bg-gray-4 h-2 w-[65px] rounded" />
                </div>
              </div>

              {/* Right: Event Card Preview */}
              <div className="sticky top-0 w-[402px] flex flex-col gap-6 shrink-0">
                <div className="bg-gray-2 flex flex-col gap-8 p-6 rounded-xl shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]">
                  <h3 className="text-gray-12 text-2xl font-extrabold font-manrope leading-[1.1]">
                    {formData.name || "Nome do evento"}
                  </h3>

                  <div className="flex flex-col gap-4">
                    {/* Location */}
                    {eventLocation && (
                      <div className="flex gap-2 items-center">
                        <LocationIcon className="size-6 text-gray-12 shrink-0" />
                        <p className="text-gray-12 font-medium font-family-dm-sans leading-[1.3] flex-1">
                          {eventLocation}
                        </p>
                      </div>
                    )}

                    {/* Date */}
                    {formData.eventDate && (
                      <div className="flex gap-2 items-center">
                        <CalendarIcon className="size-6 text-gray-12 shrink-0" />
                        <p className="text-gray-12 font-medium font-family-dm-sans leading-[1.3]">
                          {formatDate(formData.eventDate)}
                        </p>
                      </div>
                    )}

                    {/* Organizer Section */}
                    <div className="bg-gray-3 border border-gray-6 rounded-xl p-3 flex flex-col gap-4">
                      <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                        Organizador
                      </p>
                      <div className="flex gap-2 items-center">
                        {user?.avatarUrl ? (
                          <Image
                            src={user?.avatarUrl}
                            alt="Organizer avatar"
                            width={40}
                            height={40}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="size-12 rounded-full bg-gray-6 shrink-0" />
                        )}
                        <div className="flex flex-col">
                          <p className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.3]">
                            {user?.firstName}
                          </p>
                          <p className="text-gray-11 text-sm font-family-dm-sans leading-[1.3]">
                            CNPJ: {user?.documentNumber}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-gray-12 border-gray-6"
                      >
                        <MessageIcon className="min-w-5 min-h-5" />
                        Falar com organizador
                      </Button>
                    </div>
                  </div>

                  <Button className="w-full" disabled>Inscrever-se</Button>
                </div>
                <div className="flex flex-col items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    className="text-gray-11 border-gray-6"
                  >
                    <ShareIcon className="size-5" />
                    Compartilhar
                  </Button>

                  <h1 className="underline font-semibold text-gray-11 text-sm cursor-pointer">
                    Denunciar evento
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleNext}
            disabled={(!bannerPreview && !formData.bannerUrl) || uploadingBanner}
            className="w-[270px] font-bold text-lg"
          >
            {uploadingBanner ? "Enviando..." : "Confirmar imagem"}
          </Button>
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
    </div>
  );
}
