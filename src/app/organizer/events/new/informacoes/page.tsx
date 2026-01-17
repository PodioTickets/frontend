"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import { organizerService } from "@/services";
import { useCreateEvent } from "@/contexts/CreateEventContext";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { DatePicker } from "@/components/DatePicker";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import toast from "react-hot-toast";

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
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const { formData, updateFormData, errors, setErrors } = useCreateEvent();
  const [loading, setLoading] = useState(false);
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [cepFetched, setCepFetched] = useState(false);

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
      router.push("/");
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
        router.push("/");
      }
    }
  }, [authChecked, isAuthenticated, router]);


  if (!authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-11">Carregando...</div>
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

  const handleDateChange = (name: string, value: string) => {
    updateFormData({ [name]: value });
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };


  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) {
      newErrors.name = "Nome do evento é obrigatório";
    }
    if (!formData.eventDate) {
      newErrors.eventDate = "Data do evento é obrigatória";
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

      if (cepFetched && formData.street) {
        eventData.location = formData.street;
        eventData.city = formData.city;
        eventData.state = formData.state;
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


      let event;
      if (formData.createdEventId) {
        event = await organizerService.updateEvent(formData.createdEventId, eventData);
      } else {
        event = await organizerService.createEvent(eventData);
        updateFormData({ createdEventId: event.id });
      }

      toast.success("Informações salvas com sucesso!");
      router.push("/organizer/events/new/banner");
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

  const eventLocation =
    formData.street && formData.city && formData.state
      ? `${formData.street}, ${formData.city}, ${formData.state}`
      : "";

  return (
    <div className="bg-gray-2 flex-1 pb-44 px-5 md:px-[124px] mt-10">
      <div className="max-w-[1060px] mx-auto flex flex-col gap-9">
        {/* Title Section */}
        <div className="flex flex-col gap-4">
          <h1 className="text-gray-12 text-[28px] font-bold font-manrope leading-[1.1]">
            Criar evento
          </h1>
          <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
            Comece pelo básico. Defina nome, data, local e as imagens
            principais. Você poderá ajustar os detalhes depois.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-11">
          {/* Nome do Evento */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-2">
              <label className="text-gray-12 text-base font-dm-sans">
                Nome do evento
              </label>
              <Input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Ex: Corrida Pena Nubas 2025"
                className={`h-12 ${errors.name ? "border-red-10" : ""}`}
                maxLength={25}
              />
            </div>
            <div className="flex items-center gap-1">
              <InfoIcon className="size-5 text-gray-11" />
              <p className="text-gray-11 text-base font-dm-sans">
                Limite de 25 Caracteres
              </p>
            </div>
            {errors.name && (
              <p className="text-red-10 text-sm">{errors.name}</p>
            )}
          </div>

          {/* Data do Evento */}
          <div className="flex flex-col gap-5">
            <div className="flex flex-col w-[300px] gap-2">
              <label className="text-gray-12 text-base font-dm-sans">
                Data do evento
              </label>
              <DatePicker
                value={formData.eventDate}
                onChange={(value) => handleDateChange("eventDate", value || "")}
                placeholder={getCurrentDatePlaceholder()}
                className="w-[300px]"
                hideIcon={true}
              />
            </div>
            <div className="flex items-center gap-1">
              <InfoIcon className="size-5 text-gray-11" />
              <p className="text-gray-11 text-base font-dm-sans flex-1">
                Use a data e o horário oficiais de início do evento. As largadas
                por modalidade podem ser detalhadas depois
              </p>
            </div>
            {errors.eventDate && (
              <p className="text-red-10 text-sm">{errors.eventDate}</p>
            )}
          </div>

          {/* Inscrição Section */}
          <div className="flex flex-col gap-5">
            <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
              Inscrição
            </h2>

            <div className="flex gap-[52px] items-start">
              {/* Data de início das inscrições */}
              <div className="flex gap-3 items-end">
                <div className="flex flex-col gap-2 w-[300px]">
                  <label className="text-gray-12 text-base font-dm-sans">
                    Data de início das inscrições
                  </label>
                  <DatePicker
                    value={formData.registrationStartDate}
                    onChange={(value) =>
                      handleDateChange("registrationStartDate", value || "")
                    }
                    placeholder={getCurrentDatePlaceholder()}
                    className="w-[300px]"
                    hideIcon={true}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    type="time"
                    name="registrationStartTime"
                    value={formData.registrationStartTime}
                    onChange={handleInputChange}
                    className="h-12 w-[66px] text-center [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>

              {/* Data de encerramento das inscrições */}
              <div className="flex gap-3 items-end">
                <div className="flex flex-col gap-2 w-[300px]">
                  <label className="text-gray-12 text-base font-dm-sans">
                    Data de encerramento das inscrições
                  </label>
                  <DatePicker
                    value={formData.registrationEndDate}
                    onChange={(value) =>
                      handleDateChange("registrationEndDate", value || "")
                    }
                    placeholder={getCurrentDatePlaceholder()}
                    className="w-full"
                    hideIcon={true}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    type="time"
                    name="registrationEndTime"
                    value={formData.registrationEndTime}
                    onChange={handleInputChange}
                    className="h-12 w-[66px] text-center [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
                    style={{ textAlign: "center" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Local do Evento Section */}
          <div className="flex flex-col gap-3">
            <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">
              Local do evento
            </h2>
            <p className="text-gray-11 text-base font-dm-sans leading-[1.3]">
              Informe onde o evento será realizado. Essas informações aparecem
              na página do evento e ajudam o participante a chegar até o local.
            </p>

            <div className="flex flex-wrap gap-5 items-start">
              {/* CEP */}
              <div className="flex flex-col gap-2 min-w-[365px] flex-1">
                <label className="text-gray-12 text-base font-dm-sans">
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

              {/* Campos de endereço aparecem apenas após buscar CEP */}
              {cepFetched && (
                <>
                  <div className="flex flex-col gap-2 min-w-[365px] flex-1">
                    <label className="text-gray-12 text-base font-dm-sans">
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

                  <div className="flex flex-col gap-2 min-w-[365px] flex-1">
                    <label className="text-gray-12 text-base font-dm-sans">
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

                  <div className="flex flex-col gap-2 min-w-[365px] flex-1">
                    <label className="text-gray-12 text-base font-dm-sans">
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

                  <div className="flex flex-col gap-2 min-w-[365px] flex-1">
                    <label className="text-gray-12 text-base font-dm-sans">
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
                </>
              )}

              {/* URL do Google Maps */}
              <div className="flex flex-col gap-2 w-full">
                <label className="text-gray-12 text-base font-dm-sans">
                  URL do google
                </label>
                <div className="relative">
                  <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-12" />
                  <Input
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
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
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
  );
}
