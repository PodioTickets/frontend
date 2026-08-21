import type { ReactNode } from "react";

/** Bloco de conteúdo de um documento legal (política/termos). */
export type LegalBlock = {
  type: "h1" | "h2" | "h3" | "p" | "li" | "oli" | "kv" | "sub";
  text: string;
  label?: string;
  /** Quando presente, o `text` do bloco vira um link externo (abre em nova aba). */
  href?: string;
};

/** Classe do link externo dentro de um documento legal. */
const LEGAL_LINK_CLASS =
  "text-primary-10 underline underline-offset-2 hover:text-primary-11 transition-colors break-words";

/**
 * Conteúdo textual de um bloco: link externo quando `href` estiver setado,
 * senão o texto puro. Centraliza a regra p/ p e itens de lista.
 */
function blockContent(b: LegalBlock): ReactNode {
  if (!b.href) return b.text;
  return (
    <a href={b.href} target="_blank" rel="noopener noreferrer" className={LEGAL_LINK_CLASS}>
      {b.text}
    </a>
  );
}

type Section = { heading: LegalBlock | null; body: LegalBlock[] };

/** Agrupa os blocos em seções: tudo antes do 1º h2 = intro; cada h2 inicia uma seção. */
function toSections(blocks: LegalBlock[]): Section[] {
  const sections: Section[] = [];
  let current: Section = { heading: null, body: [] };
  for (const b of blocks) {
    if (b.type === "h2") {
      sections.push(current);
      current = { heading: b, body: [] };
    } else {
      current.body.push(b);
    }
  }
  sections.push(current);
  return sections;
}

/**
 * Renderiza o corpo de uma seção; runs consecutivos de li/oli viram <ul>/<ol>.
 * `compact` = variante para os modais de leitura (corpo text-xs, títulos
 * text-base); o padrão preserva o tamanho maior da página cheia (/terms,
 * /privacy).
 */
function renderBody(blocks: LegalBlock[], compact: boolean): ReactNode[] {
  const bodyText = compact ? "text-xs" : "text-base";
  const out: ReactNode[] = [];
  let buf: LegalBlock[] = [];
  let kind: "ul" | "ol" | null = null;

  const flush = () => {
    if (!buf.length) return;
    const items = buf.map((b, i) => (
      <li key={i} className="ms-6 leading-[1.3]">
        {blockContent(b)}
      </li>
    ));
    out.push(
      kind === "ol" ? (
        <ol key={`l-${out.length}`} className="list-decimal flex flex-col gap-1.5 text-gray-12">
          {items}
        </ol>
      ) : (
        <ul key={`l-${out.length}`} className="list-disc flex flex-col gap-1.5 text-gray-12">
          {items}
        </ul>
      ),
    );
    buf = [];
    kind = null;
  };

  blocks.forEach((b, i) => {
    if (b.type === "li" || b.type === "oli") {
      const k = b.type === "oli" ? "ol" : "ul";
      if (kind && kind !== k) flush();
      kind = k;
      buf.push(b);
      return;
    }
    flush();
    switch (b.type) {
      case "sub":
        out.push(
          <p
            key={i}
            className="font-manrope font-semibold uppercase tracking-wide text-sm text-gray-11"
          >
            {b.text}
          </p>,
        );
        break;
      case "h3":
        out.push(
          <h3
            key={i}
            className={`font-manrope font-bold ${compact ? "text-base" : "text-base md:text-lg"} text-gray-12 mt-2`}
          >
            {b.text}
          </h3>,
        );
        break;
      case "kv":
        out.push(
          <p key={i} className={`${bodyText} text-gray-12 leading-[1.3]`}>
            <strong className="font-bold">{b.label}:</strong> {b.text}
          </p>,
        );
        break;
      default:
        out.push(
          <p key={i} className={`${bodyText} text-gray-12 leading-[1.3]`}>
            {blockContent(b)}
          </p>,
        );
    }
  });
  flush();
  return out;
}

