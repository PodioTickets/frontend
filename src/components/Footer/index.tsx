"use client";
import Image from "next/image";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { TwitterIcon } from "../Icons/TwitterIcon";
import { FacebookIcon } from "../Icons/FacebookIcon";
import Link from "next/link";
import { useModalStore } from "@/stores/modalStore";
import { usePathname } from "next/navigation";
import { useOrganizerAppSurface } from "@/contexts/OrganizerAppSurfaceContext";
import { withOrganizerPathPrefix } from "@/lib/organizerPathPresentation";
import { useAdminAppSurface } from "@/contexts/AdminAppSurfaceContext";
import { withAdminPathPrefix } from "@/lib/adminPathPresentation";

export function Footer() {
  const pathname = usePathname();
  const appSurface = useOrganizerAppSurface();
  const adminSurface = useAdminAppSurface()
  const organizerPath = withOrganizerPathPrefix(pathname, appSurface);
  const adminPath = withAdminPathPrefix(pathname, adminSurface)
  const isOrganizer = organizerPath.startsWith("/organizer");
  const isAdmin = adminPath.includes("/admin");

  if (isOrganizer || isAdmin) {
    return null;
  }

  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full relative flex flex-col items-center justify-start overflow-hidden bg-linear-to-b from-[#191919] to-[#222222] border-t border-gray-6 px-4 py-6 md:p-20 md:pt-[52px]">
      {/* Mobile Layout */}
      {/* pb accounts for the fixed CTA button on event pages */}
      <div className={`w-full flex flex-col md:hidden${pathname.startsWith("/events/") ? " pb-44" : ""}`}>
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


        {/* Copyright Mobile */}
        <p className="text-white text-xs text-center">
          © {currentYear} - Todos os direitos reservados para PódioTicket
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
          © {currentYear} - Todos os direitos reservados para PódioTicket - 28.095.402/0001-36
        </p>
      </div>
    </footer>
  );
}
