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

/**
 * ---------------------------------------------------------------------------
 * Agregação por ZOOM
 * ---------------------------------------------------------------------------
 * O backend devolve as compras por BAIRRO. Plotar sempre o bairro faz o zoom
 * afastado mostrar vários pontos fracos empilhados sobre a mesma cidade (nesse
 * zoom o mapa base só rotula a cidade) — a leitura fica errada e nenhum número
 * corresponde ao volume real daquela cidade. Aqui o dado se junta/divide junto
 * com o mapa: UF quando bem afastado, CIDADE no zoom médio e BAIRRO no zoom
 * aproximado. A soma total é preservada em todos os níveis.
 */
type AggLevel = "state" | "city" | "neighborhood";

/** Zoom mínimo de cada nível (abaixo do menor → agrupa por UF). */
const CITY_MIN_ZOOM = 7;
const NEIGHBORHOOD_MIN_ZOOM = 12;

function levelForZoom(zoom: number): AggLevel {
  if (zoom >= NEIGHBORHOOD_MIN_ZOOM) return "neighborhood";
  if (zoom >= CITY_MIN_ZOOM) return "city";
  return "state";
}

type AggPoint = {
  /** Já formatado p/ o tooltip: "Bairro, Cidade/UF", "Cidade/UF" ou "UF". */
  label: string;
  lat: number;
  lng: number;
  purchases: number;
};

/** Mesma normalização do backend (case/acentos) p/ não duplicar "São Paulo". */
const normalizeKey = (s?: string) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

/**
 * Soma as compras no nível pedido e posiciona o ponto no CENTROIDE PONDERADO
 * pelas compras (o bairro que mais vendeu puxa o ponto da cidade p/ perto de si),
 * em vez da média simples — assim o calor continua caindo onde de fato vendeu.
 */
