import { useState, useEffect } from "react";
import { userService } from "@/services";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";

/**
 * Shared auth guard for all create-event wizard pages.
 * Redirects to /organizer/login immediately if no token is present,
 * then sets authChecked after a brief 300ms settle to avoid flash.
 */
export function useWizardAuth(): { authChecked: boolean } {
  const orgNav = useOrganizerNavigate();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (!userService.isAuthenticated()) {
      orgNav.push("/organizer/login");
      return;
    }
    const timer = setTimeout(() => setAuthChecked(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return { authChecked };
}
