"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";

/**
 * Ao abrir login / recuperação de senha do organizador, encerra qualquer sessão
 * (participante ou outra) para não reutilizar o mesmo armazenamento de JWT.
 */
export default function OrganizerAuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { setUser, clearError } = useAuth();
  const didClearRef = useRef(false);

  useLayoutEffect(() => {
    if (didClearRef.current) return;
    didClearRef.current = true;
    userService.clearLocalSession();
    setUser(null);
    clearError();
  }, [setUser, clearError]);

  return <>{children}</>;
}
