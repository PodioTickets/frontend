"use client";

import { useState, useEffect } from "react";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { userService } from "@/services";

interface UseOrganizerAuthOptions {
  redirectTo?: string;
  delay?: number;
}

interface UseOrganizerAuthReturn {
  isAuthenticated: boolean;
  isLoading: boolean;
}

export function useOrganizerAuth(options: UseOrganizerAuthOptions = {}): UseOrganizerAuthReturn {
  const { redirectTo = "/", delay = 300 } = options;
  const orgNav = useOrganizerNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    
    if (!hasToken) {
      orgNav.push(redirectTo);
      return;
    }

    // Pequeno delay para evitar flash de conteúdo
    const timer = setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [orgNav, redirectTo, delay]);

  return { isAuthenticated, isLoading };
}
