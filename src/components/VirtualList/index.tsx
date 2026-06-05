"use client";
import { useState, useRef, useMemo, ReactNode, useCallback, useLayoutEffect } from "react";

interface VirtualListProps {
  items: any[];
  itemHeight?: number;
  containerHeight?: number;
  overscan?: number;
  renderItem: (item: any, index: number) => ReactNode;
  className?: string;
  /**
   * Índice que deve ficar no TOPO da janela visível no MOMENTO DA MONTAGEM (ex.:
   * abrir um dropdown já posicionado no item selecionado). Aplicado só uma vez —
   * para reposicionar a cada abertura, troque a `key` do componente (remount).
   * `null`/`undefined` = começa no topo (0).
   */
  initialScrollIndex?: number | null;
}

export function VirtualList({
  items,
  itemHeight = 50,
  containerHeight = 400,
  overscan = 3,
  renderItem,
  className = "",
  initialScrollIndex,
}: VirtualListProps) {
  // Scroll inicial derivado do índice alvo (clampado ao máximo). Estado lazy: o
  // 1º render já calcula a fatia certa — sem setState em effect e sem flash.
  // Reposicionamento por abertura vem do remount (key trocada pelo pai).
  const initialScrollTop = useMemo(() => {
    if (initialScrollIndex == null) return 0;
    const maxTop = Math.max(0, items.length * itemHeight - containerHeight);
    return Math.min(Math.max(0, initialScrollIndex * itemHeight), maxTop);
  }, [initialScrollIndex, items.length, itemHeight, containerHeight]);
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sincroniza o scroll do DOM com o estado inicial (só no mount). Atualiza um
  // sistema externo (o nó scrollável) — uso legítimo de effect, sem setState.
  useLayoutEffect(() => {
    if (initialScrollTop > 0 && containerRef.current) {
      containerRef.current.scrollTop = initialScrollTop;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);
  
  const { startIndex, endIndex } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex: start, endIndex: end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1).map((item, idx) => ({
      item,
      index: startIndex + idx,
    }));
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
  }, []);

  // Thumb de scroll customizado (overlay): iOS Safari IGNORA ::-webkit-scrollbar
  // (só pisca o indicador nativo durante o gesto), então sem isso o usuário não
  // tem pista visual de que a lista rola. Derivado do `scrollTop` que JÁ é
  // estado da virtualização — nenhum setState extra por frame de scroll.
  const maxScrollTop = Math.max(0, totalHeight - containerHeight);
  const showThumb = maxScrollTop > 0;
  const thumbInset = 4;
  const thumbTrack = containerHeight - thumbInset * 2;
  const thumbHeight = showThumb
    ? Math.max(24, (containerHeight / totalHeight) * thumbTrack)
    : 0;
  const thumbTop = showThumb
    ? thumbInset +
      (Math.min(scrollTop, maxScrollTop) / maxScrollTop) *
        (thumbTrack - thumbHeight)
    : 0;

  return (
    <div className="relative" style={{ height: `${containerHeight}px` }}>
      <div
        ref={containerRef}
        // Esconde a scrollbar nativa nas plataformas que suportam estilização
        // (Android/desktop) — o thumb overlay abaixo é o indicador único,
        // consistente entre plataformas (inclusive iPhone).
        className={`overflow-auto h-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
        style={{
          willChange: "scroll-position",
          // iOS/Android: garante que o gesto de toque role ESTA lista (e não a
          // página atrás) — momentum no iOS antigo + sem scroll chaining.
          WebkitOverflowScrolling: "touch",
          overscrollBehavior: "contain",
          touchAction: "pan-y",
        }}
        onScroll={handleScroll}
      >
        <div style={{ height: `${totalHeight}px`, position: "relative" }}>
          <div
            style={{
              transform: `translateY(${startIndex * itemHeight}px)`,
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              willChange: 'transform',
            }}
          >
            {visibleItems.map(({ item, index }) => (
              <div
                key={index}
                style={{
                  height: `${itemHeight}px`,
                  minHeight: `${itemHeight}px`,
                  maxHeight: `${itemHeight}px`,
                  overflow: 'hidden'
                }}
              >
                {renderItem(item, index)}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showThumb && (
        <div
          aria-hidden
          className="pointer-events-none absolute right-1 w-1.5 rounded-full bg-gray-6"
          style={{ height: thumbHeight, top: thumbTop }}
        />
      )}
    </div>
  );
}

