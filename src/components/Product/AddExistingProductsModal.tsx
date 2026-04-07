"use client";

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useAddExistingProductsModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { X, Search, Ticket, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import toast from "react-hot-toast";
import { Checkbox } from "../CheckBox";
import { organizerService } from "@/services";
import { cn } from "@/utils/cn";
import { ArrowButton } from "@/components/ArrowButton";

interface Product {
  id: string;
  name: string;
  image: string | null;
  isRequired: boolean;
  isIncludedInTicket: boolean;
  /** API retorna em centavos (number); exibição em reais */
  basePrice?: number | string;
  linkedTickets?: string[];
}

interface EventTicket {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string;
  productIds: string[];
}

/** API envia preço base em centavos (number ou string numérica). */
function formatProductPrice(value: number | string | undefined): string {
  if (value == null || value === "") return "0,00";
  let cents: number;
  if (typeof value === "number" && Number.isFinite(value)) {
    cents = value;
  } else {
    const s = String(value).trim().replace(",", ".");
    const n = parseFloat(s);
    if (!Number.isFinite(n)) return "0,00";
    cents = n;
  }
  const reais = cents / 100;
  return reais.toFixed(2).replace(".", ",");
}

type LinkedTicketsPopoverPlacement = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

function productHasLinkedTickets(
  productId: string,
  tickets: EventTicket[],
): boolean {
  return tickets.some(
    (t) => Array.isArray(t.productIds) && t.productIds.includes(productId),
  );
}

export function AddExistingProductsModal() {
  const { isOpen, closeAddExistingProductsModal, data, onModalSave } =
    useAddExistingProductsModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [tickets, setTickets] = useState<EventTicket[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [expandedProductId, setExpandedProductId] = useState<string | null>(
    null,
  );
  const [linkedPopoverPlacement, setLinkedPopoverPlacement] =
    useState<LinkedTicketsPopoverPlacement | null>(null);
  const [productLinkedTickets, setProductLinkedTickets] = useState<
    Record<string, Set<string>>
  >({});
  const [portalMounted, setPortalMounted] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [linkedSheetQuery, setLinkedSheetQuery] = useState("");

  const linkTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const linkedPopoverRef = useRef<HTMLDivElement | null>(null);
  const linkedSheetRef = useRef<HTMLDivElement | null>(null);

  const eventId = data?.eventId;

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobileViewport(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    setLinkedSheetQuery("");
  }, [expandedProductId]);

  useLayoutEffect(() => {
    if (!expandedProductId || isMobileViewport) {
      setLinkedPopoverPlacement(null);
      return;
    }

    const el = linkTriggerRefs.current.get(expandedProductId);
    if (!el) {
      setLinkedPopoverPlacement(null);
      return;
    }

    const update = () => {
      const trigger = linkTriggerRefs.current.get(expandedProductId);
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const minW = 260;
      const maxW = Math.min(380, window.innerWidth - 16);
      const width = Math.min(Math.max(r.width, minW), maxW);
      let left = r.left;
      if (left + width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - width - 8);
      }
      if (left < 8) left = 8;
      const gap = 8;
      const top = r.bottom + gap;
      const maxHeight = Math.min(
        280,
        Math.max(120, window.innerHeight - top - 12),
      );
      setLinkedPopoverPlacement({ top, left, width, maxHeight });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [expandedProductId, isMobileViewport]);

  useEffect(() => {
    if (!expandedProductId) return;

    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const trigger = linkTriggerRefs.current.get(expandedProductId);
      if (trigger?.contains(t)) return;
      if (linkedPopoverRef.current?.contains(t)) return;
      if (linkedSheetRef.current?.contains(t)) return;
      setExpandedProductId(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [expandedProductId]);

  const excludeProductIds = useMemo(() => {
    const raw = data?.excludeProductIds;
    if (!Array.isArray(raw)) return new Set<string>();
    return new Set(
      raw.filter(
        (id): id is string => typeof id === "string" && id.trim().length > 0,
      ),
    );
  }, [data?.excludeProductIds]);

  const availableProducts = useMemo(
    () => products.filter((p) => !excludeProductIds.has(p.id)),
    [products, excludeProductIds],
  );

  const filteredProducts = useMemo(
    () =>
      availableProducts.filter((product) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [availableProducts, searchQuery],
  );

  const expandedProduct = useMemo(() => {
    if (!expandedProductId) return null;
    return (
      products.find((p) => p.id === expandedProductId) ??
      availableProducts.find((p) => p.id === expandedProductId) ??
      null
    );
  }, [expandedProductId, products, availableProducts]);

  const ticketsLinkedToExpanded = useMemo(() => {
    if (!expandedProductId) return [];
    return tickets.filter(
      (t) => Array.isArray(t.productIds) && t.productIds.includes(expandedProductId),
    );
  }, [tickets, expandedProductId]);

  const linkedSheetTicketsFiltered = useMemo(() => {
    const q = linkedSheetQuery.trim().toLowerCase();
    if (!q) return ticketsLinkedToExpanded;
    return ticketsLinkedToExpanded.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.categoryName.toLowerCase().includes(q),
    );
  }, [ticketsLinkedToExpanded, linkedSheetQuery]);

  const sheetCategoryLabel = ticketsLinkedToExpanded[0]?.categoryName ?? "—";

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedProducts(new Set());
      setExpandedProductId(null);
    }
  }, [isOpen]);

  // Load products and tickets
  useEffect(() => {
    if (isOpen && eventId) {
      loadProducts();
      loadTickets();
    }
  }, [isOpen, eventId]);

  const loadProducts = async () => {
    if (!eventId) return;

    try {
      const response = await organizerService.getProducts(eventId);
      setProducts(response.products || []);

      const linked: Record<string, Set<string>> = {};
      setProductLinkedTickets(linked);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const loadTickets = async () => {
    if (!eventId) return;

    try {
      const [tRes, categories] = await Promise.all([
        organizerService.getTickets(eventId, { page: 1, limit: 500 }),
        organizerService.getTicketCategories(eventId),
      ]);
      const catMap = new Map<string, string>();
      for (const c of categories || []) {
        const row = c as { id?: string; name?: string };
        if (row?.id && typeof row.name === "string") {
          catMap.set(row.id, row.name);
        }
      }
      const raw = tRes.tickets || [];
      const mapped: EventTicket[] = raw.map((t: any) => {
        const categoryId = t.categoryId ?? null;
        return {
          id: t.id,
          name: t.name ?? "",
          categoryId,
          categoryName: categoryId
            ? catMap.get(categoryId) ?? "Sem categoria"
            : "Sem categoria",
          productIds: Array.isArray(t.productIds) ? t.productIds : [],
        };
      });
      setTickets(mapped);
    } catch (error) {
      console.error("Error loading tickets:", error);
      toast.error("Erro ao carregar ingressos");
    }
  };

  const handleToggleProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      if (expandedProductId === productId) {
        setExpandedProductId(null);
      }
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleAddToTicket = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    try {
      const selectedProductsData = Array.from(selectedProducts)
        .map((id) => {
          const product = products.find((p) => p.id === id);
          if (!product) return null;
          return {
            ...product,
            linkedTickets: Array.from(productLinkedTickets[id] || []),
          };
        })
        .filter((p): p is NonNullable<typeof p> => p !== null);

      if (selectedProductsData.length === 0) {
        toast.error("Nenhum produto válido selecionado");
        return;
      }

      if (onModalSave) {
        try {
          await onModalSave({ products: selectedProductsData });
        } catch (error) {
          console.error("Error in onModalSave callback:", error);
          toast.error("Erro ao adicionar produtos");
          return;
        }
      } else {
        console.error("onModalSave is undefined!");
        toast.error("Erro: callback não configurado");
        return;
      }

      closeAddExistingProductsModal();
    } catch (error: unknown) {
      console.error("Error adding products:", error);
      toast.error("Erro ao adicionar produtos");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/60 md:bg-black/90"
            onClick={closeAddExistingProductsModal}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex max-md:p-0 md:items-center md:justify-center md:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={cn(
                "flex w-full flex-col overflow-hidden bg-gray-1 shadow-2xl pt-16 md:pt-0",
                "max-md:h-full max-md:max-h-full max-md:rounded-none",
                "md:max-h-[80vh] md:max-w-[1192px] md:rounded-xl md:border md:border-gray-6",
              )}
            >
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between border-b border-gray-6",
                  "max-md:h-[52px] max-md:bg-gray-2 max-md:px-4 max-md:py-2",
                  "md:px-6 md:py-4",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                  <button
                    type="button"
                    onClick={closeAddExistingProductsModal}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg md:border border-gray-6 text-gray-12 hover:bg-gray-3 md:hidden"
                    aria-label="Voltar"
                  >
                    <ArrowButton isOpen={false} className="rotate-180" />
                  </button>
                  <h2
                    className={cn(
                      "min-w-0 text-gray-12 leading-[1.1]",
                      "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                      "md:text-[20px] md:font-semibold md:font-family-dm-sans md:leading-[1.3]",
                    )}
                  >
                    Lista de produtos
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeAddExistingProductsModal}
                  className="hidden p-1 text-gray-11 transition-colors hover:text-gray-12 md:block"
                  aria-label="Fechar"
                >
                  <X className="size-6" />
                </button>
              </div>

              <div
                className={cn(
                  "min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-2",
                  "max-md:pb-32",
                )}
              >
                <div
                  className={cn(
                    "flex flex-col",
                    "max-md:gap-5 max-md:p-4",
                    "md:gap-6 md:p-6",
                  )}
                >
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-11" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquise aqui..."
                      className="h-12 pl-10 pr-4"
                    />
                  </div>

                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="max-w-md text-center text-base font-family-dm-sans text-gray-11">
                        {searchQuery.trim()
                          ? "Nenhum produto encontrado"
                          : availableProducts.length === 0 &&
                            products.length > 0
                            ? "Todos os produtos já estão adicionados a este ingresso"
                            : "Nenhum produto cadastrado"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid max-md:grid-cols-1 max-md:gap-3 md:grid-cols-3 md:gap-4">
                      {filteredProducts.map((product) => {
                        const isSelected = selectedProducts.has(product.id);
                        const isExpanded = expandedProductId === product.id;
                        const showLinkedRow = productHasLinkedTickets(
                          product.id,
                          tickets,
                        );

                        return (
                          <div
                            key={product.id}
                            className="flex flex-col overflow-hidden rounded-xl border border-gray-6 bg-gray-2 md:gap-3"
                          >
                            <div
                              className={cn(
                                "flex items-center gap-3 p-4",
                                "max-md:border-b max-md:border-gray-6",
                              )}
                            >
                              <div className="relative size-[100px] shrink-0 overflow-hidden rounded-lg bg-gray-3">
                                <ImageWithInitialFallback
                                  src={product.image}
                                  alt={product.name}
                                  name={product.name}
                                  fallbackId={product.id}
                                  fill
                                  sizes="100px"
                                  className="size-full border-transparent border-0"
                                  letterClassName="text-2xl font-semibold"
                                />
                              </div>

                              <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 py-2">
                                <h3
                                  className={cn(
                                    "text-gray-12 leading-[1.1]",
                                    "max-md:font-manrope max-md:text-base max-md:font-semibold",
                                    "md:text-base md:font-semibold md:font-family-dm-sans md:leading-[1.3]",
                                  )}
                                >
                                  {product.name}
                                </h3>
                                <div className="flex flex-col gap-3">
                                  <span className="text-sm font-family-dm-sans text-gray-11">
                                    {product.isRequired
                                      ? "Obrigatório"
                                      : "Opcional"}
                                  </span>
                                  <span className="text-sm font-semibold font-family-dm-sans text-gray-11">
                                    {product.isIncludedInTicket
                                      ? "Valor incluso no ingresso"
                                      : `R$ ${formatProductPrice(product.basePrice)}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div
                              className={cn(
                                "rounded-b-xl bg-gray-2",
                                "max-md:p-4",
                                "md:border-t md:border-gray-6 md:p-2",
                              )}
                            >
                              <div
                                className={cn(
                                  "flex items-center gap-2",
                                  showLinkedRow
                                    ? "justify-between"
                                    : "justify-end",
                                )}
                              >
                                {showLinkedRow ? (
                                  <button
                                    type="button"
                                    ref={(el) => {
                                      if (el)
                                        linkTriggerRefs.current.set(
                                          product.id,
                                          el,
                                        );
                                      else
                                        linkTriggerRefs.current.delete(
                                          product.id,
                                        );
                                    }}
                                    onClick={() => {
                                      setExpandedProductId(
                                        isExpanded ? null : product.id,
                                      );
                                    }}
                                    className={cn(
                                      "flex min-w-0 items-center gap-1 text-left transition-colors",
                                      "max-md:gap-1 max-md:text-base max-md:font-normal max-md:font-family-dm-sans max-md:leading-[1.3] max-md:text-gray-12 max-md:underline",
                                      "md:gap-2 md:text-sm md:font-normal md:font-family-dm-sans md:text-gray-11 md:no-underline md:hover:text-gray-12",
                                    )}
                                  >
                                    <Ticket className="size-5 shrink-0 md:hidden" />
                                    <Link2 className="size-4 shrink-0 max-md:hidden" />
                                    <span>Ver ingressos vinculados</span>
                                  </button>
                                ) : null}
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() =>
                                    handleToggleProduct(product.id)
                                  }
                                  className="max-md:size-6 max-md:rounded-md"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div
                className={cn(
                  "flex shrink-0 items-center gap-3 border-t border-gray-6",
                  "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-60 max-md:flex-col max-md:bg-gray-1 max-md:p-4",
                  "md:static md:justify-end md:px-6 md:py-4",
                )}
              >
                <Button
                  variant="outline"
                  onClick={closeAddExistingProductsModal}
                  className="border-gray-6 px-4 py-2 text-gray-11 max-md:w-full"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddToTicket}
                  disabled={selectedProducts.size === 0}
                  className="max-md:w-full"
                >
                  Adicionar ao ingresso
                </Button>
              </div>
            </div>
          </motion.div>

          {portalMounted &&
            isOpen &&
            expandedProductId &&
            typeof document !== "undefined" &&
            createPortal(
              <>
                {isMobileViewport ? (
                  <motion.div
                    key="linked-sheet-mobile"
                    role="dialog"
                    aria-labelledby="add-existing-linked-sheet-title"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-250 flex flex-col justify-end md:hidden"
                    data-add-existing-linked-sheet
                  >
                    <button
                      type="button"
                      aria-label="Fechar"
                      className="absolute inset-0 bg-[rgba(32,32,32,0.9)]"
                      onClick={() => setExpandedProductId(null)}
                    />
                    <motion.div
                      ref={linkedSheetRef}
                      initial={{ y: "100%" }}
                      animate={{ y: 0 }}
                      transition={{ type: "spring", damping: 28, stiffness: 320 }}
                      className="relative flex max-h-[min(92vh,812px)] w-full flex-col overflow-hidden rounded-t-xl border border-b-0 border-gray-6 bg-gray-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex shrink-0 items-center justify-between border-b border-gray-6 px-4 py-2">
                        <p
                          id="add-existing-linked-sheet-title"
                          className="text-base font-semibold font-family-dm-sans leading-[1.3] text-gray-12"
                        >
                          Ingressos vinculados
                        </p>
                        <button
                          type="button"
                          onClick={() => setExpandedProductId(null)}
                          className="flex size-7 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-3 hover:text-gray-12"
                          aria-label="Fechar"
                        >
                          <X className="size-5" />
                        </button>
                      </div>
                      <div className="min-h-0 flex-1 overflow-y-auto pb-10">
                        <p className="px-4 pb-3 pt-4 text-center text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                          Este produto faz parte do kit destes ingressos
                        </p>
                        <div className="flex flex-col gap-3 px-4">
                          <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-11" />
                            <Input
                              type="text"
                              value={linkedSheetQuery}
                              onChange={(e) =>
                                setLinkedSheetQuery(e.target.value)
                              }
                              placeholder="Pesquise aqui..."
                              className="h-11 pl-10 pr-4 text-sm"
                            />
                          </div>
                          {expandedProduct ? (
                            <div className="flex gap-3 rounded-lg border border-gray-6 bg-gray-2 px-3 py-2">
                              <div className="relative size-[52px] shrink-0 overflow-hidden rounded border border-gray-6 bg-gray-3">
                                <ImageWithInitialFallback
                                  src={expandedProduct.image}
                                  alt={expandedProduct.name}
                                  name={expandedProduct.name}
                                  fallbackId={expandedProduct.id}
                                  fill
                                  sizes="52px"
                                  className="size-full border-transparent border-0"
                                  letterClassName="text-sm font-semibold"
                                />
                              </div>
                              <div className="flex min-w-0 flex-col justify-center gap-3 py-2">
                                <p className="text-base font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                  {sheetCategoryLabel}
                                </p>
                                <p className="font-manrope text-base font-semibold leading-[1.1] text-gray-12">
                                  {expandedProduct.name}
                                </p>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        <div className="grid grid-cols-2 gap-x-1 gap-y-3 px-4 pb-6 pt-1">
                          {linkedSheetTicketsFiltered.length === 0 ? (
                            <p className="col-span-2 p-2 text-sm font-family-dm-sans text-gray-11">
                              {ticketsLinkedToExpanded.length === 0
                                ? "Nenhum ingresso vincula este produto"
                                : "Nenhum resultado"}
                            </p>
                          ) : (
                            linkedSheetTicketsFiltered.map((ticket) => (
                              <div
                                key={ticket.id}
                                className="flex flex-col gap-[9px] rounded-lg bg-gray-1 p-3 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.25)]"
                              >
                                <p className="text-sm font-normal font-family-dm-sans leading-[1.3] text-gray-11">
                                  {ticket.categoryName}
                                </p>
                                <p className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12">
                                  {ticket.name}
                                </p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                ) : null}

                {!isMobileViewport &&
                  linkedPopoverPlacement &&
                  expandedProductId ? (
                  <motion.div
                    key={expandedProductId}
                    ref={linkedPopoverRef}
                    role="dialog"
                    aria-labelledby="add-existing-linked-popover-title"
                    aria-label="Ingressos vinculados ao produto"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.12 }}
                    className="fixed z-200 flex flex-col overflow-hidden rounded-lg border border-gray-6 bg-gray-1 shadow-lg"
                    style={{
                      top: linkedPopoverPlacement.top,
                      left: linkedPopoverPlacement.left,
                      width: linkedPopoverPlacement.width,
                      maxHeight: linkedPopoverPlacement.maxHeight,
                    }}
                    data-add-existing-linked-popover
                  >
                    <div className="shrink-0 border-b border-gray-6 px-3 py-2.5">
                      <p
                        id="add-existing-linked-popover-title"
                        className="text-sm font-semibold font-family-dm-sans leading-[1.3] text-gray-12"
                      >
                        Ingressos vinculados
                      </p>
                    </div>
                    <div className="flex min-h-0 flex-1 flex-wrap content-start gap-2 overflow-y-auto p-2">
                      {tickets.length === 0 ? (
                        <p className="w-full p-2 text-sm font-family-dm-sans text-gray-11">
                          Nenhum ingresso disponível
                        </p>
                      ) : (
                        tickets.map((ticket) => (
                          <span
                            key={ticket.id}
                            className="rounded-md bg-gray-3 px-3 py-1.5 text-sm font-normal font-family-dm-sans text-gray-12"
                          >
                            {ticket.name}
                          </span>
                        ))
                      )}
                    </div>
                  </motion.div>
                ) : null}
              </>,
              document.body,
            )}
        </>
      )}
    </AnimatePresence>
  );
}