/**
 * Corpo de um documento legal: intro + seções (h2) separadas por divisores.
 * Reutilizado pela página (/terms, /privacy) e pelos modais de leitura
 * (TermsOfServiceModal, ContractReaderModal) — o pai controla largura, padding
 * e gap do container.
 *
 * `compact` (usado só nos modais) reduz o corpo para text-xs e os títulos para
 * text-base; sem ele, mantém-se o tamanho original da página cheia.
 */
export function LegalDocumentBody({
  blocks,
  compact = false,
}: {
  blocks: LegalBlock[];
  compact?: boolean;
}) {
  const sections = toSections(blocks);
  const intro = sections[0];
  const rest = sections.slice(1).filter((s) => s.heading);
  const bodyWrap = `flex flex-col gap-2${compact ? " text-xs" : ""}`;

  return (
    <>
      {intro.body.length > 0 && (
        <div key="intro" className={bodyWrap}>{renderBody(intro.body, compact)}</div>
      )}
      {rest.flatMap((s, i) => [
        <div key={`div-${i}`} className="h-px w-full bg-gray-6" />,
        <div key={`sec-${i}`} className="flex flex-col gap-6">
          <h2
            className={`font-manrope font-extrabold ${compact ? "text-base" : "text-xl md:text-2xl"} leading-[1.1] text-gray-12`}
          >
            {s.heading!.text}
          </h2>
          <div className={bodyWrap}>{renderBody(s.body, compact)}</div>
        </div>,
      ])}
    </>
  );
}

/**
 * Renderiza um documento legal (Política de Privacidade, Termos de Uso, etc.)
 * no layout do Figma: banner verde com título + "Última atualização" e conteúdo
 * em seções separadas por divisores. O bloco "h1" do data é ignorado (vira o
 * título do banner via prop `title`).
 */
export function LegalDocument({
  title,
  blocks,
  updatedAt,
}: {
  title: string;
  blocks: LegalBlock[];
  updatedAt?: string;
}) {
  return (
    <main className="w-full bg-gray-2">
      {/* Banner */}
      <div className="relative w-full overflow-hidden bg-linear-to-r from-[#141a15] to-[#1d3a24]">
        {/* Barra desktop — grudada na esquerda da tela, preenche a calha até
            151px (gradiente dark→green, sem passar da borda do conteúdo). Só ≥1024. */}
        <div className="hidden lg:block absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[min(151px,calc((100vw-72rem)/2))] rounded-r-full bg-linear-to-r from-[#141a15] to-[#59e373]" />
        {/* Padding mobile assimétrico de propósito (35/64): compensa o meio-leading
            do h1 (~11px de "ar" acima dos glifos) e a barra de 20px no rodapé, pra
            distância VISUAL título↔topo == atualização↔barra (~46px cada). */}
        <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 pt-[35px] pb-[64px] lg:pt-[52px] lg:pb-[52px] flex flex-col items-center text-center gap-3 lg:mx-0 lg:max-w-none lg:pl-[max(2rem,calc(min(151px,(100vw-72rem)/2)+1.5rem))] lg:pr-[max(2rem,calc(min(151px,(100vw-72rem)/2)+1.5rem))] lg:flex-row lg:items-center lg:justify-between lg:text-left lg:gap-2">
          <h1 className="font-manrope font-extrabold text-[28px] lg:text-4xl tracking-[1px] text-white">
            {title}
          </h1>
          {updatedAt && (
            <p className="font-manrope font-semibold text-base lg:text-lg text-gray-11 whitespace-nowrap shrink-0">
              Última atualização: {updatedAt}
            </p>
          )}
        </div>
        {/* Barra mobile — faixa gradiente no rodapé do banner (largura total). */}
        <div className="lg:hidden absolute bottom-0 left-0 h-5 w-full bg-linear-to-r from-[#141a15] to-[#59e373]" />
      </div>

      {/* Conteúdo */}
      <article className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 md:py-[52px] flex flex-col gap-8 md:gap-[52px] font-family-dm-sans">
        <LegalDocumentBody blocks={blocks} />
      </article>
    </main>
  );
}
