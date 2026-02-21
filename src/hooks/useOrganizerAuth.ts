"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const hasToken = userService.isAuthenticated();
    
    if (!hasToken) {
      router.push(redirectTo);
      return;
    }

    // Pequeno delay para evitar flash de conteúdo
    const timer = setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoading(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [router, redirectTo, delay]);

  return { isAuthenticated, isLoading };
}
