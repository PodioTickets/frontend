"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useParams } from "next/navigation";
import { organizerService } from "@/services";

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
  updateFormData: (data: Partial<EditEventFormData>) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  loading: boolean;
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

export function EditEventProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const eventId = params.id as string;
  const [formData, setFormData] = useState<EditEventFormData>({ ...defaultFormData, eventId });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);

  const formatDateForInput = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatTimeForInput = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  };

  const loadEvent = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const eventData = await organizerService.getEventById(eventId);
      setEvent(eventData);

      // Formatar CEP se existir
      const formatCEP = (cep: string | null | undefined) => {
        if (!cep) return "";
        const numbers = cep.replace(/\D/g, "");
        if (numbers.length <= 5) return numbers;
        return `${numbers.slice(0, 5)}-${numbers.slice(5, 8)}`;
      };

      const ev = eventData as unknown as Record<string, unknown>;
      const cardImageFromApi = [
        ev.cardImageUrl,
        ev.logoUrl,
        ev.logo_url,
      ].find((u) => typeof u === "string" && u.trim().length > 0);

      setFormData({
        eventId,
        name: eventData.name || "",
        eventDate: formatDateForInput(eventData.eventDate),
        registrationStartDate: formatDateForInput(eventData.registrationStartDate),
        registrationStartTime: formatTimeForInput(eventData.registrationStartDate),
        registrationEndDate: formatDateForInput(eventData.registrationEndDate),
        registrationEndTime: formatTimeForInput(eventData.registrationEndDate),
        cep: formatCEP(eventData.zipCode || (eventData as any).cep),
        street: eventData.location || "",
        neighborhood: eventData.neighborhood || "",
        city: eventData.city || "",
        state: eventData.state || "",
        googleMapsLink: eventData.googleMapsLink || "",
        bannerUrl: eventData.bannerUrl || "",
        cardImageUrl: typeof cardImageFromApi === "string" ? cardImageFromApi.trim() : "",
        regulationUrl: (eventData as any).regulationUrl || "",
        description: eventData.description || "",
        contactEmail: (eventData as any).contactEmail || "",
        instagram: (eventData as any).instagram || "",
        facebook: (eventData as any).facebook || "",
        youtube: (eventData as any).youtube || "",
        tiktok: (eventData as any).tiktok || "",
        website: (eventData as any).website || "",
      });
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const updateFormData = (data: Partial<EditEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const reloadEvent = async () => {
    await loadEvent();
  };

  return (
    <EditEventContext.Provider
      value={{
        formData,
        updateFormData,
        errors,
        setErrors,
        loading,
        event,
        reloadEvent,
      }}
    >
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
