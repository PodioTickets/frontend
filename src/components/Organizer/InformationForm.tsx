"use client";

import { useState, useRef, useEffect } from "react";
import { surfaceHeader } from "@/lib/authSurface";
import { Input } from "@/components/Input";
import { DatePicker } from "@/components/DatePicker";
import { TimePicker } from "@/components/TimePicker";
import { InfoIcon } from "@/components/Icons/InfoIcon";
import { LocationIcon } from "@/components/Icons/LocationIcon";
import { Plus, Globe } from "lucide-react";
import { InstagramIcon } from "@/components/Icons/InstagramIcon";
import { FacebookIcon } from "@/components/Icons/FacebookIcon";
import { YoutubeIcon } from "@/components/Icons/YoutubeIcon";
import { TiktokIcon } from "@/components/Icons/TiktokIcon";
import { EmailIcon } from "@/components/Icons/EmailIcon";
import { GoogleMapsUrlHelpTooltip } from "@/components/Organizer/GoogleMapsUrlHelpTooltip";
import { ContactEmailHelpTooltip } from "@/components/Organizer/ContactEmailHelpTooltip";
import { SearchableSelect } from "@/components/SearchableSelect";
import { BRAZIL_STATES } from "@/utils/locationFacets";
import { useCitiesByState } from "@/hooks/useCitiesByState";
import { userService } from "@/services";
import {
  EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST,
  isEventDateBeforeRegistrationEnd,
  isRegistrationStartNotBeforeEvent,
  REGISTRATION_END_BEFORE_START_TOAST,
  REGISTRATION_START_NOT_BEFORE_EVENT_TOAST,
  wouldRegistrationEndBeforeStart,
} from "@/utils/registrationPeriod";
import toast from "react-hot-toast";

// ─── constants ───────────────────────────────────────────────────────────────

const EVENT_NAME_MAX_LENGTH = 100;

const SOCIAL_NETWORKS = [
  { key: "instagram", prefix: "instagram.com/", base: "https://instagram.com/", placeholder: "seuperfil", Icon: InstagramIcon },
  { key: "facebook", prefix: "facebook.com/", base: "https://facebook.com/", placeholder: "suapágina", Icon: FacebookIcon },
  { key: "youtube", prefix: "youtube.com/@", base: "https://youtube.com/@", placeholder: "seucanal", Icon: YoutubeIcon },
  { key: "tiktok", prefix: "tiktok.com/@", base: "https://tiktok.com/@", placeholder: "seuperfil", Icon: TiktokIcon },
  { key: "website", prefix: "https://", base: "https://", placeholder: "suapágina", Icon: Globe },
];

// ─── helpers ─────────────────────────────────────────────────────────────────

