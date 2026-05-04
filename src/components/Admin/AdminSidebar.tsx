"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Megaphone, TrendingUp } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { TicketIcon } from "@/components/Icons/TicketIcon";
import { LogOutIcon } from "@/components/Icons/LogOutIcon";
import Image from "next/image";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { adminExternalHref } from "@/lib/adminPathPresentation";
import { useAdminPathname } from "@/hooks/useAdminPathname";

const NAV_ITEMS = [
  { label: "Eventos", href: "/admin/events", icon: TicketIcon },
  { label: "Repasse", href: "/admin/repasse", icon: TrendingUp },
  { label: "Anúncios", href: "/admin/anuncios", icon: Megaphone },
  { label: "Logs", href: "/admin/logs", icon: FileText },
] as const;

export function AdminSidebar() {
  const adminPath = useAdminPathname();
  const adminSurface = useAdminAppSurface();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navHref = (internal: string) => adminExternalHref(internal, adminSurface);

  const handleLogout = async () => {
    await logout();
    router.push(navHref("/admin/login"));
  };

  const isActive = (href: string) => adminPath.startsWith(href);

  return (
    <aside className="hidden md:flex bg-linear-to-b from-[#191919] to-[#222222] w-[218px] h-screen flex-col items-start justify-between px-4 py-8 shadow-[0px_4px_12px_0px_rgba(17,17,17,0.15)] fixed left-0 top-0 z-40">
      <div className="flex flex-col gap-10 items-start w-full">
        <Link href={navHref("/admin")} className="flex items-center gap-2 min-w-0">
          <Image
            src="/images/logo_admin.png"
            alt="PódioTicket"
            width={10000000}
            height={10000000}
            className="object-cover w-full"
            priority
          />
        </Link>

        <nav className="flex flex-col gap-1 w-full">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;

            return (
              <motion.div
                key={item.href}
                whileHover={{ backgroundColor: "#25482D" }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="relative rounded"
              >
                <Link
                  href={navHref(item.href)}
                  className="content-center flex gap-2 h-10 items-center px-3 py-3 relative rounded"
                >
                  <motion.div
                    animate={{
                      backgroundColor: active ? "#25482D" : "transparent",
                    }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="absolute inset-0 rounded"
                  />
                  <AnimatePresence mode="wait">
                    {active && (
                      <motion.div
                        initial={{ opacity: 0, scaleX: 0, x: -4 }}
                        animate={{ opacity: 1, scaleX: 1, x: 0 }}
                        exit={{ opacity: 0, scaleX: 0, x: -4 }}
                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                        className="w-1 h-4 bg-[#C2F0C2] rounded-full z-10 origin-left"
                      />
                    )}
                  </AnimatePresence>
                  <motion.div
                    key={`icon-${item.href}-${active}`}
                    initial={
                      active
                        ? { opacity: 0.7, x: -4, color: "#B4B4B4" }
                        : { opacity: 1, x: 0, color: "#C2F0C2" }
                    }
                    animate={{
                      color: active ? "#C2F0C2" : "#B4B4B4",
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1],
                      delay: active ? 0.05 : 0,
                    }}
                    className="relative z-10"
                    style={{ color: active ? "#C2F0C2" : "#B4B4B4" }}
                  >
                    <Icon className="size-5 shrink-0" />
                  </motion.div>
                  <motion.span
                    key={`text-${item.href}-${active}`}
                    initial={
                      active
                        ? { opacity: 0.7, x: -4, color: "#B4B4B4" }
                        : { opacity: 1, x: 0, color: "#C2F0C2" }
                    }
                    animate={{
                      color: active ? "#C2F0C2" : "#B4B4B4",
                      opacity: 1,
                      x: 0,
                    }}
                    transition={{
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1],
                      delay: active ? 0.1 : 0,
                    }}
                    className="text-sm font-normal font-family-dm-sans leading-[1.3] relative z-10"
                    style={{ color: active ? "#C2F0C2" : "#B4B4B4" }}
                  >
                    {item.label}
                  </motion.span>
                </Link>
              </motion.div>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-2.5 items-start w-full">
        <div className="relative w-full">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="content-stretch flex items-center justify-between py-2 relative rounded-lg w-full hover:bg-[#25482D] transition-colors"
          >
            <div className="content-stretch flex flex-1 gap-2 items-center min-w-0 px-3">
              <div className="relative shrink-0 size-9 rounded-full overflow-hidden bg-gray-6 border border-gray-10">
                <ImageWithInitialFallback
                  src={
                    user?.avatarUrl?.trim()
                      ? getAvatarUrl(user.avatarUrl)
                      : null
                  }
                  alt={
                    user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "Admin"
                  }
                  name={
                    user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "Admin"
                  }
                  fallbackId={user?.id}
                  fill
                  sizes="36px"
                  className="size-full rounded-full"
                  imgClassName="object-cover rounded-full"
                  letterClassName="text-sm font-medium text-[#B4B4B4]"
                />
              </div>
              <div className="content-stretch flex flex-1 flex-col items-start justify-center min-w-0">
                <p className="text-[#B4B4B4] text-xs font-normal font-family-dm-sans leading-[1.3] truncate w-full">
                  Administração
                </p>
                <p className="text-[#C2F0C2] text-sm font-medium font-family-dm-sans leading-[1.3] truncate w-full">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "Área admin"}
                </p>
              </div>
            </div>
          </button>

          <AnimatePresence>
            {isProfileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setIsProfileOpen(false)}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bg-gray-1 bottom-full left-0 mb-2 flex flex-col gap-0 items-start overflow-hidden rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full min-w-[200px] z-50"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      void handleLogout();
                    }}
                    className="flex gap-[8px] items-center px-[12px] py-[12px] relative shrink-0 w-full hover:bg-gray-3 transition-colors"
                  >
                    <LogOutIcon className="size-[24px] text-red-11 shrink-0" />
                    <p className="flex-1 font-family-dm-sans font-normal text-[14px] text-red-11 leading-[1.3] text-left">
                      Sair
                    </p>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <button
          type="button"
          onClick={() => void handleLogout()}
          className="content-center flex gap-1 h-[41px] items-center px-3 py-3 relative rounded w-full hover:bg-[#25482D] transition-colors"
        >
          <LogOutIcon className="size-4 text-red-10 shrink-0" />
          <span className="text-red-10 text-sm font-normal font-family-dm-sans leading-[1.3]">
            Desconectar
          </span>
        </button>
      </div>
    </aside>
  );
}
