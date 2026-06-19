"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/utils/cn";

/**
 * Wrapper de animação "reveal on scroll" para a landing page (server component).
 *
 * Mantém a LP majoritariamente renderizada no servidor: só este wrapper é
 * client. Usa `IntersectionObserver` (sem libs, sem listener de scroll) e faz
 * fade-in + leve subida quando o bloco entra na viewport — depois para de
 * observar (anima UMA vez; reanimar a cada scroll distrai numa LP).
 *
 * IMPORTANTE — porque começa ESCONDIDO (opacity-0) já no 1º render:
 *  - o estado inicial é o ESCONDIDO, então o primeiro paint (SSR e client) já é
 *    `opacity-0`. O observer roda DEPOIS do paint e revela → a transição
 *    sempre dispara, inclusive para blocos JÁ visíveis no load (ex.: o Hero).
 *  - se começássemos visível e escondêssemos no efeito, o React agruparia o
 *    esconde→revela e o frame escondido não pintaria → o Hero não animava.
 *
 * É fade PURO (só opacity): nada de `translate`/movimento vertical — qualquer
 * deslocamento empurraria os blocos abaixo da dobra e a posição de scroll
 * "pularia" ao revelar. Opacidade não afeta layout, então o scroll fica estável.
 *
 * Acessibilidade/no-JS:
 *  - respeita `prefers-reduced-motion` (revela na hora, sem transição);
 *  - como nasce escondido, sem JS o conteúdo ficaria invisível → o `<noscript>`
 *    na `LandingPage` reativa tudo via `[data-reveal]` (fallback global).
 */
export function Reveal({
  children,
  className = "",
  /** Atraso (ms) p/ escalonar blocos da mesma seção (ex.: heading → grid). */
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Motion reduzido → revela na hora, sem animar.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // Dispara um pouco depois de entrar (10% da base) p/ leitura mais natural.
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        "transition-opacity duration-700 ease-out will-change-[opacity] motion-reduce:transition-none",
        shown ? "opacity-100" : "opacity-0",
        className,
      )}
    >
      {children}
    </div>
  );
}
