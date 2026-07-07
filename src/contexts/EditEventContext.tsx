"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { toUtcDate } from "@/utils/datetimeBR";

export interface EditEventFormData {
  eventId: string;
  name: string;
  eventDate: string;
  registrationStartDate: string;
  registrationStartTime: string;
  registrationEndDate: string;
  registrationEndTime: string;
  /** Vagas do evento (teto de participantes). String no form; "" = ilimitado. */
  maxParticipants: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  googleMapsLink: string;
  /** Local por coordenadas (seleção no mapa). String no form; "" = não definido. */
  latitude: string;
  longitude: string;
  /** Rótulo do local escolhido (nome do POI / endereço formatado). */
  locationName: string;
  bannerUrl: string;
  regulationUrl: string;
  description: string;
  contactEmail: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  website: string;
}

interface EditEventContextType {
  formData: EditEventFormData;
  initialFormData: EditEventFormData;
  updateFormData: (data: Partial<EditEventFormData>) => void;
  /**
   * Re-fixa o `initialFormData` (baseline pro dirty check) com o `formData`
   * atual mesclado com `partial`. Chamar após save bem-sucedido pra
   * desabilitar o botão de salvar até o usuário editar algo novamente.
   */
  commitInitialFormData: (partial?: Partial<EditEventFormData>) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  loading: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: any;
  reloadEvent: () => Promise<void>;
}

const defaultFormData: EditEventFormData = {
  eventId: "",
  name: "",
  eventDate: "",
  registrationStartDate: "",
  registrationStartTime: "",
  registrationEndDate: "",
  registrationEndTime: "",
  maxParticipants: "",
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
  googleMapsLink: "",
  latitude: "",
  longitude: "",
  locationName: "",
  bannerUrl: "",
  regulationUrl: "",
  description: "",
  contactEmail: "",
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  website: "",
};

const EditEventContext = createContext<EditEventContextType | undefined>(undefined);

/** Igualdade campo a campo (mesma semântica do dirty check das páginas). */
function sameFormData(a: EditEventFormData, b: EditEventFormData): boolean {
  return (Object.keys(defaultFormData) as (keyof EditEventFormData)[]).every(
    (k) => (a[k] ?? "") === (b[k] ?? ""),
  );
}

