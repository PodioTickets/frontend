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
import { YoutubeIcon } from "../Icons/YoutubeIcon";

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

  // Etapas de checkout: no MOBILE o footer é removido (a MobileSummaryBar fixa
  // ocupa a base e o footer só atrapalha). No desktop o footer permanece — por
  // isso escondemos só o bloco mobile e zeramos a moldura do <footer> no mobile
  // (`max-md:hidden` no próprio footer faria sumir tudo, mas precisamos manter o
  // desktop, então usamos `max-md:hidden` no bloco mobile e neutralizamos a
  // borda/padding do footer no mobile).
  const isCheckoutStep =
    pathname.startsWith("/checkout/ingressos") ||
    pathname.startsWith("/checkout/informacoes") ||
    pathname.startsWith("/checkout/produtos") ||
    pathname.startsWith("/checkout/pagamento");

  // Eventos têm só o CTA "Inscreva-se" fixo no mobile → respiro pro footer não
  // ser cortado por ele.
  const isEventPage = pathname.startsWith("/events/");
  const mobileFixedBarPad = isEventPage ? " pb-44" : "";

  return (
    <footer
      className={`w-full relative flex flex-col items-center justify-start overflow-hidden bg-linear-to-b from-[#191919] to-[#222222] md:p-20 md:pt-[52px] ${isCheckoutStep
        ? "max-md:hidden md:border-t md:border-gray-6"
        : "px-4 py-6"
        }`}
    >
      {/* Mobile Layout */}
      <div className={`w-full flex flex-col md:hidden${mobileFixedBarPad}`}>
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
          A PódioTicket é o ponto de encontro de quem vive o esporte. Aqui você encontra seu próximo desafio, reúne os amigos, combina a largada e transforma cada chegada em uma história que merece ser lembrada.
        </p>

        {/* Social Media Section */}
        <div className="text-white flex items-center gap-10 w-full my-4 mb-6">
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
            href="https://www.youtube.com/channel/UCqBDBJJiUulbW2iplU_8SvQ"
            className="size-12 border border-[#3A3A3A] p-3 rounded-full flex items-center justify-center"
          >
            <YoutubeIcon className="w-full h-full text-gray-2" />
          </Link>
        </div>


        {/* Política de privacidade e Termos de uso */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <Link
            href="/privacy"
            className="text-gray-2 text-xs underline hover:text-white transition-colors"
          >
            Política de privacidade
          </Link>
          <Link
            href="/terms"
            className="text-gray-2 text-xs underline hover:text-white transition-colors"
          >
            Termos de Utilização
          </Link>
        </div>

        {/* Copyright Mobile */}
        <p className="text-white text-xs text-center">
          © {currentYear} - Todos os direitos reservados para PódioTicket
          <br /> Atendimento: suporte@podioticket.com.br | +55 11 94086-8733
          <br /> CNPJ: 65.174.909/0001-01
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
          className="absolute top-8 left-0 object-cover w-[25%] 2xl:w-[15%] h-auto"
        />
        <Image
          src="/images/right_footer.png"
          alt="Footer Right"
          width={100000}
          height={100000}
          draggable={false}
          className="absolute top-8 right-0 object-cover w-[25%] 2xl:w-[15%] h-auto"
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
            A PódioTicket é o ponto de encontro de quem vive o esporte. Aqui você encontra seu próximo desafio, reúne os amigos, combina a largada e transforma cada chegada em uma história que merece ser lembrada.
          </p>
        </div>

        <div className="text-[#B4B4B4] flex items-center gap-10 w-full my-20">
          <p className="text-start whitespace-nowrap shrink-0">
            Saiba mais sobre nós
          </p>
          <div className="flex-1 h-px bg-[#606060] min-w-0" />
          <div className="flex items-center justify-end gap-2 whitespace-nowrap shrink-0">
            <Link
              target="_blank"
              href="https://www.instagram.com/podioticket"
              className="w-8 h-8 border border-[#3A3A3A] p-2 rounded-full flex items-center justify-center"
            >
              <InstagramIcon className="w-full h-full text-gray-2" />
            </Link>
            <Link
              target="_blank"
              href="https://www.youtube.com/channel/UCqBDBJJiUulbW2iplU_8SvQ"
              className="w-8 h-8 border border-[#3A3A3A] p-2 rounded-full flex items-center justify-center"
            >
              <YoutubeIcon className="w-full h-full text-gray-2" />
            </Link>
          </div>
        </div>

        {/* Política de privacidade e Termos de uso */}
        <div className="flex items-center justify-center gap-6 mt-10">
          <Link
            href="/privacy"
            className="text-[#B4B4B4] text-sm underline hover:text-white transition-colors"
          >
            Política de privacidade
          </Link>
          <Link
            href="/terms"
            className="text-[#B4B4B4] text-sm underline hover:text-white transition-colors"
          >
            Termos de Utilização
          </Link>
        </div>

        <p className="text-[#B4B4B4] text-sm text-center mt-6">
          © {currentYear} - Todos os direitos reservados para PódioTicket
          <br /> Atendimento: suporte@podioticket.com.br | +55 11 94086-8733
          <br /> CNPJ: 65.174.909/0001-01
        </p>
      </div>
    </footer>
  );
}
