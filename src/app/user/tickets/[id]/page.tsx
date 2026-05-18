"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowButton } from "@/components/ArrowButton";
import { userService } from "@/services";
import { Loading } from "@/components/Loading";
import Image from "next/image";
import { DistanceIcon } from "@/components/Icons/DistanceIcon";
import { CalendarIcon } from "@/components/Icons/CalendarIcon";
import { ClockIcon } from "@/components/Icons/ClockIcon";
import { EventInfoCard } from "@/components/Event/EventInfoCard";
import { RegistrationQRCode } from "@/components/QRCode/RegistrationQRCode";
import { getAvatarUrl } from "@/utils/avatar";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { ProductVariationCard, type IncludedProduct } from "@/components/Ticket/ProductVariationCard";

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

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (cleaned.length === 10) return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    return phone;
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

      const includedProducts: IncludedProduct[] = (ticket.includedProducts || []).filter((item: any) => {
        const selectedName = item.selectedVariation?.name ?? null;
        if (selectedName && isSemInteresseVariation({ name: selectedName })) return false;
        return true;
      });

      const additionalProducts = (reg.additionalProducts || []).filter((item: any) => {
        const variationName = item.variation?.name ?? null;
        if (variationName && isSemInteresseVariation({ name: variationName })) return false;
        return true;
      });

      return {
        id: reg.id,
        name: p.fullName || `${p.firstName || ""} ${p.lastName || ""}`.trim() || "",
        email: p.email || "",
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
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
      <div className="md:hidden bg-gray-2 border-b border-gray-6 px-4 pt-5 pb-2">
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
              const qrCode = `$${process.env.NEXT_PUBLIC_ROOT_SITE_URL}/user/tickets/${orderId}`;
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
                          <h2 className="text-lg md:text-2xl font-bold text-gray-12 font-manrope truncate max-w-full md:max-w-[400px]">
                            {ticket.name || "Ingresso"}
                          </h2>
                        </div>
                      </div>
                    </div>

                    {/* QR — desktop-only, à direita */}
                    <div className="hidden md:block shrink-0">
                      <RegistrationQRCode qrCodeData={qrCode} size={120} />
                    </div>
                  </button>

                  {/* Participant Profile Card */}
                  <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
                    <div className="border border-gray-6 rounded-xl p-3 flex items-center gap-2">
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
                      <div className="flex flex-col">
                        <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                          {participant.name || `Participante ${index + 1}`}
                        </p>
                        <div className="flex gap-2 items-center text-sm text-gray-11 font-family-dm-sans">
                          {participant.birthDate && (
                            <>
                              {formatDate(participant.birthDate)}
                              <span className="size-1 bg-gray-11 rounded-full" />
                            </>
                          )}
                          {participant.gender && (
                            <>
                              {getGenderLabel(participant.gender)}
                              {participant.cpf && <span className="size-1 bg-gray-11 rounded-full" />}
                            </>
                          )}
                          {participant.cpf && maskCPF(participant.cpf)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleParticipant(index)}
                      className="size-8 flex items-center justify-center"
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
                                <label className="text-base text-gray-12 font-family-dm-sans">CPF</label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.cpf
                                    ? participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
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
                                  {participant.phone ? formatPhone(participant.phone) : "-"}
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
                                      ? formatPhone(participant.emergencyContact.phone)
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
                              <div className="flex flex-wrap gap-3">
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
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {participant.additionalProducts.map((item: any, productIndex: number) => {
                                  const productData = item.product || {};
                                  const variationData = item.variation || null;
                                  const price =
                                    item.totalPrice ?? (item.unitPrice ?? 0) * (item.quantity ?? 1);
                                  return (
                                    <div
                                      key={item.id || `add-${productIndex}`}
                                      className="bg-gray-2 border border-gray-6 rounded-xl"
                                    >
                                      <div className="flex gap-3 p-4">
                                        {productData.image && (
                                          <div className="size-[100px] rounded-lg border border-gray-6 overflow-hidden shrink-0">
                                            <Image
                                              src={productData.image}
                                              alt={productData.name || "Produto"}
                                              width={100}
                                              height={100}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                        )}
                                        <div className="flex flex-col justify-between flex-1 min-w-0">
                                          <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2">
                                            {productData.name || "Produto"}
                                            {item.quantity > 1 && (
                                              <span className="text-gray-11 font-normal"> x{item.quantity}</span>
                                            )}
                                          </p>
                                          <p className="text-base font-semibold text-gray-12 font-manrope">
                                            {formatPrice(price)}
                                          </p>
                                        </div>
                                      </div>
                                      {variationData && (
                                        <div className="border-t border-gray-6 p-4">
                                          <p className="text-base font-semibold text-gray-12 font-manrope">
                                            <span className="font-normal">
                                              {productData.variationType || "Variação"}:
                                            </span>{" "}
                                            {variationData.name}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
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
                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Número do pedido:
                  </p>
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1] text-right">
                    #{order.id || "N/A"}
                  </p>
                </div>

                <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                  <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                    Nome do evento:
                  </p>
                  <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
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
                  const isAutomaticCoupon = coupon?.couponType === "QUANTITY" || coupon?.couponType === "AGE";
                  const couponPercent = coupon?.type === "PERCENTAGE" && coupon?.value > 0 ? coupon.value : undefined;
                  const couponLabel = `${isAutomaticCoupon
                    ? "Cupom automático"
                    : coupon?.code
                      ? `Cupom ${coupon.code}`
                      : "Cupom"
                    }${couponPercent != null && couponPercent > 0 ? ` (-${couponPercent}%)` : ""}:`;

                  return (
                    <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between gap-3">
                      <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                        {couponLabel}
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
