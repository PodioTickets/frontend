"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Rótulo "Cidade, UF" em uma linha onde SÓ a cidade trunca com reticências e o
 * estado fica sempre visível e COLADO ao "…" (ex.: `Bom Jesus dos Perdões…, SP`).
 *
 * Por que não é só CSS: `text-overflow: ellipsis` desenha o "…" logo após o
 * último caractere que coube, mas o box (flex/inline-block) termina um pouco
 * depois — esse resíduo vira um vão visível antes da vírgula. Não há como zerar
 * isso em CSS puro mantendo o sufixo.
 *
 * Estratégia (custo baixo): medimos o ponto de corte em `canvas.measureText`
 * (NÃO força reflow) e cortamos a STRING da cidade manualmente, então a largura
 * renderizada da cidade = exatamente o texto visível e o sufixo encosta. Um
 * `ResizeObserver` re-mede apenas quando o container muda de largura.
 *
 * SSR-safe: renderiza a cidade inteira no servidor/primeiro paint e ajusta no
 * mount (sem flash relevante — o texto só encurta se realmente não couber).
 */

const ELLIPSIS = "…"; // "…"

// Layout effect no cliente (evita flicker entre medir e pintar); useEffect no SSR.
// Definido no escopo do módulo: referência estável, sem violar rules-of-hooks.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Canvas único reaproveitado entre todos os cards (evita alocar 1 por instância).
let sharedCtx: CanvasRenderingContext2D | null = null;
function getCtx(): CanvasRenderingContext2D | null {
  if (typeof document === "undefined") return null;
  if (!sharedCtx) {
    sharedCtx = document.createElement("canvas").getContext("2d");
  }
  return sharedCtx;
}

interface CityStateLabelProps {
  city: string;
  state: string;
  /** Classe do wrapper (tipografia/cor). O layout de truncamento é fixo aqui. */
  className?: string;
}

export function CityStateLabel({ city, state, className }: CityStateLabelProps) {
  const cityRaw = (city ?? "").trim();
  const stateRaw = (state ?? "").trim();

  const containerRef = useRef<HTMLSpanElement>(null);
  const cityRef = useRef<HTMLSpanElement>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);

  // Começa com a cidade inteira (server + 1º paint); o efeito encurta se preciso.
  const [displayCity, setDisplayCity] = useState(cityRaw);

  useIsomorphicLayoutEffect(() => {
    const container = containerRef.current;
    const cityEl = cityRef.current;
    const suffixEl = suffixRef.current;
    if (!container || !cityEl || !suffixEl) return;

    const ctx = getCtx();
    if (!ctx) {
      setDisplayCity(cityRaw);
      return;
    }

    const measure = () => {
      const cs = window.getComputedStyle(cityEl);
      // `font` shorthand: o canvas ignora letter-spacing, mas o card usa o padrão
      // (normal), então o erro é nulo/desprezível para o ponto de corte.
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

      // Largura disponível para a cidade = linha inteira − o sufixo (", UF").
      // Buffer de 1px absorve arredondamento sub-pixel.
      const avail = container.clientWidth - suffixEl.offsetWidth - 1;

      // Largura implausível (layout ainda não estabilizou, container colapsado
      // por ancestral sem largura definida, etc.): NÃO corta — deixa a cidade
      // inteira e o `truncate` do CSS cuida. Degrada pro comportamento antigo
      // (vão de poucos px) em vez de sumir com o nome.
      if (avail < 24 || ctx.measureText(cityRaw).width <= avail) {
        setDisplayCity(cityRaw);
        return;
      }

      // Busca binária do maior prefixo que cabe junto com o "…".
      let lo = 0;
      let hi = cityRaw.length;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        const w = ctx.measureText(cityRaw.slice(0, mid).trimEnd() + ELLIPSIS).width;
        if (w <= avail) lo = mid;
        else hi = mid - 1;
      }
      // lo === 0 ⇒ medição suspeita (nem 1 caractere "coube"): mantém a cidade
      // inteira (CSS trunca) em vez de exibir só "…".
      setDisplayCity(lo > 0 ? cityRaw.slice(0, lo).trimEnd() + ELLIPSIS : cityRaw);
    };

    // rAF: mede após o layout/paint estabilizar (largura do card/imagem/grid).
    const raf = requestAnimationFrame(measure);
    // Re-mede só em mudança de tamanho do container (nativo, em lote — barato).
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // cityRaw/stateRaw nas deps: re-mede se o evento (dados) mudar.
  }, [cityRaw, stateRaw]);

  return (
    <span
      ref={containerRef}
      /* flex-1: o container PREENCHE o espaço disponível, então sua largura é
         ESTÁVEL (não encolhe quando o texto da cidade é cortado). Sem isso, cortar
         a cidade reduzia o container → o ResizeObserver disparava de novo →
         cortava mais → loop infinito. */
      className={`flex flex-1 items-center min-w-0 ${className ?? ""}`}
    >
      {/* `truncate` (CSS) é a REDE DE SEGURANÇA: quando o JS corta a string na
          medida, ela já cabe e o CSS não age → sufixo encosta no "…". Se a
          medição falhar e mantivermos a cidade inteira, o CSS trunca normalmente
          (vão de poucos px) — nunca some com o nome. */}
      <span ref={cityRef} className="min-w-0 truncate">
        {displayCity}
      </span>
      <span ref={suffixRef} className="shrink-0 whitespace-nowrap">
        ,&nbsp;{stateRaw}
      </span>
    </span>
  );
}
