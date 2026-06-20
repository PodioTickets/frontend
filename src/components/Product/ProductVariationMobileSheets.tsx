"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Pencil } from "lucide-react";
import { Button } from "@/components/Button";
import { Tooltip } from "@/components/Tooltip";
import { BookIcon } from "../Icons/BookIcon";
import type { MobileVariationDraft } from "@/components/Product/CreateProductModal.types";

/**
 * Bottom-sheets mobile de variação do `CreateProductModal`: "Mais opções"
 * (editar/remover) e "Adicionar/Editar variação" (form do rascunho). Mobile-only.
 * Apresentacional — estado e handlers vêm do `useProductVariations` via props.
 * Extraído no Bloco 3 (Fase 4/UI).
 */
export function ProductVariationMobileSheets({
  mobileMoreMenuVariationId,
  setMobileMoreMenuVariationId,
  openMobileEditVariation,
  handleMobileRemoveVariation,
  mobileVariationDraft,
  setMobileVariationDraft,
  mobileVariationDraftError,
  setMobileVariationDraftError,
  closeMobileVariationDraft,
  handleMobileDraftPriceChange,
  saveMobileVariationDraft,
  isIncludedInTicket,
  productHoldsStock,
}: {
  mobileMoreMenuVariationId: string | null;
  setMobileMoreMenuVariationId: (v: string | null) => void;
  openMobileEditVariation: (id: string) => void;
  handleMobileRemoveVariation: (id: string) => void;
  mobileVariationDraft: MobileVariationDraft | null;
  setMobileVariationDraft: (v: MobileVariationDraft | null) => void;
  mobileVariationDraftError: string | null;
  setMobileVariationDraftError: (v: string | null) => void;
  closeMobileVariationDraft: () => void;
  handleMobileDraftPriceChange: (v: string) => void;
  saveMobileVariationDraft: () => void;
  isIncludedInTicket: boolean;
  productHoldsStock: boolean;
}) {
  return (
    <>
      {/* Bottom sheet mobile: "Mais opções" da variação (Figma 3428:160985) */}
      <AnimatePresence>
        {mobileMoreMenuVariationId !== null && (
          <>
            <motion.div
              key="variation-more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60 bg-[rgba(32,32,32,0.9)] md:hidden"
              onClick={() => setMobileMoreMenuVariationId(null)}
            />
            <motion.div
              key="variation-more-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-61 flex flex-col items-stretch rounded-t-xl bg-gray-1 md:hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-6 px-4 py-2">
                <p className="font-family-dm-sans text-base font-semibold leading-[1.3] text-gray-12">
                  Mais opções
                </p>
                <button
                  type="button"
                  onClick={() => setMobileMoreMenuVariationId(null)}
                  className="flex size-7 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-3"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex flex-col pb-[max(2.5rem,env(safe-area-inset-bottom))]">
                <button
                  type="button"
                  onClick={() => mobileMoreMenuVariationId && openMobileEditVariation(mobileMoreMenuVariationId)}
                  className="flex h-11 items-center gap-2 border-b border-gray-6 px-4 text-left transition-colors hover:bg-gray-3"
                >
                  <Pencil className="size-5 text-gray-12" />
                  <span className="font-family-dm-sans text-sm font-medium leading-[1.3] text-gray-12">
                    Editar variante
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => mobileMoreMenuVariationId && handleMobileRemoveVariation(mobileMoreMenuVariationId)}
                  className="flex h-11 items-center gap-2 border-b border-gray-6 px-4 text-left transition-colors hover:bg-red-2"
                >
                  <X className="size-5 text-red-11" />
                  <span className="font-family-dm-sans text-sm font-medium leading-[1.3] text-red-11">
                    Remover variante
                  </span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom sheet mobile: "Adicionar/Editar variação" (Figma 3428:161368) */}
      <AnimatePresence>
        {mobileVariationDraft !== null && (
          <>
            <motion.div
              key="variation-draft-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-60 bg-[rgba(32,32,32,0.9)] md:hidden"
              onClick={closeMobileVariationDraft}
            />
            <motion.div
              key="variation-draft-sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed inset-x-0 bottom-0 z-61 flex flex-col items-stretch rounded-t-xl bg-gray-1 md:hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-6 px-4 py-2">
                <p className="font-family-dm-sans text-base font-semibold leading-[1.3] text-gray-12">
                  {mobileVariationDraft.target === "new" ? "Adicionar variação" : "Editar variação"}
                </p>
                <button
                  type="button"
                  onClick={closeMobileVariationDraft}
                  className="flex size-7 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-3"
                  aria-label="Fechar"
                >
                  <X className="size-5" />
                </button>
              </div>
              <div className="flex flex-col gap-6 px-4 pt-6 pb-3">
                <div className="flex flex-col gap-2">
                  <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                    Nome da variação
                  </label>
                  <input
                    type="text"
                    value={mobileVariationDraft.name}
                    onChange={(e) => {
                      setMobileVariationDraft({ ...mobileVariationDraft, name: e.target.value });
                      if (mobileVariationDraftError) setMobileVariationDraftError(null);
                    }}
                    placeholder="Ex: GG, Azul, 22"
                    className="h-12 rounded-lg border border-gray-6 bg-transparent px-3 py-4 font-family-dm-sans text-base leading-[1.3] text-gray-12 placeholder:text-gray-11 focus:border-gray-8 focus:outline-none"
                  />
                  {mobileVariationDraftError && (
                    <p className="font-family-dm-sans text-sm text-red-11">{mobileVariationDraftError}</p>
                  )}
                </div>
                {!isIncludedInTicket && (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-1">
                      <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                        Preço específico
                      </label>
                      <Tooltip content="Sobrescreve o preço base do produto pra essa variação.">
                        <BookIcon className="size-5 text-gray-11" />
                      </Tooltip>
                    </div>
                    <div className="flex h-12 items-center gap-2 rounded-lg border border-gray-6 px-3 py-4">
                      <span className="font-family-dm-sans text-base text-gray-11">R$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={mobileVariationDraft.price}
                        onChange={(e) => handleMobileDraftPriceChange(e.target.value)}
                        placeholder="00,00"
                        className="flex-1 border-0 bg-transparent p-0 font-family-dm-sans text-base leading-[1.3] text-gray-12 placeholder:text-gray-11 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
                {productHoldsStock && (
                  <div className="flex flex-col gap-2">
                    <label className="font-family-dm-sans text-base font-normal leading-[1.3] text-gray-12">
                      Estoque
                    </label>
                    <input
                      type="number"
                      value={mobileVariationDraft.stock}
                      onChange={(e) => setMobileVariationDraft({ ...mobileVariationDraft, stock: e.target.value })}
                      placeholder="Ex: 100"
                      className="h-12 rounded-lg border border-gray-6 bg-transparent px-3 py-4 font-family-dm-sans text-base leading-[1.3] text-gray-12 placeholder:text-gray-11 focus:border-gray-8 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-2 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <Button
                  type="button"
                  variant={"outline"}
                  onClick={closeMobileVariationDraft}
                  className="flex h-12 flex-1 items-center justify-center rounded-lg border border-gray-6 font-manrope text-base font-bold leading-[1.1] text-gray-12 transition-colors hover:bg-gray-3"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  variant={"default"}
                  onClick={saveMobileVariationDraft}
                  className="flex h-12 flex-1 items-center justify-center rounded-lg font-manrope text-base font-bold leading-[1.1] transition-colors"
                >
                  {mobileVariationDraft.target === "new" ? "Adicionar" : "Salvar"}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
