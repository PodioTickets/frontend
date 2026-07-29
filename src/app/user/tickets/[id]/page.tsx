"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowButton } from "@/components/ArrowButton";
import { userService } from "@/services";
import UserTicketDetailLoading from "./loading";
import Image from "next/image";
import { DistanceIcon } from "@/components/Icons/DistanceIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { ClockIcon } from "@/components/Icons/ClockIcon";
import { EventInfoCard } from "@/components/Event/EventInfoCard";
import { RegistrationQRCode } from "@/components/QRCode/RegistrationQRCode";
import { getAvatarUrl } from "@/utils/avatar";
import { buildRegistrationProducts } from "@/lib/registrationProducts";
import { ParticipantProductsTab } from "@/components/Checkout/ParticipantProductsTab";
import { Tooltip } from "@/components/Tooltip";
import { formatPhoneForCountry } from "@/utils/phone";
import { isBrazilianCountry } from "@/validators/Auth.validator";
import { formatAnswer } from "@/utils/questionAnswer";
import { formatDateBRT, formatEventHappensLabel, formatTimeBRT } from "@/utils/datetimeBR";
import { shortId } from "@/utils/shortId";
import { EventCardContent } from "@/components/Event/Card/EventCardContent";
import Link from "next/link";

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedParticipants, setExpandedParticipants] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<Record<number, "info" | "products">>({});

  useEffect(() => {
    if (!orderId) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await userService.getOrderDetails(orderId);
        setOrderData(data);
      } catch (error: any) {
        console.error("Erro ao buscar detalhes do pedido:", error);
        setOrderData(null);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [orderId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const datePart = dateString.split("T")[0];
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [year, month, day] = datePart.split("-");
      return `${day}/${month}/${year}`;
    }
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price / 100);
  };

  /* Mascara doc do participante.
   * - CPF (BR): exibe parcial `xxx.***.***-xx` (proteção de PII).
   * - Estrangeiro (passaporte/RNE): exibe cru — não há padrão de mascaramento
   *   consensual e o doc tem letras essenciais. */
  const maskCPF = (cpf: string, isBr: boolean = true) => {
    if (!cpf) return "";
    if (!isBr) return cpf;
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  /* Brasileiro quando:
   *   1. country existe e bate com BR/Brasil/Brazil (sinal mais confiável,
   *      vem do cadastro internacional), OU
   *   2. country é null mas documentType === "CPF" (registros legados onde
   *      country não foi preenchido), OU
   *   3. ambos null + heurística do shape do doc (CPF tem 11 dígitos puros).
   *
   * NÃO confiar em documentType primeiro: contas pre-migration tem
   * documentType="CPF" mesmo com country="Estados Unidos", e o shape do
   * documento (passaporte 6 chars) seria classificado como CPF inválido. */
  const isParticipantBr = (p: {
    country?: string | null;
    documentType?: string | null;
    cpf?: string | null;
  }): boolean => {
    if (p.country) return isBrazilianCountry(p.country);
    if (p.documentType) return p.documentType === "CPF";
    const raw = (p.cpf || "").trim();
    if (!raw) return true;
    if (/[A-Za-z]/.test(raw)) return false;
    return raw.replace(/\D/g, "").length === 11;
  };

  /* Formata telefone conforme o país do participante usando o mesmo helper
   * `formatPhoneForCountry` que o cadastro (libphonenumber-js AsYouType).
   * - BR "11999990000" → "(11) 99999-0000"
   * - US "2025550100" → "(202) 555-0100"
   * - PT "912345678" → "912 345 678"
   * Quando o país não é mapeado, fallback retorna só dígitos. */
  const formatPhone = (phone: string, country?: string | null) => {
    if (!phone) return "";
    return formatPhoneForCountry(phone, country ?? null) || phone;
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const map: Record<string, string> = {
      MALE: "Masculino",
      FEMALE: "Feminino",
      OTHER: "Outro",
      PREFER_NOT_TO_SAY: "Prefiro não dizer",
    };
    return map[gender] || gender;
  };

  const toggleParticipant = (index: number) => {
    setExpandedParticipants((prev) => ({ ...prev, [index]: !prev[index] }));
    if (!expandedParticipants[index]) {
      setActiveTab((prev) => ({ ...prev, [index]: "info" }));
    }
  };

  const participants = useMemo(() => {
    if (!orderData) return [];
    const registrations = orderData.registrations || [];
    /* Preço por ingresso: usa o `ticket.unitPrice` autoritativo do backend
     * (centavos, SÓ o ingresso — ver order-details-response-spec.md §5). Antes
     * diluía `subtotal / nº inscrições`, misturando produtos no preço do ingresso
     * (produto de 1 ingresso aparecia rateado nos 2). Fallback p/ a diluição
     * legada só quando o campo não vier (pedidos antigos). */
    const ticketsHaveUnitPrice = registrations.some(
      (reg: any) => typeof reg?.ticket?.unitPrice === "number",
    );
    const legacyPerTicketPrice =
      registrations.length > 0
        ? (orderData.order?.pricing?.subtotal ?? 0) / registrations.length / 100
        : 0;
    return registrations.map((reg: any) => {
      const p = reg.participant || {};
      const ticket = reg.ticket || {};
      const perTicketPrice =
        typeof ticket.unitPrice === "number"
          ? ticket.unitPrice / 100
          : ticketsHaveUnitPrice
            ? 0
            : legacyPerTicketPrice;

      // Produtos (inclusos + adicionais) normalizados pela MESMA fonte que a tela
      // de pagamento concluído usa — ver lib/registrationProducts.
      const { includedProducts, additionalProducts } = buildRegistrationProducts(reg);

      return {
        id: reg.id,
        name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "",
        email: p.email || "",
        documentType: (p.documentType as "CPF" | "PASSPORT" | null | undefined) ?? null,
        country: p.country ?? null,
        cpf: p.documentNumber || "",
        birthDate: p.dateOfBirth || "",
        gender: p.gender || "",
        phone: p.phone || "",
        avatarUrl: p.avatarUrl || "",
        qrCode: reg.qrCode || "",
        ticket,
        ticketPrice: perTicketPrice,
        emergencyContact: reg.emergencyContact || null,
        questionAnswers: reg.questionAnswers || [],
        includedProducts,
        additionalProducts,
      };
    });
  }, [orderData]);

  const event = useMemo(() => orderData?.event ?? null, [orderData]);

  // `event` é null enquanto `orderData` carrega (o fetch roda no useEffect e o guard
  // de loading só retorna DEPOIS destes hooks). Por isso os memos abaixo tratam null —
  // acessar `event.location`/`event.eventDate` direto (inclusive nas deps) estourava
  // no 1º render.
  // "Local, Cidade, Estado" — MESMO formato do card da home (`EventCard`):
  // usa `locationName` (rótulo do local escolhido no mapa), NÃO o `location`
  // (endereço completo). Cai pra "Cidade, Estado" quando o local não tem nome.
  const addressLabel = useMemo(() => {
    if (!event) return "";
    return [event.locationName, event.city, event.state]
      .map((part: string | null | undefined) => (part ?? "").trim())
      .filter(Boolean)
      .join(", ");
  }, [event]);

  // "Acontece no sábado, 25 de julho" — helper compartilhado com o card de ingresso.
  const dateLabel = useMemo(
    () => (event ? formatEventHappensLabel(event.eventDate) : ""),
    [event],
  );

  /* Agrupa ingressos IDÊNTICOS (mesma categoria + nome + preço) numa linha
   * "(Nx) Nome" no resumo de valores. Preserva ordem de 1ª aparição. */
  const groupedTicketLines = useMemo(() => {
    const map = new Map<
      string,
      { categoryName?: string; ticketName: string; quantity: number; total: number }
    >();
    for (const participant of participants as any[]) {
      const t = participant.ticket || {};
      const categoryName = t?.category?.name ?? undefined;
      const ticketName = t.name || "Ingresso";
      const unit = participant.ticketPrice ?? 0;
      const key = `${categoryName ?? ""}|${ticketName}|${unit}`;
      const existing = map.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.total += unit;
      } else {
        map.set(key, { categoryName, ticketName, quantity: 1, total: unit });
      }
    }
    return Array.from(map.values());
  }, [participants]);

  /* Mantém o skeleton enquanto o fetch da order roda — o `loading.tsx` do Next
   * só cobre a navegação; após o RSC chegar, o estado client começa em loading
   * e expõe só o footer do layout pai se devolvermos algo menor que viewport. */
  if (loading) {
    return <UserTicketDetailLoading />;
  }

  if (!orderData) {
    return (
      <div className="min-h-dvh bg-gray-2">
        <div className="mx-auto max-w-[1280px] px-4 pt-13 pb-20">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="cursor-pointer size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 transition-colors"
            >
              <div className="rotate-180"><ArrowButton isOpen={false} /></div>
            </button>
            <h1 className="text-[28px] font-bold text-gray-12 font-manrope leading-[1.1]">
              Detalhes do seu ingresso
            </h1>
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl p-8 text-center">
            <p className="text-gray-11 mb-4 font-family-dm-sans">
              Pedido não encontrado ou erro ao carregar os dados.
            </p>
            <button
              onClick={() => router.push("/user/tickets")}
              className="text-primary-11 hover:text-primary-12 font-family-dm-sans"
            >
              Voltar para meus ingressos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const order = orderData.order || {};
  const payment = orderData.payment || {};
  const pricing = order.pricing || {};

  // Pedido gratuito: sem forma de pagamento real (backend pode default p/ PIX) →
  // não exibe a linha "Forma de pagamento". `pricing.total` é em centavos.
  const isFreeOrder = (pricing.total ?? 0) <= 0;

  return (
    <div className="min-h-dvh bg-gray-2">
      {/* Mobile header — fixo no padrão do Figma: back à esquerda, título centralizado, border-bottom */}
      <div className="md:hidden bg-gray-2 border-b border-gray-6 px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="cursor-pointer size-8 flex items-center justify-center"
            aria-label="Voltar"
          >
            <div className="rotate-180 size-8 flex items-center justify-center">
              <ArrowButton isOpen={false} />
            </div>
          </button>
          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
            Detalhes do ingresso
          </p>
          {/* Spacer pra centralizar o título (mesma largura do botão de voltar) */}
          <div className="size-8" aria-hidden />
        </div>
      </div>

      <div className="mx-auto max-w-[700px] px-4 pt-6 pb-20 md:pt-13">
        {/* Desktop header — back chevron + título compacto + subtítulo (Figma desktop) */}
        <div className="mb-6 hidden md:flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="cursor-pointer size-9 flex items-center justify-center rounded-full hover:bg-gray-3 transition-colors"
              aria-label="Voltar"
            >
              <div className="rotate-180"><ArrowButton isOpen={false} /></div>
            </button>
            <h1 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
              Detalhes do seu ingresso
            </h1>
          </div>
          <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
            Apresente este QR Code na retirada do kit ou na entrada do evento para validar sua inscrição.
          </p>
        </div>

        {/* Mobile: descrição (card-resumo do evento fica fora do bloco, compartilhado com desktop) */}
        <div className="md:hidden mb-6">
          <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3]">
            Apresente este QR Code na retirada do kit ou na entrada do evento para validar sua inscrição.
          </p>
        </div>

        <div className="relative flex w-full items-center gap-1 overflow-hidden rounded-lg bg-[#F9F9F9] mb-10">
          <EventCardContent
            name={event.name}
            bannerUrl={event.bannerUrl}
            fallbackId={event.id}
            addressLabel={addressLabel}
            dateLabel={dateLabel}
            dateClassName="text-gray-11"
            bannerRounded="none"
            // "Meus ingressos" mantém o visual próprio: banner compacto (metade) +
            // divisor em primary. Home/busca (EventCard) usam os defaults (w-full/gray-6).
            bannerWidthClassName="md:w-1/4 w-1/3"
            dividerFromClassName="hidden"
            bannerOverlay={event.bannerUrl}
          >
            <Link href={`/events/${event.slug}`} className="[text-box-trim:trim-both] font-family-dm-sans self-start font-bold text-base text-primary-11 cursor-pointer max-md:hidden underline absolute bottom-0 right-0">
              Página do evento
            </Link>
          </EventCardContent>
        </div>



        <div className="w-full flex items-center md:hidden">
          <Link href={`/events/${event.slug}`} className="[text-box-trim:trim-both] font-family-dm-sans text-end font-bold text-base text-primary-11 cursor-pointer w-full underline -mt-8 mb-6">
            Página do evento
          </Link>
        </div>

        {/* Participants List */}
        {participants.length === 0 ? (
          <div className="bg-gray-1 border border-gray-6 rounded-xl p-8 text-center">
            <p className="text-gray-11 font-family-dm-sans">
              Nenhum participante encontrado para este pedido.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {participants.map((participant: any, index: number) => {
              const isExpanded = expandedParticipants[index] || false;
              const tab = activeTab[index] || "info";
              const qrCode = `${process.env.NEXT_PUBLIC_ROOT_SITE_URL}/user/tickets/${orderId}`;
              const ticket = participant.ticket || {};
              return (
                <div
                  key={participant.id || index}
                  className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden"
                >
                  {/* Participant Header — mobile: QR à esquerda + título à direita, ícones abaixo (Figma).
                      Desktop: texto à esquerda com todos os dados, QR à direita. */}
                  <button
                    onClick={() => toggleParticipant(index)}
                    className="w-full flex flex-col gap-5 items-start px-4 py-6 border-b border-gray-6 md:flex-row md:items-center md:justify-between"
                  >
                    {/* Linha 1 mobile: QR + (Participante N + ticket name).
                        Desktop: contém tudo à esquerda. */}
                    <div className="flex gap-3 items-start w-full md:flex-col md:gap-5 md:items-start md:w-auto">
                      {/* QR — visível só no mobile aqui (no desktop renderiza na direita) */}
                      <div className="shrink-0 md:hidden">
                        <RegistrationQRCode qrCodeData={qrCode} size={120} />
                      </div>
                      <div className="flex flex-col items-start gap-2 py-3 md:gap-2 md:py-0">
                        <p className="text-base text-gray-12 font-family-dm-sans">
                          Participante {index + 1}
                        </p>
                        <div className="flex flex-col items-start gap-1">
                          <p className="text-sm text-gray-11 font-family-dm-sans truncate max-w-full md:max-w-[400px]">
                            {ticket?.category?.name ?? "Ingresso avulso"}
                          </p>
                          <Tooltip
                            content={ticket.name || "Ingresso"}
                            position="topRight"
                            trigger="click"
                            usePortal
                            className="block min-w-0 max-w-full md:max-w-[400px]"
                            contentClassName="!w-auto max-w-[calc(100vw-32px)] text-left text-sm text-gray-12 font-family-dm-sans !py-2 !px-3"
                          >
                            <h2 className="text-lg md:text-2xl font-bold text-gray-12 text-left font-manrope line-clamp-3 cursor-pointer">
                              {ticket.name || "Ingresso"}
                            </h2>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    {/* QR — desktop-only, à direita */}
                    <div className="hidden md:block shrink-0">
                      <RegistrationQRCode qrCodeData={qrCode} size={120} />
                    </div>
                  </button>

                  {/* Participant Profile Card */}
                  <div className="px-4 py-4 border-b border-gray-6 flex items-center justify-between gap-3">
                    <div className="border border-gray-6 rounded-xl p-3 flex items-center gap-2 min-w-0 flex-1">
                      <div className="size-10 rounded-full bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                        {participant.avatarUrl ? (
                          <Image
                            src={getAvatarUrl(participant.avatarUrl) as string}
                            alt="Avatar"
                            width={40}
                            height={40}
                            className="size-10 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-12">
                            {participant.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-semibold text-gray-12 font-family-dm-sans truncate">
                          {participant.name || `Participante ${index + 1}`}
                        </p>
                        <div className="flex flex-wrap gap-1.5 items-center text-xs md:text-sm text-gray-11 font-family-dm-sans">
                          {participant.birthDate && (
                            <>
                              <span>{formatDate(participant.birthDate)}</span>
                              <span className="size-1 bg-gray-11 rounded-full shrink-0" />
                            </>
                          )}
                          {participant.gender && (
                            <>
                              <span>{getGenderLabel(participant.gender)}</span>
                              {participant.cpf && <span className="size-1 bg-gray-11 rounded-full shrink-0" />}
                            </>
                          )}
                          {participant.cpf && <span>{maskCPF(participant.cpf, isParticipantBr(participant))}</span>}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleParticipant(index)}
                      className="size-8 flex items-center justify-center shrink-0"
                    >
                      <ArrowButton isOpen={isExpanded} />
                    </button>
                  </div>

                  {/* Tabs */}
                  {isExpanded && (
                    <div className="flex gap-3 items-start px-4 pt-5">
                      <button
                        onClick={() => setActiveTab((prev) => ({ ...prev, [index]: "info" }))}
                        className={`px-4 py-3 rounded-[32px] font-semibold text-base font-manrope leading-[1.1] transition-colors ${tab === "info" ? "bg-primary-11 text-primary-2" : "bg-gray-5 text-gray-11"
                          }`}
                      >
                        Informações
                      </button>
                      <button
                        onClick={() => setActiveTab((prev) => ({ ...prev, [index]: "products" }))}
                        className={`px-4 py-3 rounded-[32px] font-semibold text-base font-manrope leading-[1.1] transition-colors ${tab === "products" ? "bg-primary-11 text-primary-2" : "bg-gray-5 text-gray-11"
                          }`}
                      >
                        Produtos
                      </button>
                    </div>
                  )}

                  {/* Tab Content */}
                  {isExpanded && (
                    <div className="px-4 pb-6 pt-8">
                      {tab === "info" && (
                        <div className="flex flex-col gap-8">
                          <div>
                            <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1] mb-5">
                              Informações do participante
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2">
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">Nome</label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.name || "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">Email</label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.email || "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  {isParticipantBr(participant) ? "CPF" : "Documento"}
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.cpf
                                    ? isParticipantBr(participant)
                                      ? participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
                                      : participant.cpf
                                    : "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  Data de nascimento
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.birthDate ? formatDate(participant.birthDate) : "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">Telefone</label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.phone ? formatPhone(participant.phone, participant.country) : "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">Sexo</label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {getGenderLabel(participant.gender) || "-"}
                                </p>
                              </div>
                              {participant.emergencyContact && (
                                <div className="flex flex-col py-4">
                                  <label className="text-base text-gray-12 font-family-dm-sans">
                                    Contato de emergência
                                  </label>
                                  <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                    {participant.emergencyContact.name || "-"} -{" "}
                                    {participant.emergencyContact.phone
                                      ? formatPhone(participant.emergencyContact.phone, participant.country)
                                      : "-"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {participant.questionAnswers.length > 0 && (
                            <>
                              <div className="w-full h-px bg-gray-6" />
                              <div>
                                <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1] mb-5">
                                  Perguntas do Organizador
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {participant.questionAnswers.map((qa: any) => (
                                    <div key={qa.id} className="flex flex-col py-4">
                                      <label className="text-base text-gray-12 font-family-dm-sans">
                                        {qa.question?.question || "Pergunta"}
                                      </label>
                                      <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                        {formatAnswer(qa.answer)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {tab === "products" && (
                        <ParticipantProductsTab
                          includedProducts={participant.includedProducts}
                          additionalProducts={participant.additionalProducts}
                          registrationId={participant.id}
                          orderCreatedAt={order.createdAt}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Order Details */}
        <div className="mt-10">
          <div className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden">
            <div className="flex flex-col gap-2 px-4 py-6">
              {/* Seção 1: meta do pedido — linhas com borda individual */}
              <div className="flex flex-col gap-2">
                <div className="border border-gray-6 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Número do pedido:
                  </p>
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1] md:text-right">
                    #{shortId(order.id) || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-6 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Nome do evento:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.3] md:text-right">
                    {event?.name || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Data da compra:
                  </p>
                  {/* Instante real → data + horário em BRT (America/Sao_Paulo). */}
                  <div className="flex flex-col items-end gap-0.5">
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right flex items-center">
                      {order.createdAt ? formatDateBRT(order.createdAt) : "N/A"} -  {formatTimeBRT(order.createdAt, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>

                {!isFreeOrder && (
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Forma de pagamento:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                      {payment.method === "CREDIT_CARD"
                        ? "Cartão de crédito"
                        : payment.method === "DEBIT_CARD"
                          ? "Cartão de débito"
                          : payment.method === "PIX"
                            ? "PIX"
                            : payment.method === "BOLETO"
                              ? "Boleto"
                              : payment.method || "N/A"}
                    </p>
                  </div>
                )}

                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Participantes:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                    {participants.length}
                  </p>
                </div>
              </div>

              <div className="w-full h-px bg-gray-6 my-2" />

              {/* Seção 2: valores — linhas com borda individual */}
              <div className="flex flex-col gap-2">
                {/* Produtos adicionais — linha agregada (centavos do backend). */}
                {(pricing.productsSubtotal ?? 0) > 0 && (
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Produtos adicionais:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                      {formatPrice(pricing.productsSubtotal ?? 0)}
                    </p>
                  </div>
                )}


                {/* Ingressos — agrupados por tipo idêntico "(Nx) Nome", acima do
                    Subtotal. Preço = `ticket.unitPrice` do backend (só o
                    ingresso, sem produtos). */}
                {groupedTicketLines.map((line, lineIndex) => (
                  <div
                    key={lineIndex}
                    className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3"
                  >
                    <span className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs text-gray-11 font-family-dm-sans leading-[1.3] truncate">
                        {line.categoryName ?? "Ingresso avulso"}
                      </span>
                      <span className="text-base font-semibold text-gray-12 font-manrope leading-[1.2] break-words">
                        {line.quantity > 1 ? `(${line.quantity}x) ` : ""}{line.ticketName}
                      </span>
                    </span>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right shrink-0">
                      {formatPrice(line.total * 100)}
                    </p>
                  </div>
                ))}


                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Subtotal:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                    {formatPrice(pricing.subtotal ?? 0)}
                  </p>
                </div>

                {/* Cupom/voucher ANTES da taxa (taxa por último). */}
                {(pricing.discount ?? 0) > 0 && (() => {
                  const coupon = order.coupon ?? null;
                  const voucher = order.voucher ?? null;
                  // Cupom e voucher são exclusivos: com voucher, o desconto é do
                  // voucher — rotula "Voucher CÓDIGO", não "Cupom".
                  const isVoucher = !!voucher && !coupon;
                  const isAutomaticCoupon = coupon?.couponType === "QUANTITY" || coupon?.couponType === "AGE";
                  const couponPercent = coupon?.type === "PERCENTAGE" && coupon?.value > 0 ? coupon.value : undefined;
                  const discountLabel = isVoucher
                    ? `${voucher?.code ? `Voucher ${voucher.code}` : "Voucher"}:`
                    : `${isAutomaticCoupon
                      ? "Cupom automático"
                      : coupon?.code
                        ? `Cupom ${coupon.code}`
                        : "Cupom"
                    }${couponPercent != null && couponPercent > 0 ? ` (-${couponPercent}%)` : ""}:`;

                  return (
                    <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                        {discountLabel}
                      </p>
                      <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                        – {formatPrice(pricing.discount ?? 0)}
                      </p>
                    </div>
                  );
                })()}

                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Taxa de serviço:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                    {formatPrice(pricing.serviceFee ?? 0)}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 pb-8 flex items-center justify-center gap-1">
              <p className="text-xl font-medium text-gray-12 font-manrope leading-[1.1]">
                Total pago:
              </p>
              <p className="text-2xl font-bold text-gray-12 font-manrope leading-[1.1]">
                {formatPrice(pricing.total ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div >
  );
}
