"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { PurchaseLocation } from "@/services/organizer/OrganizerService.types";

/**
 * Mapa de CALOR de compras — Leaflet + leaflet.heat sobre tiles do OpenStreetMap
 * (aberto, sem chave). As coordenadas (lat/lng) vêm PRONTAS do BACKEND (cache
 * global de geocoding por bairro/cidade/UF) — o front NÃO geocodifica nada, só
 * plota → instantâneo. Locais ainda PENDENTES de geocoding no servidor vêm sem
 * lat/lng e aparecem numa carga seguinte.
 *
 * `leaflet.heat` é um plugin GLOBAL: registra `L.heatLayer` no `L` global
 * (bare `L` → `window.L`), não na instância ESM. Por isso setamos `window.L = L`
 * e importamos o plugin DINAMICAMENTE (imports estáticos são içados).
 */

/**
 * Padding do canvas do heatmap (fração do viewport, por lado). O `leaflet.heat`
 * dimensiona o canvas ao tamanho EXATO do viewport e só o redesenha no `moveend`
 * → ao arrastar, a borda que entra na tela fica fora do canvas ("corta") e o
 * calor só reaparece ao soltar. Aqui damos margem: o canvas fica maior que o
 * viewport, então durante o pan ele TRANSLADA junto com o mapa (sem recomputar,
 * sem tremer) e as bordas reveladas já vêm desenhadas. Redesenho continua só no
 * `moveend` (1×). 0.5 = meio viewport de cada lado (canvas 2× em cada eixo) —
 * cobre pans normais; o custo (redesenho maior) só ocorre ao soltar e o nº de
 * pontos é modesto (geocoding cacheado por bairro).
 */
const HEAT_PADDING = 0.5;

/**
 * Substitui `_reset`/`_redraw` do `L.HeatLayer` por versões que respeitam o
 * padding (o plugin não expõe essa opção). Feito UMA vez sobre o prototype
 * assim que o plugin carrega. Lógica de agregação idêntica à original, apenas
 * deslocando os pontos para o espaço do canvas ampliado.
 */
function patchHeatLayerPadding(): void {
  const proto = (L as any).HeatLayer?.prototype;
  if (!proto || proto.__paddedPatched) return;
  proto.__paddedPatched = true;

  proto._reset = function (this: any) {
    const size = this._map.getSize();
    const padX = Math.round(size.x * HEAT_PADDING);
    const padY = Math.round(size.y * HEAT_PADDING);
    // Canto superior-esquerdo do canvas ancorado ao ponto de container (-padX,-padY).
    const topLeft = this._map.containerPointToLayerPoint([-padX, -padY]);
    L.DomUtil.setPosition(this._canvas, topLeft);

    const w = size.x + padX * 2;
    const h = size.y + padY * 2;
    if (this._heat._width !== w) {
      this._canvas.width = this._heat._width = w;
    }
    if (this._heat._height !== h) {
      this._canvas.height = this._heat._height = h;
    }
    this._redraw();
  };

  proto._redraw = function (this: any) {
    if (!this._map) return;
    const heat = this._heat;
    const r = heat._r;
    const size = this._map.getSize();
    const padX = Math.round(size.x * HEAT_PADDING);
    const padY = Math.round(size.y * HEAT_PADDING);
    // Limites (coords de container) incluindo padding + margem do raio.
    const bounds = new L.Bounds(
      L.point(-padX - r, -padY - r),
      L.point(size.x + padX + r, size.y + padY + r),
    );
    const max = this.options.max === undefined ? 1 : this.options.max;
    const maxZoom =
      this.options.maxZoom === undefined ? this._map.getMaxZoom() : this.options.maxZoom;
    const v = 1 / Math.pow(2, Math.max(0, Math.min(maxZoom - this._map.getZoom(), 12)));
    const cellSize = r / 2;
    const grid: any[] = [];
    const panePos = this._map._getMapPanePos();
    const offsetX = panePos.x % cellSize;
    const offsetY = panePos.y % cellSize;

    const latlngs = this._latlngs;
    for (let i = 0, len = latlngs.length; i < len; i++) {
      const p = this._map.latLngToContainerPoint(latlngs[i]);
      if (!bounds.contains(p)) continue;
      // Desloca para o espaço do canvas ampliado (origem em -pad).
      const cx = p.x + padX;
      const cy = p.y + padY;
      const gx = Math.floor((cx - offsetX) / cellSize) + 2;
      const gy = Math.floor((cy - offsetY) / cellSize) + 2;
      const alt =
        latlngs[i].alt !== undefined
          ? latlngs[i].alt
          : latlngs[i][2] !== undefined
            ? +latlngs[i][2]
            : 1;
      const k = alt * v;
      grid[gy] = grid[gy] || [];
      const cell = grid[gy][gx];
      if (cell) {
        cell[0] = (cell[0] * cell[2] + cx * k) / (cell[2] + k);
        cell[1] = (cell[1] * cell[2] + cy * k) / (cell[2] + k);
        cell[2] += k;
      } else {
        grid[gy][gx] = [cx, cy, k];
      }
    }

    const data: number[][] = [];
    for (let y = 0, gh = grid.length; y < gh; y++) {
      if (!grid[y]) continue;
      for (let x = 0, gw = grid[y].length; x < gw; x++) {
        const cell = grid[y][x];
        if (cell) data.push([Math.round(cell[0]), Math.round(cell[1]), Math.min(cell[2], max)]);
      }
    }
    heat.data(data).draw(this.options.minOpacity);
    this._frame = null;
  };

  // A animação de zoom nativa do plugin (`_animateZoom`) assume o canvas do
  // tamanho do viewport; com o canvas ampliado (padding) ela calcula a transform
  // errada e o calor "voa" de lugar durante o zoom. Neutralizamos: o canvas é
  // marcado como `leaflet-zoom-hide` (escondido durante a animação de zoom — ver
  // draw()) e redesenhado correto no `moveend`/`zoomend` via `_reset`.
  proto._animateZoom = function () {};
}

