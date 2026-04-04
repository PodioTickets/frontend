import type { Ticket } from "@/hooks/useTickets";
import type { Event } from "@/interfaces/event";
import { modalitiesColumns } from "@/constants";
import { getApiClient } from "@/services/base/ApiClient";

/** Assets em `public/` (mesmo host do checkout), não na API */
const SAME_ORIGIN_PUBLIC_PREFIXES = ["/icons-3d/", "/images/"] as const;

/**
 * A API costuma devolver ícones como path relativo (/uploads/...).
 * No browser isso vira pedido ao domínio do front (404 em produção).
 * Prefixa com NEXT_PUBLIC_API_URL quando for mídia da API.
 */
export function resolveCheckoutModalityIconSrc(
  src: string | null | undefined,
): string | undefined {
  const t = src?.trim();
  if (!t) return undefined;
  if (
    t.startsWith("http://") ||
    t.startsWith("https://") ||
    t.startsWith("data:")
  ) {
    return t;
  }
  if (t.startsWith("/")) {
    for (const p of SAME_ORIGIN_PUBLIC_PREFIXES) {
      if (t.startsWith(p)) return t;
    }
    const base = getApiClient().getBaseURL().replace(/\/$/, "");
    return `${base}${t}`;
  }
  const base = getApiClient().getBaseURL().replace(/\/$/, "");
  return `${base}/${t}`;
}

export function getCheckoutModalityInfo(
  ticket: Ticket,
  event: Event,
): { name: string; icon?: string } | null {
  const modalityValue = ticket.modality?.trim();
  if (!modalityValue) return null;

  const fromEvent = event.modalities?.find(
    (m) =>
      m.name === modalityValue ||
      m.template?.label === modalityValue ||
      m.template?.code === modalityValue,
  );
  if (fromEvent) {
    return {
      name: fromEvent.template?.label || fromEvent.name,
      icon: resolveCheckoutModalityIconSrc(fromEvent.template?.icon),
    };
  }

  const allModalities = modalitiesColumns.flat();
  const byIdOrLabel = allModalities.find(
    (m) => m.id === modalityValue || m.label === modalityValue,
  );
  if (byIdOrLabel) {
    return {
      name: byIdOrLabel.label,
      icon: resolveCheckoutModalityIconSrc(byIdOrLabel.icon),
    };
  }

  return { name: modalityValue, icon: undefined };
}
