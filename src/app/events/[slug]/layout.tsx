import type { Metadata } from "next";
import { formatDateBR } from "@/utils/datetimeBR";

/**
 * Server Component que injeta as meta tags Open Graph / Twitter Card da página
 * pública do evento. É AQUI (e não na page client) que o preview de link do
 * WhatsApp/Telegram/Facebook é montado: esses crawlers fazem uma requisição
 * server-side, SEM JavaScript e SEM token de auth, e leem só o HTML inicial.
 * A `page.tsx` é "use client" e busca o evento via fetch autenticado no browser
 * — invisível pros bots; por isso a metadata precisa ser resolvida no servidor.
 *
 * O fetch usa o endpoint PÚBLICO `/api/v1/events/slug/:slug` (sem Authorization)
 * e tem fallbacks para qualquer falha (evento inexistente, API fora, sem banner)
 * — nunca quebra a renderização da página.
 */

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333"
).replace(/\/$/, "");

const SITE_URL = (
  process.env.NEXT_PUBLIC_ROOT_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

const DEFAULT_TITLE = "PódioTicket";
const DEFAULT_DESCRIPTION =
  "Descubra e inscreva-se em eventos esportivos na PódioTicket.";

/** Garante URL absoluta para a imagem OG (crawlers exigem absoluta). */
function toAbsoluteImageUrl(raw: string | undefined | null): string | null {
  const v = raw?.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  // Caminho relativo: prefixa com o host da API (onde os uploads são servidos).
  return `${API_BASE_URL}${v.startsWith("/") ? "" : "/"}${v}`;
}

type PublicEvent = {
  name?: string;
  description?: string;
  bannerUrl?: string;
  city?: string;
  logoUrl?: string;
  state?: string;
  registrationStartDate?: string;
};

async function fetchEventBySlug(slug: string): Promise<PublicEvent | null> {
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/v1/events/slug/${encodeURIComponent(slug)}`,
      // Revalida periodicamente: o preview não precisa ser real-time, e cachear
      // evita um hit na API a cada scrape de link.
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data?.event ?? null) as PublicEvent | null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await fetchEventBySlug(slug);

  const canonicalUrl = `${SITE_URL}/events/${slug}`;

  if (!event?.name) {
    // Sem evento: metadata genérica (não vaza "não encontrado" pro preview).
    return {
      title: DEFAULT_TITLE,
      description: DEFAULT_DESCRIPTION,
      openGraph: {
        title: DEFAULT_TITLE,
        description: DEFAULT_DESCRIPTION,
        url: canonicalUrl,
        type: "website",
        siteName: DEFAULT_TITLE,
      },
      twitter: { card: "summary", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
    };
  }

  const title = event.name;
  // "Inscrições abertas a partir de dd/mm/aaaa" (data em UTC, padrão do projeto).
  const description = `Inscrições abertas a partir de ${formatDateBR(event.registrationStartDate)}`;

  const imageUrl = toAbsoluteImageUrl(event.logoUrl);

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: "website",
      siteName: DEFAULT_TITLE,
      ...(imageUrl
        ? { images: [{ url: imageUrl, alt: event.name }] }
        : {}),
    },
    twitter: {
      // `summary_large_image` → preview com imagem grande quando há banner.
      card: imageUrl ? "summary_large_image" : "summary",
      title,
      description,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
  };
}

export default function EventSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
