"use client";
import Image from "next/image";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { TwitterIcon } from "../Icons/TwitterIcon";
import { FacebookIcon } from "../Icons/FacebookIcon";
import Link from "next/link";
import { useModalStore } from "@/stores/modalStore";
import { usePathname } from "next/navigation";

export function Footer() {
  const { openModal } = useModalStore();
  const pathname = usePathname();
  const isOrganizer = pathname.startsWith("/organizer");

  if (isOrganizer) {
    return null;
  }

  return (
    <footer className="w-full relative flex flex-col items-center justify-start overflow-hidden bg-linear-to-b from-[#191919] to-[#222222] border-t border-gray-6 px-4 py-6 md:p-20 md:pt-[52px]">
      {/* Mobile Layout */}
      <div className="w-full flex flex-col md:hidden">
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
        <p className="font-family-dm-sans text-white text-sm text-center leading-relaxed">
          PodioTicket é o ponto de encontro de quem vibra por esporte, onde você
          descobre o próximo desafio, junta a galera, combina a largada e
          transforma cada chegada em uma memória que dá vontade de repetir
        </p>

        {/* Social Media Section */}
        <div className="text-white flex items-center gap-10 w-full my-4 mb-6">
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
            <h4 className="text-white font-bold text-sm mb-3">Participantes</h4>
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
            <h4 className="text-white font-bold text-sm mb-3">Organizadores</h4>
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
            <h4 className="text-white font-bold text-sm mb-3">Empresa</h4>
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

        {/* Copyright Mobile */}
        <p className="text-white text-xs text-center">
          © 2025 - Todos os direitos reservados para PódioTicket
        </p>
      </div>

      {/* Desktop Layout - Original */}
      <div className="hidden md:flex flex-col items-center justify-center w-full h-full z-10">
        <Image
          src="/images/left_footer.png"
          alt="Footer Left"
          width={100000}
          height={100000}
          draggable={false}
          className="absolute top-8 left-0 object-cover w-[25%] h-auto"
        />
        <Image
          src="/images/right_footer.png"
          alt="Footer Right"
          width={100000}
          height={100000}
          draggable={false}
          className="absolute top-8 right-0 object-cover w-[25%] h-auto"
        />
        <div className="flex flex-col items-center justify-between h-full w-full max-w-[45%]">
          <Image
            src="/images/logo_horizontal.png"
            alt="Logo"
            width={164}
            height={44}
            className="object-cover"
            draggable={false}
          />

          <p className="font-family-dm-sans text-center text-[#B4B4B4] mt-6">
            PodioTicket é o ponto de encontro de quem vibra por esporte, onde
            você descobre o próximo desafio, junta a galera, combina a largada e
            transforma cada chegada em uma memória que dá vontade de repetir
          </p>
        </div>

        <div className="text-[#B4B4B4] flex items-center gap-10 w-full my-20">
          <p className="text-start whitespace-nowrap shrink-0">
            Nós conheça mais
          </p>
          <div className="flex-1 h-px bg-[#606060] min-w-0" />
          <div className="flex items-center justify-end gap-2 whitespace-nowrap shrink-0">
            <Link
              href="https://www.instagram.com/podiotickets/"
              className="w-8 h-8 border border-[#3A3A3A] p-2 rounded-full flex items-center justify-center"
            >
              <InstagramIcon className="w-full h-full text-gray-2" />
            </Link>
            <Link
              href="https://x.com/podiotickets"
              className="w-8 h-8 border border-[#3A3A3A] p-2 rounded-full flex items-center justify-center"
            >
              <TwitterIcon className="w-full h-full text-gray-2" />
            </Link>
            <Link
              href="https://www.facebook.com/podiotickets"
              className="w-8 h-8 border border-[#3A3A3A] p-2 rounded-full flex items-center justify-center"
            >
              <FacebookIcon className="w-full h-full text-gray-2" />
            </Link>
          </div>
        </div>

        <p className="text-[#B4B4B4] text-sm mt-10">
          © 2025 - Todos os direitos reservados para PódioTicket
        </p>
      </div>
    </footer>
  );
}
