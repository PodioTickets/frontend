import type { Metadata } from "next";
import type { ReactNode } from "react";
import { privacyPolicy, type PrivacyBlock } from "@/data/privacyPolicy";

export const metadata: Metadata = {
  title: "Política de Privacidade | PódioTicket",
  description:
    "Política de Privacidade e Política de Cookies da PódioTicket — como coletamos, usamos, compartilhamos e protegemos seus dados pessoais (LGPD).",
  robots: "index, follow",
};

// Agrupa os blocos em elementos; runs consecutivos de "li" viram uma <ul>.
function renderBlocks(blocks: PrivacyBlock[]): ReactNode[] {
  const out: ReactNode[] = [];
  let liBuffer: PrivacyBlock[] = [];

  const flushList = () => {
    if (!liBuffer.length) return;
    out.push(
      <ul
        key={`ul-${out.length}`}
        className="list-disc pl-6 flex flex-col gap-1.5 text-gray-11"
      >
        {liBuffer.map((b, i) => (
          <li key={i} className="leading-relaxed">
            {b.text}
          </li>
        ))}
      </ul>,
    );
    liBuffer = [];
  };

  blocks.forEach((b, i) => {
    if (b.type === "li") {
      liBuffer.push(b);
      return;
    }
    flushList();
    switch (b.type) {
      case "h2":
        out.push(
          <h2
            key={i}
            className="font-manrope font-bold text-xl md:text-2xl text-gray-12 mt-10 mb-1"
          >
            {b.text}
          </h2>,
        );
        break;
      case "h3":
        out.push(
          <h3
            key={i}
            className="font-manrope font-semibold text-base md:text-lg text-gray-12 mt-6 mb-1"
          >
            {b.text}
          </h3>,
        );
        break;
      case "kv":
        out.push(
          <p key={i} className="text-gray-11 leading-relaxed">
            <strong className="text-gray-12 font-semibold">{b.label}:</strong>{" "}
            {b.text}
          </p>,
        );
        break;
      default:
        out.push(
          <p key={i} className="text-gray-11 leading-relaxed">
            {b.text}
          </p>,
        );
    }
  });
  flushList();
  return out;
}

export default function PrivacyPage() {
  const title =
    privacyPolicy.find((b) => b.type === "h1")?.text ?? "Política de Privacidade";
  const body = privacyPolicy.filter((b) => b.type !== "h1");

  return (
    <main className="w-full bg-gray-2">
      <article className="mx-auto max-w-3xl px-4 py-10 md:py-16 font-family-dm-sans flex flex-col gap-3">
        <h1 className="font-manrope font-extrabold text-2xl md:text-4xl text-gray-12 mb-4">
          {title}
        </h1>
        {renderBlocks(body)}
      </article>
    </main>
  );
}
