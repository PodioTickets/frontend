"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

/** Pathname + search normalizado (host curto ou /organizer) para comparar “mesma página”. */
function navigationUrlKey(absoluteHref: string, isAppSurface: boolean): string {
  const u = new URL(absoluteHref);
  const p = normalizePathname(withOrganizerPathPrefix(u.pathname, isAppSurface));
  return `${p}${u.search}`;
}

function absoluteHrefToInternalPath(
  absoluteHref: string,
  isAppSurface: boolean,
): string {
  const u = new URL(absoluteHref);
  const p = normalizePathname(withOrganizerPathPrefix(u.pathname, isAppSurface));
  return `${p}${u.search}${u.hash}`;
}

/**
 * Histórico extra + popstate + beforeunload + interceptação de links (capture)
 * quando há alterações locais. `navigateTarget` é usado no voltar do fluxo;
 * cliques em outros destinos guardam o alvo em pending até confirmar.
 */
export function useUnsavedLeaveGuard(
  isDirty: boolean,
  options: {
    navigateTarget: string;
    onDiscard: () => void;
  },
) {
  const orgNav = useOrganizerNavigate();
  const appSurface = useOrganizerAppSurface();
  const { navigateTarget, onDiscard } = options;
  const [leavePromptOpen, setLeavePromptOpen] = useState(false);
  const guardPushedRef = useRef(false);
  const isDirtyRef = useRef(false);
  const isNavigatingAwayRef = useRef(false);
  const skipUnsavedPopStateRef = useRef(false);
  const pendingNavigationInternalRef = useRef<string | null>(null);
  const leavePromptOpenRef = useRef(false);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    leavePromptOpenRef.current = leavePromptOpen;
  }, [leavePromptOpen]);

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
      pendingNavigationInternalRef.current = null;
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

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (!isDirtyRef.current || leavePromptOpenRef.current) return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || !(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.hasAttribute("data-skip-unsaved-guard")) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      let url: URL;
      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const currentKey = navigationUrlKey(window.location.href, appSurface);
      const targetKey = navigationUrlKey(anchor.href, appSurface);
      if (currentKey === targetKey) return;

      e.preventDefault();
      e.stopPropagation();
      pendingNavigationInternalRef.current = absoluteHrefToInternalPath(
        anchor.href,
        appSurface,
      );
      setLeavePromptOpen(true);
    };

    document.addEventListener("click", onClickCapture, true);
    return () => document.removeEventListener("click", onClickCapture, true);
  }, [appSurface]);

  const navigateWithoutGuard = useCallback(() => {
    isNavigatingAwayRef.current = true;
    isDirtyRef.current = false;
    const dest =
      pendingNavigationInternalRef.current ?? navigateTarget;
    pendingNavigationInternalRef.current = null;
    if (guardPushedRef.current) {
      skipUnsavedPopStateRef.current = true;
    }
    guardPushedRef.current = false;
    orgNav.push(dest);
    queueMicrotask(() => {
      isNavigatingAwayRef.current = false;
    });
  }, [orgNav, navigateTarget]);

  const confirmLeaveWithoutSaving = useCallback(() => {
    void (async () => {
      setLeavePromptOpen(false);
      await Promise.resolve(onDiscard());
      navigateWithoutGuard();
    })();
  }, [onDiscard, navigateWithoutGuard]);

  const handleBack = useCallback(() => {
    if (isDirty) {
      pendingNavigationInternalRef.current = null;
      setLeavePromptOpen(true);
      return;
    }
    orgNav.push(navigateTarget);
  }, [isDirty, navigateTarget, orgNav]);

  const beginNavigationAfterSave = useCallback(() => {
    setLeavePromptOpen(false);
    navigateWithoutGuard();
  }, [navigateWithoutGuard]);

  const dismissLeavePrompt = useCallback(() => {
    pendingNavigationInternalRef.current = null;
    setLeavePromptOpen(false);
  }, []);

  const requestNavigate = useCallback(
    (internalPath: string) => {
      if (!isDirtyRef.current) {
        orgNav.push(internalPath);
        return;
      }
      const currentKey = navigationUrlKey(window.location.href, appSurface);
      const targetUrl = new URL(internalPath, window.location.origin).href;
      const targetKey = navigationUrlKey(targetUrl, appSurface);
      if (currentKey === targetKey) {
        orgNav.push(internalPath);
        return;
      }
      pendingNavigationInternalRef.current = internalPath;
      setLeavePromptOpen(true);
    },
    [appSurface, orgNav],
  );

  return {
    leavePromptOpen,
    setLeavePromptOpen,
    handleBack,
    confirmLeaveWithoutSaving,
    beginNavigationAfterSave,
    dismissLeavePrompt,
    requestNavigate,
  };
}