// Extrai o "handle" (parte editavel depois do prefixo) de um valor salvo,
// tolerando protocolo/www e valores legados (URL completa). A reconstrucao
// para salvar e sempre `base + handle` — mantemos URL completa no estado.
function socialHandle(value: string | undefined, base: string, prefix: string): string {
  if (!value) return "";
  const v = value.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "");
  const p = prefix.replace(/^https?:\/\//i, ""); // ex.: "youtube.com/@", "instagram.com/", "" (website)
  if (!p) return v; // website: handle é o domínio/caminho digitado
  // dominio do prefixo sem "/" e "@" finais (ex.: "youtube.com"). Removemos esse
  // dominio + "/" e "@" opcionais — tolera legados salvos sem "@".
  const domain = p.replace(/[@/]+$/g, "");
  const re = new RegExp("^" + domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\/?@?", "i");
  return re.test(v) ? v.replace(re, "") : v;
}

function formatCEP(value: string): string {
  const n = value.replace(/\D/g, "");
  return n.length <= 5 ? n : `${n.slice(0, 5)}-${n.slice(5, 8)}`;
}

// Placeholder dos campos de data: dia/mês zerados + ano ATUAL ("00/00/2026").
// É o estado "sem data" exibido quando o campo está vazio/resetado (ex.: o
// encerramento das inscrições ao mudar o início pra depois do fim).
function getCurrentDatePlaceholder(): string {
  return `00/00/${new Date().getFullYear()}`;
}

interface ViaCEPResponse {
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

// ─── types ───────────────────────────────────────────────────────────────────

export interface InformationFormValues {
  name: string;
  eventDate?: string;
  registrationStartDate?: string;
  registrationStartTime?: string;
  registrationEndDate?: string;
  registrationEndTime?: string;
  cep?: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  googleMapsLink?: string;
  contactEmail?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  website?: string;
  regulationUrl?: string;
}

interface InformationFormProps {
  formId: string;
  values: InformationFormValues;
  onChange: (updates: Partial<InformationFormValues>) => void;
  errors: Record<string, string>;
  onErrorsChange: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  /**
   * Called after internal PDF upload (if any).
   * Receives the resolved regulation URL (uploaded or already set) or null.
   */
  onSubmit: (e: React.FormEvent, resolvedPdfUrl: string | null) => Promise<void>;
  loading?: boolean;
  /** When true, shows "PDF guardado no rascunho" hint (create flow only). */
  hasLocalRegulationDraft?: boolean;
  /** Called when user removes the PDF file in create flow. */
  onClearLocalRegulationDraft?: () => void;
  /** Called whenever the pending PDF file presence changes (for dirty tracking). */
  onHasPendingPdfChange?: (has: boolean) => void;
}

// ─── component ───────────────────────────────────────────────────────────────

export function InformationForm({
  formId,
  values,
  onChange,
  errors,
  onErrorsChange,
  onSubmit,
  loading = false,
  hasLocalRegulationDraft = false,
  onClearLocalRegulationDraft,
  onHasPendingPdfChange,
}: InformationFormProps) {
  const { cities: stateCities, loading: loadingCities } = useCitiesByState(values.state ?? "");
  const [loadingCEP, setLoadingCEP] = useState(false);
  const [uploadingPDF, setUploadingPDF] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>("");
  useEffect(() => {
    onHasPendingPdfChange?.(pdfFile !== null);
  }, [pdfFile, onHasPendingPdfChange]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const cepDigits = (values.cep ?? "").replace(/\D/g, "");
  const showAddressFields = cepDigits.length === 8;

  // ── CEP ──────────────────────────────────────────────────────────────────

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    onChange({ cep: formatCEP(raw) });
    if (errors.cep) onErrorsChange((prev) => ({ ...prev, cep: "" }));

    if (raw.length === 8) {
      setLoadingCEP(true);
      try {
        const response = await fetch(`/api/cep?cep=${raw}`);
        if (!response.ok) throw new Error("Erro na requisição: " + response.status);
        const data: ViaCEPResponse = await response.json();
        if (data.erro) {
          toast.error("CEP não encontrado");
        } else {
          onChange({ street: data.logradouro || "", neighborhood: data.bairro || "", city: data.localidade || "", state: data.uf || "" });
          toast.success("Endereço encontrado!");
        }
      } catch {
        toast.error("Erro ao buscar CEP");
      } finally {
        setLoadingCEP(false);
      }
    }
  };

  // ── field changes ─────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "name" && value.length > EVENT_NAME_MAX_LENGTH) return;
    onChange({ [name]: value });
    if (errors[name]) onErrorsChange((prev) => ({ ...prev, [name]: "" }));
  };

  const clearRegistrationPeriodError = (name: string) => {
    if (["registrationStartDate", "registrationStartTime", "registrationEndDate", "registrationEndTime"].includes(name)) {
      onErrorsChange((prev) => prev.registrationPeriod ? { ...prev, registrationPeriod: "" } : prev);
    }
  };

  const handleTimeChange = (name: string, value: string) => {
    if (name === "registrationStartTime" || name === "registrationEndTime") {
      if (wouldRegistrationEndBeforeStart({ ...values, [name]: value } as any)) {
        toast.error(REGISTRATION_END_BEFORE_START_TOAST);
        return;
      }
    }
    onChange({ [name]: value });
    clearRegistrationPeriodError(name);
    if (errors[name]) onErrorsChange((prev) => ({ ...prev, [name]: "" }));

    // A regra "início das inscrições antes da data do evento" é por INSTANTE (data+HORA).
    // Mudar só a HORA de início precisa reavaliar — senão o erro não aparece/limpa ao
    // ajustar os minutos (ex.: início no mesmo dia do evento). Espelha o handler de `eventDate`.
    if (name === "registrationStartTime") {
      const startBeforeEventViolation = isRegistrationStartNotBeforeEvent(
        values.registrationStartDate,
        value,
        values.eventDate,
      );
      if (startBeforeEventViolation) toast.error(REGISTRATION_START_NOT_BEFORE_EVENT_TOAST);
      onErrorsChange((prev) => ({
        ...prev,
        registrationStartDate: startBeforeEventViolation
          ? REGISTRATION_START_NOT_BEFORE_EVENT_TOAST
          : prev.registrationStartDate === REGISTRATION_START_NOT_BEFORE_EVENT_TOAST
            ? ""
            : prev.registrationStartDate,
      }));
    }
  };

  // Seleção LIVRE: o organizador pode escolher QUALQUER data (início/encerramento/
  // evento), inclusive passada — não bloqueamos mais. As violações de ORDEM viram
  // apenas ERRO DE INPUT (mesmo mapeamento de campos da validação de submit
  // `validateEventInformation`), sem `return`/toast. O submit segue barrando a
  // publicação enquanto houver erro.
  const handleDateChange = (name: string, value: string) => {
    const v = value?.trim();

    if (name === "registrationStartDate") {
      const nextStartTime = v ? values.registrationStartTime?.trim() || "00:00" : "";
      onChange({ registrationStartDate: value, registrationStartTime: nextStartTime });

      const startBeforeEvent = isRegistrationStartNotBeforeEvent(value, nextStartTime, values.eventDate);
      const endBeforeStart =
        Boolean(values.registrationEndDate?.trim()) &&
        wouldRegistrationEndBeforeStart({
          ...values,
          registrationStartDate: value,
          registrationStartTime: nextStartTime,
        } as any);

      onErrorsChange((prev) => ({
        ...prev,
        registrationStartDate: startBeforeEvent ? REGISTRATION_START_NOT_BEFORE_EVENT_TOAST : "",
        registrationPeriod: endBeforeStart ? REGISTRATION_END_BEFORE_START_TOAST : "",
      }));
      return;
    }

    if (name === "registrationEndDate") {
      const nextEndTime = v ? values.registrationEndTime?.trim() || "00:00" : "";
      onChange({ registrationEndDate: value, registrationEndTime: nextEndTime });

      const endBeforeStart =
        !!v &&
        wouldRegistrationEndBeforeStart({
          ...values,
          registrationEndDate: value,
          registrationEndTime: nextEndTime,
        } as any);
      const eventBeforeEnd = !!v && isEventDateBeforeRegistrationEnd(values.eventDate, value);

      onErrorsChange((prev) => ({
        ...prev,
        registrationEndDate: "",
        registrationPeriod: endBeforeStart ? REGISTRATION_END_BEFORE_START_TOAST : "",
        // "Evento não pode ser antes do encerramento" → erro no campo do EVENTO
        // (mesmo alvo do submit), pra não divergir.
        eventDate: eventBeforeEnd
          ? EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST
          : prev.eventDate === EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST
            ? ""
            : prev.eventDate,
      }));
      return;
    }

    // eventDate
    onChange({ eventDate: value });
    const eventBeforeEnd = !!v && isEventDateBeforeRegistrationEnd(value, values.registrationEndDate);
    const startBeforeEvent = isRegistrationStartNotBeforeEvent(
      values.registrationStartDate,
      values.registrationStartTime,
      value,
    );
    onErrorsChange((prev) => ({
      ...prev,
      eventDate: eventBeforeEnd ? EVENT_DATE_NOT_BEFORE_REGISTRATION_END_TOAST : "",
      registrationStartDate: startBeforeEvent
        ? REGISTRATION_START_NOT_BEFORE_EVENT_TOAST
        : prev.registrationStartDate === REGISTRATION_START_NOT_BEFORE_EVENT_TOAST
          ? ""
          : prev.registrationStartDate,
    }));
  };

  // ── PDF ───────────────────────────────────────────────────────────────────

  const handlePDFSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Formato inválido. Use apenas PDF."); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo de 10MB."); return; }
    setPdfFile(file);
    setPdfUrl("");
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      if (file.size > 10 * 1024 * 1024) { toast.error("Arquivo muito grande. Máximo de 10MB."); return; }
      setPdfFile(file);
      setPdfUrl("");
    } else {
      toast.error("Formato inválido. Use apenas PDF.");
    }
  };

  const uploadPDF = async (): Promise<string | null> => {
    if (!pdfFile) return null;
    setUploadingPDF(true);
    try {
      const fd = new FormData();
      fd.append("file", pdfFile);
      const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333").replace(/\/$/, "");
      // Auth por cookie httpOnly: `credentials: "include"`.
      // `X-PT-Surface` declara a superfície (fetch cru não passa pelo ApiClient).
      const response = await fetch(`${apiUrl}/api/v1/upload/pdf`, {
        method: "POST",
        credentials: "include",
        headers: surfaceHeader(),
        body: fd,
      });
      let result: Record<string, unknown> = {};
      try { result = JSON.parse(await response.text()) as Record<string, unknown>; } catch { /* empty */ }
      if (!response.ok) {
        const msg = (result.message as string) || "Erro ao fazer upload";
        toast.error(msg);
        throw new Error(msg);
      }
      const fileUrl =
        (result.url as string) || (result.fileUrl as string) ||
        ((result.data as Record<string, unknown>)?.url as string) ||
        ((result.data as Record<string, unknown>)?.fileUrl as string) ||
        Object.values(result).find((v): v is string => typeof v === "string" && (v.startsWith("http") || v.startsWith("/")));
      if (!fileUrl) throw new Error("Resposta do servidor inválida - URL não encontrada");
      const full = fileUrl.startsWith("http") ? fileUrl : `${apiUrl}${fileUrl.startsWith("/") ? "" : "/"}${fileUrl}`;
      setPdfUrl(full);
      toast.success("PDF enviado com sucesso!");
      return full;
    } catch (error: any) {
      if (!error.message?.includes("image")) toast.error(error.message || "Erro ao fazer upload do PDF");
      throw error;
    } finally {
      setUploadingPDF(false);
    }
  };

  // ── submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let resolvedPdfUrl: string | null = values.regulationUrl?.trim() && !values.regulationUrl.startsWith("data:")
      ? values.regulationUrl.trim()
      : null;
    if (pdfFile && !pdfUrl) {
      try {
        resolvedPdfUrl = await uploadPDF();
      } catch {
        return;
      }
    } else if (pdfUrl) {
      resolvedPdfUrl = pdfUrl;
    }
    await onSubmit(e, resolvedPdfUrl);
  };

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <form id={formId} onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-9 md:gap-[44px]">

      {/* Name + event date */}
      <div className="flex flex-col md:flex-row gap-9 md:gap-3 w-full items-stretch md:items-start">
        <div className="flex flex-col gap-3 flex-1 min-w-0">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <label htmlFor={`${formId}-name`} className="text-gray-12 text-base font-family-dm-sans">Nome do evento</label>
            </div>
            <Input
              id={`${formId}-name`}
              type="text"
              name="name"
              value={values.name}
              onChange={handleInputChange}
              placeholder="Ex: Corrida Pena Nubas 2025"
              className={`h-12 ${errors.name ? "border-red-10" : ""}`}
              maxLength={EVENT_NAME_MAX_LENGTH}
            />
          </div>
          {errors.name && <p className="text-red-10 text-sm">{errors.name}</p>}
        </div>

        <div className="flex flex-col gap-3 w-full md:w-1/2 shrink-0">
          <div className="flex flex-col gap-2">
            <label className="text-gray-12 text-base font-family-dm-sans">Data do evento</label>
            <DatePicker
              value={values.eventDate}
              onChange={(value) => handleDateChange("eventDate", value || "")}
              placeholder={getCurrentDatePlaceholder()}
              className="w-full md:w-max"
              hideIcon={false}
              error={!!errors.eventDate}
              // Seleção livre: qualquer data (a validação de ordem/erro é inline).
              disablePastDates={false}
            />
          </div>
          <div className="flex items-start gap-2">
            <InfoIcon className="size-5 text-gray-11 shrink-0 mt-0.5" />
            <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.4]">
              Use a data oficial em que o evento começa. Modalidades e horários você configura nas próximas etapas.
            </p>
          </div>
          {errors.eventDate && <p className="text-red-10 text-sm">{errors.eventDate}</p>}
        </div>
      </div>

      {/* Registration period */}
      <div className="flex flex-col gap-5 md:gap-[20px]">
        <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">Inscrição</h2>
        <div className="flex flex-col md:flex-row gap-9 md:gap-[72px] items-stretch md:items-start">
          <div className="flex flex-col gap-3 md:gap-[12px] min-w-0">
            <label className="text-gray-12 text-base font-family-dm-sans">Data de início das inscrições</label>
            <div className="flex gap-3 items-end w-full">
              <div className="min-w-0 flex-1 md:flex-none">
                <DatePicker value={values.registrationStartDate} onChange={(v) => handleDateChange("registrationStartDate", v || "")} placeholder={getCurrentDatePlaceholder()} className="w-full md:w-max" error={!!errors.registrationStartDate} disablePastDates={false} />
              </div>
              <div className="w-[112px] shrink-0 md:w-auto">
                <TimePicker
                  value={values.registrationStartDate?.trim() ? values.registrationStartTime?.trim() || "00:00" : values.registrationStartTime || ""}
                  onChange={(v) => handleTimeChange("registrationStartTime", v)}
                  className="w-full md:w-max"
                />
              </div>
            </div>
            {errors.registrationStartDate && <p className="text-red-10 text-sm">{errors.registrationStartDate}</p>}
          </div>

          <div className="flex flex-col gap-3 md:gap-[12px] min-w-0">
            <label className="text-gray-12 text-base font-family-dm-sans">Data de encerramento das inscrições</label>
            <div className="flex gap-3 items-end w-full">
              <div className="min-w-0 flex-1 md:flex-none">
                <DatePicker value={values.registrationEndDate} onChange={(v) => handleDateChange("registrationEndDate", v || "")} placeholder={getCurrentDatePlaceholder()} className="w-full md:w-max" error={!!errors.registrationEndDate} disablePastDates={false} />
              </div>
              <div className="w-[112px] shrink-0 md:w-auto">
                <TimePicker
                  value={values.registrationEndDate?.trim() ? values.registrationEndTime?.trim() || "00:00" : values.registrationEndTime || ""}
                  onChange={(v) => handleTimeChange("registrationEndTime", v)}
                  className="w-full md:w-max"
                />
              </div>
            </div>
            {errors.registrationEndDate && <p className="text-red-10 text-sm">{errors.registrationEndDate}</p>}
          </div>
        </div>
        {errors.registrationPeriod && <p className="text-red-10 text-sm">{errors.registrationPeriod}</p>}
      </div>

      {/* Location */}
      <div className="flex flex-col gap-4 md:gap-[12px]">
        <div className="flex flex-col gap-2 md:gap-[12px]">
          <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">Local do evento</h2>
          <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.4] md:leading-[1.3]">
            Informe onde o evento será realizado. Essas informações aparecem na página e ajudam o participante a chegar ao destino.
          </p>
        </div>

        <div className="gap-2 w-full grid grid-cols-1 md:grid-cols-2 md:pr-3">
          <div className="flex flex-col gap-2 w-full">
            <label className="text-gray-12 text-base font-family-dm-sans">CEP</label>
            <Input type="text" name="cep" value={values.cep} onChange={handleCEPChange} placeholder="00000-000" maxLength={9} className={`h-12 ${errors.cep ? "border-red-10" : ""}`} />
            {loadingCEP && <p className="text-gray-11 text-sm">Buscando endereço...</p>}
            {errors.cep && <p className="text-red-10 text-sm">{errors.cep}</p>}
          </div>
        </div>

        <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${showAddressFields ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
          <div className={`overflow-hidden transition-opacity duration-300 ${showAddressFields ? "opacity-100" : "opacity-0"}`}>
            <div className="flex flex-col md:flex-row md:flex-wrap gap-5 items-stretch md:items-start pt-1">
              <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                <label className="text-gray-12 text-base font-family-dm-sans">Rua</label>
                <Input type="text" name="street" value={values.street} onChange={handleInputChange} placeholder="Digite o nome da rua" className={`h-12 ${errors.street ? "border-red-10" : ""}`} />
                {errors.street && <p className="text-red-10 text-sm">{errors.street}</p>}
              </div>

              <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                <label className="text-gray-12 text-base font-family-dm-sans">Bairro</label>
                <Input type="text" name="neighborhood" value={values.neighborhood} onChange={handleInputChange} placeholder="Digite o nome do bairro" className="h-12" />
              </div>

              <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                <label className="text-gray-12 text-base font-family-dm-sans">Estado</label>
                <SearchableSelect
                  options={BRAZIL_STATES.map(({ uf, name }) => ({ id: uf, label: `${name} - ${uf}` }))}
                  value={values.state ?? ""}
                  onChange={(val) => { onChange({ state: val, city: "" }); if (errors.state) onErrorsChange((prev) => ({ ...prev, state: "" })); if (errors.city) onErrorsChange((prev) => ({ ...prev, city: "" })); }}
                  placeholder="Selecione o estado"
                  searchPlaceholder="Pesquisar estado..."
                  emptyText="Nenhum estado encontrado"
                  error={!!errors.state}
                />
                {errors.state && <p className="text-red-10 text-sm">{errors.state}</p>}
              </div>

              <div className="flex flex-col gap-2 w-full md:min-w-[365px] md:flex-1">
                <label className="text-gray-12 text-base font-family-dm-sans">Cidade</label>
                <SearchableSelect
                  options={stateCities.map((c) => ({ id: c, label: c }))}
                  value={values.city ?? ""}
                  onChange={(val) => { onChange({ city: val }); if (errors.city) onErrorsChange((prev) => ({ ...prev, city: "" })); }}
                  placeholder={!values.state ? "Selecione o estado primeiro" : "Selecione a cidade"}
                  searchPlaceholder="Pesquisar cidade..."
                  emptyText="Nenhuma cidade encontrada"
                  disabled={!values.state}
                  loading={loadingCities}
                  loadingText="Carregando cidades..."
                  error={!!errors.city}
                />
                {errors.city && <p className="text-red-10 text-sm">{errors.city}</p>}
              </div>



              <div className="flex flex-col gap-2 w-full">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <label htmlFor={`${formId}-google-maps`} className="text-gray-12 text-base font-family-dm-sans">URL do google</label>
                  <GoogleMapsUrlHelpTooltip />
                </div>
                <div className="relative">
                  <LocationIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-12 pointer-events-none" />
                  <Input id={`${formId}-google-maps`} type="url" name="googleMapsLink" value={values.googleMapsLink} onChange={handleInputChange} placeholder="www.google.com/maps/search/?api=1&query=Av.+Paulista+2084+S%C3%A3o+Paulo+SP" className={`h-12 pl-10 ${errors.googleMapsLink ? "border-red-10" : ""}`} />
                </div>
                {errors.googleMapsLink && <p className="text-red-10 text-sm">{errors.googleMapsLink}</p>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contact email */}
      <div className="flex flex-col gap-4 md:gap-[12px]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">Email de atendimento</h2>
            <ContactEmailHelpTooltip />
          </div>
          <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.4] md:leading-[1.3]">Utilizado para receber dúvidas dos participantes</p>
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <div className="relative">
            <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11 pointer-events-none" />
            <Input type="email" name="contactEmail" value={values.contactEmail} onChange={handleInputChange} placeholder="atendimento@seuevento.com.br" className={`h-12 pl-10 ${errors.contactEmail ? "border-red-10" : ""}`} />
          </div>
          {errors.contactEmail && <p className="text-red-10 text-sm">{errors.contactEmail}</p>}
        </div>
      </div>

      {/* Social networks */}
      <div className="flex flex-col gap-4 md:gap-3">
        <div className="flex flex-col gap-2">
          <h2 className="text-gray-12 text-lg font-semibold font-manrope leading-[1.1]">Redes sociais</h2>
          <p className="text-gray-11 text-sm md:text-base font-family-dm-sans leading-[1.4] md:leading-[1.3]">
            Adicione os canais oficiais do evento. Eles aparecem na página pública para que os participantes possam acompanhar atualizações
          </p>
        </div>
        <div className="bg-gray-2 border border-gray-6 rounded-xl p-5 flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
            {SOCIAL_NETWORKS.map(({ key, prefix, base, placeholder, Icon }) => {
              const handle = socialHandle((values as any)[key], base, prefix);
              return (
                <div key={key} className="flex items-center gap-4 min-w-0">
                  <Icon className="size-8 shrink-0 text-gray-12" />
                  <div className="flex flex-1 min-w-0 h-11 items-stretch rounded-lg border border-gray-6 overflow-hidden focus-within:border-gray-8 transition-colors">
                    <span className="flex items-center px-3 bg-gray-3 text-gray-12 font-family-dm-sans text-base whitespace-nowrap border-r border-gray-6 select-none">
                      {prefix}
                    </span>
                    <input
                      type="text"
                      inputMode="url"
                      value={handle}
                      onChange={(e) => {
                        const h = socialHandle(e.target.value, base, prefix);
                        onChange({ [key]: h ? base + h : "" } as any);
                      }}
                      placeholder={placeholder}
                      className="flex-1 min-w-0 px-3 bg-transparent outline-none text-gray-12 placeholder:text-gray-11 font-family-dm-sans text-base"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* PDF regulation */}
      <div className="flex flex-col items-stretch justify-center w-full">
        <div
          className="border-2 border-dashed border-gray-6 rounded-xl md:rounded-[12px] p-4 md:p-6 flex flex-col md:flex-row gap-4 items-center justify-center w-full cursor-pointer hover:border-gray-6 transition-colors min-h-[140px] md:min-h-0"
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="md:hidden flex flex-col items-center justify-center gap-2 text-center px-2">
            <Plus className="size-10 text-primary-11" strokeWidth={1.5} />
            <p className="text-primary-11 text-sm font-bold font-family-dm-sans leading-[1.35]">Clique e envie o regulamento do evento em PDF.</p>
            <p className="text-gray-11 text-xs font-family-dm-sans">Opcional · máx. 10MB</p>
          </div>
          <div className="hidden md:flex gap-4 items-center justify-center w-full">
            <div className="flex items-center justify-center size-16 shrink-0">
              <Plus className="size-16 text-primary-11" strokeWidth={1.5} />
            </div>
            <div className="flex flex-col gap-4 items-start justify-center flex-1">
              <div className="flex flex-col gap-2 items-start justify-center w-full">
                <p className="text-primary-11 text-base font-bold font-family-dm-sans leading-[1.3] text-start w-full">Envie o regulamento do evento em PDF para que os participantes possam visualizar na página do evento.</p>
                <p className="text-gray-12 text-base font-semibold font-manrope leading-[1.1] w-full">Formato recomendado: PDF</p>
              </div>
              <p className="text-gray-12 text-base font-bold font-family-dm-sans leading-[1.3]">Arraste um arquivo PDF para este campo ou clique aqui</p>
            </div>
          </div>
        </div>
        <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handlePDFSelect} className="hidden" />

        {pdfFile && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-gray-11 text-sm">Arquivo selecionado: {pdfFile.name}</p>
            <button
              type="button"
              onClick={() => {
                setPdfFile(null);
                setPdfUrl("");
                onClearLocalRegulationDraft?.();
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-red-10 text-sm hover:text-red-11"
            >
              Remover
            </button>
          </div>
        )}

        {!pdfFile && (pdfUrl || (values.regulationUrl && !values.regulationUrl.startsWith("data:")) || hasLocalRegulationDraft) && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-gray-11 text-sm">PDF atual do regulamento</p>
            {pdfUrl || (values.regulationUrl && !values.regulationUrl.startsWith("data:")) ? (
              <a href={pdfUrl || values.regulationUrl} target="_blank" rel="noopener noreferrer" className="text-primary-11 text-sm hover:underline">
                Ver PDF
              </a>
            ) : (
              <span className="text-gray-11 text-sm">Guardado no rascunho (será enviado ao concluir o banner)</span>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
