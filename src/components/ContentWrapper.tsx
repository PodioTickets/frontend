"use client";

import { usePathname } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { withAdminPathPrefix } from "@/lib/adminPathPresentation";
import { isOrganizerShortSurfacePath } from "@/lib/organizerSurfacePath";

export function ContentWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminSurface = useAdminAppSurface()
  const isAppSurface = useOrganizerAppSurface();
  const normalized = withOrganizerPathPrefix(pathname, isAppSurface);
  const adminNormalized = withAdminPathPrefix(pathname, isAdminSurface)

  const isAuthOrganizer =
    normalized.startsWith("/organizer/login") ||
    normalized.startsWith("/organizer/forgot-password") ||
    normalized.startsWith("/organizer/reset-password") ||
    adminNormalized.startsWith("/admin")

  if (isAuthOrganizer) {
    return <div>{children}</div>;
  }

  // A landing institucional (/crie-seu-evento-na-podioticket) tem seu próprio topo
  // (hero full-bleed). Sem este caso, o offset `mt-[64px]` abaixo reservaria espaço
  // para o header — expondo uma faixa `bg-gray-2` acima do gradiente do hero
  // ("espaço em branco" que não pega o gradiente).
  const LANDING_PATH = "/crie-seu-evento-na-podioticket";
  const isLanding = pathname === LANDING_PATH || pathname.startsWith(`${LANDING_PATH}/`);
  if (isLanding) {
    return <div>{children}</div>;
  }

  // NÃO depende de reconhecer o app host: `normalized` só recebe o prefixo
  // `/organizer` quando `isAppSurface` é true, e esse valor vem do `host` cru no
  // `layout.tsx`. Se ele falhar atrás do proxy, o painel cairia no ramo público e
  // ganharia `mt-[64px]` EM CIMA do `pt-16` do layout do organizador — 64px de
  // faixa vazia. A forma do caminho é a mesma nos dois hosts, então serve de rede.
  const isOrganizer =
    normalized.startsWith("/organizer") || isOrganizerShortSurfacePath(pathname);

  if (isOrganizer) {
    return <div className="mb-12">{children}</div>;
  }

  return <div className="mt-[64px] md:mt-[68px] mb-12">{children}</div>;
}
