"use client";
import { Button } from "../Button";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { Dropdown, DropdownOption } from "../Dropdown";
import { ArrowButton } from "../ArrowButton";
import { SearchBar } from "../SearchBar";
import { LanguageToggle } from "../LanguageToggle";
import { modalitiesColumns } from "@/constants";
import { eventService } from "@/services";
import { useModalStore } from "@/stores/modalStore";
import { formatDateBR } from "@/utils/datetimeBR";
import { User, LogOut, X, Globe } from "lucide-react";
import { TicketIcon } from "../Icons/TicketIcon";
import { InfoIcon } from "../Icons/InfoIcon";
import { TwitterIcon } from "../Icons/TwitterIcon";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { FacebookIcon } from "../Icons/FacebookIcon";
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { UserIcon } from "../Icons/UserIcon";
import { getAvatarUrl } from "@/utils/avatar";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { withAdminPathPrefix } from "@/lib/adminPathPresentation";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { YoutubeIcon } from "../Icons/YoutubeIcon";

function MobileLanguageToggle({ onClose }: { onClose: () => void }) {
  const { language, setLanguage } = useLanguage();

  const languages: Array<{ code: Language; label: string }> = [
    { code: "pt", label: "PT-BR" },
    { code: "en", label: "ENG" },
    { code: "es", label: "ESP" },
  ];

  const dropdownOptions: DropdownOption[] = languages.map((lang) => ({
    id: lang.code,
    label: lang.label,
    onClick: () => {
      setLanguage(lang.code);
      onClose();
    },
  }));

  return (
    <div className="relative">
      <Dropdown
        options={dropdownOptions}
        dataAttribute="mobile-language"
        width="w-full"
        maxHeight="max-h-[200px]"
        className="top-14 left-0 right-0"
        trigger={(isOpen) => (
          <Button variant="outline" className="w-full">
            <Globe className="size-5" />
            <span className="text-base font-medium">Idioma</span>
          </Button>
        )}
        onSelect={(option) => {
          if (option.onClick) {
            option.onClick();
          }
        }}
      />
    </div>
  );
}

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const pathname = usePathname();
  const appSurface = useOrganizerAppSurface();
  const adminSurface = useAdminAppSurface()
  const organizerPath = withOrganizerPathPrefix(pathname, appSurface);
  const adminPath = withAdminPathPrefix(pathname, adminSurface)
  const isOrganizer = organizerPath.startsWith("/organizer");
  const isAdmin = adminPath.includes("/admin");
  const { push } = useRouter();
  const { isAuthenticated, user, logout } = useAuth();
  const { openModal } = useModalStore();

  const userDisplayName = useMemo(() => {
    if (!user) return "";
    const full = `${user.firstName || ""} ${user.lastName || ""}`.trim();
    return full || user.email || "Usuário";
  }, [user]);

  const [searchResults, setSearchResults] = useState<Array<{ id: string; title: string; href: string; logoUrl?: string; location?: string; date?: string }>>([]);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const q = search.trim();
    if (q.length === 0) {
      setSearchResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(async () => {
      try {
        const res = await eventService.searchEvents({ q, limit: 5, status: "PUBLISHED" } as any);
        setSearchResults(
          (res.events || []).map((e: any) => {
            const city: string = e.city || "";
            const state: string = e.state || "";
            const locationParts = [city, state].filter(Boolean);
            const location = locationParts.length > 0 ? locationParts.join(", ") : (e.location || undefined);

            let date: string | undefined;
            const rawDate = e.eventDate || e.event_date;
            if (rawDate) {
              date = formatDateBR(rawDate, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              });
            }

            return {
              id: e.id,
              title: e.name || e.title,
              href: `/events/${e.slug || e.id}`,
              logoUrl: e.logoUrl || e.logo_url || undefined,
              location,
              date,
            };
          })
        );
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
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

  if (isOrganizer || isAdmin) {
    return null;
  }

  return (
    <>
      <header
        className={`w-full fixed top-0 left-0 p-[14px] px-4 md:px-6 z-999 h-[64px] md:h-[68px] border-b border-gray-11 transition-all duration-300 flex items-center justify-center bg-linear-to-r from-[#191919] to-[#222222]`}
      >
        <div className="max-w-[1280px] h-full w-full flex items-center justify-between gap-2 md:gap-4 md:px-0">
          <div className="flex items-center gap-2 md:gap-8 h-full shrink-0">
            <Link href="/" className="flex items-center">
              <div className="size-8 md:w-8 md:h-8 overflow-hidden relative shrink-0">
                <Image
                  src="/images/logo.png"
                  alt="PódioTicket"
                  fill
                  sizes="32px"
                  priority
                  className="size-full"
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

            {isAuthenticated && user ? (
              <Dropdown
                trigger={(isOpen) => (
                  <div className="flex items-center gap-2 cursor-pointer h-full text-gray-2">
                    <ImageWithInitialFallback
                      src={
                        user.avatarUrl?.trim()
                          ? getAvatarUrl(user.avatarUrl)
                          : null
                      }
                      alt={userDisplayName}
                      name={userDisplayName}
                      fallbackId={user.id}
                      width={40}
                      height={40}
                      className="size-10 rounded-full shrink-0 overflow-hidden bg-primary-10"
                      imgClassName="object-cover rounded-full"
                      letterClassName="text-base font-semibold text-gray-12 uppercase"
                    />
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
                    label: "Meus ingressos",
                    onClick: () => {
                      push("/user/tickets");
                    },
                  },
                  {
                    id: "logout",
                    label: "Logout",
                    icon: LogOut,
                    onClick: () => {
                      logout();
                      push("/");
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
                  className="border-[#3A3A3A] text-[#EEEEEE] font-bold font-manrope"
                >
                  Criar conta
                </Button>
                <Button
                  onClick={() => openModal("login")}
                  variant="default"
                  size="default"
                >
                  Entrar
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
                  className={`w-6 h-[2px] rounded-full transition-all duration-300 ease-in-out ${mobileMenuOpen
                    ? "bg-gray-4 rotate-45 translate-y-[10px]"
                    : "bg-gray-4"
                    }`}
                />
                <span
                  className={`w-6 h-[2px] rounded-full transition-all duration-300 ease-in-out ${mobileMenuOpen
                    ? "opacity-0 scale-0"
                    : "bg-gray-4 opacity-100 scale-100"
                    }`}
                />
                <span
                  className={`w-6 h-[2px] rounded-full transition-all duration-300 ease-in-out ${mobileMenuOpen
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
              className="fixed inset-0 z-1000 bg-[rgba(32,32,32,0.9)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div
              className="fixed inset-y-0 right-0 z-1001 w-[336px] bg-[#111] overflow-hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              {/* Header */}
              <div className="bg-[#191919] border-b-2 border-[#3a3a3a] flex items-center justify-between p-4 h-[64px] shrink-0">
                <Link href="/" className="h-5 w-[120px] shrink-0 block relative">
                  <Image
                    src="/images/logo_horizontal.png"
                    alt="PodioTicket"
                    width={120}
                    height={120}
                    className="size-full object-contain object-left"
                  />
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center w-8 h-8 text-[#EEE] hover:opacity-80 transition-opacity"
                  aria-label="Fechar menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto h-[calc(100vh-64px)]">
                {/* Menu Items */}
                <div className="bg-[#222] border-b border-[#3a3a3a] space-y-2 font-family-dm-sans">
                  {isAuthenticated && user ? (
                    <>
                      <button
                        onClick={() => {
                          push("/user");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-[#EEE] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <UserIcon className="size-5 text-[#EEE]" />
                        <span className="text-base font-medium text-[#EEE]">
                          Perfil e configurações
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          push("/user/tickets");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-[#EEE] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <TicketIcon className="w-5 h-5 text-[#EEE]" />
                        <span className="text-base font-medium text-[#EEE]">
                          Meus ingressos
                        </span>
                      </button>
                     {/*  <button className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-[#EEE] hover:bg-[#2a2a2a] transition-colors">
                        <InfoIcon className="w-5 h-5 text-[#EEE]" />
                        <span className="text-base font-medium text-[#EEE]">
                          Central de ajuda
                        </span>
                      </button> */}

                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                          push("/");
                        }}
                        className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-[#EEE] hover:bg-[#2a2a2a] transition-colors"
                      >
                        <LogOut className="w-5 h-5 text-[#EEE]" />
                        <span className="text-base font-medium text-[#EEE]">
                          Sair
                        </span>
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 p-4">
                      <Button
                        onClick={() => {
                          openModal("login");
                          setMobileMenuOpen(false);
                        }}
                        variant="default"
                        size="default"
                        className="w-full"
                      >
                        Entrar
                      </Button>
                      <Button
                        onClick={() => {
                          openModal("register");
                          setMobileMenuOpen(false);
                        }}
                        variant="outline"
                        size="default"
                        className="w-full border-[#3A3A3A] text-[#EEEEEE] font-bold font-manrope"
                      >
                        Criar conta
                      </Button>
                      <MobileLanguageToggle
                        onClose={() => setMobileMenuOpen(false)}
                      />
                    </div>
                  )}
                </div>

                {/* About Section */}
                <div className="w-full flex flex-col md:hidden p-4">
                  {/* Logo */}
                  <div className="mb-4 flex items-center justify-center gap-2">
                    <Image
                      src="/images/left_footer_mobile.png"
                      alt="Footer Left"
                      width={100000}
                      height={100000}
                      draggable={false}
                      className="object-cover w-1/2 h-auto"
                    />
                    <Image
                      src="/images/right_footer_mobile.png"
                      alt="Footer Right"
                      width={100000}
                      height={100000}
                      draggable={false}
                      className=" object-cover w-1/2 h-auto"
                    />
                  </div>

                  {/* Introductory Text */}
                  <p className="font-family-dm-sans text-[#B4B4B4] text-sm text-center leading-relaxed">
                    A PódioTicket é o ponto de encontro de quem vive o esporte. Aqui você encontra seu próximo desafio, reúne os amigos, combina a largada e transforma cada chegada em uma história que merece ser lembrada.
                  </p>

                  {/* Social Media Section */}
                  <div className="text-[#EEE] flex items-center gap-10 w-full my-4 mb-6">
                    <div className="flex-1 h-px bg-[#606060] min-w-0" />
                    <p className="text-start whitespace-nowrap shrink-0">
                      Saiba mais sobre nós
                    </p>
                    <div className="flex-1 h-px bg-[#606060] min-w-0" />
                  </div>
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap shrink-0 mb-4">
                    <Link
                      target="_blank"
                      href="https://www.instagram.com/podioticket"
                      className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
                    >
                      <InstagramIcon className="w-full h-full text-gray-2" />
                    </Link>
                    <Link
                      target="_blank"
                      href="https://x.com/podiotickets"
                      className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
                    >
                      <TwitterIcon className="w-full h-full text-gray-2" />
                    </Link>
                    <Link
                      target="_blank"
                      href="https://www.youtube.com/channel/UCqBDBJJiUulbW2iplU_8SvQ"
                      className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
                    >
                      <YoutubeIcon className="w-full h-full text-gray-2" />
                    </Link>
                  </div>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