function aggregate(located: PurchaseLocation[], level: AggLevel): AggPoint[] {
  if (level === "neighborhood") {
    return located.map((d) => ({
      label: placeLabel(d),
      lat: d.lat as number,
      lng: d.lng as number,
      purchases: d.purchases,
    }));
  }

  const byState = level === "state";
  const merged = new Map<string, AggPoint>();
  for (const d of located) {
    // Sem UF cai pra cidade como chave (não dá pra somar num estado desconhecido).
    const key = byState
      ? normalizeKey(d.state) || "city:" + normalizeKey(d.city)
      : normalizeKey(d.city) + "|" + normalizeKey(d.state);
    const existing = merged.get(key);
    if (existing) {
      const total = existing.purchases + d.purchases;
      existing.lat =
        (existing.lat * existing.purchases + (d.lat as number) * d.purchases) / total;
      existing.lng =
        (existing.lng * existing.purchases + (d.lng as number) * d.purchases) / total;
      existing.purchases = total;
    } else {
      merged.set(key, {
        label: byState ? d.state || d.city : placeLabel({ ...d, neighborhood: undefined }),
        lat: d.lat as number,
        lng: d.lng as number,
        purchases: d.purchases,
      });
    }
  }
  return Array.from(merged.values());
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
// Distância (px) que um toque de 1 dedo precisa percorrer para ser tratado como
// tentativa de arrastar o mapa. Abaixo disso é toque/tap e a dica não aparece.
const PAN_INTENT_PX = 12;

/** Nome do local como o organizador reconhece: "Bairro, Cidade/UF". */
function placeLabel(d: PurchaseLocation): string {
  const city = d.state ? `${d.city}/${d.state}` : d.city;
  return d.neighborhood ? `${d.neighborhood}, ${city}` : city;
}

/**
 * Etiqueta com o nº de compras, ancorada ACIMA da bola de calor do local
 * (`translate` sobe a pílula 100% da própria altura + folga, então o calor
 * fica visível embaixo). `iconSize` 0 e o deslocamento no filho mantêm a
 * pílula centrada no ponto sem depender da largura (varia com os dígitos).
 */
function purchaseBadgeIcon(purchases: number): any {
  const label = purchases.toLocaleString("pt-BR");
  return L.divIcon({
    className: "purchase-count-badge",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
    html:
      `<span style="` +
      "display:inline-block;transform:translate(-50%,calc(-100% - 14px));" +
      "pointer-events:auto;white-space:nowrap;border-radius:9999px;" +
      "background:#fff;color:#1a1a1a;border:1px solid rgba(0,0,0,0.12);" +
      "box-shadow:0 1px 3px rgba(0,0,0,0.25);padding:1px 7px;" +
      'font:600 11px/1.5 var(--font-dm-sans,system-ui,sans-serif);' +
      `">${label}</span>`,
  });
}

export default function PurchaseHeatmapImpl({ data }: { data: PurchaseLocation[] }) {
  const mapElRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const heatRef = useRef<any>(null);
  // Camada das etiquetas de contagem (uma por local do nível agregado atual).
  const labelsRef = useRef<any>(null);
  const wheelHandlerRef = useRef<((e: WheelEvent) => void) | null>(null);
  const touchHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchMoveHandlerRef = useRef<((e: TouchEvent) => void) | null>(null);
  // Origem do toque monodigital em curso (null = sem toque de 1 dedo rastreado).
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  // A dica já foi mostrada neste gesto? Evita re-render a cada `touchmove`.
  const hintShownRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  // Nível já desenhado, p/ só redesenhar quando o zoom cruza uma faixa
  // (e não a cada zoomend).
  const levelsRef = useRef<Record<AggLevel, AggPoint[]> | null>(null);
  const renderedLevelRef = useRef<AggLevel | null>(null);
  // Enquadra nos dados 1× por montagem: as cargas seguintes (bairros que o
  // worker de geocoding vai resolvendo) não podem puxar o zoom do usuário.
  const fittedRef = useRef(false);

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
  // Esconde na hora (o gesto correto começou — a dica não pode cobrir o mapa).
  const hideHint = useCallback(() => {
    if (hintTimerRef.current) {
      clearTimeout(hintTimerRef.current);
      hintTimerRef.current = null;
    }
    setHint(null);
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

  // Os três níveis pré-calculados: trocar de faixa de zoom é só reusar a lista.
  const levels = useMemo(
    () => ({
      state: aggregate(located, "state"),
      city: aggregate(located, "city"),
      neighborhood: aggregate(located, "neighborhood"),
    }),
    [located],
  );

  /**
   * (Re)desenha calor + selos no nível pedido. Estável (só lê refs), então os
   * listeners nativos do mapa capturam esta função uma única vez.
   */
  const renderLevel = useCallback((level: AggLevel) => {
    const map = mapRef.current;
    const points = levelsRef.current?.[level] ?? [];
    if (!map || points.length === 0) return;
    renderedLevelRef.current = level;

    const maxPurchases = Math.max(...points.map((p) => p.purchases), 1);

    if (heatRef.current) map.removeLayer(heatRef.current);
    heatRef.current = (L as any)
      .heatLayer(
        points.map((p) => [p.lat, p.lng, p.purchases]),
        {
          radius: 30,
          blur: 20,
          minOpacity: 0.45,
          maxZoom: HEAT_MAX_ZOOM,
          // `max` abaixo do pico (metade) = locais de baixo volume ainda visíveis.
          // Recalculado por nível: agrupado, o pico é maior que o de bairro.
          max: Math.max(1, Math.ceil(maxPurchases / 2)),
        },
      )
      .addTo(map);

    // Canvas ampliado (padding) não pode animar no zoom (transform errada) →
    // escondê-lo durante a animação de zoom e redesenhar no fim (`_reset`).
    const heatCanvas = heatRef.current._canvas as HTMLElement | undefined;
    if (heatCanvas) {
      heatCanvas.classList.remove("leaflet-zoom-animated");
      heatCanvas.classList.add("leaflet-zoom-hide");
    }

    // Etiquetas "quantas compras neste local", por cima do calor. Locais com
    // mais compras ficam na frente (zIndexOffset) quando as bolhas se sobrepõem.
    if (labelsRef.current) map.removeLayer(labelsRef.current);
    labelsRef.current = L.layerGroup(
      points.map((p) => {
        const suffix = p.purchases === 1 ? "compra" : "compras";
        return L.marker([p.lat, p.lng], {
          icon: purchaseBadgeIcon(p.purchases),
          zIndexOffset: p.purchases,
          keyboard: false,
        }).bindTooltip(`${p.label} — ${p.purchases} ${suffix}`, {
          // Acima da própria etiqueta (que já está 14px + altura acima do ponto).
          direction: "top",
          offset: [0, -34],
        });
      }),
    ).addTo(map);
  }, []);


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
      //
      // A dica NÃO pode sair no `touchstart`: num gesto de 2 dedos o browser
      // dispara DOIS `touchstart` (1 dedo, depois 2 — os dedos nunca encostam no
      // mesmo instante), então o primeiro acendia o aviso e ele tapava o mapa por
      // HINT_VISIBLE_MS mesmo com o usuário fazendo tudo certo. Um tap simples
      // também acendia. Agora ela só aparece diante de uma tentativa REAL de
      // arrastar com 1 dedo (`touchmove` monodigital além de PAN_INTENT_PX), e
      // some no instante em que o segundo dedo encosta.
      const dragging = mapRef.current.dragging;
      const handleTouchStart = (e: TouchEvent) => {
        panStartRef.current = null;
        hintShownRef.current = false;
        if (fullscreenRef.current) {
          dragging.enable();
          return;
        }
        if (e.touches.length >= 2) {
          dragging.enable();
          hideHint();
          return;
        }
        dragging.disable();
        const t = e.touches[0];
        panStartRef.current = { x: t.clientX, y: t.clientY };
      };
      const handleTouchMove = (e: TouchEvent) => {
        if (fullscreenRef.current) return;
        if (e.touches.length >= 2) {
          // Virou pinça/arrasto de 2 dedos → gesto correto, nada de aviso.
          panStartRef.current = null;
          hideHint();
          return;
        }
        const start = panStartRef.current;
        if (!start || hintShownRef.current) return;
        const t = e.touches[0];
        const moved = Math.hypot(t.clientX - start.x, t.clientY - start.y);
        if (moved < PAN_INTENT_PX) return;
        hintShownRef.current = true;
        flashHint("touch");
      };
      mapElRef.current.addEventListener("touchstart", handleTouchStart, { passive: true });
      touchHandlerRef.current = handleTouchStart;
      mapElRef.current.addEventListener("touchmove", handleTouchMove, { passive: true });
      touchMoveHandlerRef.current = handleTouchMove;

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

      // Zoom cruzou uma faixa → reagrupa (bairros viram cidade e vice-versa).
      mapRef.current.on("zoomend", () => {
        if (!mapRef.current) return;
        const level = levelForZoom(mapRef.current.getZoom());
        if (level !== renderedLevelRef.current) renderLevel(level);
      });
    }
    // Container pode ter montado antes do layout → recalcula o tamanho.
    setTimeout(() => mapRef.current?.invalidateSize(), 60);

    const draw = async () => {
      levelsRef.current = levels;
      if (located.length === 0) {
        if (heatRef.current) {
          mapRef.current.removeLayer(heatRef.current);
          heatRef.current = null;
        }
        if (labelsRef.current) {
          mapRef.current.removeLayer(labelsRef.current);
          labelsRef.current = null;
        }
        renderedLevelRef.current = null;
        return;
      }
      await ensureHeatPlugin();
      if (!active || !mapRef.current) return;

      // Enquadra ANTES de desenhar: o zoom final é quem define o nível.
      if (!fittedRef.current) {
        const bounds = L.latLngBounds(
          located.map((d) => L.latLng(d.lat as number, d.lng as number)),
        );
        mapRef.current.fitBounds(bounds.pad(0.2), { maxZoom: HEAT_MAX_ZOOM, animate: false });
        fittedRef.current = true;
      }

      renderLevel(levelForZoom(mapRef.current.getZoom()));
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
      if (touchMoveHandlerRef.current) {
        mapElRef.current?.removeEventListener("touchmove", touchMoveHandlerRef.current);
        touchMoveHandlerRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
      document.body.style.overflow = "";
      mapRef.current?.remove();
      mapRef.current = null;
      heatRef.current = null;
      labelsRef.current = null;
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
