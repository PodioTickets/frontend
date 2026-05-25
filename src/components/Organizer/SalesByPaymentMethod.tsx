"use client";

/**
 * Card de dashboard: "Vendas por forma de pagamento".
 *
 * Substitui a aba "Produtos mais vendidos" (BestSellingVariations) nos
 * dashboards de organizador e admin de um evento. Mostra distribuição
 * percentual + valor bruto + quantidade de vendas por método de pagamento
 * (PIX, Crédito, Débito, Boleto, etc).
 *
 * Layout segue o Figma:
 *   - Header com titulo e subtitulo.
 *   - Lista de itens. Cada item:
 *       * Linha 1: nome do método à esquerda · vendas + R$ total à direita.
 *       * Linha 2: barra de progresso preenchida com % das vendas (em valor).
 *         Quando a % > 25 o texto fica branco dentro da barra; senão fica
 *         alinhado à esquerda em cor gray-12.
 *   - Footer com Total de vendas (count + R$).
 */

export interface SalesByPaymentMethodItem {
  /** PaymentMethod do Prisma (PIX | CREDIT_CARD | DEBIT_CARD | BOLETO | CRYPTO | FREE) */
  method: string;
  salesCount: number;
  /** Valor bruto em centavos */
  totalAmount: number;
  /** % do método sobre o total (0-100) */
  percentage: number;
}

export interface SalesByPaymentMethodData {
  items: SalesByPaymentMethodItem[];
  totals: { salesCount: number; totalAmount: number };
}

interface Props {
  data: SalesByPaymentMethodData;
}

const METHOD_LABEL: Record<string, string> = {
  PIX: "PIX",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  BOLETO: "Boleto",
  CRYPTO: "Cripto",
  FREE: "Gratuito",
};

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/* Cor do bar igual ao Figma: teal escuro (#0E7490 ~ cyan-700).
 * Não está mapeado no design system primário — usa hex direto pra match. */
const BAR_COLOR = "#0E7490";

export function SalesByPaymentMethod({ data }: Props) {
  const { items, totals } = data;
  const hasData = items.length > 0;

  return (
    <div className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden flex flex-col w-full h-full">
      {/* Header */}
      <div className="px-4 py-4 md:py-5 border-b border-gray-6 shrink-0">
        <p className="font-manrope font-bold text-[18px] leading-[19.8px] text-gray-12">
          Vendas por forma de pagamento
        </p>
        <p className="font-family-dm-sans text-[14px] leading-[18.2px] text-gray-11 mt-1">
          Distribuição das vendas por método de pagamento
        </p>
      </div>

      {/* Lista */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!hasData ? (
          <div className="px-4 py-8 text-center">
            <p className="font-family-dm-sans text-sm text-gray-11">
              Nenhuma venda registrada
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5 px-4 py-5">
            {items.map((item) => {
              const label = METHOD_LABEL[item.method] ?? item.method;
              const pct = Math.max(0, Math.min(100, item.percentage));
              const pctLabel = `${pct.toFixed(pct < 10 ? 1 : pct % 1 === 0 ? 0 : 1)}%`;
              const labelInsideBar = pct >= 22;
              return (
                <div key={item.method} className="flex flex-col gap-2 w-full">
                  {/* Header linha: nome + vendas/R$ */}
                  <div className="flex items-center justify-between gap-2 w-full">
                    <p className="font-family-dm-sans font-medium text-[14px] md:text-[16px] leading-[1.3] text-gray-12 truncate">
                      {label}
                    </p>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-family-dm-sans text-[12px] md:text-[14px] leading-[1.3] text-gray-11">
                        {item.salesCount.toLocaleString("pt-BR")} vendas
                      </p>
                      <p className="font-manrope font-bold text-[14px] md:text-[16px] leading-[1.1] text-gray-12 tabular-nums">
                        {formatBRL(item.totalAmount)}
                      </p>
                    </div>
                  </div>

                  {/* Barra */}
                  <div className="relative w-full h-10 rounded-lg bg-gray-4 overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full rounded-lg flex items-center px-3"
                      style={{
                        width: `${Math.max(pct, 4)}%`,
                        backgroundColor: BAR_COLOR,
                      }}
                    >
                      {labelInsideBar && (
                        <span className="font-family-dm-sans font-bold text-[14px] leading-[1.1] text-white tabular-nums">
                          {pctLabel}
                        </span>
                      )}
                    </div>
                    {!labelInsideBar && (
                      <span
                        className="absolute top-1/2 -translate-y-1/2 font-family-dm-sans font-bold text-[14px] leading-[1.1] text-white tabular-nums"
                        style={{ left: 12 }}
                      >
                        {pctLabel}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Total de vendas */}
      {hasData && (
        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-6 shrink-0">
          <p className="font-family-dm-sans font-medium text-[14px] md:text-[16px] leading-[1.3] text-gray-12">
            Total de vendas
          </p>
          <div className="flex items-center gap-3">
            <p className="font-family-dm-sans text-[12px] md:text-[14px] leading-[1.3] text-gray-11">
              {totals.salesCount.toLocaleString("pt-BR")} vendas
            </p>
            <p className="font-manrope font-bold text-[14px] md:text-[16px] leading-[1.1] text-gray-12 tabular-nums">
              {formatBRL(totals.totalAmount)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
