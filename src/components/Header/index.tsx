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
import { User, LogOut, X, Globe } from "lucide-react";
import { TicketIcon } from "../Icons/TicketIcon";
import { InfoIcon } from "../Icons/InfoIcon";
import { TwitterIcon } from "../Icons/TwitterIcon";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { FacebookIcon } from "../Icons/FacebookIcon";
import { MedalIcon } from "../Icons/MedalIcon";
import { SneakersIcon } from "../Icons/SneakersIcon";
import { getApiClient } from "@/services/base/ApiClient";
import { useLanguage, Language } from "@/contexts/LanguageContext";

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
                    icon: LogOut,
                    onClick: () => {
                      logout();
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
                    mobileMenuOpen
                      ? "opacity-0 scale-0"
                      : "bg-gray-4 opacity-100 scale-100"
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
                <Link href="/" className="h-5">
                  <Image
                    src="/images/logo_horizontal.png"
                    alt="PodioTicket"
                    width={117}
                    height={20}
                    className="h-5 w-auto"
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
                <div className="bg-[#222] border-b border-[#3a3a3a] p-4 space-y-2">
                  {isAuthenticated && user ? (
                    <>
                      <button
                        onClick={() => {
                          push("/user");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-gray-12 hover:bg-[#2a2a2a] transition-colors"
                      >
                        <User className="w-5 h-5 text-gray-12" />
                        <span className="text-base font-medium text-gray-12">
                          Perfil e configurações
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          push("/user/tickets");
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-gray-12 hover:bg-[#2a2a2a] transition-colors"
                      >
                        <TicketIcon className="w-5 h-5 text-gray-12" />
                        <span className="text-base font-medium text-gray-12">
                          Ingressos
                        </span>
                      </button>
                      <button className="w-full flex gap-2 items-center h-[52px] px-4 border-b border-[#3a3a3a] text-gray-12 hover:bg-[#2a2a2a] transition-colors">
                        <InfoIcon className="w-5 h-5 text-gray-12" />
                        <span className="text-base font-medium text-gray-12">
                          Central de ajuda
                        </span>
                      </button>
                      <MobileLanguageToggle
                        onClose={() => setMobileMenuOpen(false)}
                      />
                      <button
                        onClick={() => {
                          logout();
                          setMobileMenuOpen(false);
                        }}
                        className="w-full flex gap-2 items-center h-[52px] px-4 text-gray-12 hover:bg-[#2a2a2a] transition-colors"
                      >
                        <LogOut className="w-5 h-5 text-gray-12" />
                        <span className="text-base font-medium text-gray-12">
                          Sair
                        </span>
                      </button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => openModal("login")}
                        variant="default"
                        size="default"
                        className="w-full"
                      >
                        Conectar-se
                      </Button>
                      <Button
                        onClick={() => openModal("register")}
                        variant="outline"
                        size="default"
                        className="w-full"
                      >
                        Cadastrar-se
                      </Button>
                      <MobileLanguageToggle
                        onClose={() => setMobileMenuOpen(false)}
                      />
                    </>
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
                    PodioTicket é o ponto de encontro de quem vibra por esporte,
                    onde você descobre o próximo desafio, junta a galera,
                    combina a largada e transforma cada chegada em uma memória
                    que dá vontade de repetir
                  </p>

                  {/* Social Media Section */}
                  <div className="text-[#EEE] flex items-center gap-10 w-full my-4 mb-6">
                    <div className="flex-1 h-px bg-[#606060] min-w-0" />
                    <p className="text-start whitespace-nowrap shrink-0">
                      Nós conheça mais
                    </p>
                    <div className="flex-1 h-px bg-[#606060] min-w-0" />
                  </div>
                  <div className="flex items-center justify-center gap-2 whitespace-nowrap shrink-0 mb-4">
                    <Link
                      href="https://www.instagram.com/podiotickets/"
                      className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
                    >
                      <InstagramIcon className="w-full h-full text-gray-2" />
                    </Link>
                    <Link
                      href="https://x.com/podiotickets"
                      className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
                    >
                      <TwitterIcon className="w-full h-full text-gray-2" />
                    </Link>
                    <Link
                      href="https://www.facebook.com/podiotickets"
                      className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
                    >
                      <FacebookIcon className="w-full h-full text-gray-2" />
                    </Link>
                  </div>

                  {/* Information Blocks */}
                  <div className="flex flex-col gap-3 mb-6">
                    {/* Participantes */}
                    <div className="bg-[#191919] border border-[#3A3A3A] rounded-lg p-4">
                      <h4 className="text-white font-bold text-sm mb-3">
                        Participantes
                      </h4>
                      <ul className="flex flex-col gap-2">
                        <li>
                          <button
                            onClick={() => openModal("login")}
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm text-left"
                          >
                            Login
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => openModal("register")}
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm text-left"
                          >
                            Cadastre-se
                          </button>
                        </li>
                        <li>
                          <Link
                            href="/help"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Central de ajuda
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/terms"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Termos de compra
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Organizadores */}
                    <div className="bg-[#191919] border border-[#3A3A3A] rounded-lg p-4">
                      <h4 className="text-white font-bold text-sm mb-3">
                        Organizadores
                      </h4>
                      <ul className="flex flex-col gap-2">
                        <li>
                          <Link
                            href="/organizer/create"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Solicite um orçamento
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/organizer"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Painel do Organizador
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/organizer/support"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Suporte
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Empresa */}
                    <div className="bg-[#191919] border border-[#3A3A3A] rounded-lg p-4">
                      <h4 className="text-white font-bold text-sm mb-3">
                        Empresa
                      </h4>
                      <ul className="flex flex-col gap-2">
                        <li>
                          <Link
                            href="/about"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Sobre nós
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/careers"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Trabalhe conosco
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/privacy"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Política de privacidade
                          </Link>
                        </li>
                        <li>
                          <Link
                            href="/terms"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Termos de uso
                          </Link>
                        </li>
                      </ul>
                    </div>

                    {/* Grupos esportivos */}
                    <div className="bg-[#191919] border border-[#3A3A3A] rounded-lg p-4">
                      <h4 className="text-white font-bold text-sm mb-3">
                        Grupos esportivos
                      </h4>
                      <ul className="flex flex-col gap-2">
                        <li>
                          <button
                            onClick={() => openModal("login")}
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm text-left"
                          >
                            Login
                          </button>
                        </li>
                        <li>
                          <button
                            onClick={() => openModal("register")}
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm text-left"
                          >
                            Cadastre-se
                          </button>
                        </li>
                        <li>
                          <Link
                            href="/help"
                            className="text-[#B4B4B4] hover:text-white transition-colors text-sm"
                          >
                            Central de Ajuda
                          </Link>
                        </li>
                      </ul>
                    </div>
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
