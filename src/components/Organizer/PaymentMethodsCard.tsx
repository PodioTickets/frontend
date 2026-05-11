import type { PaymentMethodStats } from "@/services/organizer/OrganizerService";

interface PaymentMethodsCardProps {
  stats?: PaymentMethodStats;
  className?: string;
}

interface MethodCard {
  label: string;
  data: { sales: number; netRevenue: number };
}

const EMPTY_BREAKDOWN = { sales: 0, netRevenue: 0 };

const formatCurrency = (cents: number) =>
  `R$ ${(cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatSales = (sales: number) => sales.toLocaleString("pt-BR");

export function PaymentMethodsCard({ stats, className = "" }: PaymentMethodsCardProps) {
  const methods: MethodCard[] = [
    { label: "PIX", data: stats?.pix ?? EMPTY_BREAKDOWN },
    { label: "Cartão de crédito", data: stats?.creditCard ?? EMPTY_BREAKDOWN },
    { label: "Cartão de débito", data: stats?.debitCard ?? EMPTY_BREAKDOWN },
  ];

  return (
    <div
      className={`bg-gray-1 border border-gray-6 rounded-xl p-5 flex flex-col gap-5 w-full ${className}`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="font-manrope font-extrabold text-lg leading-[1.1] text-gray-12">
          Vendas por forma de pagamento
        </h2>
        <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
          Entenda quais métodos de pagamento são mais utilizados pelos participantes.
        </p>
      </div>

      {/* Desktop: 3 colunas com wrap */}
      <div className="hidden md:flex flex-wrap gap-6 w-full">
        {methods.map((method) => (
          <div
            key={method.label}
            className="flex-1 min-w-[280px] border border-gray-6 rounded-lg p-4 flex flex-col gap-4 justify-center"
          >
            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11 whitespace-nowrap">
              {method.label}
            </p>
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-3 items-start">
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  Vendas
                </p>
                <p className="font-manrope font-extrabold text-xl leading-[1.1] text-gray-12">
                  {formatSales(method.data.sales)}
                </p>
              </div>
              <div className="flex flex-col gap-3 items-end">
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  Valor líquido
                </p>
                <p className="font-manrope font-extrabold text-xl leading-[1.1] text-gray-12 whitespace-nowrap">
                  {formatCurrency(method.data.netRevenue)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile: scroll horizontal seguindo padrão dos demais cards */}
      <div
        className="md:hidden flex gap-3 overflow-x-auto overflow-y-hidden pb-1 snap-x snap-mandatory scroll-smooth [&::-webkit-scrollbar]:hidden -mx-1 px-1"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {methods.map((method) => (
          <div
            key={method.label}
            className="border border-gray-6 rounded-lg p-4 flex flex-col gap-4 justify-center min-w-[260px] shrink-0 snap-center"
          >
            <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11 whitespace-nowrap">
              {method.label}
            </p>
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-3 items-start">
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  Vendas
                </p>
                <p className="font-manrope font-extrabold text-xl leading-[1.1] text-gray-12">
                  {formatSales(method.data.sales)}
                </p>
              </div>
              <div className="flex flex-col gap-3 items-end">
                <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                  Valor líquido
                </p>
                <p className="font-manrope font-extrabold text-xl leading-[1.1] text-gray-12 whitespace-nowrap">
                  {formatCurrency(method.data.netRevenue)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
