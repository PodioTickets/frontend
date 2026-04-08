"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Building2 } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import { Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { TicketIcon } from "../Icons/TicketIcon";
import { UsersIcon } from "../Icons/Organizer/UsersIcon";
import { LogOutIcon } from "../Icons/LogOutIcon";
import { organizerService } from "@/services";
import { PlusCircleIcon } from "../Icons/PlusCircleIcon";
import { InfoIcon } from "../Icons/InfoIcon";
import { useAccessAllOrganizationsModal } from "@/stores/modalStore";
import Image from "next/image";

const navItems = [
  { label: "Eventos", href: "/organizer/events", icon: TicketIcon },
  {
    label: "Organização",
    href: "/organizer/organization/settings",
    icon: Building2,
  },
  {
    label: "Equipe",
    href: "/organizer/team",
    icon: UsersIcon,
  },
];

export function OrganizerMobileNav() {
  const organizerPath = useOrganizerPathname();
  const appSurface = useOrganizerAppSurface();
  const orgNav = useOrganizerNavigate();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const { openAccessAllOrganizationsModal } = useAccessAllOrganizationsModal();

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    orgNav.push("/organizer/login");
  };

  useEffect(() => {
    const loadOrganizer = async () => {
      try {
        const org = await organizerService.getOrganization();
        setOrganizer(org);
      } catch {
        // ignore
      }
    };
    loadOrganizer();
  }, []);

  const navHref = (internal: string) =>
    organizerExternalHref(internal, appSurface);

  const isActive = (href: string) => organizerPath.startsWith(href);

  return (
    <>
      {/* Top bar - fixed, dark background, logo + hamburger */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 bg-linear-to-b from-[#191919] to-[#222222] shadow-[0px_4px_12px_0px_rgba(17,17,17,0.15)]">
        <Link href={navHref("/organizer")} className="flex items-center shrink-0 h-6 w-[120px] relative">
          <Image
            src="/images/logo_horizontal.png"
            alt="PódioTicket"
            width={120}
            height={120}
            className="size-full object-contain object-left"
          />
        </Link>
        <Drawer open={open} onOpenChange={setOpen} direction="right">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="size-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Abrir menu"
          >
            <Menu className="size-6" />
          </button>
          <DrawerContent className="h-full w-[85%] max-w-[320px] rounded-none flex flex-col p-0 overflow-hidden">
            {/* Header: apenas botão fechar */}
            <div className="flex flex-row items-center justify-between shrink-0 px-4 pt-4 pb-2 bg-[#191919]">
              <span className="relative h-6 w-[120px] shrink-0 block">
                <Image
                  src="/images/logo_organizers_mobile.png"
                  alt="PódioTicket"
                  width={110}
                  height={24}
                  className="size-full object-contain object-left"
                />
              </span>
              <DrawerClose asChild>
                <button
                  type="button"
                  className="size-10 flex items-center justify-center text-white hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="Fechar menu"
                >
                  <Menu className="size-6" />
                </button>
              </DrawerClose>
            </div>
            {/* Bloco perfil – fundo verde (Figma) */}
            <div className="bg-linear-to-r from-[#1D3A24] to-[#141A15] border-y border-[#3E7949] flex flex-col items-center justify-center px-4 py-6 shrink-0">
              <div className="size-16 rounded-full overflow-hidden bg-gray-6 shrink-0 border-2 border-white/20 relative">
                <ImageWithInitialFallback
                  src={
                    user?.avatarUrl?.trim()
                      ? getAvatarUrl(user.avatarUrl)
                      : null
                  }
                  alt={
                    user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "Usuário"
                  }
                  name={
                    user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "Usuário"
                  }
                  fallbackId={user?.id}
                  fill
                  sizes="64px"
                  className="size-full rounded-full"
                  imgClassName="object-cover rounded-full"
                  letterClassName="text-xl font-semibold text-white"
                />
              </div>
              <p className="mt-3 text-white font-manrope font-bold text-base leading-[1.2] text-center truncate w-full max-w-[240px]">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email ?? "Nome do usuário"}
              </p>
              <p className="mt-1 text-[#B4B4B4] text-sm font-family-dm-sans text-center truncate w-full max-w-[240px]">
                {organizer?.name ?? "Nome da organização"}
              </p>
            </div>
            {/* Lista de navegação – fundo escuro, botões arredondados com borda */}
            <div className="flex-1 overflow-y-auto bg-linear-to-b from-[#191919] to-[#222222] px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={navHref(item.href)}
                    onClick={() => setOpen(false)}
                    className={`flex items-center gap-3 h-12 px-4 rounded-lg border border-[#3A3A3A] bg-white/5 transition-colors ${active ? "bg-[#25482D] border-[#25482D] text-[#C2F0C2]" : "text-white hover:bg-white/10 font-family-dm-sans"}`}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openAccessAllOrganizationsModal();
                }}
                className="flex items-center gap-3 h-12 px-4 rounded-lg border border-[#3A3A3A] bg-white/5 text-white hover:bg-white/10 transition-colors text-left font-family-dm-sans"
              >
                <PlusCircleIcon className="size-5 shrink-0" />
                <span className="text-sm font-medium">Trocar organização</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-3 h-12 px-4 rounded-lg border border-[#3A3A3A] bg-white/5 text-white hover:bg-white/10 transition-colors text-left font-family-dm-sans"
              >
                <LogOutIcon className="size-4 shrink-0" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </header>
      {/* Spacer so page content is not under the fixed bar */}
      <div className="md:hidden h-16 shrink-0" />
    </>
  );
}
