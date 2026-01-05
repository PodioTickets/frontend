"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

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

const STORAGE_PREFIX = "checkout_";

function getStorageKey(eventId: string | null): string | null {
  if (!eventId) return null;
  return `${STORAGE_PREFIX}${eventId}`;
}

function loadFromStorage(eventId: string | null): {
  raceQuantities: Record<string, number>;
  participants: ParticipantFormData[];
} | null {
  if (typeof window === "undefined" || !eventId) return null;

  try {
    const storageKey = getStorageKey(eventId);
    if (!storageKey) return null;

    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    return {
      raceQuantities: parsed.raceQuantities || {},
      participants:
        parsed.participants && parsed.participants.length > 0
          ? parsed.participants
          : [
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
            ],
    };
  } catch (error) {
    console.error("Error loading checkout data from storage:", error);
    return null;
  }
}

function saveToStorage(
  eventId: string | null,
  raceQuantities: Record<string, number>,
  participants: ParticipantFormData[]
) {
  if (typeof window === "undefined" || !eventId) return;

  try {
    const storageKey = getStorageKey(eventId);
    if (!storageKey) return;

    const data = {
      raceQuantities,
      participants,
      savedAt: Date.now(),
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving checkout data to storage:", error);
  }
}

function clearStorage(eventId: string | null) {
  if (typeof window === "undefined" || !eventId) return;

  try {
    const storageKey = getStorageKey(eventId);
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
  } catch (error) {
    console.error("Error clearing checkout data from storage:", error);
  }
}

const DEFAULT_PARTICIPANT: ParticipantFormData = {
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

function CheckoutProviderContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  // Load initial state from storage
  const [raceQuantities, setRaceQuantities] = useState<Record<string, number>>(
    () => {
      if (typeof window === "undefined") return {};
      const stored = loadFromStorage(eventId);
      return stored?.raceQuantities || {};
    }
  );

  const [participants, setParticipants] = useState<ParticipantFormData[]>(() => {
    if (typeof window === "undefined") return [DEFAULT_PARTICIPANT];
    const stored = loadFromStorage(eventId);
    return stored?.participants || [DEFAULT_PARTICIPANT];
  });

  useEffect(() => {
    if (eventId) {
      const stored = loadFromStorage(eventId);
      if (stored) {
        setRaceQuantities(stored.raceQuantities);
        setParticipants(stored.participants);
      } else {
        setRaceQuantities({});
        setParticipants([DEFAULT_PARTICIPANT]);
      }
    } else {
      setRaceQuantities({});
      setParticipants([DEFAULT_PARTICIPANT]);
    }
  }, [eventId]);

  // Save to storage whenever data changes
  useEffect(() => {
    if (eventId) {
      saveToStorage(eventId, raceQuantities, participants);
    }
  }, [eventId, raceQuantities, participants]);

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
    setParticipants([DEFAULT_PARTICIPANT]);
    if (eventId) {
      clearStorage(eventId);
    }
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

export function CheckoutProvider({ children }: { children: ReactNode }) {
  return <CheckoutProviderContent>{children}</CheckoutProviderContent>;
}

export function useCheckout() {
  const context = useContext(CheckoutContext);
  if (context === undefined) {
    throw new Error("useCheckout must be used within a CheckoutProvider");
  }
  return context;
}
