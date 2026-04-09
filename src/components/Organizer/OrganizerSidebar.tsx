"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { organizerExternalHref } from "@/lib/organizerPathPresentation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { useOrganizerPathname } from "@/hooks/useOrganizerPathname";
import { useAuth } from "@/hooks/useAuth";
import { Home, TrendingUp, Ticket, Settings, FileText, LogOut, ChevronDown, Medal, Sun, HelpCircle, Building2 } from "lucide-react";
import { getAvatarUrl } from "@/utils/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { TicketIcon } from "../Icons/TicketIcon";
import { ArrowButton } from "../ArrowButton";
import { LogOutIcon } from "../Icons/LogOutIcon";
import { organizerService } from "@/services";
import { PlusCircleIcon } from "../Icons/PlusCircleIcon";
import { InfoIcon } from "../Icons/InfoIcon";
import { ConfigIcon } from "../Icons/ConfigIcon";
import { UsersIcon } from "../Icons/Organizer/UsersIcon";
import { useAccessAllOrganizationsModal } from "@/stores/modalStore";
import Image from "next/image";
import { isCurrentUserOrganizationOwner } from "@/utils/organizationOwner";

const OWNER_ONLY_NAV_HREFS = new Set([
  "/organizer/organization/settings",
  "/organizer/team",
]);

