"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Megaphone, Menu, TrendingUp } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import { Drawer, DrawerClose, DrawerContent } from "@/components/ui/drawer";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { LogOutIcon } from "@/components/Icons/LogOutIcon";

const navItems = [
  { label: "Eventos", href: "/admin/events", icon: TicketIcon },
  { label: "Repasse", href: "/admin/repasse", icon: TrendingUp },
  { label: "Anúncios", href: "/admin/anuncios", icon: Megaphone },
  { label: "Logs", href: "/admin/logs", icon: FileText },
] as const;

export function AdminMobileNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
    router.push("/");
  };

  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <>
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-16 flex items-center justify-between px-4 bg-linear-to-b from-[#191919] to-[#222222] shadow-[0px_4px_12px_0px_rgba(17,17,17,0.15)]">
        <Link href="/admin" className="flex items-center shrink-0">
          <Image
            src="/images/logo_horizontal.png"
            alt="PódioTicket"
            width={24}
            height={24}
            className="h-6 w-auto"
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
            <div className="flex flex-row items-center justify-between shrink-0 px-4 pt-4 pb-2 bg-[#191919]">
              <Image
                src="/images/logo_horizontal.png"
                alt="PódioTicket"
                width={24}
                height={24}
                className="h-6 w-auto"
              />
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
            <div className="bg-linear-to-r from-[#1D3A24] to-[#141A15] border-y border-[#3E7949] flex flex-col items-center justify-center px-4 py-6 shrink-0">
              <div className="size-16 rounded-full overflow-hidden bg-gray-6 shrink-0 border-2 border-white/20">
                {user?.avatarUrl ? (
                  <Image
                    src={getAvatarUrl(user.avatarUrl)}
                    alt=""
                    width={64}
                    height={64}
                    className="object-cover size-full"
                  />
                ) : (
                  <div className="size-full flex items-center justify-center text-white text-xl font-semibold">
                    {user?.firstName?.[0]?.toUpperCase() || "A"}
                  </div>
                )}
              </div>
              <p className="mt-3 text-white font-manrope font-bold text-base leading-[1.2] text-center truncate w-full max-w-[240px]">
                {user?.firstName && user?.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user?.email ?? "Área administrativa"}
              </p>
              <p className="mt-1 text-[#B4B4B4] text-sm font-family-dm-sans text-center truncate w-full max-w-[240px]">
                PódioTicket Admin
              </p>
            </div>
            <div className="flex-1 overflow-y-auto bg-linear-to-b from-[#191919] to-[#222222] px-4 py-4 flex flex-col gap-2">
              {navItems.map((item) => {
                const active = isActive(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
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
                onClick={() => void handleLogout()}
                className="flex items-center gap-3 h-12 px-4 rounded-lg border border-[#3A3A3A] bg-white/5 text-white hover:bg-white/10 transition-colors text-left font-family-dm-sans"
              >
                <LogOutIcon className="size-4 shrink-0" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </DrawerContent>
        </Drawer>
      </header>
      <div className="md:hidden h-16 shrink-0" />
    </>
  );
}
