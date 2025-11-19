"use client";
import Image from "next/image";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { TwitterIcon } from "../Icons/TwitterIcon";
import { FacebookIcon } from "../Icons/FacebookIcon";
import Link from "next/link";

export function Footer() {
  const socialLinks = [
    { href: "https://x.com/Loot4Fun", icon: TwitterIcon },
    { href: "https://www.instagram.com/loot4fun/", icon: InstagramIcon },
  ];

  const footerSections = [
    {
      title: "Platform",
      links: [
        { href: "/", label: "Home" },
        { href: "/boxes", label: "Boxes" },
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/affiliates", label: "Affiliates" },
      ],
    },
    {
      title: "Resources",
      links: [
        { href: "/docs/privacy", label: "Privacy" },
        { href: "/docs/terms-of-use", label: "Terms of Use" },
        { href: "/docs/refund", label: "Refund" },
        { href: "/docs/cookies", label: "Cookies" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/#about-us", label: "About Us" },
        { href: "/#tokenomics", label: "Tokenomics" },
        { href: "/#whitepaper", label: "Whitepaper" },
        { href: "/#gitbook", label: "Gitbook" },
      ],
    },
  ];

  return (
    <footer className="w-full relative flex flex-col items-center justify-start overflow-hidden bg-linear-to-b from-[#191919] to-[#222222] border-t border-gray-6 p-20 pt-[52px]">
      <Image
        src="/images/left_footer.png"
        alt="Footer Left"
        width={425}
        height={171}
        draggable={false}
        className="absolute top-8 left-0 object-cover"
      />
      <Image
        src="/images/right_footer.png"
        alt="Footer Right"
        width={425}
        height={171}
        draggable={false}
        className="absolute top-8 right-0 object-cover"
      />
      <div className="flex flex-col items-center justify-center w-full h-full z-10">
        <div className="flex flex-col items-center justify-between h-full w-full max-w-[810px]">
          <Image
            src="/images/logo_horizontal.png"
            alt="Logo"
            width={164}
            height={44}
            className="object-cover"
            draggable={false}
          />

          <p className="font-family-dm-sans text-[#B4B4B4] mt-6">
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
      </div>

      <p className="text-[#B4B4B4] text-sm mt-10">
        © 2025 - Todos os direitos reservados para PódioTicket
      </p>
    </footer>
  );
}
