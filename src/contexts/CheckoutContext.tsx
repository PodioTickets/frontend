"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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

function saveToStorageAsync(
  eventId: string | null,
  raceQuantities: Record<string, number>,
  participants: ParticipantFormData[]
) {
  if (typeof window === "undefined" || !eventId) return;

  // Use microtask queue for non-blocking save
  Promise.resolve().then(() => {
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
  });
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
  questionAnswers: {},
  productVariations: {},
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

  // Refs for debounced save
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const eventIdRef = useRef(eventId);
  const raceQuantitiesRef = useRef(raceQuantities);
  const participantsRef = useRef(participants);

  // Keep refs in sync
  useEffect(() => {
    eventIdRef.current = eventId;
  }, [eventId]);

  useEffect(() => {
    raceQuantitiesRef.current = raceQuantities;
  }, [raceQuantities]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Load from storage when eventId changes
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

  // Debounced async save - completely non-blocking
  const scheduleSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      const currentEventId = eventIdRef.current;
      const currentQuantities = raceQuantitiesRef.current;
      const currentParticipants = participantsRef.current;
      
      if (currentEventId) {
        saveToStorageAsync(currentEventId, currentQuantities, currentParticipants);
      }
    }, 500);
  }, []);

  // Direct immediate state update - no delays, no async
  const MAX_TICKETS_PER_ORDER = 20;

  const updateRaceQuantity = useCallback((raceId: string, quantity: number) => {
    const newQuantity = Math.max(0, quantity);

    setRaceQuantities((prev) => {
      const totalWithout = Object.entries(prev).reduce(
        (sum, [id, qty]) => (id === raceId ? sum : sum + qty),
        0,
      );
      const clamped = Math.min(newQuantity, MAX_TICKETS_PER_ORDER - totalWithout);
      const updated = { ...prev, [raceId]: clamped };
      raceQuantitiesRef.current = updated;
      return updated;
    });

    scheduleSave();
  }, [scheduleSave]);

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
      participantsRef.current = updated;
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const addParticipant = useCallback(() => {
    setParticipants((prev) => {
      const updated = [...prev, { ...DEFAULT_PARTICIPANT }];
      participantsRef.current = updated;
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const removeParticipant = useCallback((index: number) => {
    setParticipants((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      participantsRef.current = updated;
      return updated;
    });
    scheduleSave();
  }, [scheduleSave]);

  const resetCheckout = useCallback(() => {
    setRaceQuantities({});
    setParticipants([DEFAULT_PARTICIPANT]);
    raceQuantitiesRef.current = {};
    participantsRef.current = [DEFAULT_PARTICIPANT];
    
    if (eventId) {
      clearStorage(eventId);
    }
  }, [eventId]);

  // Memoize context value
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

/** Checkout isolado para pré-visualização (sem localStorage do fluxo real). */
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
