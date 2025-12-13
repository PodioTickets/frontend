"use client";
import { Button } from "../Button";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { Dropdown, DropdownOption } from "../Dropdown";
import { ArrowButton } from "../ArrowButton";
import { SearchBar } from "../SearchBar";
import { LanguageToggle } from "../LanguageToggle";
import { modalitiesColumns, mockEvents } from "@/constants";
import { useModalStore } from "@/stores/modalStore";
import { User, LogOut, LogOutIcon } from "lucide-react";
import { TicketIcon } from "../Icons/TicketIcon";
import { InfoIcon } from "../Icons/InfoIcon";
import { getApiClient } from "@/services/base/ApiClient";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { push } = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { openModal } = useModalStore();

  const searchResults = useMemo(() => {
    if (search.trim().length === 0) return [];

    const query = search.toLowerCase().trim();
    const filtered = mockEvents
      .filter(
        (event) =>
          event.title.toLowerCase().includes(query) ||
          event.organizer.toLowerCase().includes(query) ||
          event.location.city.toLowerCase().includes(query) ||
          event.location.state.toLowerCase().includes(query) ||
          event.description?.toLowerCase().includes(query)
      )
      .slice(0, 5);

    return filtered.map((event) => ({
      id: event.id,
      title: event.title,
      href: `/events/${event.id}`,
    }));
  }, [search]);

  const handleSearch = () => {
    if (search.trim().length > 0) {
      push(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const menuItemVariants = {
    closed: { opacity: 0, y: -10, x: 20 },
    open: { opacity: 1, y: 0, x: 0, transition: { duration: 0.4 } },
  };

  const links = [
    {
      href: "/",
      label: "Calendario de eventos",
      key: "calendar",
    },
    {
      href: "/modalities",
      label: "Modalidades",
      key: "modalities",
    },
  ];

  return (
    <>
      <header
        className={`w-full fixed top-0 left-0 p-[14px] px-4 md:px-6 z-999 h-[64px] md:h-[68px] border-b border-gray-11 transition-all duration-300 flex items-center justify-center bg-linear-to-r from-[#191919] to-[#222222]`}
      >
        <div className="max-w-[1280px] h-full w-full flex items-center justify-between gap-2 md:gap-4 md:px-0">
          <div className="flex items-center gap-2 md:gap-8 h-full shrink-0">
            <Link href="/" className="flex items-center">
              <div className="size-8 md:w-8 md:h-8 rounded-full flex items-center justify-center">
                <Image
                  src="/images/logo.png"
                  alt="Logo"
                  width={10000}
                  height={10000}
                  priority
                  className="size-8 md:w-8 md:h-8"
                />
              </div>
            </Link>

            <div className="hidden lg:flex items-center h-full text-[#B4B4B4] text-sm gap-4">
              <Link
                href="/search"
                className="flex items-center gap-2 hover:text-primary-7 transition-all duration-200"
              >
                Calendário de eventos
              </Link>
              <Dropdown
                options={[
                  ...modalitiesColumns[0],
                  ...modalitiesColumns[1],
                  ...modalitiesColumns[2],
                  ...modalitiesColumns[3],
                ]}
                dataAttribute="modalities"
                width="w-48"
                maxHeight="max-h-[430px]"
                className="top-14"
                trigger={(isOpen) => (
                  <h1 className="flex items-center h-full gap-2 hover:text-primary-7 transition-all duration-200 cursor-pointer">
                    Modalidades
                    <ArrowButton isOpen={isOpen} />
                  </h1>
                )}
              />
            </div>
          </div>
          <div className="flex w-full max-w-[560px] px-4 md:px-0">
            <SearchBar
              search={search}
              setSearch={setSearch}
              results={searchResults}
              onSearch={handleSearch}
            />
          </div>
          <div className="hidden md:flex items-center h-[50px] gap-2">
            <LanguageToggle className="h-[44px]" />

            {isAuthenticated && user ? (
              <Dropdown
                trigger={(isOpen) => (
                  <div className="flex items-center gap-2 cursor-pointer h-full text-gray-2">
                    {user?.avatarUrl ? (
                      <Image
                        src={
                          user?.avatarUrl
                            ? `${getApiClient().getBaseURL()}${user?.avatarUrl}`
                            : "/images/default-avatar.png"
                        }
                        alt="User"
                        width={40}
                        height={40}
                        className="size-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-primary-10 text-gray-12 uppercase flex items-center justify-center font-semibold text-base">
                        {(user as any).firstName?.charAt(0)}
                      </div>
                    )}
                    <ArrowButton isOpen={isOpen} />
                  </div>
                )}
                options={[
                  {
                    id: "profile",
                    label: "Perfil e configurações",
                    icon: User,
                    onClick: () => {
                      push("/user");
                    },
                  },
                  {
                    id: "tickets",
                    icon: TicketIcon,
                    label: "Ingressos",
                    onClick: () => {
                      push("/user/tickets");
                    },
                  },
                  {
                    id: "help",
                    icon: InfoIcon,
                    label: "Central de ajuda",
                  },
                  {
                    id: "logout",
                    label: "Logout",
                    icon: LogOutIcon,
                    onClick: () => {
                      logout();
                    },
                  },
                  {
                    id: "organizer",
                    label:
                      user?.role === "ORGANIZER"
                        ? "Painel de controle"
                        : "organizer",
                    onClick: () => {
                      if (user?.role === "ORGANIZER") {
                        push("/organizer");
                      } else {
                        push("/organizer/create");
                      }
                    },
                  },
                ]}
                position="bottom"
                align="end"
                width="w-[240px]"
                className="right-0 mt-3"
                onSelect={(option) => {
                  if (option.onClick) option.onClick();
                }}
              />
            ) : (
              <>
                <Button
                  onClick={() => openModal("register")}
                  variant="outline"
                  size="default"
                >
                  Cadastrar-se
                </Button>
                <Button
                  onClick={() => openModal("login")}
                  variant="default"
                  size="default"
                >
                  Conectar-se
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center z-50 shrink-0 md:hidden">
            <button
              className="flex items-center justify-center w-10 h-10 relative transition-all duration-300 hover:opacity-80"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              role="button"
            >
              <div className="w-6 h-5 flex flex-col items-center justify-center gap-1.5 relative">
                <span
                  className={`w-6 h-[2px] rounded-full transition-all duration-300 ease-in-out ${
                    mobileMenuOpen
                      ? "bg-gray-4 rotate-45 translate-y-[10px]"
                      : "bg-gray-4"
                  }`}
                />
                <span
                  className={`w-6 h-[2px] rounded-full transition-all duration-300 ease-in-out ${
                    mobileMenuOpen ? "opacity-0 scale-0" : "bg-gray-4 opacity-100 scale-100"
                  }`}
                />
                <span
                  className={`w-6 h-[2px] rounded-full transition-all duration-300 ease-in-out ${
                    mobileMenuOpen
                      ? "bg-gray-4 -rotate-45 -translate-y-[6px]"
                      : "bg-gray-4"
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-gray-2/30 backdrop-blur-md"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-40 w-[85%] max-w-[360px] bg-linear-to-l from-gray-2 to-gray-2 pt-20 px-6 shadow-xl border-l border-gray-6"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              <motion.div
                className="flex flex-col gap-8 py-6 h-full w-full"
                initial="closed"
                animate="open"
                exit="closed"
                variants={{
                  open: {
                    transition: {
                      staggerChildren: 0.1,
                      delayChildren: 0.1,
                    },
                  },
                  closed: {
                    transition: {
                      staggerChildren: 0.05,
                      staggerDirection: -1,
                    },
                  },
                }}
              >
                <motion.div className="flex flex-col gap-4">
                  {links.map((link) => (
                    <motion.div key={link.href} variants={menuItemVariants}>
                      <Link
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-4 text-gray-11 hover:text-gray-11 transition-colors text-xl py-3 border-b border-gray-6"
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

