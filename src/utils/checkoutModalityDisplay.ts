import type { Ticket } from "@/hooks/useTickets";
import type { Event } from "@/interfaces/event";
import { modalitiesColumns } from "@/constants";

/** Assets em `public/` (mesmo host do checkout), não pela API */
const SAME_ORIGIN_PUBLIC_PREFIXES = ["/icons-3d/", "/images/"] as const;

function getConfiguredApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333")
    .trim()
    .replace(/\/$/, "");
}

function isLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "[::1]" ||
    h.endsWith(".localhost")
  );
}

/**
 * Ícones salvos com URL absoluta apontando para localhost (upload em dev)
 * quebram em produção. Troca só o origin pelo da API configurada no build.
 */
function rehostLoopbackAssetUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!isLoopbackHost(parsed.hostname)) return url;
  let baseParsed: URL;
  try {
    baseParsed = new URL(getConfiguredApiBase());
  } catch {
    return url;
  }
  if (isLoopbackHost(baseParsed.hostname)) return url;
  return `${baseParsed.origin}${parsed.pathname}${parsed.search}`;
}

function normalizeProtocolRelative(t: string): string {
  if (!t.startsWith("//")) return t;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}${t}`;
  }
  return `https:${t}`;
}

/**
 * A API costuma devolver ícones como path relativo (/uploads/...).
 * No browser isso vira pedido ao domínio do front (404 em produção).
 * Prefixa com NEXT_PUBLIC_API_URL quando for mídia da API.
 *
 * Em produção é obrigatório definir NEXT_PUBLIC_API_URL com a URL pública da API
 * usada pelo browser (não host interno Docker).
 */
export function resolveCheckoutModalityIconSrc(
  src: string | null | undefined,
): string | undefined {
  let t = src?.trim();
  if (!t) return undefined;
  t = normalizeProtocolRelative(t);
  if (t.startsWith("data:")) return t;
  if (t.startsWith("http://") || t.startsWith("https://")) {
    return rehostLoopbackAssetUrl(t);
  }
  if (t.startsWith("/")) {
    for (const p of SAME_ORIGIN_PUBLIC_PREFIXES) {
      if (t.startsWith(p)) return t;
    }
    const base = getConfiguredApiBase();
    return `${base}${t}`;
  }
  const base = getConfiguredApiBase();
  return `${base}/${t}`;
}

/**
 * Detecta distância no nome do ingresso ("5km", "5 km", "10 KM teste",
 * "21,1km"…). Nesses casos o nome já comunica a modalidade/distância e o
 * bloco de modalidade (ícone + nome) ao lado vira ruído duplicado.
 */
export function ticketNameHasDistance(name: string | null | undefined): boolean {
  if (!name) return false;
  return /\d+(?:[.,]\d+)?\s*km\b/i.test(name);
}

/**
 * `true` só quando a distância deve ser exibida — existe e é > 0. Aceita number
 * ou string ("0", "", "5", "14"): normaliza vírgula decimal e faz `parseFloat`.
 * Distância 0 / ausente / não-numérica → oculta o bloco de ícone + distância
 * (regra única do checkout, modal do organizador, kits, etc.).
 */
export function hasDisplayableDistance(distance: unknown): boolean {
  if (distance == null) return false;
  const n = parseFloat(String(distance).replace(",", "."));
  return Number.isFinite(n) && n > 0;
}

export function getCheckoutModalityInfo(
  ticket: Ticket,
  event: Event,
): { name: string; icon?: string } | null {
  // Nome do ingresso já traz a distância (ex.: "5KM") → oculta o bloco de
  // modalidade inteiro pra não duplicar a informação no card.
  if (ticketNameHasDistance(ticket.name)) return null;

  const modalityValue = ticket.modality?.trim();
  if (!modalityValue) return null;

  const fromEvent = event.modalities?.find(
    (m) =>
      m.name === modalityValue ||
      m.id === modalityValue ||
      m.templateId === modalityValue ||
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
