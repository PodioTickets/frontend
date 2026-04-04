"use client";

import { useEffect, useRef } from "react";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { useAuth } from "@/hooks/useAuth";
import { useRegisterModal } from "@/stores/modalStore";
import {
  isProfileComplete,
  skipsParticipantProfileFlow,
} from "@/utils/checkProfileComplete";

export function ProfileCompleteChecker() {
  const pathname = useOrganizerPathname();
  const { user, isAuthenticated } = useAuth();
  const { openRegisterModal, isOpen } = useRegisterModal();
  const lastCheckedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Só verifica se o usuário está autenticado
    if (!isAuthenticated || !user) {
      lastCheckedUserIdRef.current = null;
      return;
    }

    if (skipsParticipantProfileFlow(user, pathname)) {
      return;
    }

    // Se o modal já está aberto, não faz nada
    if (isOpen) {
      return;
    }

    // Se já verificamos este usuário e o perfil ainda está incompleto, não verifica novamente
    // (evita loop infinito se o usuário fechar o modal sem completar)
    if (lastCheckedUserIdRef.current === user.id && !isProfileComplete(user)) {
      return;
    }

    // Se o usuário clicou em "Continuar navegando", não reabrir por um tempo (ex.: 24h)
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("completeProfileModalDismissed");
      if (raw) {
        const [dismissedUserId, dismissedAt] = raw.split(":");
        const ts = dismissedAt ? parseInt(dismissedAt, 10) : 0;
        const ageMs = Date.now() - ts;
        if (dismissedUserId === user.id && ageMs < 24 * 60 * 60 * 1000) {
          lastCheckedUserIdRef.current = user.id;
          return;
        }
      }
    }

    // Verifica se o perfil está completo
    if (!isProfileComplete(user)) {
      lastCheckedUserIdRef.current = user.id;
      // Abre o modal para completar o cadastro
      openRegisterModal({ completeProfile: true });
    } else {
      // Se o perfil estiver completo, atualiza a referência
      lastCheckedUserIdRef.current = user.id;
    }
  }, [user, isAuthenticated, isOpen, openRegisterModal, pathname]);

  return null;
}
