import type { ReactNode } from "react";

/** Bloco de conteúdo de um documento legal (política/termos). */
export type LegalBlock = {
  type: "h1" | "h2" | "h3" | "p" | "li" | "oli" | "kv" | "sub";
  text: string;
  label?: string;
};

/**
 * Renderiza um documento legal (Política de Privacidade, Termos de Uso, etc.)
 * a partir de uma lista de blocos. Runs consecutivos de "li"/"oli" viram
 * <ul>/<ol>. O `title` é o cabeçalho (o bloco "h1" do data é ignorado).
 */
export function LegalDocument({
  title,
  blocks,
}: {
  title: string;
  blocks: LegalBlock[];
}) {
  const out: ReactNode[] = [];
  let listBuf: LegalBlock[] = [];
  let listKind: "ul" | "ol" | null = null;

  const flushList = () => {
    if (!listBuf.length) return;
    const items = listBuf.map((b, i) => (
      <li key={i} className="leading-relaxed">
        {b.text}
      </li>
    ));
    out.push(
      listKind === "ol" ? (
        <ol
          key={`l-${out.length}`}
          className="list-decimal pl-6 flex flex-col gap-1.5 text-gray-11"
        >
          {items}
        </ol>
      ) : (
        <ul
          key={`l-${out.length}`}
          className="list-disc pl-6 flex flex-col gap-1.5 text-gray-11"
        >
          {items}
        </ul>
      ),
    );
    listBuf = [];
    listKind = null;
  };

  blocks.forEach((b, i) => {
    if (b.type === "li" || b.type === "oli") {
      const kind = b.type === "oli" ? "ol" : "ul";
      if (listKind && listKind !== kind) flushList();
      listKind = kind;
      listBuf.push(b);
      return;
    }
    flushList();
    switch (b.type) {
      case "h1":
        break; // título vem pelo prop
      case "sub":
        out.push(
          <p
            key={i}
            className="text-gray-11 font-medium uppercase tracking-wide text-sm -mt-2 mb-2"
          >
            {b.text}
          </p>,
        );
        break;
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

  return (
    <main className="w-full bg-gray-2">
      <article className="mx-auto max-w-3xl px-4 py-10 md:py-16 font-family-dm-sans flex flex-col gap-3">
        <h1 className="font-manrope font-extrabold text-2xl md:text-4xl text-gray-12 mb-4">
          {title}
        </h1>
        {out}
      </article>
    </main>
  );
}
