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
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { ProductVariationCard, type IncludedProduct } from "@/components/Ticket/ProductVariationCard";
import { Tooltip } from "@/components/Tooltip";
import { formatPhoneForCountry } from "@/utils/phone";
import { isBrazilianCountry } from "@/validators/Auth.validator";

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
    return (orderData.registrations || []).map((reg: any) => {
      const p = reg.participant || {};
      const ticket = reg.ticket || {};

      // O backend manda TODOS os produtos do participante em `reg.products`
      // (inclusos no ingresso + opcionais comprados), cada item já com os dados
      // de edição de variação: `product` (catálogo, com `isIncludedInTicket`),
      // `variation` (selecionada), `variations` (opções), `buyerVariationEditAllowed`,
      // `canEditVariation`, `variationEdited` e `variationEditDeadline` (ISO).
      // Diferenciamos incluso × opcional pela flag `product.isIncludedInTicket`.
      const rawProducts = (reg.products || reg.additionalProducts || []) as any[];

      // Normaliza um item do carrinho pro shape consumido pelo ProductVariationCard.
      // `price` é o valor exibido: 0/base pro incluso, valor pago (unitPrice) pro opcional.
      const toIncludedProduct = (item: any, price: number): IncludedProduct => {
        const prod = item.product || {};
        return {
          // O endpoint de update é keyed pelo id do PRODUTO (catálogo).
          id: prod.id ?? item.id,
          name: prod.name ?? "Produto",
          image: prod.image,
          basePrice: price,
          variationType: prod.variationType,
          buyerVariationEditAllowed: item.buyerVariationEditAllowed === true,
          canEditVariation: item.canEditVariation === true,
          variationEdited: item.variationEdited === true,
          variationEditDeadline: item.variationEditDeadline,
          selectedVariation: item.variation
            ? {
                id: item.variation.id,
                name: item.variation.name,
                price: item.variation.price ?? 0,
              }
            : undefined,
          variations: item.variations,
        };
      };

      // Esconde variação "sem interesse" (opt-out de produto opcional).
      const visibleProducts = rawProducts.filter((item: any) => {
        const variationName = item.variation?.name ?? item.variationName ?? null;
        return !(variationName && isSemInteresseVariation({ name: variationName }));
      });

      const includedProducts: IncludedProduct[] = visibleProducts
        .filter((item: any) => item.product?.isIncludedInTicket === true)
        .map((item: any) => toIncludedProduct(item, item.product?.basePrice ?? 0));

      const additionalProducts: IncludedProduct[] = visibleProducts
        .filter((item: any) => item.product?.isIncludedInTicket !== true)
        .map((item: any) =>
          toIncludedProduct(item, item.unitPrice ?? item.product?.basePrice ?? 0),
        );

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
        emergencyContact: reg.emergencyContact || null,
        questionAnswers: reg.questionAnswers || [],
        includedProducts,
        additionalProducts,
      };
    });
  }, [orderData]);

  const event = useMemo(() => {
    if (!orderData?.event) return null;
    return orderData.event;
  }, [orderData]);

  /* Mantém o skeleton enquanto o fetch da order roda — o `loading.tsx` do Next
   * só cobre a navegação; após o RSC chegar, o estado client começa em loading
   * e expõe só o footer do layout pai se devolvermos algo menor que viewport. */
  if (loading) {
    return <UserTicketDetailLoading />;
  }

  if (!orderData) {
    return (
      <div className="min-h-screen bg-gray-2">
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

  return (
    <div className="min-h-screen bg-gray-2">
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

        {/* Card-resumo do evento — único bloco responsivo (mobile = 2 linhas, desktop = 1 linha) */}
        {event && <EventInfoCard event={event} className="mb-6" />}

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

              const distance = ticket.distance
                ? `${ticket.distance} ${ticket.distanceUnit || "Km"}`
                : null;

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
                                        {qa.answer || "-"}
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
                        <div className="flex flex-col gap-8">
                          {participant.includedProducts.length > 0 && (
                            <div className="flex flex-col gap-4">
                              <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                                Incluídos no ingresso
                              </h3>
                              <div className="grid grid-cols-2 gap-3 w-full">
                                {participant.includedProducts.map((product: IncludedProduct) => (
                                  <ProductVariationCard
                                    key={product.id}
                                    product={product}
                                    orderCreatedAt={order.createdAt}
                                    registrationId={participant.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {participant.additionalProducts.length > 0 && (
                            <div className="flex flex-col gap-4">
                              <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1]">
                                Adicionais
                              </h3>
                              <div className="grid grid-cols-2 gap-3 w-full">
                                {participant.additionalProducts.map((product: IncludedProduct) => (
                                  <ProductVariationCard
                                    key={product.id}
                                    product={product}
                                    orderCreatedAt={order.createdAt}
                                    registrationId={participant.id}
                                  />
                                ))}
                              </div>
                            </div>
                          )}

                          {participant.includedProducts.length === 0 &&
                            participant.additionalProducts.length === 0 && (
                              <p className="text-base text-gray-11 font-family-dm-sans">
                                Nenhum produto para este participante.
                              </p>
                            )}
                        </div>
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
                    #{order.id || "N/A"}
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
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                    {order.createdAt ? formatDate(order.createdAt) : "N/A"}
                  </p>
                </div>

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
                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Subtotal:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                    {formatPrice(pricing.subtotal ?? 0)}
                  </p>
                </div>

                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Taxa de serviço:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                    {formatPrice(pricing.serviceFee ?? 0)}
                  </p>
                </div>

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
    </div>
  );
}
