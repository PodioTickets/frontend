"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/Button";
import { Radio } from "@/components/Radio";
import { cn } from "@/utils/cn";
import {
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Star,
  Image as ImageIconLucide,
} from "lucide-react";
import toast from "react-hot-toast";
import { UNCATEGORIZED_CATEGORY_KEY } from "@/lib/eventKitSelectionDisplay";
import { ArrowButton } from "../ArrowButton";
import { itemInitialLetter } from "@/utils/itemInitial";

export type KitImagePositionProduct = {
  productId: string;
  url: string | null;
  /** Nome do produto (ex.: para inicial quando não há foto). */
  name?: string | null;
};

export type KitImagePositionTicketRow = {
  id: string;
  name: string;
  images: KitImagePositionProduct[];
};

export type KitImagePositionCategorySection = {
  id: string;
  name: string;
  tickets: KitImagePositionTicketRow[];
};

export type KitImageLayoutMode = "on_tickets" | "on_categories";

export interface KitImagePositionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sections: KitImagePositionCategorySection[];
  /** Bloco “(Sem categoria)” — opcional */
  uncategorized?: KitImagePositionCategorySection | null;
  /** Estado salvo (API). Quando ausente, usa primeiro produto de cada ingresso/categoria. */
  initialKitSelection?: {
    layout: KitImageLayoutMode;
    primaryByTicket: Record<string, string>;
    primaryByCategory: Record<string, string>;
  } | null;
  onSave?: (payload: {
    layout: KitImageLayoutMode;
    /** Modo “Nos ingressos”: principal por ingresso */
    primaryProductIdByTicketId: Record<string, string>;
    /** Modo “Nas categorias”: principal por categoria (id da categoria ou `"uncategorized"`) */
    primaryProductIdByCategoryId: Record<string, string>;
  }) => void | Promise<void>;
  /** Mensagem após confirmar no drawer (ex.: quando a persistência é na página). */
  saveSuccessMessage?: string;
}

function resolvePrimaryAmongProducts(
  images: KitImagePositionProduct[],
  preferred: string | undefined
): string | undefined {
  if (images.length === 0) return undefined;
  if (preferred && images.some((i) => i.productId === preferred)) {
    return preferred;
  }
  return images[0].productId;
}

function aggregateCategoryProducts(
  tickets: KitImagePositionTicketRow[]
): KitImagePositionProduct[] {
  const seen = new Set<string>();
  const out: KitImagePositionProduct[] = [];
  for (const t of tickets) {
    for (const img of t.images) {
      if (!seen.has(img.productId)) {
        seen.add(img.productId);
        out.push(img);
      }
    }
  }
  return out;
}

