"use client";
import { Button } from "../Button";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";
import { Dropdown } from "../Dropdown";
import { ArrowButton } from "../ArrowButton";
import { SearchBar } from "../SearchBar";
import { LanguageToggle } from "../LanguageToggle";
import { modalitiesColumns } from "@/constants";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { push } = useRouter();
  const { isAuthenticated, user } = useAuth();

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
        className={`w-full fixed top-0 left-0 p-[14px] px-6 z-9999 h-[64px] md:h-[68px] border-b border-gray-11 transition-all duration-300 flex items-center justify-center bg-linear-to-r from-[#191919] to-[#222222]`}
      >
        <div className="max-w-screen-2xl h-full w-full flex items-center justify-between md:px-0">
          <div className="flex items-center gap-8 h-full">
            <Link href="/">
              <Image
                src="/images/logo.png"
                alt="Logo"
                width={32}
                height={32}
                priority
              />
            </Link>

            <div className="hidden lg:flex items-center h-full text-[#B4B4B4] text-sm gap-4">
              <Link
                href="/events"
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
          <div className="hidden md:flex w-full max-w-[560px]">
            <SearchBar search={search} setSearch={setSearch} />
          </div>
          <div className="hidden md:flex items-center h-[50px] gap-2">
            <LanguageToggle className="h-[44px]" />
            <Button
              onClick={() => push("/login")}
              variant="outline"
              size="default"
            >
              Cadastrar-se
            </Button>
            {isAuthenticated && user ? (
              <Button variant="default" size="default" className="h-full">
                Logout
              </Button>
            ) : (
              <Button
                onClick={() => push("/login")}
                variant="default"
                size="default"
              >
                Conectar-se
              </Button>
            )}
          </div>
          <div className="md:hidden flex items-center z-50">
            <button
              className={`flex flex-col items-center justify-center w-10 h-10 rounded-full relative transition-colors ${
                mobileMenuOpen ? "bg-primary-10/20" : "hover:bg-gray-6/50"
              }`}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
              role="button"
            >
              <div className="w-8 h-8 flex items-center justify-center relative">
                <span
                  className={`absolute h-[2px] rounded-full ${
                    mobileMenuOpen
                      ? "bg-primary-10"
                      : "bg-linear-to-r from-primary-2 to-primary-10"
                  }`}
                />
                <span
                  className={`absolute h-[2px] rounded-full ${
                    mobileMenuOpen
                      ? "bg-primary-10"
                      : "bg-linear-to-r from-primary-2 to-primary-10"
                  }`}
                />
                <span
                  className={`absolute h-[2px] rounded-full ${
                    mobileMenuOpen
                      ? "bg-primary-10"
                      : "bg-linear-to-r from-primary-2 to-primary-10"
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
