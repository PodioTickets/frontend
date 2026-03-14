"use client";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
} from "@/components/ui/drawer";
import { X, ChevronLeft } from "lucide-react";
import { ArrowButton } from "../ArrowButton";

export interface ProductVariationRow {
  variationName: string;
  quantitySold: string;
  percentage: number;
  stock: string;
  stockStatus?: "Esgotado" | "Normal";
}

interface ProductDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  productImageUrl?: string | null;
  productIndex?: number;
  totalProducts?: number;
  /** Total vendido (para "Vendas totais": exibir como vendido / estoque) */
  quantitySold?: number | string;
  /** Total do estoque (opcional; quando informado, Vendas totais = quantitySold / totalStock) */
  totalStock?: number;
  /** Receita total em valor (ex.: "R$ 1.500,00") */
  totalRevenue?: string;
  variationRows: ProductVariationRow[];
  onPrevious?: () => void;
  onNext?: () => void;
}

const BAR_SEGMENTS = 10;

function PercentageBar({ percentage }: { percentage: number }) {
  const filled = Math.round((percentage / 100) * BAR_SEGMENTS);
  return (
    <div className="flex gap-0.5 items-center h-9">
      {Array.from({ length: BAR_SEGMENTS }).map((_, i) => (
        <div
          key={i}
          className={`h-full w-3 rounded shrink-0 ${i < filled ? "bg-primary-11" : "bg-gray-6"
            }`}
        />
      ))}
    </div>
  );
}

export function ProductDetailsDrawer({
  isOpen,
  onClose,
  productName,
  productImageUrl,
  productIndex = 1,
  totalProducts = 1,
  totalRevenue = "—",
  quantitySold = 0,
  totalStock,
  variationRows,
  onPrevious,
  onNext,
}: ProductDetailsDrawerProps) {
  const vendasTotaisLabel =
    totalStock != null && totalStock > 0
      ? `${Number(quantitySold).toLocaleString("pt-BR")} / ${totalStock.toLocaleString("pt-BR")}`
      : `${Number(quantitySold).toLocaleString("pt-BR")}`;

  return (
    <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()} direction="right">
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[883px] border-l border-gray-6 rounded-l-xl">
        <DrawerHeader className="border-b border-gray-6 px-5 py-3 flex flex-row items-center justify-between shrink-0">
          <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
            Detalhes dos produtos
          </p>
          <DrawerClose asChild>
            <button
              type="button"
              className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="size-6 text-gray-12" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="p-5 flex flex-col gap-6">
            {/* Top: Produto X de Y + nav */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between w-full">
                <p className="font-family-dm-sans font-normal text-base text-gray-11">
                  Produto {productIndex} de {totalProducts}
                </p>
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={onPrevious}
                    disabled={!onPrevious || productIndex <= 1}
                    className="size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer rotate-180"
                    aria-label="Produto anterior"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                  <button
                    type="button"
                    onClick={onNext}
                    disabled={!onNext || productIndex >= totalProducts}
                    className="size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                    aria-label="Próximo produto"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                </div>
              </div>

              {/* Product card: image + name + stats */}
              <div className="flex gap-5 items-center">
                <div className="size-[124px] rounded-lg bg-gray-3 border border-gray-6 shrink-0 overflow-hidden">
                  {productImageUrl ? (
                    <img
                      src={productImageUrl}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-gray-8 text-2xl font-manrope font-bold">
                      {productName.charAt(0)}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 min-w-0 flex-1">
                  <p className="font-manrope font-extrabold text-[20px] leading-[1.1] text-gray-12">
                    {productName}
                  </p>
                  <div className="flex gap-10 flex-wrap">
                    <div className="flex flex-col gap-1">
                      <p className="font-family-dm-sans font-medium text-base text-gray-11">
                        Vendas totais
                      </p>
                      <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                        {vendasTotaisLabel} un
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="font-family-dm-sans font-medium text-base text-gray-11">
                        Receita total
                      </p>
                      <p className="font-family-dm-sans font-semibold text-[18px] leading-[1.3] text-gray-12">
                        {totalRevenue}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Table: Desempenho por variações */}
            <div className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-6 bg-gray-3">
                <p className="font-manrope font-extrabold text-base leading-[1.2] text-gray-12">
                  Desempenho por variações
                </p>
              </div>
              <div className="grid grid-cols-[44px_1fr_117px_216px_90px] border-b border-gray-6 bg-gray-3 h-11 items-center">
                <div className="border-r border-gray-6" />
                <div className="px-4 py-3">
                  <p className="font-medium text-sm leading-[1.3] text-gray-12">
                    Variação
                  </p>
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <p className="font-medium text-sm leading-[1.3] text-gray-12">
                    QT vendida
                  </p>
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <p className="font-medium text-sm leading-[1.3] text-gray-12">
                    % das Escolhas
                  </p>
                </div>
                <div className="px-4 py-3 flex items-center justify-center">
                  <p className="font-medium text-sm leading-[1.3] text-gray-12">
                    Estoque
                  </p>
                </div>
              </div>
              {variationRows.map((row, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[44px_1fr_117px_216px_90px] border-b border-gray-6 last:border-b-0 items-center min-h-[52px]"
                >
                  <div className="h-full flex items-center justify-center border-r border-gray-6 px-4 py-3">
                    <p className="font-semibold text-sm leading-[1.3] text-gray-12">
                      {index + 1}
                    </p>
                  </div>
                  <div className="min-w-0 px-3 py-3">
                    <p className="font-medium text-sm leading-[1.3] text-gray-12 truncate">
                      {row.variationName}
                    </p>
                  </div>
                  <div className="flex items-center justify-center px-4 py-3">
                    <p className="font-semibold text-sm leading-[1.3] text-gray-12">
                      {row.quantitySold}
                    </p>
                  </div>
                  <div className="flex gap-2 items-center justify-end px-4 py-2">
                    <p className="font-semibold text-sm leading-[1.3] text-gray-12 shrink-0">
                      {row.percentage}%
                    </p>
                    <PercentageBar percentage={row.percentage} />
                  </div>
                  <div className="flex flex-col items-center justify-center px-4 py-2 gap-0.5">
                    <p className="font-semibold text-sm leading-[1.3] text-gray-12">
                      {row.stock}
                    </p>
                    {row.stockStatus === "Esgotado" && (
                      <p className="font-normal text-xs leading-[1.3] text-red-11">
                        Esgotado
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