let heatPluginPromise: Promise<void> | null = null;
async function ensureHeatPlugin(): Promise<void> {
  if ((L as any).heatLayer) {
    patchHeatLayerPadding();
    return;
  }
  if (!heatPluginPromise) {
    (window as any).L = L;
    heatPluginPromise = import("leaflet.heat").then(() => {
      patchHeatLayerPadding();
    });
  }
  await heatPluginPromise;
}

const BRAZIL_CENTER: [number, number] = [-14.235, -51.925];
const BRAZIL_ZOOM = 4;
const HEAT_MAX_ZOOM = 12;

// Ícones (inline SVG) do botão de tela cheia — expandir / contrair.
const ICON_EXPAND =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M16 21h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>';
const ICON_COMPRESS =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';

// Quanto tempo a dica de gesto cooperativo fica visível após o último scroll/toque.
const HINT_VISIBLE_MS = 1400;

export default function PurchaseHeatmapImpl({ data }: { data: PurchaseLocation[] }) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const touchHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Tela cheia (modal) — reaproveita a MESMA instância do mapa (só reestiliza o
  // container p/ `fixed inset-0`), evitando 2º mapa/tiles/geocoding.
  const [fullscreen, setFullscreen] = useState(false);
  // Dica de gesto cooperativo (estilo Google Maps): "ctrl" no desktop, "touch" no
  // mobile. `null` = escondida.
  const [hint, setHint] = useState<"ctrl" | "touch" | null>(null);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Espelha o estado atual dentro de handlers nativos registrados 1× (sem re-bind);
  // atualizado no efeito de tela cheia, nunca durante o render.
  const fullscreenRef = useRef(false);
  const fsBtnRef = useRef<HTMLAnchorElement | null>(null);

  // Handlers estáveis (identidade fixa) capturados 1× pelos listeners nativos.
  // Mostra a dica e agenda o auto-ocultar (debounce: cada scroll renova o timer).
  const flashHint = useCallback((kind: "ctrl" | "touch") => {
    setHint(kind);
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    hintTimerRef.current = setTimeout(() => setHint(null), HINT_VISIBLE_MS);
  }, []);
  const toggleFs = useCallback(() => setFullscreen((v) => !v), []);

  // Só os locais que o backend já geocodificou (têm lat/lng).
  const located = useMemo(
    () => data.filter((d) => typeof d.lat === "number" && typeof d.lng === "number"),
    [data],
  );
  const dataKey = useMemo(
    () => located.map((d) => `${d.lat},${d.lng}:${d.purchases}`).join("|"),
    [located],
  );

  useEffect(() => {
    if (!mapElRef.current) return;
    let active = true;

    if (!mapRef.current) {
      mapRef.current = L.map(mapElRef.current, {
        center: BRAZIL_CENTER,
        zoom: BRAZIL_ZOOM,
        // Zoom por scroll nativo desligado: só habilitamos via Ctrl+scroll
        // (gesto cooperativo — ver `handleWheel` abaixo).
        scrollWheelZoom: false,
        // Controle padrão nasce no topo-esquerdo; recriamos no canto inferior direito.
        zoomControl: false,
        attributionControl: true,
      });
      L.control.zoom({ position: "bottomright" }).addTo(mapRef.current);

      // Botão "tela cheia" — controle Leaflet ancorado no MESMO canto (bottomright),
      // adicionado DEPOIS do zoom → empilha logo ABAIXO dos botões +/−. O clique
      // dispara o toggle do React via ref (o controle é criado 1×).
      const FullscreenControl = L.Control.extend({
        onAdd() {
          const container = L.DomUtil.create("div", "leaflet-bar leaflet-control");
          const btn = L.DomUtil.create("a", "", container) as HTMLAnchorElement;
          btn.href = "#";
          btn.setAttribute("role", "button");
          btn.title = "Abrir mapa em tela cheia";
          btn.setAttribute("aria-label", "Abrir mapa em tela cheia");
          btn.style.display = "flex";
          btn.style.alignItems = "center";
          btn.style.justifyContent = "center";
          btn.innerHTML = ICON_EXPAND;
          fsBtnRef.current = btn;
          // Impede que o clique/scroll no botão vaze pro mapa (pan/zoom).
          L.DomEvent.disableClickPropagation(container);
          L.DomEvent.on(btn, "click", (e: Event) => {
            L.DomEvent.stop(e);
            toggleFs();
          });
          return container;
        },
      });
      new FullscreenControl({ position: "bottomright" }).addTo(mapRef.current);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(mapRef.current);

      // Zoom cooperativo: rola a página normalmente, mas com Ctrl pressionado
      // (ou pinça de trackpad, que emite `ctrlKey`) faz zoom ancorado no cursor.
      // Em tela cheia o mapa é o foco → scroll comum já dá zoom (sem exigir Ctrl).
      const handleWheel = (e: WheelEvent) => {
        if (!mapRef.current) return;
        if (e.ctrlKey || fullscreenRef.current) {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 1 : -1;
          mapRef.current.setZoomAround(
            mapRef.current.mouseEventToLatLng(e),
            mapRef.current.getZoom() + delta,
          );
          return;
        }
        // Scroll sem Ctrl (fora da tela cheia): NÃO sequestra a rolagem da página;
        // só sinaliza como usar o zoom (igual ao Google Maps).
        flashHint("ctrl");
      };
      // `passive: false` é obrigatório para o `preventDefault` valer no wheel.
      mapElRef.current.addEventListener("wheel", handleWheel, { passive: false });
      wheelHandlerRef.current = handleWheel;

      // Mobile: um dedo rola a PÁGINA e mostra a dica "use dois dedos"; a
      // manipulação do mapa (arrastar/pinçar) exige 2 dedos. Em tela cheia o
      // mapa ocupa tudo → um dedo já arrasta normalmente.
      const dragging = mapRef.current.dragging;
      const handleTouchStart = (e: TouchEvent) => {
        if (fullscreenRef.current) {
          dragging.enable();
          return;
        }
        if (e.touches.length >= 2) {
          dragging.enable();
        } else {
          dragging.disable();
          flashHint("touch");
        }
      };
      mapElRef.current.addEventListener("touchstart", handleTouchStart, { passive: true });
      touchHandlerRef.current = handleTouchStart;

      // Recalcula o tamanho do mapa SEMPRE que o container muda de dimensão
      // (entrar/sair da tela cheia, layout tardio). Sem isso o Leaflet mantém o
      // tamanho antigo e os tiles do novo viewport não são buscados → mapa em
      // branco. O ResizeObserver dispara APÓS o reflow (medida já correta),
      // eliminando o palpite de timing de um `requestAnimationFrame` avulso.
      const ro = new ResizeObserver(() => {
        mapRef.current?.invalidateSize({ animate: false });
      });
      ro.observe(mapElRef.current);
      resizeObserverRef.current = ro;
    }
    // Container pode ter montado antes do layout → recalcula o tamanho.
    setTimeout(() => mapRef.current?.invalidateSize(), 60);

    const draw = async () => {
      if (located.length === 0) {
        if (heatRef.current) {
          mapRef.current.removeLayer(heatRef.current);
          heatRef.current = null;
        }
        return;
      }
      await ensureHeatPlugin();
      if (!active || !mapRef.current) return;

      const maxPurchases = Math.max(...located.map((d) => d.purchases), 1);
      const points = located.map((d) => [d.lat as number, d.lng as number, d.purchases]);

      if (heatRef.current) mapRef.current.removeLayer(heatRef.current);
      heatRef.current = (L as any)
        .heatLayer(points, {
          radius: 30,
          blur: 20,
          minOpacity: 0.45,
          maxZoom: HEAT_MAX_ZOOM,
          // `max` abaixo do pico (metade) = bairros de baixo volume ainda visíveis.
          max: Math.max(1, Math.ceil(maxPurchases / 2)),
        })
        .addTo(mapRef.current);

      // Canvas ampliado (padding) não pode animar no zoom (transform errada) →
      // escondê-lo durante a animação de zoom e redesenhar no fim (`_reset`).
      const heatCanvas = heatRef.current._canvas as HTMLElement | undefined;
      if (heatCanvas) {
        heatCanvas.classList.remove("leaflet-zoom-animated");
        heatCanvas.classList.add("leaflet-zoom-hide");
      }

      const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));
      mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: HEAT_MAX_ZOOM });
    };

    void draw();

    return () => {
      active = false;
    };
  }, [dataKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Entra/sai da tela cheia: reflete no ref (handlers nativos), atualiza o ícone
  // do botão, trava a rolagem do body, recalcula o tamanho do mapa (o container
  // mudou de dimensão) e libera scroll-zoom/arrastar-com-1-dedo enquanto aberto.
  useEffect(() => {
    fullscreenRef.current = fullscreen;
    if (fsBtnRef.current) {
      fsBtnRef.current.innerHTML = fullscreen ? ICON_COMPRESS : ICON_EXPAND;
      const label = fullscreen ? "Sair da tela cheia" : "Abrir mapa em tela cheia";
      fsBtnRef.current.title = label;
      fsBtnRef.current.setAttribute("aria-label", label);
    }
    if (fullscreen) {
      document.body.style.overflow = "hidden";
      mapRef.current?.dragging.enable();
    } else {
      document.body.style.overflow = "";
    }
    // O reajuste de tamanho do mapa (tela cheia ↔ normal) fica a cargo do
    // ResizeObserver do container, que dispara já com a medida correta.
  }, [fullscreen]);

  // Esc fecha a tela cheia.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  // Destrói o mapa ao desmontar (evita "map container already initialized").
  useEffect(
    () => () => {
      if (wheelHandlerRef.current) {
        mapElRef.current?.removeEventListener("wheel", wheelHandlerRef.current);
        wheelHandlerRef.current = null;
      }
      if (touchHandlerRef.current) {
        mapElRef.current?.removeEventListener("touchstart", touchHandlerRef.current);
        touchHandlerRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      document.body.style.overflow = "";
      mapRef.current?.remove();
      mapRef.current = null;
      heatRef.current = null;
    },
    [],
  );

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-11 font-family-dm-sans py-8 text-center">
        Ainda não há compras com endereço para exibir no mapa.
      </p>
    );
  }

  // Há compras, mas nenhuma geocodificada ainda (fila do backend).
  const pending = located.length === 0;

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-9999 bg-gray-1 p-3 md:p-5 flex flex-col"
          : "relative w-full"
      }
    >
      {/* Caixa de dimensionamento — o React controla estas classes (tamanho +
          tela cheia). NÃO é o elemento do mapa: assim o Leaflet fica livre para
          gerenciar as próprias classes no `mapElRef` sem o React sobrescrevê-las
          num re-render (o que zerava `.leaflet-container` → mapa branco). */}
      <div
        className={
          fullscreen
            ? "relative flex-1 min-h-0 w-full"
            : "relative h-80 md:h-[420px] w-full"
        }
      >
        {/* Container do Leaflet: className CONSTANTE — nunca re-renderizado pelo
            React, preservando as classes que o Leaflet injeta. Preenche o pai. */}
        <div
          ref={mapElRef}
          className="h-full w-full rounded-xl overflow-hidden bg-gray-3 z-0"
        />

      {/* Dica de gesto cooperativo (estilo Google Maps) — aparece ao rolar/tocar
          sem o gesto correto e some sozinha. `pointer-events-none` p/ não bloquear
          o scroll da página nem a interação com o mapa. */}
      <div
        className={`pointer-events-none absolute inset-0 z-600 flex items-center justify-center rounded-xl bg-gray-12/45 px-6 text-center transition-opacity duration-200 ${
          hint ? "opacity-100" : "opacity-0"
        }`}
        aria-live="polite"
      >
        {hint && (
          <span className="rounded-lg bg-gray-12/80 px-4 py-2 text-sm font-medium text-gray-1 font-family-dm-sans shadow-lg">
            {hint === "ctrl"
              ? "Use Ctrl + scroll para aplicar zoom no mapa"
              : "Use dois dedos para mover o mapa"}
          </span>
        )}
      </div>

        {pending && (
          <div className="absolute inset-0 z-500 flex items-center justify-center rounded-xl bg-gray-1/70 px-6 text-center">
            <span className="text-sm font-medium text-gray-11 font-family-dm-sans">
              Localizando os bairros das compras… o mapa preenche automaticamente.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
