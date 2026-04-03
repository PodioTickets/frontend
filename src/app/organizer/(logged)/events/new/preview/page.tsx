"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { FlagIcon } from "@/components/Icons/FlagIcon";
import Image from "next/image";
import toast from "react-hot-toast";
import {
  ImageUploadWithCrop,
  type ImageUploadWithCropRef,
} from "@/components/ImageUploadWithCrop";
import { EVENT_IMAGE_SPECS } from "@/lib/eventImageSpecs";
import { Loading } from "@/components/Loading";

export default function PreviaPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { formData, updateFormData } = useCreateEvent();
  const [cardPreview, setCardPreview] = useState<string>(
    formData.cardImageUrl || ""
  );
  const [uploadingCard, setUploadingCard] = useState(false);
  const [selectedCardFile, setSelectedCardFile] = useState<File | null>(null);
  const cardCropRef = useRef<ImageUploadWithCropRef>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Verificar autenticação
  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    if (!hasToken) {
      router.push("/organizer/login");
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
        router.push("/organizer/login");
      }
    }
  }, [authChecked, isAuthenticated, router]);

  useEffect(() => {
    if (formData.cardImageUrl) {
      setCardPreview(formData.cardImageUrl);
    }
  }, [formData.cardImageUrl]);

  const applyCroppedCard = useCallback((file: File) => {
    setSelectedCardFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setCardPreview(reader.result as string);
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
      cardCropRef.current?.openWithFile(file);
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

  const handleCardUpload = async () => {
    if (!selectedCardFile) {
      toast.error("Por favor, selecione uma imagem antes de continuar");
      return;
    }

    setUploadingCard(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", selectedCardFile);

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
      console.log("Card upload response status:", response.status, response.statusText);

      let result;
      try {
        const text = await response.text();
        console.log("Card upload raw response:", text);
        result = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        result = {};
      }

      // Log full result for debugging
      console.log("Card upload parsed result:", result);

      if (!response.ok) {
        const errorMessage = result.message || result.error?.message || "Erro ao fazer upload";
        console.error("Card upload error:", {
          status: response.status,
          statusText: response.statusText,
          result,
        });
        throw new Error(errorMessage);
      }

      // Handle card upload response - try multiple possible formats
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
        updateFormData({ cardImageUrl: fullUrl });

        if (formData.createdEventId) {
          try {
            // O campo será atualizado quando necessário, por enquanto apenas salva no contexto
            // await organizerService.updateEvent(formData.createdEventId, {
            //   cardImageUrl: fullUrl,
            // });
          } catch (updateError) {
            console.error("Error updating event with card image:", updateError);
          }
        }

        toast.success("Imagem do card enviada com sucesso!");
        setSelectedCardFile(null);
      } else {
        // If upload was successful (status 200/201) but no URL in response, 
        // check if file was actually uploaded by checking response structure
        console.warn("Card upload response missing URL, but status was OK:", result);

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
            updateFormData({ cardImageUrl: fullUrl });

            if (formData.createdEventId) {
              try {
                // O campo será atualizado quando necessário, por enquanto apenas salva no contexto
                // await organizerService.updateEvent(formData.createdEventId, {
                //   cardImageUrl: fullUrl,
                // });
              } catch (updateError) {
                console.error("Error updating event with card image:", updateError);
              }
            }

            toast.success("Imagem do card enviada com sucesso!");
            setSelectedCardFile(null);
            return;
          }
        }

        console.error("Card upload response missing URL:", result);
        throw new Error(result.message || "Resposta do servidor inválida - URL não encontrada");
      }
    } catch (error: any) {
      console.error("Error uploading card image:", error);
      toast.error(error.message || "Erro ao fazer upload da imagem do card");
    } finally {
      setUploadingCard(false);
    }
  };

  const handleBack = () => {
    router.push("/organizer/events/new/banner");
  };

  const handleNext = async () => {
    // Se já tem cardImageUrl salvo, apenas navega
    if (formData.cardImageUrl && !selectedCardFile) {
      router.push("/organizer/events/new/tickets");
      return;
    }

    // Se tem arquivo selecionado mas não foi feito upload, faz upload primeiro
    if (selectedCardFile) {
      await handleCardUpload();
      // Aguarda um pouco para garantir que o upload foi processado
      setTimeout(() => {
        router.push("/organizer/events/new/tickets");
      }, 500);
      return;
    }

    toast.error("Por favor, selecione uma imagem antes de continuar");
  };

  const eventLocation =
    formData.city && formData.state
      ? `${formData.city}, ${formData.state}`
      : "";

  return (
    <div className="bg-gray-2 flex-1 pb-[176px] px-5 md:px-[124px] pt-[52px]">
      <div className="max-w-[525px] mx-auto flex flex-col gap-9">
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
              Pré-visualização do evento
            </h1>
          </div>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3] text-center">
            Está imagem aparece na pré-visualização do seu evento
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex flex-col gap-[44px] items-center">
          {/* Upload Field */}
          {cardPreview ? (
            <div className="border-2 border-gray-6 border-dashed rounded-xl p-6 flex gap-6 items-center w-full">
              <div className="relative rounded-2xl shrink-0 size-[128px] overflow-hidden">
                <Image
                  src={cardPreview}
                  alt="Card preview"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex flex-1 flex-col gap-6">
                <div className="flex flex-col gap-4">
                  <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                    Imagem 300 × 300 px (quadrado)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => cardCropRef.current?.open()}
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
              className="border-2 border-dashed border-gray-6 rounded-xl p-6 flex flex-col gap-6 items-center justify-center min-h-[300px] cursor-pointer hover:border-primary-8 transition-colors w-full"
              onClick={() => cardCropRef.current?.open()}
            >
              <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3]">
                Arraste uma imagem para este campo ou clique aqui
              </p>
              <div className="flex flex-col gap-4 items-center text-center">
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1]">
                  Imagem 300 × 300 px (quadrado)
                </p>
              </div>
            </div>
          )}

          {/* Preview Section */}
          <div className="flex flex-col gap-5 items-center w-full">
            <h2 className="text-gray-12 text-xl font-bold font-manrope leading-[1.1]">
              Prévia
            </h2>
            <div className="bg-gray-2 flex flex-col items-start overflow-hidden rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full">
              {/* Card Image */}
              <div className="aspect-square relative rounded-t-lg shrink-0 w-full">
                {cardPreview ? (
                  <Image
                    src={cardPreview}
                    alt="Card preview"
                    fill
                    className="object-cover rounded-t-lg"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-4 rounded-t-lg" />
                )}
              </div>

              {/* Title Section */}
              <div className="border-b border-gray-6 flex flex-col gap-3 items-start justify-center pb-3 pt-4 px-3 w-full">
                <h3 className="font-bold text-base leading-[1.1] text-gray-12 font-manrope line-clamp-2">
                  {formData.name || "Nome do evento"}
                </h3>
                {eventLocation && (
                  <div className="flex gap-1 items-center">
                    <LocationIcon className="size-5 shrink-0 text-gray-12" />
                    <p className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                      {eventLocation}
                    </p>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="flex flex-col gap-4 items-start justify-center pt-3 px-0 w-full">
                <div className="flex flex-col gap-3 items-start px-3 w-full">
                  {/* Organizer */}
                  <div className="flex gap-1 items-center">
                    {user?.avatarUrl ? (
                      <Image
                        src={user.avatarUrl}
                        alt="Organizer avatar"
                        width={20}
                        height={20}
                        className="rounded-full shrink-0"
                      />
                    ) : (
                      <FlagIcon className="size-5 shrink-0 text-gray-12" />
                    )}
                    <p className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                      {user?.firstName || "Organizador"}
                    </p>
                  </div>

                  {/* Date */}
                  {formData.eventDate && (
                    <div className="flex gap-1 items-center">
                      <CalendarIcon className="size-5 shrink-0 text-gray-12" />
                      <p className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                        {formatDate(formData.eventDate)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Status Tag */}
                <div className="flex items-center pl-0 pr-3 py-0 w-full">
                  <div className="bg-primary-5 border-r border-t border-primary-7 flex gap-1 items-center justify-center p-3 rounded-tr-2xl">
                    <div className="border border-primary-12 bg-primary-5 rounded-full p-1">
                      <div className="bg-primary-12 rounded-full size-1" />
                    </div>
                    <p className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-primary-12">
                      Inscrições abertas
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <Button
            onClick={handleNext}
            disabled={(!cardPreview && !formData.cardImageUrl) || uploadingCard}
            className="h-[52px] px-11 text-xl font-bold font-manrope"
          >
            {uploadingCard ? "Enviando..." : "Confirmar imagem"}
          </Button>
        </div>
      </div>

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
