import { sanitizeRichHtml } from "@/lib/richContent";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";

/**
 * Seção "Kits" da pré-visualização de tópicos. Antes copy-paste idêntico nas 4
 * preview pages (organizer new/edit, admin edit/review). O HTML das descrições
 * já passa pelo `sanitizeRichHtml` (allowlist anti-XSS) aqui dentro — um único
 * sink, não 4.
 *
 * `kits` é tipado de forma estrutural frouxa porque cada página carrega o kit de
 * uma fonte com shape ligeiramente diferente (`Record<string, unknown>` vs `any`).
 * Renderiza `null` quando não há kits ativos.
 */
interface PreviewKit {
  description?: unknown;
  imageUrl?: unknown;
  name?: unknown;
}

export function TopicsPreviewKitsSection({ kits }: { kits: readonly PreviewKit[] }) {
  if (kits.length === 0) return null;

  const descriptionHtml =
    sanitizeRichHtml(
      kits
        .map((kit) => String(kit.description || ""))
        .filter(Boolean)
        .join(" "),
    ) || "Informações sobre os kits do evento.";

  const firstKit = kits[0];

  return (
    <div className="w-full border-b border-gray-6 py-10">
      <div className="flex flex-col items-start gap-6">
        <h2 className="font-manrope text-2xl font-bold leading-[1.1] text-gray-12">
          Kits
        </h2>
        <div
          className="max-w-none font-family-dm-sans text-base leading-[1.3] text-gray-11 prose prose-sm"
          dangerouslySetInnerHTML={{ __html: descriptionHtml }}
        />
        {firstKit && (
          <div className="flex w-full items-start">
            <div className="relative aspect-192/184 w-[192px] overflow-hidden rounded-lg border border-gray-6">
              <ImageWithInitialFallback
                src={firstKit.imageUrl as string | undefined}
                alt={String(firstKit.name ?? "")}
                name={String(firstKit.name ?? "")}
                fill
                sizes="192px"
                className="size-full rounded-lg border-transparent border-0"
                letterClassName="text-3xl font-semibold"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
