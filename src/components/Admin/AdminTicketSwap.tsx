"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Loading } from "@/components/Loading";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { TicketCategoryCard } from "@/components/Checkout/TicketCategoryCard";
import { ProductsSection } from "@/components/Checkout/SubscriptionStep";
import { WizardDoneStep, WizardStepper } from "@/components/Checkout/WizardSteps";
import type { DropdownOption } from "@/components/Dropdown";
import {
  formatDateShort,
  getVariationKey,
  isVariationSoldOut,
  maskCPF,
  type Product,
} from "@/components/Checkout/SubscriptionStep.utils";
import { TicketPickProvider } from "@/contexts/TicketPickContext";
import { useEvent } from "@/hooks/useEvent";
import { useSubscriptionData } from "@/hooks/useSubscriptionData";
import type { Ticket } from "@/hooks/useTickets";
import { parseEventKitSelectionDisplay } from "@/lib/eventKitSelectionDisplay";
import { autoSelectedVariationId, productOffersChoice } from "@/lib/checkoutProductStep";
import {
  buildSwapProductsPayload,
  hasMissingRequiredVariation,
  swapBlockedReason,
} from "@/lib/ticketSwap";
import { adminService, organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { formatBRL } from "@/lib/money";
import { formatShortId } from "@/utils/shortId";

/**
 * Troca de ingresso pelo ADMIN (Figma 6809:141882 → 6809:142137 → 6813:144454).
 * Reusa os cards do checkout: ingressos via `TicketCategoryCard` em modo seleção
 * (`TicketPickProvider`) e produtos via `ProductsSection`. O backend anula a inscrição
 * e cria a nova; nada é cobrado — a diferença de valor é só informativa.
 */

type Step = "tickets" | "products" | "done";

const SWAP_STEPS = [
  { id: 1, label: "Ingressos" },
  { id: 2, label: "Produtos" },
  { id: 3, label: "Conclusão" },
];

/** Recorte do `GET /registrations/:id` (receiptSnapshot) que a tela usa. */
interface SwapRegistration {
  id: string;
  status: string;
  voidedAt: string | null;
  orderId: string | null;
  paidAt: string | null;
  event: { id: string; eventDate?: string | null } | null;
  ticket: {
    id?: string;
    name?: string;
    category?: { name?: string } | null;
    batch?: { price?: number } | null;
  } | null;
  participant: {
    name?: string | null;
    birthDate?: string | null;
    gender?: string | null;
    cpf?: string | null;
    documentNumber?: string | null;
    documentType?: string | null;
  } | null;
}

function genderLabel(gender?: string | null): string {
  const g = (gender ?? "").trim().toLowerCase();
  if (!g) return "";
  if (g.startsWith("m")) return "Masculino";
  if (g.startsWith("f")) return "Feminino";
  return gender ?? "";
}

/** Centavos com sinal ("- R$ 10,00" quando o novo é mais barato). */
function formatDifference(cents: number): string {
  const abs = formatBRL(Math.abs(cents) / 100);
  return cents < 0 ? `- ${abs}` : abs;
}

export function AdminTicketSwap({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: registration, isLoading: regLoading, error: regError } = useQuery({
    queryKey: ["admin", "ticket-swap", registrationId],
    queryFn: async () =>
      (await organizerService.getRegistrationById(registrationId)) as unknown as SwapRegistration,
    staleTime: 0,
    gcTime: 0,
  });

  const eventId = registration?.event?.id ?? null;
  const { event, loading: eventLoading } = useEvent(eventId, !!eventId);
  const { loading: dataLoading, categories, categorizedTickets, uncategorizedTickets, getProductsForTicket } =
    useSubscriptionData(eventId ?? undefined);

  const [step, setStep] = useState<Step>("tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [variations, setVariations] = useState<Record<string, string | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const busyRef = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const kitSelectionDisplay = useMemo(
    () => parseEventKitSelectionDisplay(event?.kitSelectionDisplay),
    [event?.kitSelectionDisplay],
  );

  const allTickets = useMemo(
    () => [...uncategorizedTickets, ...categorizedTickets.flatMap((c) => c.tickets)],
    [uncategorizedTickets, categorizedTickets],
  );
  const selectedTicket = allTickets.find((t) => t.id === selectedTicketId) ?? null;
  const categoryNameById = useMemo(
    () => new Map(categorizedTickets.map((c) => [c.id, c.name])),
    [categorizedTickets],
  );

  const currentTicketId = registration?.ticket?.id ?? null;
  const participant = registration?.participant ?? null;
  const participantInfo = {
    birthDate: participant?.birthDate ?? null,
    gender: participant?.gender ?? null,
  };
  const blockedReason = (ticket: Ticket) =>
    swapBlockedReason(participantInfo, { ageLimit: ticket.ageLimit, gender: ticket.gender }, event?.eventDate);

  const newProducts: Product[] = selectedTicket ? getProductsForTicket(selectedTicket.id) : [];
  const kitProducts = newProducts.filter((p) => p.isRequired);
  const extraProducts = newProducts.filter((p) => !p.isRequired);
  // Mesma regra do checkout: só há etapa de Produtos se algum produto oferece escolha (>1 opção).
  const hasSelectableProducts = newProducts.some(productOffersChoice);

  // Diferença só visual: lote ativo do novo − preço do lote do ingresso atual (centavos).
  const currentPrice = registration?.ticket?.batch?.price ?? 0;
  const newPrice = selectedTicket?.activeBatch?.price ?? null;
  const difference = newPrice !== null ? newPrice - currentPrice : 0;

  // Volta para a lista de inscrições do evento (de onde a troca é aberta).
  const registrationsHref = eventId ? `/admin/events/${eventId}/registrations` : "/admin/events";

  const submit = async () => {
    if (busyRef.current || !selectedTicket) return;
    busyRef.current = true;
    setSubmitting(true);
    try {
      const res = await adminService.swapRegistrationTicket(registrationId, {
        ticketId: selectedTicket.id,
        products: buildSwapProductsPayload(newProducts, variations),
      });
      setEmailSent(res.emailSent);
      // Drawer de usuários do admin também lista as inscrições do participante.
      queryClient.invalidateQueries({ queryKey: [...queryKeys.admin.users.all(), "registrations"] });
      setStep("done");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } }; message?: string };
      const msg = err?.response?.data?.message;
      toast.error((Array.isArray(msg) ? msg[0] : msg) || "Não foi possível trocar o ingresso.");
    } finally {
      busyRef.current = false;
      setSubmitting(false);
    }
  };

  const handleTicketsNext = () => {
    if (!selectedTicket) return;
    // Pré-seleciona a variação única (mesmo efeito do SubscriptionStep no checkout).
    setVariations(
      Object.fromEntries(
        getProductsForTicket(selectedTicket.id)
          .map((p) => [p.id, autoSelectedVariationId(p)] as const)
          .filter(([, v]) => !!v),
      ),
    );
    if (hasSelectableProducts) setStep("products");
    else void submit();
  };

  const back = () => {
    if (step === "products") setStep("tickets");
    else router.push(registrationsHref);
  };

  if (regLoading || (eventId && (eventLoading || dataLoading))) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loading /></div>;
  }
  if (regError || !registration || !event) {
    return <p className="py-16 text-center text-gray-11">Inscrição não encontrada.</p>;
  }

  const notSwappable = !!registration.voidedAt || registration.status !== "CONFIRMED";
  const activeStepId = step === "tickets" ? 1 : step === "products" ? 2 : 3;
  const stepLabel = SWAP_STEPS[activeStepId - 1].label;

  const getVariationOptions = (product: Product): DropdownOption[] =>
    (product.variations ?? []).map((v, i) => {
      const soldOut = isVariationSoldOut(product, v);
      return { id: v.id || `${product.id}-${i}`, label: v.name, suffix: soldOut ? "Esgotado" : undefined, disabled: soldOut };
    });
  const getSelectedVariation = (_idx: number, product: Product) =>
    product.variations.find((v, i) => (v.id || `${product.id}-${i}`) === variations[product.id]) ?? null;
  const onVariationSelect = (_idx: number, productId: string) => (opt: DropdownOption) =>
    setVariations((prev) => ({ ...prev, [productId]: opt.id || null }));
  const selectedForSection = Object.fromEntries(
    Object.entries(variations).map(([productId, v]) => [getVariationKey(0, productId), v]),
  );

  const currentTicketLabel = [registration.ticket?.category?.name, registration.ticket?.name]
    .filter(Boolean)
    .join(" · ");
  const newTicketLabel = selectedTicket
    ? [categoryNameById.get(selectedTicket.groupId), selectedTicket.name].filter(Boolean).join(" · ")
    : "";
  const documentDisplay = participant?.cpf || participant?.documentNumber || "";
  const subLine = [
    participant?.birthDate ? formatDateShort(participant.birthDate) : "",
    genderLabel(participant?.gender),
    documentDisplay
      ? participant?.documentType && participant.documentType !== "CPF"
        ? documentDisplay
        : maskCPF(documentDisplay.replace(/\D/g, ""))
      : "",
  ].filter(Boolean);
  const paidAt = registration.paidAt ? new Date(registration.paidAt) : null;
  const paidLabel = paidAt && !Number.isNaN(paidAt.getTime())
    ? `Pago em ${String(paidAt.getDate()).padStart(2, "0")}/${String(paidAt.getMonth() + 1).padStart(2, "0")}`
    : "";

  const ctaDisabled =
    submitting ||
    notSwappable ||
    !selectedTicket ||
    (step === "products" && hasMissingRequiredVariation(newProducts, variations));
  const ctaLabel = step === "products" || (selectedTicket && !hasSelectableProducts) ? "Concluir" : "Próximo";

  const summary = (
    <div className="bg-gray-2 border border-gray-6 rounded-xl overflow-hidden pb-6">
      <div className="flex flex-col gap-4 px-4 py-5 border-b border-gray-6">
        <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">Trocando ingresso de:</p>
        <div className="flex items-center gap-2 min-w-0">
          <ImageWithInitialFallback
            src={null}
            alt={participant?.name ?? "Participante"}
            name={participant?.name ?? "P"}
            width={52}
            height={52}
            className="size-[52px] rounded-full shrink-0"
            letterClassName="text-lg"
          />
          <div className="flex flex-col gap-3 min-w-0">
            <p className="text-base font-semibold font-manrope text-gray-12 leading-[1.1] truncate">{participant?.name}</p>
            <p className="flex flex-wrap items-center gap-2 text-sm text-gray-11 font-family-dm-sans leading-[1.3]">
              {subLine.map((item, i) => (
                <Fragment key={i}>
                  {i > 0 && <span className="size-1 rounded-full bg-gray-11" aria-hidden />}
                  <span>{item}</span>
                </Fragment>
              ))}
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-4 p-4 border-b border-gray-6">
        <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">Ingresso atual:</p>
        <div className="flex flex-col gap-3">
          <p className="text-base font-semibold font-manrope text-gray-12 leading-[1.1]">{currentTicketLabel}</p>
        </div>
      </div>
      {step === "products" && selectedTicket && (
        <div className="flex flex-col gap-4 p-4 border-b border-gray-6">
          <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">Novo ingresso selecionado:</p>
          <p className="text-base font-semibold font-manrope text-gray-12 leading-[1.1]">{newTicketLabel}</p>
        </div>
      )}
      <div className="flex items-center justify-between px-4 py-4 text-base text-gray-12 font-manrope leading-[1.1]">
        <p className="font-semibold">Diferença de valor:</p>
        <p className="font-bold">{selectedTicket ? formatDifference(difference) : "—"}</p>
      </div>
      <div className="px-4 pt-1">
        <Button
          type="button"
          onClick={step === "products" ? submit : handleTicketsNext}
          disabled={ctaDisabled}
          className="w-full h-11 text-lg font-bold font-manrope rounded-lg"
        >
          {submitting ? "Trocando..." : ctaLabel}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="pb-10">
      {/* Faixa com borda sangra até as bordas do <main> do admin (Figma); as pílulas ficam
          na mesma coluna centralizada (1158px) do conteúdo — o sangramento é simétrico. */}
      <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-4 md:-mt-8 md:px-6 lg:px-8 md:border-b md:border-gray-6">
        <WizardStepper
          options={SWAP_STEPS}
          activeStep={activeStepId}
          currentLabel={stepLabel}
          onBack={back}
          showBack={step !== "done"}
          className="max-w-[1158px] mx-auto px-0 py-5 border-b-0"
        />
      </div>

      {step === "done" ? (
        <div className="pt-16">
          <WizardDoneStep
            title="Troca concluída!"
            description={
              emailSent
                ? "Novo ingresso enviado para o e-mail do participante."
                : "Ingresso trocado, mas o e-mail não foi enviado. Reenvie pelo ingresso."
            }
            actionLabel="Ver nas inscrições"
            onAction={() => router.push(registrationsHref)}
          />
        </div>
      ) : (
        <div className="max-w-[1158px] mx-auto pt-8">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="hidden md:flex cursor-pointer rotate-180 size-9 items-center justify-center rounded-full border border-gray-6"
                onClick={back}
                aria-label="Voltar"
              >
                <ArrowButton isOpen={false} />
              </button>
              <h1 className="text-2xl md:text-[32px] font-bold font-manrope text-gray-12 leading-[1.1]">
                {step === "tickets" ? "Selecione seus ingressos" : "Produtos do kit"}
              </h1>
            </div>
            <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3] max-w-[720px]">
              {step === "tickets"
                ? "Escolha o novo ingresso do participante. A diferença de valor é apenas informativa — nada será cobrado."
                : "Escolha os produtos do kit, defina tamanhos e adicione itens extras. Tudo o que você selecionar aqui ficará vinculado ao novo ingresso."}
            </p>
            {notSwappable && (
              <p className="text-sm font-medium text-red-11">
                {registration.voidedAt
                  ? "Este ingresso já foi trocado."
                  : "Só é possível trocar o ingresso de uma inscrição confirmada."}
              </p>
            )}
          </div>

          <div className="mt-9 flex flex-col lg:flex-row items-start gap-11">
            <div className="flex-1 min-w-0 w-full">
              {step === "tickets" ? (
                <TicketPickProvider
                  value={{ selectedTicketId, currentTicketId, onPick: setSelectedTicketId, blockedReason }}
                >
                  <div className="flex flex-col gap-9">
                    {uncategorizedTickets.map((ticket) => (
                      <TicketCategoryCard
                        key={ticket.id}
                        tickets={[ticket]}
                        event={event}
                        kitSelectionDisplay={kitSelectionDisplay}
                      />
                    ))}
                    {categorizedTickets.map((category, index) => (
                      <TicketCategoryCard
                        key={category.id}
                        categoryId={category.id}
                        categoryName={category.name}
                        categoryDescription={categories.find((c) => c.id === category.id)?.description}
                        tickets={category.tickets}
                        index={index}
                        expandedByDefault={category.tickets.some((t) => t.id === currentTicketId) || index === 0}
                        event={event}
                        kitSelectionDisplay={kitSelectionDisplay}
                      />
                    ))}
                  </div>
                </TicketPickProvider>
              ) : (
                <div className="border border-gray-6 rounded-xl px-4 pt-6 pb-2">
                  <ProductsSection
                    title="Produtos do kit (obrigatório)"
                    requiredSection
                    products={kitProducts}
                    participantIndex={0}
                    selectedVariations={selectedForSection}
                    onVariationSelect={onVariationSelect}
                    getVariationOptions={getVariationOptions}
                    getSelectedVariation={getSelectedVariation}
                    variant="desktop"
                  />
                  {kitProducts.length > 0 && extraProducts.length > 0 && (
                    <div className="h-px bg-gray-6 mb-6" />
                  )}
                  <ProductsSection
                    title="Produtos adicionais (opcional)"
                    products={extraProducts.filter((p) => (p.variations?.length ?? 0) > 0)}
                    participantIndex={0}
                    selectedVariations={selectedForSection}
                    onVariationSelect={onVariationSelect}
                    getVariationOptions={getVariationOptions}
                    getSelectedVariation={getSelectedVariation}
                    variant="desktop"
                  />
                </div>
              )}
            </div>
            <div className="w-full lg:w-[406px] shrink-0 lg:sticky lg:top-8">{summary}</div>
          </div>
        </div>
      )}
    </div>
  );
}
