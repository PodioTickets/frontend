"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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
  questionAnswers?: Record<string, string | string[]>;
  productVariations?: Record<string, string | null>;
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
  questionAnswers: {},
  productVariations: {},
};

const MAX_TICKETS_PER_ORDER = 20;

function CheckoutProviderContent({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [raceQuantities, setRaceQuantities] = useState<Record<string, number>>({});
  const [participants, setParticipants] = useState<ParticipantFormData[]>([
    DEFAULT_PARTICIPANT,
  ]);

  // Reset ao trocar de evento — estado de checkout é por-evento e nunca persistido.
  useEffect(() => {
    setRaceQuantities({});
    setParticipants([DEFAULT_PARTICIPANT]);
  }, [eventId]);

  const updateRaceQuantity = useCallback((raceId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);

    setRaceQuantities((prev) => {
      const totalWithout = Object.entries(prev).reduce(
        (sum, [id, qty]) => (id === raceId ? sum : sum + qty),
        0,
      );
      const clamped = Math.min(newQuantity, MAX_TICKETS_PER_ORDER - totalWithout);
      return { ...prev, [raceId]: clamped };
    });
  }, []);

  const updateParticipant = useCallback((
    index: number,
    data: Partial<ParticipantFormData>
  ) => {
    setParticipants((prev) => {
      const updated = [...prev];
      if (!updated[index]) {
        updated[index] = { ...DEFAULT_PARTICIPANT };
      }
      updated[index] = { ...updated[index], ...data };
      return updated;
    });
  }, []);

  const addParticipant = useCallback(() => {
    setParticipants((prev) => [...prev, { ...DEFAULT_PARTICIPANT }]);
  }, []);

  const removeParticipant = useCallback((index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetCheckout = useCallback(() => {
    setRaceQuantities({});
    setParticipants([DEFAULT_PARTICIPANT]);
  }, []);

  const contextValue = useMemo(
    () => ({
      raceQuantities,
      participants,
      updateRaceQuantity,
      updateParticipant,
      addParticipant,
      removeParticipant,
      resetCheckout,
    }),
    [raceQuantities, participants, updateRaceQuantity, updateParticipant, addParticipant, removeParticipant, resetCheckout]
  );

  return (
    <CheckoutContext.Provider value={contextValue}>
      {children}
    </CheckoutContext.Provider>
  );
}

export function CheckoutProvider({ children }: { children: ReactNode }) {
  return <CheckoutProviderContent>{children}</CheckoutProviderContent>;
}

/** Checkout isolado para pré-visualização — mesma API, estado em memória. */
export function CheckoutPreviewProvider({ children }: { children: ReactNode }) {
  const [raceQuantities, setRaceQuantities] = useState<Record<string, number>>(
    {},
  );
  const [participants, setParticipants] = useState<ParticipantFormData[]>([
    { ...DEFAULT_PARTICIPANT },
  ]);

  const updateRaceQuantity = useCallback((raceId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);
    setRaceQuantities((prev) => ({ ...prev, [raceId]: newQuantity }));
  }, []);

  const updateParticipant = useCallback(
    (index: number, data: Partial<ParticipantFormData>) => {
      setParticipants((prev) => {
        const updated = [...prev];
        if (!updated[index]) {
          updated[index] = { ...DEFAULT_PARTICIPANT };
        }
        updated[index] = { ...updated[index], ...data };
        return updated;
      });
    },
    [],
  );

  const addParticipant = useCallback(() => {
    setParticipants((prev) => [...prev, { ...DEFAULT_PARTICIPANT }]);
  }, []);

  const removeParticipant = useCallback((index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const resetCheckout = useCallback(() => {
    setRaceQuantities({});
    setParticipants([{ ...DEFAULT_PARTICIPANT }]);
  }, []);

  const contextValue = useMemo(
    () => ({
      raceQuantities,
      participants,
      updateRaceQuantity,
      updateParticipant,
      addParticipant,
      removeParticipant,
      resetCheckout,
    }),
    [
      raceQuantities,
      participants,
      updateRaceQuantity,
      updateParticipant,
      addParticipant,
      removeParticipant,
      resetCheckout,
    ],
  );

  return (
    <CheckoutContext.Provider value={contextValue}>
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
