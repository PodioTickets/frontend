"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ParticipantFormData {
  name: string;
  cpf: string;
  email: string;
  birthDate: string;
  phone: string;
  gender: string;
  emergencyPhone?: string;
  emergencyContactName?: string;
  hasEmergencyContact?: boolean;
}

interface CheckoutState {
  raceQuantities: Record<string, number>;
  participants: ParticipantFormData[];
  updateRaceQuantity: (raceId: string, quantity: number) => void;
  updateParticipant: (
    index: number,
    data: Partial<ParticipantFormData>
  ) => void;
  addParticipant: () => void;
  removeParticipant: (index: number) => void;
  resetCheckout: () => void;
}

const CheckoutContext = createContext<CheckoutState | undefined>(undefined);

export function CheckoutProvider({ children }: { children: ReactNode }) {
  const [raceQuantities, setRaceQuantities] = useState<Record<string, number>>(
    {}
  );
  const [participants, setParticipants] = useState<ParticipantFormData[]>([
    {
      name: "",
      cpf: "",
      email: "",
      birthDate: "",
      phone: "",
      gender: "",
      emergencyPhone: "",
      emergencyContactName: "",
      hasEmergencyContact: false,
    },
  ]);

  const updateRaceQuantity = (raceId: string, quantity: number) => {
    setRaceQuantities((prev) => ({
      ...prev,
      [raceId]: quantity,
    }));
  };

  const updateParticipant = (
    index: number,
    data: Partial<ParticipantFormData>
  ) => {
    setParticipants((prev) => {
      const updated = [...prev];
      // Ensure participant exists at this index
      if (!updated[index]) {
        updated[index] = {
          name: "",
          cpf: "",
          email: "",
          birthDate: "",
          phone: "",
          gender: "",
          emergencyPhone: "",
          emergencyContactName: "",
          hasEmergencyContact: false,
        };
      }
      updated[index] = { ...updated[index], ...data };
      return updated;
    });
  };

  const addParticipant = () => {
    setParticipants((prev) => [
      ...prev,
      {
        name: "",
        cpf: "",
        email: "",
        birthDate: "",
        phone: "",
        gender: "",
        emergencyPhone: "",
        emergencyContactName: "",
        hasEmergencyContact: false,
      },
    ]);
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const resetCheckout = () => {
    setRaceQuantities({});
    setParticipants([
      {
        name: "",
        cpf: "",
        email: "",
        birthDate: "",
        phone: "",
        gender: "",
        emergencyPhone: "",
        emergencyContactName: "",
        hasEmergencyContact: false,
      },
    ]);
  };

  return (
    <CheckoutContext.Provider
      value={{
        raceQuantities,
        participants,
        updateRaceQuantity,
        updateParticipant,
        addParticipant,
        removeParticipant,
        resetCheckout,
      }}
    >
      {children}
    </CheckoutContext.Provider>
  );
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
