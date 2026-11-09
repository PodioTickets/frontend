import { Pagination } from "@/components/Pagination";
import { cn } from "@/utils/cn";

export interface LotNearDepletionRow {
  name: string;
  categoryName: string | null;
  status: string;
  remaining: number;
  percentageSold: number;
  activeBatch: { number: number; count?: number } | null;
}

// Tons de azul do Figma (7688:162632). Crítico usa o hex: o token `--blue-10` do projeto está
// #079789, não o #0797b9 do Figma (mesmo contorno do SalesHeatmap).
const STATUS_STYLE: Record<string, { label: string; text: string; bar: string }> = {
  Esgotado: { label: "Esgotado", text: "text-blue-12", bar: "bg-blue-12" },
  Crítico: { label: "Crítico", text: "text-[#0797b9]", bar: "bg-[#0797b9]" },
  Atenção: { label: "Atenção", text: "text-blue-8", bar: "bg-blue-7" },
  Normal: { label: "Saudável", text: "text-blue-8", bar: "bg-blue-6" },
};

/** "Lotes próximos de esgotamento" do dashboard (desktop e mobile), com a paginação de antes. */
export function LotsNearDepletionCard({
  lots,
  sliceStart,
  page,
  totalPages,
  onPageChange,
  className,
  paginationClassName,
}: {
  lots: LotNearDepletionRow[];
  sliceStart: number;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  paginationClassName?: string;
}) {
  return (
    <div className={cn("flex flex-col overflow-hidden rounded-xl border border-gray-6 bg-gray-1", className)}>
      <p className="px-4 py-5 font-family-dm-sans text-base font-normal leading-[1.3] text-gray-11 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
        Lotes próximos de esgotamento
      </p>
      <div className="flex flex-1 flex-col border-y border-gray-6 bg-gray-2">
        {lots.map((lot, index) => {
          // Lote sem vaga = "Esgotado" (o back marca como Crítico).
          const style = STATUS_STYLE[lot.remaining === 0 ? "Esgotado" : lot.status] ?? STATUS_STYLE.Normal;
          const batch = lot.activeBatch
            ? `Lote ${lot.activeBatch.number}${lot.activeBatch.count ? ` de ${lot.activeBatch.count}` : ""}`
            : null;
          const caption = [lot.categoryName, batch].filter(Boolean).join("  ·  ");
          return (
            <div
              key={`${sliceStart + index}-${lot.name}`}
              className="flex flex-1 flex-col justify-center gap-3 border-b border-gray-4 px-4 py-[18px] last:border-b-0"
            >
              <div className="flex items-center gap-3 break-words">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  {caption && (
                    <p className="whitespace-pre-wrap font-family-dm-sans text-xs font-normal leading-[1.3] text-gray-11 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                      {caption}
                    </p>
                  )}
                  <p className="font-manrope text-base font-semibold leading-[1.1] text-gray-12 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">
                    {lot.name}
                  </p>
                </div>
                <p className={cn("shrink-0 font-family-dm-sans text-sm font-medium leading-[1.3] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]", style.text)}>
                  {style.label}
                </p>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-4">
                <div className={cn("h-full rounded-full", style.bar)} style={{ width: `${Math.min(100, lot.percentageSold)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <Pagination currentPage={page} totalPages={totalPages} onPageChange={onPageChange} variant="compact" className={paginationClassName} />
    </div>
  );
}
