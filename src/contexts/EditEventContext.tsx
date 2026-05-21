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

interface EditEventFormData {
  eventId: string;
  name: string;
  eventDate: string;
  registrationStartDate: string;
  registrationStartTime: string;
  registrationEndDate: string;
  registrationEndTime: string;
  cep: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  googleMapsLink: string;
  bannerUrl: string;
  cardImageUrl: string;
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
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
  googleMapsLink: "",
  bannerUrl: "",
  cardImageUrl: "",
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

function formatDateForInput(dateString: string | null | undefined) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeForInput(dateString: string | null | undefined) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
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
  const ev = eventData as Record<string, unknown>;
  const cardImageFromApi = [ev.cardImageUrl, ev.logoUrl, ev.logo_url].find(
    (u) => typeof u === "string" && u.trim().length > 0,
  );

  return {
    eventId,
    name: eventData.name || "",
    eventDate: formatDateForInput(eventData.eventDate),
    registrationStartDate: formatDateForInput(eventData.registrationStartDate),
    registrationStartTime: formatTimeForInput(eventData.registrationStartDate),
    registrationEndDate: formatDateForInput(eventData.registrationEndDate),
    registrationEndTime: formatTimeForInput(eventData.registrationEndDate),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cep: formatCEP(eventData.zipCode || (eventData as any).cep),
    street: eventData.location || "",
    neighborhood: eventData.neighborhood || "",
    city: eventData.city || "",
    state: eventData.state || "",
    googleMapsLink: eventData.googleMapsLink || "",
    bannerUrl: eventData.bannerUrl || "",
    cardImageUrl: typeof cardImageFromApi === "string" ? cardImageFromApi.trim() : "",
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
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reidrata formData/initialFormData sempre que o evento muda (1ª carga +
  // qualquer reload). O initialFormData fixa apenas na 1ª carga — usado
  // pro dirty check.
  useEffect(() => {
    if (!event || !eventId) return;
    const loaded = buildFormDataFromEvent(eventId, event);
    setFormData(loaded);
    if (!initialLoadDone.current) {
      setInitialFormData(loaded);
      initialLoadDone.current = true;
    }
  }, [event, eventId]);

  const updateFormData = (data: Partial<EditEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const commitInitialFormData = (partial?: Partial<EditEventFormData>) => {
    setFormData((prev) => {
      const next = partial ? { ...prev, ...partial } : prev;
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
