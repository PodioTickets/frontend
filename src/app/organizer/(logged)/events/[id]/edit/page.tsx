"use client";

import { useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { organizerService } from "@/services";
import { useEditEvent } from "@/contexts/EditEventContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { Info, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { GoogleMapsUrlHelpTooltip } from "@/components/Organizer/GoogleMapsUrlHelpTooltip";
import {
  getMinDateForRegistrationEndPicker,
  REGISTRATION_END_BEFORE_START_TOAST,
  wouldRegistrationEndBeforeStart,
} from "@/utils/registrationPeriod";

interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export default function EditInformationPage() {
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { formData, updateFormData, errors, setErrors } = useEditEvent();

  const [saving, setSaving] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [cepFetched, setCepFetched] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>(formData.regulationUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getCurrentDatePlaceholder = () => {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    return `${day}/${month}/${year}`;
  };

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
          setCepFetched(false);
        } else {
          updateFormData({
            street: data.logradouro || "",
            neighborhood: data.bairro || "",
            city: data.localidade || "",
            state: data.uf || "",
          });
          setCepFetched(true);
          toast.success("Endereço encontrado!");
        }
      } catch (error: any) {
        console.error("Error fetching CEP:", error);
        toast.error("Erro ao buscar CEP");
        setCepFetched(false);
      } finally {
        setLoadingCEP(false);
      }
    } else {
      setCepFetched(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name" && value.length > 25) {
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
      updateFormData({
        registrationStartDate: value,
        registrationEndDate: "",
        registrationEndTime: "",
      });
      clearRegistrationPeriodErrorIfNeeded(name);
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
      return;
    }

    if (name === "registrationEndDate") {
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

    setPdfFile(file);
    setPdfUrl("");
  };

  const uploadPDF = async (): Promise<string | null> => {
    if (!pdfFile) return null;

    if (pdfFile.type !== "application/pdf") {
      toast.error("Formato inválido. Use apenas PDF.");
      return null;
    }

    setUploadingPDF(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", pdfFile);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333";
      const token = localStorage.getItem("token");

      const response = await fetch(`${apiUrl}/api/v1/upload/pdf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formDataUpload,
      });

      let result;
      try {
        const text = await response.text();
        result = text ? JSON.parse(text) : {};
      } catch (parseError) {
        console.error("Error parsing response:", parseError);
        result = {};
      }

      if (!response.ok) {
        const errorMessage = result.message || result.error?.message || "Erro ao fazer upload";
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      const fileUrl = result.url || result.fileUrl || result.data?.url || result.data?.fileUrl;

      if (fileUrl) {
        const fullUrl = fileUrl.startsWith("http")
          ? fileUrl
          : `${apiUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
        setPdfUrl(fullUrl);
        toast.success("PDF enviado com sucesso!");
        return fullUrl;
      } else {
        throw new Error(result.message || "Resposta do servidor inválida - URL não encontrada");
      }
    } catch (error: any) {
      console.error("Error uploading PDF:", error);
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
      setPdfUrl("");
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

    setSaving(true);
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
          setSaving(false);
          return;
        }
      }

      const registrationStartDateTime =
        formData.registrationStartDate && formData.registrationStartTime
          ? `${formData.registrationStartDate}T${formData.registrationStartTime}:00`
          : undefined;

      const registrationEndDateTime =
        formData.registrationEndDate && formData.registrationEndTime
          ? `${formData.registrationEndDate}T${formData.registrationEndTime}:00`
          : undefined;

      const eventData: any = {
        name: formData.name,
        eventDate: formData.eventDate,
        country: "BR",
      };

      if (formData.street) {
        eventData.location = formData.street;
        eventData.city = formData.city;
        eventData.state = formData.state;
      }

      if (formData.cep) {
        eventData.zipCode = formData.cep;
      }

      if (formData.neighborhood) {
        eventData.neighborhood = formData.neighborhood;
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

      await organizerService.updateEvent(eventId, eventData, {
        clientPage: `events/${eventId}/general`,
      });
      toast.success("Informações salvas com sucesso!");

      // Navigate to banner step
      router.push(`/organizer/events/${eventId}/edit/banner`);
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
      setSaving(false);
    }
  };

  return (
    <div className="pb-20">
      <div className="w-full flex flex-col gap-11">
        {/* Title Section */}
        <div className="flex flex-col gap-4">
          <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
            Editar evento
          </h1>
          <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
            Comece pelo básico. Defina o nome, a data e o local. Você poderá ajustar essas informações depois.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-11">
          {/* Nome do Evento e Data */}
          <div className="flex gap-3 w-full items-start">
            <div className="flex flex-col gap-3 flex-1">
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">Nome do evento</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ex: Corrida Pena Nubas 2025"
                  className={`h-12 ${errors.name ? "border-red-10" : ""}`}
                  maxLength={200}
                />
              </div>
              {errors.name && <p className="text-red-10 text-sm">{errors.name}</p>}
            </div>
            <div className="flex flex-col gap-3 w-1/2">
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">Data do evento</label>
                <DatePicker
                  value={formData.eventDate}
                  onChange={(value) => handleDateChange("eventDate", value || "")}
                  placeholder={getCurrentDatePlaceholder()}
                  className="w-max"
                  hideIcon={false}
                />
              </div>
              <div className="flex items-center gap-1">
                <InfoIcon className="size-5 text-gray-11 shrink-0" />
                <p className="text-gray-11 text-base font-family-dm-sans flex-1">
                  Use a data oficial em que o evento começa.
                </p>
              </div>
              {errors.eventDate && <p className="text-red-10 text-sm">{errors.eventDate}</p>}
            </div>
          </div>

          {/* Inscrição Section */}
          <div className="flex flex-col gap-5">
            <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
              Inscrição
            </h2>

            <div className="flex gap-[72px] items-start">
              {/* Data de início das inscrições */}
              <div className="flex flex-col gap-3">
                <label className="text-gray-12 text-base font-family-dm-sans">
                  Data de início das inscrições
                </label>
                <div className="flex gap-3 items-end">
                  <DatePicker
                    value={formData.registrationStartDate}
                    onChange={(value) => handleDateChange("registrationStartDate", value || "")}
                    placeholder={getCurrentDatePlaceholder()}
                    className="w-max"
                  />
                  <TimePicker
                    value={formData.registrationStartTime}
                    onChange={(value) => handleTimeChange("registrationStartTime", value)}
                    className="w-max"
                  />
                </div>
              </div>

              {/* Data de encerramento das inscrições */}
              <div className="flex flex-col gap-3">
                <label className="text-gray-12 text-base font-family-dm-sans">
                  Data de encerramento das inscrições
                </label>
                <div className="flex gap-3 items-end">
                  <DatePicker
                    value={formData.registrationEndDate}
                    onChange={(value) => handleDateChange("registrationEndDate", value || "")}
                    placeholder={getCurrentDatePlaceholder()}
                    className="w-max"
                    minDate={getMinDateForRegistrationEndPicker(
                      formData.registrationStartDate,
                    )}
                  />
                  <TimePicker
                    value={formData.registrationEndTime}
                    onChange={(value) => handleTimeChange("registrationEndTime", value)}
                    className="w-max"
                  />
                </div>
              </div>
            </div>
            {errors.registrationPeriod && (
              <p className="text-red-10 text-sm">{errors.registrationPeriod}</p>
            )}
          </div>

          {/* Local do Evento Section */}
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-3">
              <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
                Local do evento
              </h2>
              <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
                Essas informações serão exibidas na página e ajudam o participante a chegar ao destino.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 items-start">
              {/* CEP */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">CEP</label>
                <Input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleCEPChange}
                  placeholder="00000-000"
                  maxLength={9}
                  className="h-12"
                />
                {loadingCEP && <p className="text-gray-11 text-sm">Buscando endereço...</p>}
              </div>

              {/* Rua */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">Rua</label>
                <Input
                  type="text"
                  name="street"
                  value={formData.street}
                  onChange={handleInputChange}
                  placeholder="Digite o nome da rua"
                  className="h-12"
                />
              </div>

              {/* Bairro */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">Bairro</label>
                <Input
                  type="text"
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleInputChange}
                  placeholder="Digite o nome do bairro"
                  className="h-12"
                />
              </div>

              {/* Cidade */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">Cidade</label>
                <Input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Digite o nome da cidade"
                  className="h-12"
                />
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-base font-family-dm-sans">Estado</label>
                <Input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleInputChange}
                  placeholder="Digite o nome do estado"
                  className="h-12"
                />
              </div>
            </div>

            {/* URL do Google Maps */}
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center gap-1.5 flex-wrap">
                <label
                  htmlFor="event-google-maps-url"
                  className="text-gray-12 text-base font-family-dm-sans"
                >
                  URL do google
                </label>
                <GoogleMapsUrlHelpTooltip />
              </div>
              <div className="relative">
                <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-12" />
                <Input
                  id="event-google-maps-url"
                  type="url"
                  name="googleMapsLink"
                  value={formData.googleMapsLink}
                  onChange={handleInputChange}
                  placeholder="Ex: www.google.com/maps/search/?api=1&query=Av.+Paulista+2084+S%C3%A3o+Paulo+SP"
                  className="h-12 pl-10"
                />
              </div>
            </div>
          </div>

          {/* PDF Upload Section */}
          <div className="flex flex-col items-start justify-center w-full">
            <div
              className="border-2 border-dashed border-gray-6 rounded-[12px] p-6 flex gap-4 items-center justify-center w-full cursor-pointer hover:border-gray-7 transition-colors"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex items-center justify-center size-16 shrink-0">
                <Plus className="size-16 text-primary-11" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col gap-4 items-start justify-center flex-1">
                <div className="flex flex-col gap-2 items-start justify-center w-full">
                  <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3] text-start w-full">
                    Envie o regulamento do evento em PDF para que os participantes possam visualizar na página do evento.
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
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={handlePDFSelect}
              className="hidden"
            />
            {pdfFile && (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-gray-11 text-sm">Arquivo selecionado: {pdfFile.name}</p>
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
              <div className="mt-2 flex items-center gap-2">
                <p className="text-gray-11 text-sm">PDF atual do regulamento</p>
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={saving}
              className="h-[52px] px-11 text-xl font-bold font-manrope"
            >
              {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
