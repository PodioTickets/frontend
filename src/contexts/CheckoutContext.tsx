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
  /**
   * Nacionalidade selecionada pelo usuário no card do participante. Default "Brasil".
   * Determina label/placeholder/máscara/validação do campo de documento. NÃO é enviada
   * ao backend hoje (endpoint PATCH /participants tem `forbidNonWhitelisted`); fica no
   * estado local pra coerência da UI durante a navegação do checkout.
   */
  nationality?: string;
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
  nationality: "Brasil",
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

  // Chaves de sessionStorage por evento. Estado persiste enquanto a aba
  // estiver aberta — sobrevive a navegacao (login modal/redirect) mas nao
  // a fechar a aba. SessionStorage > localStorage: nao polui storage entre
  // visitas, e cada aba/evento tem escopo proprio.
  const rqStorageKey = eventId ? `checkout:raceQuantities:${eventId}` : null;
  const pStorageKey = eventId ? `checkout:participants:${eventId}` : null;

  // Hidrata do sessionStorage ao trocar de evento. Se nao tem nada salvo,
  // reseta. Roda so no client (sessionStorage indefinido no SSR).
  useEffect(() => {
    if (!eventId) return;
    if (typeof window === "undefined") return;
    try {
      const savedRq = rqStorageKey ? window.sessionStorage.getItem(rqStorageKey) : null;
      setRaceQuantities(savedRq ? JSON.parse(savedRq) : {});
      const savedP = pStorageKey ? window.sessionStorage.getItem(pStorageKey) : null;
      setParticipants(savedP ? JSON.parse(savedP) : [DEFAULT_PARTICIPANT]);
    } catch {
      setRaceQuantities({});
      setParticipants([DEFAULT_PARTICIPANT]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Persiste mudancas. Skip quando nao tem eventId (preview/SSR).
  useEffect(() => {
    if (!rqStorageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(rqStorageKey, JSON.stringify(raceQuantities));
    } catch {
      /* quota/disabled storage — ignora */
    }
  }, [rqStorageKey, raceQuantities]);

  useEffect(() => {
    if (!pStorageKey || typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(pStorageKey, JSON.stringify(participants));
    } catch {
      /* quota/disabled storage — ignora */
    }
  }, [pStorageKey, participants]);

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
    if (typeof window !== "undefined") {
      try {
        if (rqStorageKey) window.sessionStorage.removeItem(rqStorageKey);
        if (pStorageKey) window.sessionStorage.removeItem(pStorageKey);
      } catch {
        /* ignora */
      }
    }
  }, [rqStorageKey, pStorageKey]);

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