// Datas/horas do evento são WALL-CLOCK (o backend devolve ISO com `Z`, ex.:
// "2026-06-30T00:00:00.000Z"). Ler com getters LOCAIS (getDate/getHours) reaplica
// o fuso do runtime (−3h no BR) e desloca o dia/hora — daí a data "desconfigurar"
// pra um dia antes ao abrir o evento. Lemos sempre em UTC (mesmo padrão de
// datetimeBR.ts) pra preservar o valor escolhido pelo organizador.
function formatDateForInput(dateString: string | null | undefined) {
  const date = toUtcDate(dateString);
  if (!date) return "";
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(dateString: string | null | undefined) {
  const date = toUtcDate(dateString);
  if (!date) return "";
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function formatCEP(cep: string | null | undefined) {
  if (!cep) return "";
  const numbers = cep.replace(/\D/g, "");
  if (numbers.length <= 5) return numbers;
  return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildFormDataFromEvent(eventId: string, eventData: any): EditEventFormData {
  return {
    eventId,
    name: eventData.name || "",
    eventDate: formatDateForInput(eventData.eventDate),
    registrationStartDate: formatDateForInput(eventData.registrationStartDate),
    registrationStartTime: formatTimeForInput(eventData.registrationStartDate),
    registrationEndDate: formatDateForInput(eventData.registrationEndDate),
    registrationEndTime: formatTimeForInput(eventData.registrationEndDate),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maxParticipants:
      (eventData as any).maxParticipants != null
        ? String((eventData as any).maxParticipants)
        : "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cep: formatCEP(eventData.zipCode || (eventData as any).cep),
    street: eventData.location || "",
    neighborhood: eventData.neighborhood || "",
    city: eventData.city || "",
    state: eventData.state || "",
    googleMapsLink: eventData.googleMapsLink || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    latitude: (eventData as any).latitude != null ? String((eventData as any).latitude) : "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    longitude: (eventData as any).longitude != null ? String((eventData as any).longitude) : "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    locationName: (eventData as any).locationName || "",
    bannerUrl: eventData.bannerUrl || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    regulationUrl: (eventData as any).regulationUrl || "",
    description: eventData.description || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contactEmail: (eventData as any).contactEmail || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    instagram: (eventData as any).instagram || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    facebook: (eventData as any).facebook || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    youtube: (eventData as any).youtube || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tiktok: (eventData as any).tiktok || "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    website: (eventData as any).website || "",
  };
}

export function EditEventProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const eventId = params.id as string;

  // Fonte primária: React Query. Quando hidratado via HydrationBoundary no
  // Server Component, vem preenchido no primeiro render — zero waterfall.
  const {
    data: event,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.events.detail(eventId || ""),
    queryFn: async () => {
      if (!eventId) return null;
      return organizerService.getEventById(eventId);
    },
    enabled: !!eventId,
  });

  const [formData, setFormData] = useState<EditEventFormData>({
    ...defaultFormData,
    eventId,
  });
  const [initialFormData, setInitialFormData] = useState<EditEventFormData>({
    ...defaultFormData,
    eventId,
  });
  const initialLoadDone = useRef(false);
  // Espelhos síncronos dos states — o efeito de reidratação precisa comparar
  // form vs baseline SEM entrar na lista de deps (senão re-dispararia a cada
  // tecla digitada).
  const formDataRef = useRef(formData);
  const initialFormDataRef = useRef(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reidrata formData/initialFormData quando o evento muda (1ª carga + reloads
  // do React Query — com `refetchOnMount: "always"`, TODA entrada na tela tem
  // um refetch após a 1ª pintura com cache).
  //
  // Nas recargas, o baseline é re-sincronizado JUNTO com o form — desde que
  // não exista edição local pendente. Sem isso, a 1ª carga com cache stale
  // fixava um baseline velho e o refetch (dados frescos) só atualizava o
  // form → dirty "fantasma": modal de sair sem salvar logo ao entrar, sem o
  // usuário ter tocado em nada. Com edição local pendente, nada é sobrescrito
  // (preserva a digitação do usuário durante refetches em background).
  useEffect(() => {
    if (!event || !eventId) return;
    const loaded = buildFormDataFromEvent(eventId, event);
    if (initialLoadDone.current) {
      const hasLocalEdits = !sameFormData(
        formDataRef.current,
        initialFormDataRef.current,
      );
      if (hasLocalEdits) return;
    }
    initialLoadDone.current = true;
    formDataRef.current = loaded;
    initialFormDataRef.current = loaded;
    setFormData(loaded);
    setInitialFormData(loaded);
  }, [event, eventId]);

  const updateFormData = (data: Partial<EditEventFormData>) => {
    setFormData((prev) => {
      const next = { ...prev, ...data };
      formDataRef.current = next;
      return next;
    });
  };

  const commitInitialFormData = (partial?: Partial<EditEventFormData>) => {
    setFormData((prev) => {
      const next = partial ? { ...prev, ...partial } : prev;
      formDataRef.current = next;
      initialFormDataRef.current = next;
      setInitialFormData(next);
      return next;
    });
  };

  const reloadEvent = async () => {
    await refetch();
  };

  const value = useMemo<EditEventContextType>(
    () => ({
      formData,
      initialFormData,
      updateFormData,
      commitInitialFormData,
      errors,
      setErrors,
      loading: isLoading,
      event,
      reloadEvent,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formData, initialFormData, errors, isLoading, event],
  );

  return (
    <EditEventContext.Provider value={value}>
      {children}
    </EditEventContext.Provider>
  );
}

export function useEditEvent() {
  const context = useContext(EditEventContext);
  if (context === undefined) {
    throw new Error("useEditEvent must be used within an EditEventProvider");
  }
  return context;
}
