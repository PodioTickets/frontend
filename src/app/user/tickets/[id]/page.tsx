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
import { RegistrationQRCode } from "@/components/QRCode/RegistrationQRCode";
import { getAvatarUrl } from "@/utils/avatar";
import { ChevronDown, ChevronRight } from "lucide-react";

export default function TicketDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const registrationId = params.id as string;
  const [registration, setRegistration] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedParticipants, setExpandedParticipants] = useState<Record<number, boolean>>({});
  const [activeTab, setActiveTab] = useState<Record<number, "info" | "products">>({});

  useEffect(() => {
    if (!registrationId) return;

    const fetchRegistration = async () => {
      try {
        setLoading(true);
        const data = await userService.getMyRegistrationById(registrationId);
        setRegistration(data);
        // Expandir primeiro participante por padrão
        if (data?.tickets && data.tickets.length > 0) {
          setExpandedParticipants({ 0: true });
          setActiveTab({ 0: "info" });
        } else if (data) {
          // Mesmo sem tickets, expandir se tiver dados
          setExpandedParticipants({ 0: true });
          setActiveTab({ 0: "info" });
        }
      } catch (error: any) {
        console.error("Erro ao buscar detalhes da inscrição:", error);
        setRegistration(null);
      } finally {
        setLoading(false);
      }
    };

    fetchRegistration();
  }, [registrationId]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatPrice = (price: number) => {
    let value = price / 100
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "";
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (cleaned.length === 10) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return phone;
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const genderMap: Record<string, string> = {
      MALE: "Masculino",
      FEMALE: "Feminino",
      OTHER: "Outro",
      PREFER_NOT_TO_SAY: "Prefiro não dizer",
      masculino: "Masculino",
      feminino: "Feminino",
      outro: "Outro",
      "prefiro-nao-dizer": "Prefiro não dizer",
    };
    return genderMap[gender] || gender;
  };

  const toggleParticipant = (index: number) => {
    setExpandedParticipants((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
    // Se estiver expandindo, definir tab padrão
    if (!expandedParticipants[index]) {
      setActiveTab((prev) => ({ ...prev, [index]: "info" }));
    }
  };

  // Mapear tickets para participantes
  const participants = useMemo(() => {
    if (!registration) return [];

    const tickets = registration.tickets || [];
    const user = registration.user || {};
    // Produtos vêm do registration.products com estrutura { product, variation, quantity, totalPrice, unitPrice }
    const registrationProducts = registration.products || [];

    return tickets.map((ticketItem: any, index: number) => {
      const ticket = ticketItem.ticket || {};

      return {
        id: ticketItem.id || ticket.id || `ticket-${index}`,
        name: user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`.trim()
          : user.fullName || `Participante ${index + 1}`,
        email: user.email || "",
        cpf: user.documentNumber || "",
        birthDate: user.dateOfBirth || "",
        gender: user.gender || "",
        phone: user.phone || "",
        emergencyPhone: user.reservePhone || "",
        avatarUrl: user.avatarUrl || "",
        qrCode: registration.qrCode || "",
        ticket: ticket,
        questionAnswers: (registration.questionAnswers || []).reduce((acc: any, qa: any) => {
          if (qa.question) {
            acc[qa.question.id || qa.question.question] = qa.answer;
          }
          return acc;
        }, {}),
        // Usar produtos do registration com a estrutura correta
        products: registrationProducts,
      };
    });
  }, [registration]);

  const event = useMemo(() => {
    if (!registration) return null;
    return registration.event || null;
  }, [registration]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-2 flex items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (!registration) {
    return (
      <div className="min-h-screen bg-gray-2">
        <div className="mx-auto max-w-[1280px] px-4 md:px-20 pt-13 pb-20">
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="cursor-pointer size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 transition-colors"
            >
              <div className="rotate-180">
                <ArrowButton isOpen={false} />
              </div>
            </button>
            <h1 className="text-[28px] font-bold text-gray-12 font-manrope leading-[1.1]">
              Detalhes do seu ingresso
            </h1>
          </div>
          <div className="bg-gray-1 border border-gray-6 rounded-xl p-8 text-center">
            <p className="text-gray-11 mb-4 font-family-dm-sans">
              Inscrição não encontrada ou erro ao carregar os dados.
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

  return (
    <div className="min-h-screen bg-gray-2">
      <div className="mx-auto max-w-[700px] px-4 pt-13 pb-20">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="cursor-pointer size-9 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-3 transition-colors"
            >
              <div className="rotate-180">
                <ArrowButton isOpen={false} />
              </div>
            </button>
            <h1 className="text-[28px] font-bold text-gray-12 font-manrope leading-[1.1]">
              Detalhes do seu ingresso
            </h1>
          </div>
          <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
            Apresente este QR Code na retirada do kit ou na entrada do evento para validar sua inscrição.
          </p>
        </div>

        {/* Participants List */}
        {participants.length === 0 ? (
          <div className="bg-gray-1 border border-gray-6 rounded-xl p-8 text-center">
            <p className="text-gray-11 font-family-dm-sans">
              Nenhum participante encontrado para esta inscrição.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {participants.map((participant: any, index: number) => {
              const isExpanded = expandedParticipants[index] || false;
              const tab = activeTab[index] || "info";
              const ticket = participant.ticket || {};

              // Calcular distância do ticket
              const distance = ticket.distance
                ? `${ticket.distance} ${ticket.distanceUnit || "Km"}`
                : null;

              return (
                <div
                  key={participant.id || index}
                  className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden"
                >
                  {/* Participant Header */}
                  <button
                    onClick={() => toggleParticipant(index)}
                    className="w-full flex items-center justify-between px-4 py-6 border-b border-gray-6"
                  >
                    <div className="flex flex-col gap-5 items-start">
                      <p className="text-base text-gray-12 font-family-dm-sans">
                        Participante {index + 1}
                      </p>
                      <h2 className="text-2xl font-bold text-gray-12 font-manrope leading-[1.1]">
                        {ticket.name || "Ingresso"}
                      </h2>
                      <div className="flex gap-8 items-center">
                        {distance && (
                          <div className="flex gap-2 items-center">
                            <DistanceIcon className="size-6" />
                            <p className="text-lg font-medium text-gray-12 font-family-dm-sans">
                              {distance}
                            </p>
                          </div>
                        )}
                        {event?.eventDate && (
                          <div className="flex gap-2 items-center">
                            <CalendarIcon className="size-6" />
                            <p className="text-lg font-medium text-gray-12 font-family-dm-sans">
                              {formatDate(event.eventDate)}
                            </p>
                          </div>
                        )}
                        {event?.eventDate && (
                          <div className="flex gap-2 items-center">
                            <ClockIcon className="size-6" />
                            <p className="text-lg font-medium text-gray-12 font-family-dm-sans">
                              {formatTime(event.eventDate)}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* QR Code */}
                    <div className="shrink-0">
                      {registration?.qrCode ? (
                        <RegistrationQRCode
                          qrCodeData={registration.qrCode}
                          size={120}
                        />
                      ) : (
                        <div className="size-[120px] bg-gray-5 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-11">QR Code</span>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Participant Profile Card */}
                  <div className="px-4 py-5 border-b border-gray-6 flex items-center justify-between">
                    <div className="border border-gray-6 rounded-xl p-3 flex items-center gap-2">
                      <div className="size-10 rounded-full bg-gray-6 flex items-center justify-center shrink-0 overflow-hidden">
                        {participant.avatarUrl ? (
                          <Image
                            src={getAvatarUrl(participant.avatarUrl || "") as string}
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
                              {participant.cpf && (
                                <span className="size-1 bg-gray-11 rounded-full" />
                              )}
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
                  <div className={`flex gap-3 items-start px-4 pt-5 ${isExpanded ? "pb-0" : "pb-5"}`}>
                    <button
                      onClick={() => setActiveTab((prev) => ({ ...prev, [index]: "info" }))}
                      className={`px-4 py-3 rounded-[32px] font-semibold text-base font-manrope leading-[1.1] transition-colors ${tab === "info"
                        ? "bg-primary-11 text-primary-2"
                        : "bg-gray-5 text-gray-11"
                        }`}
                    >
                      Informações
                    </button>
                    <button
                      onClick={() => setActiveTab((prev) => ({ ...prev, [index]: "products" }))}
                      className={`px-4 py-3 rounded-[32px] font-semibold text-base font-manrope leading-[1.1] transition-colors ${tab === "products"
                        ? "bg-primary-11 text-primary-2"
                        : "bg-gray-5 text-gray-11"
                        }`}
                    >
                      Produtos
                    </button>
                  </div>

                  {/* Tab Content */}
                  {isExpanded && (
                    <div className="px-4 pb-6 pt-8">
                      {tab === "info" && (
                        <div className="flex flex-col gap-8">
                          {/* Informações do participante */}
                          <div>
                            <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1] mb-5">
                              Informações do participante
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2">
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  Nome
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.name || "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  Email
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.email || "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  CPF
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.cpf ? participant.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "-"}
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
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  Telefone
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {participant.phone ? formatPhone(participant.phone) : "-"}
                                </p>
                              </div>
                              <div className="flex flex-col py-4">
                                <label className="text-base text-gray-12 font-family-dm-sans">
                                  Sexo
                                </label>
                                <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                  {getGenderLabel(participant.gender) || "-"}
                                </p>
                              </div>
                              {participant.emergencyPhone && (
                                <div className="flex flex-col py-4">
                                  <label className="text-base text-gray-12 font-family-dm-sans">
                                    Telefone de emergência
                                  </label>
                                  <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                                    {participant.emergencyPhone ? formatPhone(participant.emergencyPhone) : "-"}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Perguntas do Organizador */}
                          {registration.questionAnswers && registration.questionAnswers.length > 0 && (
                            <>
                              <div className="w-full h-px bg-gray-6" />
                              <div>
                                <h3 className="text-xl font-bold text-gray-12 font-manrope leading-[1.1] mb-5">
                                  Perguntas do Organizador
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {registration.questionAnswers.map((qa: any) => (
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
                        <div>
                          {participant.products && participant.products.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {participant.products.map((item: any, productIndex: number) => {
                                const productData = item.product || {};
                                const variationData = item.variation || {};
                                const price = item.totalPrice ?? item.unitPrice ?? 0;
                                const isIncluded = price === 0;

                                return (
                                  <div
                                    key={item.id || productIndex}
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
                                        </p>
                                        <p className="text-base font-semibold text-gray-12 font-manrope">
                                          {isIncluded ? "Incluso no ingresso" : formatPrice(price)}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="border-t border-gray-6 p-4">
                                      <p className="text-base font-semibold text-gray-12 font-manrope">
                                        <span className="font-normal"> {productData.variationType || "Tamanho"}:</span> {variationData.name || "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-base text-gray-11 font-family-dm-sans">
                              Nenhum produto adicional
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
        {registration.order && (
          <div className="mt-10">
            <div className="bg-gray-1 border border-gray-6 rounded-xl overflow-hidden">
              <div className="flex flex-col gap-2 px-4 py-6">
                {/* Order Information Section */}
                <div className="flex flex-col gap-2">
                  {/* Número do pedido */}
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Número do pedido:
                    </p>
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      #{registration.order.id || "N/A"}
                    </p>
                  </div>

                  {/* Nome do evento */}
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Nome do evento:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1] text-right">
                      {event?.name || "N/A"}
                    </p>
                  </div>

                  {/* Data */}
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Data:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      {registration.order.purchaseDate ? formatDate(registration.order.purchaseDate) : "N/A"}
                    </p>
                  </div>

                  {/* Forma de pagamento */}
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Forma de pagamento:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      {registration.order.payment?.method === "CREDIT_CARD"
                        ? "Cartão de crédito"
                        : registration.order.payment?.method === "PIX"
                          ? "PIX"
                          : registration.order.payment?.method || "N/A"}
                    </p>
                  </div>

                  {/* Participantes */}
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Participantes:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      {participants.length}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="w-full h-px bg-gray-6 my-2" />

                {/* Financial Breakdown Section */}
                <div className="flex flex-col gap-2">
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Produtos adicionais:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      {formatPrice(
                        registration.kitItems.reduce((sum: number, item: any) => {
                          return sum + (item.kitItem?.price || 0) * (item.quantity || 1);
                        }, 0)
                      )}
                    </p>
                  </div>

                  {/* Subtotal */}
                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Subtotal:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      {formatPrice(registration.order.totalAmount || 0)}
                    </p>
                  </div>

                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Taxa de serviço:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      {formatPrice(registration.order.serviceFee || 0)}
                    </p>
                  </div>

                  <div className="border border-gray-6 rounded-lg p-4 flex items-center justify-between">
                    <p className="text-base font-semibold text-gray-12 font-manrope leading-[1.1]">
                      Desconto cupom:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope leading-[1.1]">
                      – {formatPrice(registration.order.discount || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Total pago (fora do card, abaixo) */}
              <div className="px-4 py-4 pb-8 flex items-center justify-center gap-1">
                <p className="text-xl font-medium text-gray-12 font-manrope leading-[1.1]">
                  Total pago:
                </p>
                <p className="text-2xl font-bold text-gray-12 font-manrope leading-[1.1]">
                  {formatPrice(registration.order.finalAmount || 0)}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
