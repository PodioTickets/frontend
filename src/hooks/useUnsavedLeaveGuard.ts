"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Mesmo padrão do TicketForm: histórico extra + popstate + beforeunload ao haver alterações locais.
 */
export function useUnsavedLeaveGuard(
  isDirty: boolean,
  options: {
    navigateTarget: string;
    onDiscard: () => void;
  },
) {
  const router = useRouter();
  const { navigateTarget, onDiscard } = options;
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const guardPushedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);
  const skipUnsavedPopStateRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    if (isNavigatingAwayRef.current) return;
    if (!isDirty) {
      if (guardPushedRef.current) {
        guardPushedRef.current = false;
        window.history.back();
      }
      return;
    }
    if (!guardPushedRef.current) {
      window.history.pushState({ unsavedPageGuard: true }, "", window.location.href);
      guardPushedRef.current = true;
    }
  }, [isDirty]);

  useEffect(() => {
    const onPopState = () => {
      if (skipUnsavedPopStateRef.current) {
        skipUnsavedPopStateRef.current = false;
        return;
      }
      if (!isDirtyRef.current) return;
      window.history.pushState({ unsavedPageGuard: true }, "", window.location.href);
      setLeavePromptOpen(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const navigateWithoutGuard = useCallback(() => {
    isNavigatingAwayRef.current = true;
    isDirtyRef.current = false;
    if (guardPushedRef.current) {
      skipUnsavedPopStateRef.current = true;
    }
    guardPushedRef.current = false;
    router.push(navigateTarget);
    queueMicrotask(() => {
      isNavigatingAwayRef.current = false;
    });
  }, [router, navigateTarget]);

  const confirmLeaveWithoutSaving = useCallback(() => {
    setLeavePromptOpen(false);
    onDiscard();
    navigateWithoutGuard();
  }, [onDiscard, navigateWithoutGuard]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      setLeavePromptOpen(true);
      return;
    }
    router.push(navigateTarget);
  }, [isDirty, navigateTarget, router]);

  const beginNavigationAfterSave = useCallback(() => {
    setLeavePromptOpen(false);
    navigateWithoutGuard();
  }, [navigateWithoutGuard]);

  return {
    leavePromptOpen,
    setLeavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
  };
}
