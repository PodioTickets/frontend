"use client";
import Image from "next/image";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { TwitterIcon } from "../Icons/TwitterIcon";
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
    <footer className="w-full sm:h-[252px] flex flex-col items-center justify-start overflow-hidden bg-gray-3 border-t border-gray-6">
      <div className="w-full h-full flex flex-col sm:flex-row items-center justify-between">
        <div className="flex flex-col sm:flex-row items-center justify-between w-full h-full p-8 sm:p-8 gap-8 sm:gap-0">
          {/* Brand Section */}
          <div className="flex flex-col items-start justify-between h-full w-full sm:w-1/2">
            <Image
              src="/images/logo_footer.png"
              alt="Logo"
              width={164}
              height={44}
              className="object-cover"
              draggable={false}
            />

            <p className="text-gray-11 leading-relaxed mt-2 sm:mt-0">
              Loot4Fun is a platform for creating and managing tickets for your
              events.
            </p>

            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              {socialLinks.map(({ href, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  target="_blank"
                  className="hover:scale-110 transition-transform duration-200"
                >
                  <Icon className="text-white h-6 w-6" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
