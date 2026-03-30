"use client";

import { useState, useEffect, useMemo, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useAddExistingProductsModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { X, Search, Link2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import toast from "react-hot-toast";
import { Checkbox } from "../CheckBox";
import { organizerService } from "@/services";

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

/** API envia preço base em centavos (number ou string numérica). */
function formatProductPrice(value: number | string | undefined): string {
  console.log("value", value);
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

interface Ticket {
  id: string;
  name: string;
}

type LinkedTicketsPopoverPlacement = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

export function AddExistingProductsModal() {
  const { isOpen, closeAddExistingProductsModal, data, onModalSave } = useAddExistingProductsModal();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [linkedPopoverPlacement, setLinkedPopoverPlacement] =
    useState<LinkedTicketsPopoverPlacement | null>(null);
  const [productLinkedTickets, setProductLinkedTickets] = useState<Record<string, Set<string>>>({});
  const [portalMounted, setPortalMounted] = useState(false);

  const linkTriggerRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const linkedPopoverRef = useRef<HTMLDivElement | null>(null);

  const eventId = data?.eventId;

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!expandedProductId) {
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
      const maxHeight = Math.min(280, Math.max(120, window.innerHeight - top - 12));
      setLinkedPopoverPlacement({ top, left, width, maxHeight });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [expandedProductId]);

  useEffect(() => {
    if (!expandedProductId) return;

    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      const trigger = linkTriggerRefs.current.get(expandedProductId);
      if (trigger?.contains(t)) return;
      if (linkedPopoverRef.current?.contains(t)) return;
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

      // Load linked tickets for each product (from productIds in tickets)
      const linked: Record<string, Set<string>> = {};
      // TODO: implementar lógica de tickets vinculados se necessário
      setProductLinkedTickets(linked);
    } catch (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    }
  };

  const loadTickets = async () => {
    if (!eventId) return;

    try {
      const response = await organizerService.getTickets(eventId);
      setTickets(response.tickets || []);
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

  const handleToggleTicketLink = (productId: string, ticketId: string) => {
    const current = productLinkedTickets[productId] || new Set<string>();
    const updated = new Set(current);

    if (updated.has(ticketId)) {
      updated.delete(ticketId);
    } else {
      updated.add(ticketId);
    }

    setProductLinkedTickets({
      ...productLinkedTickets,
      [productId]: updated,
    });
  };

  const handleAddToTicket = async () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    try {
      const selectedProductsData = Array.from(selectedProducts)
        .map(id => {
          const product = products.find(p => p.id === id);
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
          // Toast será exibido pelo callback, não precisa aqui
        } catch (error) {
          console.error("Error in onModalSave callback:", error);
          toast.error("Erro ao adicionar produtos");
          return; // Don't close modal if there was an error
        }
      } else {
        console.error("onModalSave is undefined!");
        toast.error("Erro: callback não configurado");
        return; // Don't close modal if callback is missing
      }

      closeAddExistingProductsModal();
    } catch (error: any) {
      console.error("Error adding products:", error);
      toast.error("Erro ao adicionar produtos");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
            onClick={closeAddExistingProductsModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[1192px] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-6 flex items-center justify-between px-6 py-4 shrink-0">
                <h2 className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[1.3]">
                  Lista de produtos
                </h2>
                <button
                  onClick={closeAddExistingProductsModal}
                  className="text-gray-11 hover:text-gray-12 transition-colors p-1"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 min-h-0 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                <div className="flex flex-col gap-6 p-6">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-11" />
                    <Input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Pesquise aqui..."
                      className="h-12 pl-10 pr-4"
                    />
                  </div>

                  {/* Products Grid */}
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="text-gray-11 text-base font-family-dm-sans text-center max-w-md">
                        {searchQuery.trim()
                          ? "Nenhum produto encontrado"
                          : availableProducts.length === 0 && products.length > 0
                            ? "Todos os produtos já estão adicionados a este ingresso"
                            : "Nenhum produto cadastrado"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {filteredProducts.map((product) => {
                        const isSelected = selectedProducts.has(product.id);
                        const isExpanded = expandedProductId === product.id;

                        return (
                          <div
                            key={product.id}
                            className="bg-gray-2 border border-gray-6 rounded-xl flex flex-col gap-3"
                          >
                            <div className="flex items-center gap-3 p-4">
                              {/* Product Image */}
                              <div className="relative size-[100px] rounded-lg overflow-hidden bg-gray-3">
                                {product.image ? (
                                  <Image
                                    src={product.image}
                                    alt={product.name}
                                    height={100}
                                    width={100}
                                    className="object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gray-4" />
                                )}
                              </div>

                              {/* Product Info */}
                              <div className="flex flex-col justify-between h-full py-2 gap-2">
                                <h3 className="text-gray-12 text-base font-semibold font-family-dm-sans leading-[1.3]">
                                  {product.name}
                                </h3>
                                <div className="flex flex-col gap-1">
                                  <span className={`text-sm font-family-dm-sans text-gray-11`}>
                                    {product.isRequired ? "Obrigatório" : "Opcional"}
                                  </span>
                                  <span className="text-gray-11 text-sm font-semibold font-family-dm-sans">
                                    {product.isIncludedInTicket
                                      ? "Valor incluso no ingresso"
                                      : `R$ ${formatProductPrice(product.basePrice)}`}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Ver ingressos — painel em portal (fora do card) */}
                            <div className="bg-gray-2 border-t border-gray-6 rounded-b-xl p-2">
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  ref={(el) => {
                                    if (el) linkTriggerRefs.current.set(product.id, el);
                                    else linkTriggerRefs.current.delete(product.id);
                                  }}
                                  onClick={() => {
                                    setExpandedProductId(isExpanded ? null : product.id);
                                  }}
                                  className="flex items-center gap-2 text-gray-11 hover:text-gray-12 transition-colors text-left"
                                >
                                  <Link2 className="size-4 shrink-0" />
                                  <span className="text-sm font-normal font-family-dm-sans">
                                    Ver ingressos vinculados
                                  </span>
                                </button>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => handleToggleProduct(product.id)}
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

              {/* Footer */}
              <div className="border-t border-gray-6 flex items-center justify-end gap-3 px-6 py-4 shrink-0">
                <Button
                  variant="outline"
                  onClick={closeAddExistingProductsModal}
                  className="border-gray-6 text-gray-11 px-4 py-2"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleAddToTicket}
                  disabled={selectedProducts.size === 0}

                >
                  Adicionar ao ingresso
                </Button>
              </div>
            </div>
          </motion.div>

          {portalMounted &&
            isOpen &&
            expandedProductId &&
            linkedPopoverPlacement &&
            typeof document !== "undefined" &&
            createPortal(
              <motion.div
                key={expandedProductId}
                ref={linkedPopoverRef}
                role="dialog"
                aria-labelledby="add-existing-linked-popover-title"
                aria-label="Ingressos vinculados ao produto"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed z-[200] flex flex-col overflow-hidden rounded-lg border border-gray-6 bg-gray-1 shadow-lg"
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
                    className="text-gray-12 text-sm font-semibold font-family-dm-sans leading-[1.3]"
                  >
                    Ingressos vinculados
                  </p>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto p-2 flex flex-wrap gap-2 content-start">
                  {tickets.length === 0 ? (
                    <p className="text-gray-11 text-sm font-family-dm-sans p-2 w-full">
                      Nenhum ingresso disponível
                    </p>
                  ) : (
                    tickets.map((ticket) => (
                      <span
                        key={ticket.id}
                        className="text-gray-12 text-sm font-normal font-family-dm-sans bg-gray-3 px-3 py-1.5 rounded-md"
                      >
                        {ticket.name}
                      </span>
                    ))
                  )}
                </div>
              </motion.div>,
              document.body,
            )}
        </>
      )
      }
    </AnimatePresence >
  );
}
