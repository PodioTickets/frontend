"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

interface CreateEventFormData {
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
  createdEventId: string | null;
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
  cep: "",
  street: "",
  neighborhood: "",
  city: "",
  state: "",
  googleMapsLink: "",
  bannerUrl: "",
  cardImageUrl: "",
  regulationUrl: "",
  createdEventId: null,
};

export function CreateEventProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [formData, setFormData] = useState<CreateEventFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("createEventFormData");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Error loading form data from localStorage:", e);
      }
    }
  }, []);

  // Save to localStorage whenever formData changes
  useEffect(() => {
    localStorage.setItem("createEventFormData", JSON.stringify(formData));
  }, [formData]);

  const updateFormData = (data: Partial<CreateEventFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const clearFormData = () => {
    setFormData(initialFormData);
    localStorage.removeItem("createEventFormData");
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
