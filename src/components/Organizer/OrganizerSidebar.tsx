"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Home, TrendingUp, Ticket, Settings, FileText, LogOut, ChevronDown, Medal } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { TicketIcon } from "../Icons/TicketIcon";
import { ArrowButton } from "../ArrowButton";
import { LogOutIcon } from "../Icons/LogOutIcon";

export function OrganizerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push("/");
  };

  const navItems = [
    {
      label: "Início",
      href: "/organizer",
      icon: Home,
    },
    {
      label: "Financeiro",
      href: "/organizer/financial",
      icon: TrendingUp,
    },
    {
      label: "Eventos",
      href: "/organizer/events",
      icon: TicketIcon,
    },
  ];

  const isActive = (href: string) => {
    if (href === "/organizer") {
      return pathname === "/organizer";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="bg-linear-to-b from-[#191919] to-[#222222] w-[218px] h-screen flex flex-col items-start justify-between px-4 py-8 shadow-[0px_4px_12px_0px_rgba(17,17,17,0.15)] fixed left-0 top-0 z-50">
      {/* Top Section */}
      <div className="flex flex-col gap-10 items-start w-full">
        {/* Logo */}
        <Link href="/organizer" className="flex items-center gap-[5.057px]">
          <Image
            src="/images/logo_horizontal.png"
            alt="PódioTicket"
            width={24}
            height={24}
            className="h-6 w-auto shrink-0"
          />
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 w-full">
          {navItems.map((item) => {
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
                  href={item.href}
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
                    initial={active ? { opacity: 0.7, x: -4, color: "#B4B4B4" } : { opacity: 1, x: 0, color: "#C2F0C2" }}
                    animate={{
                      color: active ? "#C2F0C2" : "#B4B4B4",
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0.7,
                      x: -4,
                      color: "#B4B4B4",
                    }}
                    transition={{
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1],
                      delay: active ? 0.05 : 0
                    }}
                    className="relative z-10"
                    style={{ color: active ? "#C2F0C2" : "#B4B4B4" }}
                  >
                    <Icon className="size-5 shrink-0" />
                  </motion.div>
                  <motion.span
                    key={`text-${item.href}-${active}`}
                    initial={active ? { opacity: 0.7, x: -4, color: "#B4B4B4" } : { opacity: 1, x: 0, color: "#C2F0C2" }}
                    animate={{
                      color: active ? "#C2F0C2" : "#B4B4B4",
                      opacity: 1,
                      x: 0,
                    }}
                    exit={{
                      opacity: 0.7,
                      x: -4,
                      color: "#B4B4B4",
                    }}
                    transition={{
                      duration: 0.25,
                      ease: [0.4, 0, 0.2, 1],
                      delay: active ? 0.1 : 0
                    }}
                    className="text-sm font-normal font-dm-sans leading-[1.3] relative z-10"
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

      {/* Bottom Section */}
      <div className="flex flex-col gap-2.5 items-start w-full">
        {/* Profile Button */}
        <div className="relative w-full">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="content-stretch flex items-center justify-between py-2 relative rounded-lg w-full hover:bg-[#25482D] transition-colors"
          >
            <div className="content-stretch flex flex-1 gap-2 items-center min-w-0 px-3">
              <div className="relative shrink-0 size-9 rounded-full overflow-hidden bg-gray-6">
                {user?.avatarUrl ? (
                  <Image
                    src={getAvatarUrl(user.avatarUrl)}
                    alt={user.firstName || "User"}
                    fill
                    className="object-cover border border-gray-10 rounded-full"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-6">
                    <span className="text-[#B4B4B4] text-sm font-medium">
                      {user?.firstName?.[0]?.toUpperCase() || "O"}
                    </span>
                  </div>
                )}
              </div>
              <div className="content-stretch flex flex-1 flex-col items-start justify-center min-w-0">
                <p className="text-[#B4B4B4] text-sm font-medium font-dm-sans leading-[1.3] truncate w-full">
                  {user?.firstName && user?.lastName
                    ? `${user.firstName} ${user.lastName}`
                    : user?.email || "Nome organização"}
                </p>
              </div>
            </div>
            <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 pr-3">
              <div className="flex items-center justify-center relative shrink-0 text-[#B4B4B4] -rotate-90">
                <ArrowButton isOpen={!isProfileOpen} />
              </div>
            </div>
          </button>

          {/* Profile Dropdown */}
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
                  className="absolute bg-gray-12 bottom-full left-0 mb-2 flex flex-col gap-0 items-start overflow-hidden rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-full z-50"
                >
                  <button className="content-stretch flex gap-1 items-center px-2 py-3 relative shrink-0 w-full hover:bg-gray-4 transition-colors">
                    <Medal className="size-4 text-gray-11 shrink-0" />
                    <p className="text-gray-11 text-sm font-normal font-dm-sans leading-[1.3]">
                      Upgrade to Pro
                    </p>
                  </button>
                  <div className="bg-gray-6 h-px shrink-0 w-full" />
                  <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
                    <Link
                      href="/organizer/settings"
                      className="content-stretch flex gap-1 items-center px-2 py-3 relative shrink-0 w-full hover:bg-gray-4 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <Settings className="size-4 text-gray-11 shrink-0" />
                      <p className="text-gray-11 text-sm font-normal font-dm-sans leading-[1.3]">
                        Settings
                      </p>
                    </Link>
                    <Link
                      href="/organizer/documentation"
                      className="content-stretch flex gap-1 items-center px-2 py-3 relative shrink-0 w-full hover:bg-gray-4 transition-colors"
                      onClick={() => setIsProfileOpen(false)}
                    >
                      <FileText className="size-4 text-gray-11 shrink-0" />
                      <p className="text-gray-11 text-sm font-normal font-dm-sans leading-[1.3]">
                        Documentation
                      </p>
                    </Link>
                  </div>
                  <div className="bg-gray-6 h-px shrink-0 w-full" />
                  <button
                    onClick={handleLogout}
                    className="content-stretch flex gap-1 items-center px-2 py-3 relative shrink-0 w-full hover:bg-gray-4 transition-colors"
                  >
                    <LogOutIcon className="size-4 text-red-10 shrink-0" />
                    <p className="text-red-10 text-sm font-normal font-dm-sans leading-[1.3]">
                      Logout
                    </p>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Disconnect Button */}
        <button
          onClick={handleLogout}
          className="content-center flex gap-1 h-[41px] items-center px-3 py-3 relative rounded w-full hover:bg-[#25482D] transition-colors"
        >
          <LogOutIcon className="size-4 text-red-10 shrink-0" />
          <span className="text-red-10 text-sm font-normal font-dm-sans leading-[1.3]">
            Desconectar
          </span>
        </button>
      </div>
    </aside>
  );
}
