"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { Plus } from "lucide-react";
import toast from "react-hot-toast";
import { organizerNewEventClientPage } from "@/lib/organizerAudit";
import { Loading } from "@/components/Loading";
import { GoogleMapsUrlHelpTooltip } from "@/components/Organizer/GoogleMapsUrlHelpTooltip";
import {
  getMinDateForRegistrationEndPicker,
  REGISTRATION_END_BEFORE_START_TOAST,
  wouldRegistrationEndBeforeStart,
} from "@/utils/registrationPeriod";
import { ArrowButton } from "@/components/ArrowButton";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import type { Event } from "@/interfaces/event";

const EVENT_NAME_MAX_LENGTH = 100;

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export default function InformacoesPage() {
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const { isAuthenticated, user } = useAuth();
  const { formData, updateFormData, errors, setErrors } = useCreateEvent();
  const [loading, setLoading] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Função para obter a data atual formatada como DD/MM/YYYY
  const getCurrentDatePlaceholder = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
  }, [orgNav]);

  useEffect(() => {
    if (authChecked && !isAuthenticated) {
      const hasToken = userService.isAuthenticated();
      if (!hasToken) {
        orgNav.push("/organizer/login");
      }
    }
  }, [authChecked, isAuthenticated, orgNav]);

  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  // Formatar CEP
  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 5) return numbers;
    return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
  };

  // Buscar CEP
  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const formattedValue = formatCEP(rawValue);
    updateFormData({ cep: formattedValue });

    if (rawValue.length === 8) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`/api/cep?cep=${rawValue}`);
        if (!response.ok) {
          throw new Error("Erro na requisição: " + response.status);
        }
        const data: ViaCEPResponse = await response.json();

        if (data.erro) {
          toast.error("CEP não encontrado");
        } else {
          updateFormData({
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          });
          toast.success("Endereço encontrado!");
        }
      } catch (error: any) {
        console.error("Error fetching CEP:", error);
        toast.error("Erro ao buscar CEP");
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name" && value.length > EVENT_NAME_MAX_LENGTH) {
      return;
    }
    updateFormData({ [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const clearRegistrationPeriodErrorIfNeeded = (name: string) => {
    if (
      name === "registrationStartDate" ||
      name === "registrationStartTime" ||
      name === "registrationEndDate" ||
      name === "registrationEndTime"
    ) {
      setErrors((prev) =>
        prev.registrationPeriod ? { ...prev, registrationPeriod: "" } : prev,
      );
    }
  };

  const handleTimeChange = (name: string, value: string) => {
    if (
      name === "registrationStartTime" ||
      name === "registrationEndTime"
    ) {
      const next = { ...formData, [name]: value };
      if (wouldRegistrationEndBeforeStart(next)) {
        toast.error(REGISTRATION_END_BEFORE_START_TOAST);
        return;
      }
    }
    updateFormData({ [name]: value });
    clearRegistrationPeriodErrorIfNeeded(name);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleDateChange = (name: string, value: string) => {
    if (name === "registrationStartDate") {
      const hasStart = Boolean(value?.trim());
      updateFormData({
        registrationStartDate: value,
        registrationEndDate: "",
        registrationEndTime: "",
        registrationStartTime: hasStart
          ? formData.registrationStartTime?.trim() || "00:00"
          : "",
      });
      clearRegistrationPeriodErrorIfNeeded(name);
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
      return;
    }

    if (name === "registrationEndDate") {
      const hasEnd = Boolean(value?.trim());
      const nextEndTime = hasEnd
        ? formData.registrationEndTime?.trim() || "00:00"
        : "";
      const next = {
        ...formData,
        registrationEndDate: value,
        registrationEndTime: nextEndTime,
      };
      if (wouldRegistrationEndBeforeStart(next)) {
        toast.error(REGISTRATION_END_BEFORE_START_TOAST);
        return;
      }
      updateFormData({
        registrationEndDate: value,
        registrationEndTime: nextEndTime,
      });
      clearRegistrationPeriodErrorIfNeeded(name);
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
      return;
    }
    updateFormData({ [name]: value });
    clearRegistrationPeriodErrorIfNeeded(name);
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handlePDFSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Formato inválido. Use apenas PDF.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo de 10MB.");
      return;
    }

    // Apenas armazena o arquivo para preview, sem fazer upload
    setPdfFile(file);
    setPdfUrl(""); // Limpa URL anterior se houver
  };

  const uploadPDF = async (): Promise<string | null> => {
    if (!pdfFile) return null;

    // Verify file type before upload
    if (pdfFile.type !== "application/pdf") {
      toast.error("Formato inválido. Use apenas PDF.");
      return null;
    }

    setUploadingPDF(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", pdfFile);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
      const apiClient = (userService as any).apiClient;
      const token = apiClient?.getAccessToken();

      // Log for debugging
      console.log("Uploading PDF:", {
        fileName: pdfFile.name,
        fileType: pdfFile.type,
        fileSize: pdfFile.size,
        endpoint: `${apiUrl}/api/v1/upload/pdf`,
      });

      // Use PDF upload endpoint
      // Note: Don't set Content-Type header - let browser set it with boundary for multipart/form-data
      const response = await fetch(`${apiUrl}/api/v1/upload/pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // Don't set Content-Type - browser will set it automatically with boundary
        },
        body: formDataUpload,
      });

      // Log response for debugging
      console.log(
        "PDF upload response status:",
        response.status,
        response.statusText,
      );

      let result;
      try {
        const text = await response.text();
        console.log("PDF upload raw response:", text);
        result = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        result = {};
      }

      // Log full result for debugging
      console.log("PDF upload parsed result:", result);

      if (!response.ok) {
        // Log error details for debugging
        console.error("PDF upload error:", {
          status: response.status,
          statusText: response.statusText,
          result,
          fileType: pdfFile.type,
        });

        // Check if error is about image files (backend validation issue)
        const errorMessage =
          result.message || result.error?.message || "Erro ao fazer upload";
        if (
          errorMessage.includes("image") ||
          errorMessage.includes("Only image")
        ) {
          toast.error(
            "Erro: O backend está rejeitando PDFs. Verifique a configuração do servidor.",
          );
        } else {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }
      const fileUrl =
        result.url ||
        result.fileUrl ||
        result.data?.url ||
        result.data?.fileUrl;

      if (fileUrl) {
        const fullUrl = fileUrl.startsWith("http")
          ? fileUrl
          : `${apiUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
        setPdfUrl(fullUrl);
        toast.success("PDF enviado com sucesso!");
        return fullUrl;
      } else {
        // If upload was successful (status 200/201) but no URL in response,
        // check if file was actually uploaded by checking response structure
        console.warn(
          "PDF upload response missing URL, but status was OK:",
          result,
        );

        // If response indicates success but no URL, maybe the backend returns differently
        if (response.status === 200 || response.status === 201) {
          // Try to extract URL from any field
          const possibleUrl = Object.values(result).find(
            (v: any) =>
              typeof v === "string" &&
              (v.startsWith("http") || v.startsWith("/")),
          ) as string | undefined;

          if (possibleUrl) {
            const fullUrl = possibleUrl.startsWith("http")
              ? possibleUrl
              : `${apiUrl}${possibleUrl.startsWith("/") ? "" : "/"}${possibleUrl}`;
            setPdfUrl(fullUrl);
            toast.success("PDF enviado com sucesso!");
            return fullUrl;
          }
        }

        console.error("PDF upload response missing URL:", result);
        throw new Error(
          result.message ||
          "Resposta do servidor inválida - URL não encontrada",
        );
      }
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
      // Don't show toast here if it was already shown above
      if (!error.message?.includes("image")) {
        toast.error(error.message || "Erro ao fazer upload do PDF");
      }
      throw error;
    } finally {
      setUploadingPDF(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type === "application/pdf") {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo de 10MB.");
        return;
      }
      setPdfFile(file);
      setPdfUrl(""); // Limpa URL anterior se houver
    } else {
      toast.error("Formato inválido. Use apenas PDF.");
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Nome do evento é obrigatório";
    }
    if (!formData.eventDate) {
      newErrors.eventDate = "Data do evento é obrigatória";
    }
    if (wouldRegistrationEndBeforeStart(formData)) {
      newErrors.registrationPeriod = REGISTRATION_END_BEFORE_START_TOAST;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error("Por favor, corrija os erros no formulário");
      return;
    }

    setLoading(true);
    try {
      // Upload do PDF se houver arquivo selecionado
      let regulationUrl: string | null = formData.regulationUrl || null;
      if (pdfFile && !pdfUrl) {
        try {
          const uploadedUrl = await uploadPDF();
          if (uploadedUrl) {
            regulationUrl = uploadedUrl;
            updateFormData({ regulationUrl: uploadedUrl });
          }
        } catch (error: any) {
          toast.error(error?.message || "Erro ao fazer upload do PDF");
          setLoading(false);
          return;
        }
      }

      const rs = formData.registrationStartDate?.trim();
      const re = formData.registrationEndDate?.trim();
      const rst = (formData.registrationStartTime?.trim() || "00:00").slice(0, 5);
      const ret = (formData.registrationEndTime?.trim() || "00:00").slice(0, 5);

      const registrationStartDateTime = rs
        ? `${rs}T${rst}:00`
        : undefined;

      const registrationEndDateTime = re
        ? `${re}T${ret}:00`
        : undefined;

      const eventData: any = {
        name: formData.name.trim(),
        eventDate: formData.eventDate,
        country: "BR",
        // API exige strings em create (CreateEventDto); não depender só de busca de CEP.
        location: (formData.street ?? "").trim(),
        city: (formData.city ?? "").trim(),
        state: (formData.state ?? "").trim(),
      };

      if ((formData.cep ?? "").trim()) {
        eventData.zipCode = formData.cep.trim();
      }
      if ((formData.neighborhood ?? "").trim()) {
        eventData.neighborhood = formData.neighborhood.trim();
      }

      if (formData.googleMapsLink) {
        eventData.googleMapsLink = formData.googleMapsLink;
      }

      if (registrationStartDateTime) {
        eventData.registrationStartDate = registrationStartDateTime;
      }

      if (registrationEndDateTime) {
        eventData.registrationEndDate = registrationEndDateTime;
      }

      if (regulationUrl && typeof regulationUrl === "string") {
        eventData.regulationUrl = regulationUrl;
      }

      let event: Event;
      if (formData.createdEventId) {
        event = await organizerService.updateEvent(
          formData.createdEventId,
          eventData,
          {
            clientPage: organizerNewEventClientPage("information"),
          },
        );
      } else {
        event = await organizerService.createEvent(eventData);
        flushSync(() => {
          updateFormData({ createdEventId: event.id });
        });
      }

      toast.success("Informações salvas com sucesso!");
      orgNav.push("/organizer/events/new/banner");
    } catch (error: any) {
      console.error("Error saving event:", error);
      let errorMessage = "Erro ao salvar evento";

      if (error.response?.data) {
        const errorData = error.response.data;
        if (errorData.message) {
          errorMessage = errorData.message;
        }
        if (errorData.errors && Array.isArray(errorData.errors)) {
          const validationErrors = errorData.errors
            .map((err: any) => err.message || err)
            .join(", ");
          if (validationErrors) {
            errorMessage = validationErrors;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const eventsListHref = organizerExternalHref(
    "/organizer/events",
    appSurface,
  );

  return (
    <>
      <div className="bg-gray-2 flex-1 pb-28 md:pb-44 px-4 md:px-[124px] mt-0 md:mt-10 min-w-0">
        <div className="md:hidden sticky top-0 z-20 bg-gray-2 border-b border-gray-6 -mx-4 px-4">
          <div className="flex items-center gap-1 h-[52px]">
            <Link
              href={eventsListHref}
              className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
              aria-label="Voltar"
            >
              <ArrowButton isOpen={false} />
            </Link>
            <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
              Criar evento
            </p>
          </div>
        </div>

        <div className="max-w-[1060px] mx-auto flex flex-col gap-9 md:gap-[44px] md:px-5 pt-4 md:pt-0">
          <div className="hidden md:flex flex-col gap-[16px]">
            <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
              Criar evento
            </h1>
            <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
              Comece pelo básico. Defina nome, data, local e as imagens
              principais. Você poderá ajustar os detalhes depois.
            </p>
          </div>

          <p className="md:hidden text-sm text-gray-11 font-family-dm-sans leading-[1.4]">
            Comece pelo básico. Defina nome, data, local e as imagens
            principais. Você poderá ajustar os detalhes depois.
          </p>

          <form
            id="create-event-information-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-9 md:gap-[44px]"
          >
            <div className="flex flex-col md:flex-row gap-9 md:gap-3 w-full items-stretch md:items-start">
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <label
                      htmlFor="edit-event-name"
                      className="text-gray-12 text-base font-family-dm-sans"
                    >
                      Nome do evento
                    </label>
                  </div>
                  <Input
                    id="edit-event-name"
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Corrida Pena Nubas 2025"
                    className={`h-12 ${errors.name ? "border-red-10" : ""}`}
                    maxLength={EVENT_NAME_MAX_LENGTH}
                  />
                </div>
                {errors.name && (
                  <p className="text-red-10 text-sm">{errors.name}</p>
                )}
              </div>
              <div className="flex flex-col gap-3 w-full md:w-1/2 shrink-0">
                <div className="flex flex-col gap-2">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Data do evento
                  </label>
                  <DatePicker
                    value={formData.eventDate}
                    onChange={(value) =>
                      handleDateChange("eventDate", value || "")
                    }
                    placeholder={getCurrentDatePlaceholder()}
                    className="w-full md:w-max"
                    hideIcon={false}
                  />
                </div>
                <div className="flex items-start gap-2">
                  <InfoIcon className="size-5 text-gray-11 shrink-0 mt-0.5" />
                  <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.4]">
                    Use a data oficial em que o evento começa. Modalidades e
                    horários você configura nas próximas etapas.
                  </p>
                </div>
                {errors.eventDate && (
                  <p className="text-red-10 text-sm">{errors.eventDate}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-5 md:gap-[20px]">
              <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                Inscrição
              </h2>

              <div className="flex flex-col md:flex-row gap-9 md:gap-[72px] items-stretch md:items-start">
                <div className="flex flex-col gap-3 md:gap-[12px] min-w-0">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Data de início das inscrições
                  </label>
                  <div className="flex gap-3 items-end w-full">
                    <div className="min-w-0 flex-1 md:flex-none">
                      <DatePicker
                        value={formData.registrationStartDate}
                        onChange={(value) =>
                          handleDateChange(
                            "registrationStartDate",
                            value || "",
                          )
                        }
                        placeholder={getCurrentDatePlaceholder()}
                        className="w-full md:w-max"
                      />
                    </div>
                    <div className="w-[112px] shrink-0 md:w-auto">
                      <TimePicker
                        value={
                          formData.registrationStartDate?.trim()
                            ? formData.registrationStartTime?.trim() || "00:00"
                            : formData.registrationStartTime || ""
                        }
                        onChange={(value) =>
                          handleTimeChange("registrationStartTime", value)
                        }
                        className="w-full md:w-max"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 md:gap-[12px] min-w-0">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Data de encerramento das inscrições
                  </label>
                  <div className="flex gap-3 items-end w-full">
                    <div className="min-w-0 flex-1 md:flex-none">
                      <DatePicker
                        value={formData.registrationEndDate}
                        onChange={(value) =>
                          handleDateChange(
                            "registrationEndDate",
                            value || "",
                          )
                        }
                        placeholder={getCurrentDatePlaceholder()}
                        className="w-full md:w-max"
                        minDate={getMinDateForRegistrationEndPicker(
                          formData.registrationStartDate,
                        )}
                      />
                    </div>
                    <div className="w-[112px] shrink-0 md:w-auto">
                      <TimePicker
                        value={
                          formData.registrationEndDate?.trim()
                            ? formData.registrationEndTime?.trim() || "00:00"
                            : formData.registrationEndTime || ""
                        }
                        onChange={(value) =>
                          handleTimeChange("registrationEndTime", value)
                        }
                        className="w-full md:w-max"
                      />
                    </div>
                  </div>
                </div>
              </div>
              {errors.registrationPeriod && (
                <p className="text-red-10 text-sm">
                  {errors.registrationPeriod}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 md:gap-[12px]">
              <div className="flex flex-col gap-2 md:gap-[12px]">
                <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                  Local do evento
                </h2>
                <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.4] md:leading-[1.3]">
                  Informe onde o evento será realizado. Essas informações
                  aparecem na página e ajudam o participante a chegar ao
                  destino.
                </p>
              </div>

              <div className="flex flex-col md:flex-row md:flex-wrap gap-5 items-stretch md:items-start">
                <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    CEP
                  </label>
                  <Input
                    type="text"
                    name="cep"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    placeholder="00000-000"
                    maxLength={9}
                    className="h-12"
                  />
                  {loadingCEP && (
                    <p className="text-gray-11 text-sm">Buscando endereço...</p>
                  )}
                </div>

                <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Rua
                  </label>
                  <Input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    placeholder="Digite o nome da rua"
                    className="h-12"
                  />
                </div>

                <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Bairro
                  </label>
                  <Input
                    type="text"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleInputChange}
                    placeholder="Digite o nome do bairro"
                    className="h-12"
                  />
                </div>

                <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Cidade
                  </label>
                  <Input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Digite o nome da cidade"
                    className="h-12"
                  />
                </div>

                <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                  <label className="text-gray-12 text-base font-family-dm-sans">
                    Estado
                  </label>
                  <Input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    placeholder="Digite o nome do estado"
                    className="h-12"
                  />
                </div>

                <div className="flex flex-col gap-2 w-full">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <label
                      htmlFor="new-event-google-maps-url"
                      className="text-gray-12 text-base font-family-dm-sans"
                    >
                      URL do google
                    </label>
                    <GoogleMapsUrlHelpTooltip />
                  </div>
                  <div className="relative">
                    <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-12 pointer-events-none" />
                    <Input
                      id="new-event-google-maps-url"
                      type="url"
                      name="googleMapsLink"
                      value={formData.googleMapsLink}
                      onChange={handleInputChange}
                      placeholder="www.google.com/maps/search/?api=1&query=Av.+Paulista+2084+S%C3%A3o+Paulo+SP"
                      className="h-12 pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-stretch justify-center w-full">
              <div
                className="border-2 border-dashed border-gray-6 rounded-xl md:rounded-[12px] p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-center w-full cursor-pointer hover:border-gray-6 transition-colors min-h-[140px] md:min-h-0"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="md:hidden flex flex-col items-center justify-center gap-2 text-center px-2">
                  <Plus
                    className="size-10 text-primary-11"
                    strokeWidth={1.5}
                  />
                  <p className="text-primary-11 text-sm font-bold font-family-dm-sans leading-[1.35]">
                    Clique e envie o regulamento do evento em PDF.
                  </p>
                  <p className="text-gray-11 text-xs font-family-dm-sans">
                    Opcional · máx. 10MB
                  </p>
                </div>
                <div className="hidden md:flex gap-4 items-center justify-center w-full">
                  <div className="flex items-center justify-center size-16 shrink-0">
                    <Plus
                      className="size-16 text-primary-11"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div className="flex flex-col gap-4 items-start justify-center flex-1">
                    <div className="flex flex-col gap-2 items-start justify-center w-full">
                      <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3] text-start w-full">
                        Envie o regulamento do evento em PDF para que os
                        participantes possam visualizar na página do evento.
                      </p>
                      <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] w-full">
                        Formato recomendado: PDF
                      </p>
                    </div>
                    <div className="flex gap-1 items-center justify-center">
                      <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">
                        Arraste um arquivo PDF para este campo ou clique aqui
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handlePDFSelect}
                className="hidden"
              />
              {pdfFile && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-gray-11 text-sm">
                    Arquivo selecionado: {pdfFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null);
                      setPdfUrl("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    className="text-red-10 text-sm hover:text-red-11"
                  >
                    Remover
                  </button>
                </div>
              )}
              {(pdfUrl || formData.regulationUrl) && !pdfFile && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <p className="text-gray-11 text-sm">
                    PDF atual do regulamento
                  </p>
                  <a
                    href={pdfUrl || formData.regulationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-11 text-sm hover:underline"
                  >
                    Ver PDF
                  </a>
                </div>
              )}
            </div>

            <div className="hidden md:flex justify-end pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-[52px] px-11 text-xl font-bold font-manrope"
              >
                {loading ? "Salvando..." : "Próxima etapa"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 md:hidden border-t border-gray-6 bg-gray-2 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <Button
          form="create-event-information-form"
          type="submit"
          disabled={loading}
          className="h-12 w-full text-base font-bold font-manrope"
        >
          {loading ? "Salvando..." : "Próxima etapa"}
        </Button>
      </div>
    </>
  );
}

