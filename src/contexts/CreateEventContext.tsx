"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { clearAllCreateEventClientStorage } from "@/lib/createEventWizardPersistence";
import {
  ACCEPTED_PAYMENT_METHODS,
  type AcceptedPaymentMethod,
} from "@/interfaces/event";

export interface CreateEventFormData {
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
  /** Exige contato de emergência de cada participante no checkout. */
  emergencyContactRequired: boolean;
  createdEventId: string | null;
  contactEmail: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  website: string;
  organizerFeePercent: number;
  /** Taxa TOTAL (%) do evento (organizador + comprador). Fixa em 6 quando a org não
   *  tem taxa personalizada; editável até o teto da org (`maxTotalFeePercent`) quando tem.
   *  Persistida no formData p/ sobreviver ao resume de rascunho na etapa financeira. */
  totalFeePercent?: number;
  maxInstallments: 1 | 2 | 3;
  acceptedPaymentMethods: AcceptedPaymentMethod[];
}

interface CreateEventContextType {
  formData: CreateEventFormData;
  setFormData: React.Dispatch<React.SetStateAction<CreateEventFormData>>;
  updateFormData: (data: Partial<CreateEventFormData>) => void;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  clearFormData: () => void;
}

const CreateEventContext = createContext<CreateEventContextType | undefined>(
  undefined
);

const initialFormData: CreateEventFormData = {
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
  emergencyContactRequired: false,
  createdEventId: null,
  contactEmail: "",
  instagram: "",
  facebook: "",
  youtube: "",
  tiktok: "",
  website: "",
  // Default da divisão da taxa (total fixa = 6%): organizador absorve 4%,
  // logo participante paga 6 − 4 = 2% (derivado em FinancialSection/saveFinancialSettings).
  organizerFeePercent: 4,
  maxInstallments: 1,
  // Default = todas as formas aceitas (espelha o default do backend)
  acceptedPaymentMethods: [...ACCEPTED_PAYMENT_METHODS],
};

// Helper function to load initial data from localStorage
function loadInitialFormData(): CreateEventFormData {
  if (typeof window === 'undefined') {
    return initialFormData;
  }
  
  try {
    const saved = localStorage.getItem("createEventFormData");
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with initialFormData to ensure all fields exist
      return { ...initialFormData, ...parsed };
    }
  } catch (e) {
    console.error("Error loading form data from localStorage:", e);
  }
  
  return initialFormData;
}

export function CreateEventProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize state directly from localStorage to avoid race conditions
  const [formData, setFormData] = useState<CreateEventFormData>(loadInitialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Save to localStorage whenever formData changes
  // Always save to ensure createdEventId is persisted even if other fields are empty
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem("createEventFormData", JSON.stringify(formData));
    }
  }, [formData]);

  const updateFormData = (data: Partial<CreateEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const clearFormData = () => {
    setFormData(initialFormData);
    clearAllCreateEventClientStorage();
  };

  return (
    <CreateEventContext.Provider
      value={{
        formData,
        setFormData,
        updateFormData,
        errors,
        setErrors,
        clearFormData,
      }}
    >
      {children}
    </CreateEventContext.Provider>
  );
}

export function useCreateEvent() {
  const context = useContext(CreateEventContext);
  if (context === undefined) {
    throw new Error("useCreateEvent must be used within a CreateEventProvider");
  }
  return context;
}