/** Prévia “Nos ingressos” alinhada ao Figma (nó 3340:117752): principal à esquerda, coluna vertical de thumbs + setas, cards do ingresso à direita. */
const MiniWireframeOnTickets = memo(function MiniWireframeOnTickets() {
  return (
    <div className="bg-gray-1 border border-gray-6 rounded-[6px] w-full h-auto overflow-hidden shrink-0">
      <div className="flex items-center justify-between border-b border-gray-6 px-1.5 py-1.5">
        <div className="flex flex-col gap-1 flex-1 min-w-0 pr-1">
          <div className="h-1.5 bg-gray-5 rounded-sm w-[66%]" />
          <div className="h-1 bg-gray-5 rounded-sm w-[40%]" />
        </div>
        <div className="flex items-center justify-center shrink-0 size-3.5 text-gray-11">
          <ArrowButton isOpen={false} className="size-3.5" aria-hidden />
        </div>
      </div>
      <div className="px-1.5 pt-2 pb-2.5 flex flex-col gap-2.5">
        <div className="h-2.5 bg-gray-5 rounded-sm w-full" />
        {[0, 1].map((row) => (
          <div
            key={row}
            className="flex gap-1.5 items-center w-full min-h-[72px]"
          >
            <div className="w-14 h-14 shrink-0 rounded-[2px] bg-yellow-3 border border-yellow-8 flex items-center justify-center p-0.5">
              <span className="text-[8px] font-bold text-yellow-11 font-manrope text-center leading-[1.1]">
                Imagem principal
              </span>
            </div>
            <div
              className="flex flex-col items-center justify-center gap-0.5 shrink-0 py-0.5"
              aria-hidden
            >
              <span className="size-3.5 rounded flex items-center justify-center text-gray-11">
                <ArrowButton isOpen={false} className="size-2 -rotate-90" />
              </span>
              <div className="flex flex-col gap-[3px]">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="size-[10px] rounded-[1px] bg-yellow-3 border border-yellow-8 flex items-center justify-center"
                  >
                    <ImageIconLucide
                      className="size-[7px] text-yellow-11 opacity-80"
                      strokeWidth={2}
                    />
                  </div>
                ))}
              </div>
              <span className="size-3.5 rounded flex items-center justify-center text-gray-11">
                <ArrowButton isOpen={false} className="size-2 rotate-90" />
              </span>
            </div>
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="bg-gray-2 border border-gray-6 rounded-md p-2 flex flex-col gap-1.5">
                <div className="h-1 bg-gray-5 rounded-sm w-full" />
                <div className="flex items-center justify-between gap-1">
                  <div className="h-1 bg-gray-5 rounded-sm w-[28%]" />
                  <div className="h-1.5 bg-gray-5 rounded-sm w-[36%]" />
                </div>
              </div>
              <div className="bg-gray-2 border border-gray-6 rounded-md p-2 flex flex-col gap-1.5">
                <div className="h-1 bg-gray-5 rounded-sm w-full" />
                <div className="flex items-center justify-between gap-1">
                  <div className="h-1 bg-gray-5 rounded-sm w-[28%]" />
                  <div className="h-1.5 bg-gray-5 rounded-sm w-[36%]" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

/** Texto do mock Figma 3340:117757 (descrição da categoria na prévia). */
const MINI_WIREFRAME_CATEGORY_DESCRIPTION =
  "Essencial para sua participação. Inclui a inscrição, a camiseta oficial, a sacochila, a necessaire e a medalha pós-prova — tudo leve, prático e com a identidade do evento.";

/** Prévia “Nas categorias” alinhada ao Figma (nó 3340:117757). */
const MiniWireframeOnCategories = memo(function MiniWireframeOnCategories() {
  return (
    <div className="bg-gray-1 border border-gray-6 rounded-md w-full overflow-hidden shrink-0">
      <div className="border-b border-gray-6 px-2 py-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="size-7 shrink-0 rounded-sm bg-yellow-3 border border-yellow-8 flex items-center justify-center">
              <ImageIconLucide
                className="size-4 text-yellow-11 opacity-90"
                strokeWidth={2}
                aria-hidden
              />
            </div>
            <div className="flex flex-col gap-1 flex-1 min-w-0 py-0.5">
              <div className="h-1.5 bg-gray-5 rounded-sm w-[55%]" />
              <div className="h-1 bg-gray-5 rounded-sm w-[38%]" />
            </div>
          </div>
          <ArrowButton className="size-3.5 text-gray-11 shrink-0" aria-hidden />
        </div>
      </div>
      <div className="px-2 py-2.5 flex flex-col gap-3">
        <p className="text-[9px] sm:text-[10px] text-gray-11 font-family-dm-sans leading-[1.35] text-left">
          {MINI_WIREFRAME_CATEGORY_DESCRIPTION}
        </p>
        <div
          className="flex items-center justify-center gap-1 sm:gap-1.5 w-full flex-wrap"
          aria-hidden
        >
          <span className="size-6 rounded-md flex items-center justify-center text-gray-11 shrink-0">
            <ArrowButton isOpen={false} className="size-2 rotate-180" />
          </span>
          {[0, 1].map((i) => (
            <div
              key={`mini-cat-l-${i}`}
              className="size-7 shrink-0 rounded-sm bg-yellow-3 border border-yellow-8 flex items-center justify-center"
            >
              <ImageIconLucide
                className="size-3.5 text-yellow-11 opacity-80"
                strokeWidth={2}
              />
            </div>
          ))}
          <div className="size-[42px] shrink-0 rounded-md bg-yellow-3 border-[1.5px] border-yellow-8 flex items-center justify-center px-0.5">
            <span className="text-[7px] font-bold text-yellow-11 font-manrope text-center leading-[1.1]">
              Imagem principal
            </span>
          </div>
          {[0, 1].map((i) => (
            <div
              key={`mini-cat-r-${i}`}
              className="size-7 shrink-0 rounded-sm bg-yellow-3 border border-yellow-8 flex items-center justify-center"
            >
              <ImageIconLucide
                className="size-3.5 text-yellow-11 opacity-80"
                strokeWidth={2}
              />
            </div>
          ))}
          <span className="size-6 rounded-md flex items-center justify-center text-gray-11 shrink-0">
            <ArrowButton isOpen={false} className="size-2" />
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <div className="bg-gray-2 border border-gray-6 rounded-md p-2 flex flex-col gap-2">
            <div className="h-1 bg-gray-5 rounded-sm w-full" />
            <div className="flex justify-between items-center gap-1">
              <div className="h-1 bg-gray-5 rounded-sm w-[28%]" />
              <div className="h-1.5 bg-gray-5 rounded-sm w-[40%]" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-1 bg-gray-5 rounded-sm w-[45%]" />
              <div className="h-2 bg-gray-5 rounded-sm w-[22%]" />
            </div>
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded-md p-2 flex flex-col gap-2">
            <div className="h-1 bg-gray-5 rounded-sm w-full" />
            <div className="flex justify-between items-center gap-1">
              <div className="h-1 bg-gray-5 rounded-sm w-[28%]" />
              <div className="h-1.5 bg-gray-5 rounded-sm w-[40%] opacity-0" />
            </div>
            <div className="flex justify-between items-center">
              <div className="h-1 bg-gray-5 rounded-sm w-[45%]" />
              <div className="h-2 bg-gray-5 rounded-sm w-[22%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

type TicketProductStripProps = {
  ticketId: string;
  ticketName: string;
  images: KitImagePositionProduct[];
  primaryProductId: string | undefined;
  onSelectPrimary: (ticketId: string, productId: string) => void;
};

const KitThumb = memo(function KitThumb({
  url,
  isPrimary,
  productId,
  productName,
  entityId,
  onSelectPrimary,
}: {
  url: string | null;
  isPrimary: boolean;
  productId: string;
  productName?: string | null;
  entityId: string;
  onSelectPrimary: (entityId: string, productId: string) => void;
}) {
  const initial = itemInitialLetter(productName, productId);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [url]);

  const showUrl = Boolean(url?.trim()) && !imageFailed;

  return (
    <button
      type="button"
      onClick={() => onSelectPrimary(entityId, productId)}
      className={cn(
        "relative shrink-0 size-20 rounded-lg overflow-hidden",
        isPrimary
          ? "border-2 border-yellow-8"
          : "border border-gray-6"
      )}
    >
      {showUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbs pequenos: img nativo + lazy pesa menos que next/image em listas longas
        <img
          src={url!}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="size-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="size-full bg-gray-4 flex items-center justify-center">
          <span className="font-semibold text-[22px] leading-none text-gray-11 font-manrope select-none">
            {initial}
          </span>
        </div>
      )}
      {isPrimary ? (
        <span className="absolute top-0 right-0 z-20 size-5 rounded-full bg-gray-1 flex items-center justify-center border border-yellow-8 pointer-events-none">
          <Star className="size-3.5 text-yellow-11 fill-yellow-11" />
        </span>
      ) : null}
    </button>
  );
});

const TicketProductStrip = memo(function TicketProductStrip({
  ticketId,
  ticketName,
  images,
  primaryProductId,
  onSelectPrimary,
}: TicketProductStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  if (images.length === 0) {
    return (
      <div className="flex flex-col gap-3 w-full">
        <p className="font-medium text-base text-gray-12 font-family-dm-sans">
          {ticketName}
        </p>
        <p className="text-sm text-gray-11 font-family-dm-sans">
          Nenhuma imagem de produto neste ingresso.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full">
      <p className="font-medium text-base text-gray-12 font-family-dm-sans">
        {ticketName}
      </p>
      <div className="relative w-full">
        <div
          ref={scrollRef}
          className="flex gap-2 items-center overflow-x-auto pb-1 pr-10 [scrollbar-width:thin]"
        >
          {images.map((img) => (
            <KitThumb
              key={img.productId}
              url={img.url}
              productId={img.productId}
              productName={img.name}
              entityId={ticketId}
              isPrimary={primaryProductId === img.productId}
              onSelectPrimary={onSelectPrimary}
            />
          ))}
        </div>
        {images.length > 4 ? (
          <button
            type="button"
            onClick={() => scrollBy(180)}
            className="absolute right-0 top-1/2 -translate-y-1/2 size-8 rounded-full border-[1.5px] border-gray-6 bg-gray-2 flex items-center justify-center hover:bg-gray-3"
            aria-label="Rolar imagens"
          >
            <ArrowButton className="size-4 text-gray-12" />
          </button>
        ) : null}
      </div>
    </div>
  );
});

const CategoryTicketsList = memo(function CategoryTicketsList({
  tickets,
}: {
  tickets: { id: string; name: string }[];
}) {
  if (tickets.length === 0) return null;
  return (
    <div className="bg-gray-3 flex flex-col gap-4 p-4 rounded-xl w-full">
      <p className="font-medium text-base text-gray-12 font-family-dm-sans">
        Ingressos desta categoria
      </p>
      <div className="flex flex-wrap gap-x-6 gap-y-2 items-start">
        {tickets.map((t) => (
          <div key={t.id} className="flex gap-2 items-center">
            <span
              className="size-1.5 rounded-full bg-primary-11 shrink-0"
              aria-hidden
            />
            <span className="font-medium text-sm text-gray-11 font-family-dm-sans whitespace-nowrap">
              {t.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

const CategoryImageStrip = memo(function CategoryImageStrip({
  categoryId,
  images,
  primaryProductId,
  onSelectPrimary,
}: {
  categoryId: string;
  images: KitImagePositionProduct[];
  primaryProductId: string | undefined;
  onSelectPrimary: (categoryId: string, productId: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollBy = useCallback((delta: number) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  }, []);

  if (images.length === 0) {
    return (
      <p className="text-sm text-gray-11 font-family-dm-sans">
        Nenhum produto de kit nesta categoria.
      </p>
    );
  }

  return (
    <div className="relative w-full">
      <div
        ref={scrollRef}
        className="flex gap-2 items-center overflow-x-auto pb-1 pr-10 [scrollbar-width:thin]"
      >
        {images.map((img) => (
          <KitThumb
            key={img.productId}
            url={img.url}
            productId={img.productId}
            productName={img.name}
            entityId={categoryId}
            isPrimary={primaryProductId === img.productId}
            onSelectPrimary={onSelectPrimary}
          />
        ))}
      </div>
      {images.length > 4 ? (
        <button
          type="button"
          onClick={() => scrollBy(180)}
          className="absolute right-0 top-1/2 -translate-y-1/2 size-8 rounded-full border-[1.5px] border-gray-6 bg-gray-2 flex items-center justify-center hover:bg-gray-3"
          aria-label="Rolar imagens"
        >
          <ArrowButton className="size-4 text-gray-12" />
        </button>
      ) : null}
    </div>
  );
});

function categoryBlockCategoriesPropsEqual(
  prev: {
    section: KitImagePositionCategorySection;
    aggregatedImages: KitImagePositionProduct[];
    primaryProductId: string | undefined;
    onSelectPrimary: (categoryId: string, productId: string) => void;
  },
  next: typeof prev
) {
  if (prev.section !== next.section) return false;
  if (prev.aggregatedImages !== next.aggregatedImages) return false;
  if (prev.primaryProductId !== next.primaryProductId) return false;
  if (prev.onSelectPrimary !== next.onSelectPrimary) return false;
  return true;
}

const CategoryBlockCategoriesMode = memo(function CategoryBlockCategoriesMode({
  section,
  aggregatedImages,
  primaryProductId,
  onSelectPrimary,
}: {
  section: KitImagePositionCategorySection;
  aggregatedImages: KitImagePositionProduct[];
  primaryProductId: string | undefined;
  onSelectPrimary: (categoryId: string, productId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  const ticketSummaries = useMemo(
    () => section.tickets.map((t) => ({ id: t.id, name: t.name })),
    [section.tickets]
  );

  return (
    <div className="border border-gray-6 rounded-lg overflow-hidden w-full [content-visibility:auto]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-6 bg-gray-1 hover:bg-gray-2"
      >
        <p className="font-bold text-base text-gray-12 font-manrope leading-[1.1] text-left">
          {section.name}
        </p>
        <ArrowButton
          isOpen={open}
          className="size-3 text-gray-12 shrink-0"
        />
      </button>
      {open ? (
        <div className="flex flex-col gap-4 px-4 py-5 bg-gray-1">
          <CategoryImageStrip
            categoryId={section.id}
            images={aggregatedImages}
            primaryProductId={primaryProductId}
            onSelectPrimary={onSelectPrimary}
          />
          <CategoryTicketsList tickets={ticketSummaries} />
        </div>
      ) : null}
    </div>
  );
}, categoryBlockCategoriesPropsEqual);

const UncategorizedCategoriesBlock = memo(
  function UncategorizedCategoriesBlock({
    section,
    aggregatedImages,
    primaryProductId,
    onSelectPrimary,
  }: {
    section: KitImagePositionCategorySection;
    aggregatedImages: KitImagePositionProduct[];
    primaryProductId: string | undefined;
    onSelectPrimary: (categoryId: string, productId: string) => void;
  }) {
    const ticketSummaries = useMemo(
      () => section.tickets.map((t) => ({ id: t.id, name: t.name })),
      [section.tickets]
    );

    return (
      <div className="border border-gray-6 rounded-lg overflow-hidden w-full [content-visibility:auto]">
        <div className="px-4 pt-4 pb-2">
          <p className="font-bold text-base text-gray-12 font-manrope leading-[1.1]">
            {section.name ? (
              <>
                {section.name}{" "}
                <span className="font-normal text-sm text-gray-11 font-family-dm-sans">
                  (Sem categoria)
                </span>
              </>
            ) : (
              "(Sem categoria)"
            )}
          </p>
        </div>
        <div className="flex flex-col gap-4 px-4 pb-5 bg-gray-1">
          <CategoryImageStrip
            categoryId={UNCATEGORIZED_CATEGORY_KEY}
            images={aggregatedImages}
            primaryProductId={primaryProductId}
            onSelectPrimary={onSelectPrimary}
          />
          <CategoryTicketsList tickets={ticketSummaries} />
        </div>
      </div>
    );
  },
  categoryBlockCategoriesPropsEqual
);

function categoryBlockPropsEqual(
  prev: {
    section: KitImagePositionCategorySection;
    primaryByTicket: Record<string, string>;
    onSelectPrimary: (ticketId: string, productId: string) => void;
  },
  next: {
    section: KitImagePositionCategorySection;
    primaryByTicket: Record<string, string>;
    onSelectPrimary: (ticketId: string, productId: string) => void;
  }
) {
  if (prev.section !== next.section) return false;
  if (prev.onSelectPrimary !== next.onSelectPrimary) return false;
  for (const t of prev.section.tickets) {
    if (prev.primaryByTicket[t.id] !== next.primaryByTicket[t.id]) return false;
  }
  return true;
}

const CategoryBlock = memo(function CategoryBlock({
  section,
  primaryByTicket,
  onSelectPrimary,
}: {
  section: KitImagePositionCategorySection;
  primaryByTicket: Record<string, string>;
  onSelectPrimary: (ticketId: string, productId: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-gray-6 rounded-lg overflow-hidden w-full [content-visibility:auto]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-4 border-b border-gray-6 bg-gray-1 hover:bg-gray-2"
      >
        <p className="font-bold text-base text-gray-12 font-manrope leading-[1.1] text-left">
          {section.name}
        </p>
        <ArrowButton isOpen={open} className="size-3 text-gray-12 shrink-0" />
      </button>
      {open ? (
        <div className="flex flex-col gap-4 px-4 py-5 bg-gray-1">
          {section.tickets.map((t) => (
            <TicketProductStrip
              key={t.id}
              ticketId={t.id}
              ticketName={t.name}
              images={t.images}
              primaryProductId={primaryByTicket[t.id]}
              onSelectPrimary={onSelectPrimary}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}, categoryBlockPropsEqual);

const DRAWER_OVERLAY_LIGHT =
  "bg-black/25 supports-backdrop-filter:backdrop-blur-none";

export function KitImagePositionDrawer({
  isOpen,
  onClose,
  sections,
  uncategorized,
  initialKitSelection,
  onSave,
  saveSuccessMessage = "Configuração salva.",
}: KitImagePositionDrawerProps) {
  const [layout, setLayout] = useState<KitImageLayoutMode>("on_tickets");
  const [primaryByTicket, setPrimaryByTicket] = useState<
    Record<string, string>
  >({});
  const [primaryByCategory, setPrimaryByCategory] = useState<
    Record<string, string>
  >({});

  const allTicketRows = useMemo(() => {
    const rows: KitImagePositionTicketRow[] = [];
    sections.forEach((s) => rows.push(...s.tickets));
    if (uncategorized?.tickets?.length) {
      rows.push(...uncategorized.tickets);
    }
    return rows;
  }, [sections, uncategorized]);

  const categoryAggregates = useMemo(() => {
    const map: Record<string, KitImagePositionProduct[]> = {};
    sections.forEach((s) => {
      map[s.id] = aggregateCategoryProducts(s.tickets);
    });
    if (uncategorized?.tickets?.length) {
      map[UNCATEGORIZED_CATEGORY_KEY] = aggregateCategoryProducts(
        uncategorized.tickets
      );
    }
    return map;
  }, [sections, uncategorized]);

  useEffect(() => {
    if (!isOpen) return;

    const nextTicket: Record<string, string> = {};
    for (const t of allTicketRows) {
      const pid = resolvePrimaryAmongProducts(
        t.images,
        initialKitSelection?.primaryByTicket?.[t.id]
      );
      if (pid) nextTicket[t.id] = pid;
    }
    setPrimaryByTicket(nextTicket);

    const nextCat: Record<string, string> = {};
    for (const s of sections) {
      const imgs = aggregateCategoryProducts(s.tickets);
      const pid = resolvePrimaryAmongProducts(
        imgs,
        initialKitSelection?.primaryByCategory?.[s.id]
      );
      if (pid) nextCat[s.id] = pid;
    }
    if (uncategorized?.tickets?.length) {
      const imgs = aggregateCategoryProducts(uncategorized.tickets);
      const pid = resolvePrimaryAmongProducts(
        imgs,
        initialKitSelection?.primaryByCategory?.[UNCATEGORIZED_CATEGORY_KEY]
      );
      if (pid) nextCat[UNCATEGORIZED_CATEGORY_KEY] = pid;
    }
    setPrimaryByCategory(nextCat);

    setLayout(initialKitSelection?.layout ?? "on_tickets");
  }, [isOpen, allTicketRows, sections, uncategorized, initialKitSelection]);

  const handleSelectPrimary = useCallback(
    (ticketId: string, productId: string) => {
      setPrimaryByTicket((prev) => ({ ...prev, [ticketId]: productId }));
    },
    []
  );

  const handleSelectPrimaryCategory = useCallback(
    (categoryId: string, productId: string) => {
      setPrimaryByCategory((prev) => ({ ...prev, [categoryId]: productId }));
    },
    []
  );

  const handleSave = useCallback(async () => {
    try {
      await onSave?.({
        layout,
        primaryProductIdByTicketId: primaryByTicket,
        primaryProductIdByCategoryId: primaryByCategory,
      });
      toast.success(saveSuccessMessage);
      onClose();
    } catch {
      toast.error("Não foi possível salvar.");
    }
  }, [
    layout,
    primaryByTicket,
    primaryByCategory,
    onSave,
    onClose,
    saveSuccessMessage,
  ]);

  const hasAnyImages = useMemo(
    () => allTicketRows.some((t) => t.images.length > 0),
    [allTicketRows]
  );

  const hasAnyCategoryImages = useMemo(
    () => Object.values(categoryAggregates).some((imgs) => imgs.length > 0),
    [categoryAggregates]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose]
  );

  return (
    <Drawer
      open={isOpen}
      onOpenChange={handleOpenChange}
      direction="right"
      shouldScaleBackground={false}
    >
      <DrawerContent
        overlayClassName={DRAWER_OVERLAY_LIGHT}
        className="bg-gray-1 flex h-full max-h-dvh w-full flex-col sm:max-w-[730px] border-l border-gray-6 rounded-l-xl p-0"
        aria-describedby={undefined}
      >
        <DrawerHeader className="border-b border-gray-6 px-5 py-3 flex flex-row items-center justify-between shrink-0 space-y-0 rounded-none">
          <DrawerTitle className="font-semibold text-[20px] leading-[1.1] text-gray-12 font-manrope text-left">
            Selecione a posição desejada
          </DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3"
              aria-label="Fechar"
            >
              <X className="size-6 text-gray-12" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 min-h-0 overflow-y-auto flex flex-col overscroll-contain">
          <div className="p-5 flex flex-col gap-8">
            <div className="flex gap-1 items-center w-full">
              <Info className="size-5 text-gray-11 shrink-0 mt-0.5" />
              <p className="flex-1 text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                Na tela em que os participantes escolhem o ingresso, em qual
                posição as imagens dos produtos do kit devem aparecer?
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <div
                role="button"
                tabIndex={0}
                onClick={() => setLayout("on_tickets")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLayout("on_tickets");
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col gap-4 items-start p-4 rounded-lg border text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-8",
                  layout === "on_tickets"
                    ? "bg-primary-2 border-primary-6"
                    : "bg-gray-1 border-gray-6 hover:bg-gray-2"
                )}
              >
                <div className="flex gap-2 items-center">
                  <Radio
                    name="kit-image-layout"
                    checked={layout === "on_tickets"}
                    onChange={() => setLayout("on_tickets")}
                  />
                  <span className="text-base text-gray-12 font-family-dm-sans">
                    Nos ingressos
                  </span>
                </div>
                <MiniWireframeOnTickets />
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => setLayout("on_categories")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setLayout("on_categories");
                  }
                }}
                className={cn(
                  "flex-1 flex flex-col gap-4 items-start p-4 rounded-lg border text-left cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary-8",
                  layout === "on_categories"
                    ? "bg-primary-2 border-primary-6"
                    : "bg-gray-1 border-gray-6 hover:bg-gray-2"
                )}
              >
                <div className="flex gap-2 items-center">
                  <Radio
                    name="kit-image-layout"
                    checked={layout === "on_categories"}
                    onChange={() => setLayout("on_categories")}
                  />
                  <span className="text-base text-gray-12 font-family-dm-sans">
                    Nas categorias
                  </span>
                </div>
                <MiniWireframeOnCategories />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="font-semibold text-base text-gray-12 font-manrope leading-[1.1]">
                {layout === "on_tickets"
                  ? "Imagem principal de cada ingresso"
                  : "Imagem principal de cada categoria"}
              </p>
              <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                Defina a imagem principal. Ela será exibida em destaque, maior
                que as demais. As outras também ficam visíveis ao lado.
              </p>
            </div>

            {layout === "on_tickets" ? (
              !hasAnyImages ? (
                <p className="text-base text-gray-11 font-family-dm-sans py-6 text-center border border-dashed border-gray-6 rounded-lg">
                  Nenhum ingresso com produtos no kit para configurar imagens.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {sections.map((section) => (
                    <CategoryBlock
                      key={section.id}
                      section={section}
                      primaryByTicket={primaryByTicket}
                      onSelectPrimary={handleSelectPrimary}
                    />
                  ))}
                  {uncategorized && uncategorized.tickets.length > 0 ? (
                    <div className="border border-gray-6 rounded-lg overflow-hidden w-full [content-visibility:auto]">
                      <div className="px-4 pt-4 pb-2">
                        <p className="font-bold text-base text-gray-12 font-manrope">
                          {uncategorized.name ? (
                            <>
                              {uncategorized.name}{" "}
                              <span className="font-normal text-sm text-gray-11 font-family-dm-sans">
                                (Sem categoria)
                              </span>
                            </>
                          ) : (
                            "(Sem categoria)"
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col gap-4 px-4 pb-5 bg-gray-1">
                        {uncategorized.tickets.map((t) => (
                          <TicketProductStrip
                            key={t.id}
                            ticketId={t.id}
                            ticketName={t.name}
                            images={t.images}
                            primaryProductId={primaryByTicket[t.id]}
                            onSelectPrimary={handleSelectPrimary}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            ) : !hasAnyCategoryImages ? (
              <p className="text-base text-gray-11 font-family-dm-sans py-6 text-center border border-dashed border-gray-6 rounded-lg">
                Nenhuma categoria com produtos no kit para configurar imagens.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {sections.map((section) => (
                  <CategoryBlockCategoriesMode
                    key={section.id}
                    section={section}
                    aggregatedImages={
                      categoryAggregates[section.id] ?? []
                    }
                    primaryProductId={primaryByCategory[section.id]}
                    onSelectPrimary={handleSelectPrimaryCategory}
                  />
                ))}
                {uncategorized && uncategorized.tickets.length > 0 ? (
                  <UncategorizedCategoriesBlock
                    section={uncategorized}
                    aggregatedImages={
                      categoryAggregates[UNCATEGORIZED_CATEGORY_KEY] ?? []
                    }
                    primaryProductId={
                      primaryByCategory[UNCATEGORIZED_CATEGORY_KEY]
                    }
                    onSelectPrimary={handleSelectPrimaryCategory}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-6 px-4 py-3 flex justify-end bg-gray-1">
          <Button
            type="button"
            onClick={handleSave}
            className="h-11 px-5 font-bold text-base font-manrope"
          >
            Salvar configuração
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
