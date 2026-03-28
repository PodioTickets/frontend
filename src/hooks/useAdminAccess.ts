"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./useAuth";

export function useAdminAccess() {
  const router = useRouter();
  const { user, refetchUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refetchUser();
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Intentionally once on mount: refetch profile for admin role check
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = useMemo(
    () =>
      user?.role === "ADMIN" || user?.role === "PODIOGO_STAFF",
    [user?.role]
  );

  useEffect(() => {
    if (loading) return;
    if (!user || !isAdmin) {
      router.replace("/");
    }
  }, [loading, user, isAdmin, router]);

  return { loading, isAdmin, user };
}