export function OrganizerSidebar() {
  const organizerPath = useOrganizerPathname();
  const appSurface = useOrganizerAppSurface();
  const orgNav = useOrganizerNavigate();
  const { user, logout } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [organizer, setOrganizer] = useState<any>(null);
  const { openAccessAllOrganizationsModal } = useAccessAllOrganizationsModal();

  const handleLogout = async () => {
    await logout();
    orgNav.push("/organizer/login");
  };

  useEffect(() => {
    const loadOrganizer = async () => {
      try {
        const org = await organizerService.getOrganization();
        setOrganizer(org);
      } catch (error: any) {
        // Organization might not exist yet, that's okay
        console.error("Error loading organization:", error);
      }
    };
    loadOrganizer();
  }, []);

  const navItems = [
    {
      label: "Eventos",
      href: "/organizer/events",
      icon: TicketIcon,
    },
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

  const isOrgOwner = isCurrentUserOrganizationOwner(organizer, user?.id);
  const visibleNavItems = navItems.filter(
    (item) => !OWNER_ONLY_NAV_HREFS.has(item.href) || isOrgOwner,
  );

  const navHref = (internal: string) =>
    organizerExternalHref(internal, appSurface);

  const isActive = (href: string) => {
    if (href === "/organizer") {
      return organizerPath === "/organizer" || organizerPath === "/organizer/";
    }
    return organizerPath.startsWith(href);
  };

  return (
    <aside className="hidden md:flex bg-linear-to-b from-[#191919] to-[#222222] w-[218px] h-screen flex-col items-start justify-between px-4 py-8 shadow-[0px_4px_12px_0px_rgba(17,17,17,0.15)] fixed left-0 top-0 z-40">
      {/* Top Section */}
      <div className="flex flex-col gap-10 items-start w-full">
        {/* Logo */}
        <Link href={navHref("/organizer")} className="flex items-center gap-2 min-w-0">
          <Image
            src="/images/logo_organizers.png"
            alt="PódioTicket"
            width={10000000}
            height={10000000}
            className="object-cover w-full"
            priority
          />
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1 w-full">
          {visibleNavItems.map((item) => {
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
                      backgroundColor: active ? "#25482D" : "rgba(0, 0, 0, 0)",
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

      {/* Bottom Section */}
      <div className="flex flex-col gap-2.5 items-start w-full">
        {/* Profile Button */}
        <div className="relative w-full">
          <button
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
                      : user?.email || "Usuário"
                  }
                  name={
                    user?.firstName && user?.lastName
                      ? `${user.firstName} ${user.lastName}`
                      : user?.email || "Usuário"
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
                <p className="text-[#B4B4B4] text-sm font-medium font-family-dm-sans leading-[1.3] truncate w-full">
                  {organizer?.name || "Nome organização"}
                </p>
              </div>
            </div>
            <div className="content-stretch flex flex-col items-start justify-center relative shrink-0 pr-3">
              <div className="flex items-center justify-center relative shrink-0 text-[#B4B4B4] -rotate-90">
                <ArrowButton isOpen={!isProfileOpen} />
              </div>
            </div>
          </button>

          {/* Profile Menu - Matching Figma Design */}
          <AnimatePresence>
            {isProfileOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setIsProfileOpen(false);
                    setIsUserMenuOpen(false);
                    setIsOrgMenuOpen(false);
                  }}
                />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute bg-gray-1 bottom-full left-0 mb-2 flex flex-col gap-0 items-start overflow-hidden rounded-[12px] shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)] w-min z-50"
                >


                  {/* Organization Entry */}
                  {organizer && (
                    <div className="relative w-full">
                      <button
                        onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
                        className="border-b border-gray-6 flex items-center justify-between p-[12px] relative shrink-0 w-full hover:bg-gray-3 transition-colors"
                      >
                        <div className="flex flex-1 gap-[8px] items-center min-w-0">
                          <div className="relative shrink-0 size-[36px] rounded-full overflow-hidden bg-gray-6">
                            <ImageWithInitialFallback
                              src={(() => {
                                const url =
                                  organizer?.logoUrl || organizer?.avatarUrl;
                                return url?.trim()
                                  ? getAvatarUrl(url)
                                  : null;
                              })()}
                              alt={organizer.name || "Organização"}
                              name={organizer.name || "Organização"}
                              fallbackId={organizer.id}
                              fill
                              sizes="36px"
                              className="size-full rounded-full"
                              imgClassName="object-cover"
                              letterClassName="text-sm font-medium text-gray-11"
                            />
                          </div>
                          <div className="flex flex-1 flex-col items-start justify-start min-w-0">
                            <p className="font-family-dm-sans font-normal text-[14px] text-gray-11 leading-[1.3] truncate">
                              {organizer?.name || "Nome organização"}
                            </p>
                          </div>
                        </div>
                      </button>

                      {/* Organization Dropdown Menu */}
                      <AnimatePresence>
                        {isOrgMenuOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -5 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bg-gray-3 top-0 left-full -ml-px flex flex-col gap-[4px] items-start overflow-hidden rounded-[8px] w-[140px] z-50"
                          >
                            <button className="flex gap-[4px] items-center px-[8px] py-[12px] relative shrink-0 w-[123.5px] hover:bg-gray-4 transition-colors">
                              <Medal className="size-[24px] text-gray-11 shrink-0" />
                              <p className="flex-1 font-family-dm-sans font-normal text-[14px] text-gray-11 leading-[1.3] whitespace-pre-wrap">
                                Upgrade to Pro
                              </p>
                            </button>
                            <div className="bg-gray-6 h-px shrink-0 w-[140px]" />
                            <div className="flex flex-col items-start relative shrink-0 w-[140px]">
                              <Link
                                href={navHref("/organizer/settings")}
                                className="flex gap-[4px] items-center px-[8px] py-[12px] relative shrink-0 w-full hover:bg-gray-4 transition-colors"
                                onClick={() => {
                                  setIsProfileOpen(false);
                                  setIsOrgMenuOpen(false);
                                }}
                              >
                                <Settings className="size-[24px] text-gray-11 shrink-0" />
                                <p className="flex-1 font-family-dm-sans font-normal text-[14px] text-gray-11 leading-[1.3] whitespace-pre-wrap">
                                  Configurações
                                </p>
                              </Link>
                              <Link
                                href={navHref("/organizer/documentation")}
                                className="flex gap-[4px] items-center px-[8px] py-[12px] relative shrink-0 w-full hover:bg-gray-4 transition-colors"
                                onClick={() => {
                                  setIsProfileOpen(false);
                                  setIsOrgMenuOpen(false);
                                }}
                              >
                                <FileText className="size-[24px] text-gray-11 shrink-0" />
                                <p className="flex-1 font-family-dm-sans font-normal text-[14px] text-gray-11 leading-[1.3] whitespace-pre-wrap">
                                  Documentação
                                </p>
                              </Link>
                            </div>
                            <div className="bg-gray-6 h-px shrink-0 w-[140px]" />
                            <button
                              onClick={handleLogout}
                              className="flex gap-[4px] items-center px-[8px] py-[12px] relative shrink-0 w-[123.5px] hover:bg-gray-4 transition-colors"
                            >
                              <LogOutIcon className="size-[24px] text-red-11 shrink-0" />
                              <p className="flex-1 font-family-dm-sans font-normal text-[14px] text-red-11 leading-[1.3] whitespace-pre-wrap">
                                Sair
                              </p>
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Bottom Options */}
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      openAccessAllOrganizationsModal();
                    }}
                    className="border-b border-gray-6 flex gap-[8px] h-[44px] items-center overflow-clip px-[12px] py-[16px] relative shrink-0 w-full hover:bg-gray-3 transition-colors cursor-pointer"
                  >
                    <PlusCircleIcon className="size-[24px] text-gray-12 shrink-0" />
                    <p className="font-family-dm-sans font-medium text-[14px] text-gray-12 leading-[1.3] text-center whitespace-nowrap">
                      Acesse todas as organizações
                    </p>
                  </button>
                  <Link
                    href={navHref("/organizer/settings")}
                    className="border-b border-gray-6 flex gap-[8px] h-[44px] items-center overflow-clip px-[12px] py-[16px] relative shrink-0 w-full hover:bg-gray-3 transition-colors"
                    onClick={() => setIsProfileOpen(false)}
                  >
                    <ConfigIcon className="size-6 text-gray-12 shrink-0" />
                    <p className="font-family-dm-sans font-medium text-[14px] text-gray-12 leading-[1.3] text-center whitespace-nowrap">
                      Configurações
                    </p>
                  </Link>
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
          <span className="text-red-10 text-sm font-normal font-family-dm-sans leading-[1.3]">
            Desconectar
          </span>
        </button>
      </div>
    </aside>
  );
}
