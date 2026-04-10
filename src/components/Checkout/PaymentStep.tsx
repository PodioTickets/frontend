"use client";

import { useState, useEffect, useMemo } from "react";
import { OrderSummary } from "./OrderSummary";
import { ParticipantSummaryModal } from "./ParticipantSummaryModal";
import {
  CheckoutAddressSection,
  initialBillingAddress,
  type CheckoutBillingAddress,
} from "./CheckoutAddressSection";
import { Button } from "../Button";
import { Dropdown, DropdownOption } from "../Dropdown";
import { VisaIcon } from "../Icons/VisaIcon";
import { MasterCardIcon } from "../Icons/MasterCardIcon";
import { EloIcon } from "../Icons/EloIcon";
import { HelpIcon } from "../Icons/HelpIcon";
import { ArrowButton } from "../ArrowButton";
import { RemoveIcon } from "../Icons/RemoveIcon";
import { TrashIcon } from "../Icons/TrashIcon";
import { PencilIcon } from "../Icons/PencilIcon";
import Image from "next/image";
import { ImageWithInitialFallback } from "@/components/ImageWithInitialFallback";
import { Tooltip, CVVTooltip } from "../Tooltip";
import type { Event } from "@/interfaces/event";
import { useCheckout } from "@/contexts/CheckoutContext";
import { Input } from "../Input";
import { useTickets } from "@/hooks/useTickets";
import { useTicketCategories } from "@/hooks/useTicketCategories";
import type { Ticket } from "@/hooks/useTickets";
import { useQuery } from "@tanstack/react-query";
import { organizerService } from "@/services";
import { queryKeys } from "@/services/cache/QueryClient";
import { Loading } from "../Loading";
import { useCheckout as useCheckoutPayment } from "@/hooks/useCheckoutPayment";
import { usePaymentStatusPolling } from "@/hooks/usePaymentStatus";
import { validateCardNumber, validateExpiry, validateCVV, getCardBrand } from "@/utils/cardValidation";
import { isValidCPF } from "@/utils/cpf";
import type {
  CheckoutBillingAddressRequest,
  CheckoutRequest,
  PixPayment,
} from "@/interfaces/checkout";
import toast from "react-hot-toast";
import { apiClient } from "@/services";

interface PaymentStepProps {
  event: Event;
  onBack: () => void;
  onSuccess?: () => void;
}

type PaymentMethod = "credit" | "pix" | "boleto";

interface PaymentOption {
  id: PaymentMethod;
  name: string;
  description: string;
  badge?: string;
  icons?: React.ReactNode;
}

type CardErrors = {
  cardName?: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCVV?: string;
};

function CreditCardForm({
  installmentOptions,
  selectedInstallments,
  setSelectedInstallments,
  onSuccess,
  cardName,
  setCardName,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCVV,
  setCardCVV,
  isMobile = false,
  errors,
}: {
  installmentOptions: DropdownOption[];
  selectedInstallments: string;
  setSelectedInstallments: (value: string) => void;
  onSuccess?: () => void;
  cardName?: string;
  setCardName?: (value: string) => void;
  cardNumber?: string;
  setCardNumber?: (value: string) => void;
  cardExpiry?: string;
  setCardExpiry?: (value: string) => void;
  cardCVV?: string;
  setCardCVV?: (value: string) => void;
  isMobile?: boolean;
  errors?: CardErrors;
}) {
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return v;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 2) {
      return v.substring(0, 2) + "/" + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (setCardNumber) setCardNumber(formatted);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    if (setCardExpiry) setCardExpiry(formatted);
  };

  // Detectar se é Amex para permitir 4 dígitos no CVV
  const isAmex = cardNumber ? getCardBrand(cardNumber) === 'AMEX' : false;
  const cvvMaxLength = isAmex ? 4 : 3;

  const handleCVVChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").substring(0, cvvMaxLength);
    if (setCardCVV) setCardCVV(value);
  };

  return (
    <div className={`${isMobile ? "flex flex-col gap-4" : "space-y-4"}`}>
      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-family-dm-sans">
          Nome impresso no cartão
        </label>
        <div className="relative">
          <Input
            type="text"
            value={cardName || ""}
            onChange={(e) => setCardName && setCardName(e.target.value)}
            className="bg-gray-2"
            placeholder="Ex: João Ribeiro"
            aria-invalid={!!errors?.cardName}
          />
        </div>
        {errors?.cardName && <p className="text-sm text-red-11">{errors.cardName}</p>}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-family-dm-sans">
          Número do cartão
        </label>
        <div className="relative">
          <Input
            type="text"
            value={cardNumber || ""}
            onChange={handleCardNumberChange}
            className="bg-gray-2"
            maxLength={19}
            placeholder="Ex: 5400 7975 6026 4737"
            aria-invalid={!!errors?.cardNumber}
          />
        </div>
        {errors?.cardNumber && <p className="text-sm text-red-11">{errors.cardNumber}</p>}
      </div>

      <div
        className={`flex ${isMobile ? "flex-col gap-4" : "justify-between gap-4"
          } w-full`}
      >
        <div
          className={`${isMobile ? "w-full" : "flex-1"} flex flex-col gap-2`}
        >
          <label className="text-base text-gray-12 font-family-dm-sans">
            Data de validade
          </label>
          <Input
            type="text"
            value={cardExpiry || ""}
            onChange={handleExpiryChange}
            className="bg-gray-2"
            maxLength={5}
            placeholder="MM/AA"
            aria-invalid={!!errors?.cardExpiry}
          />
          {errors?.cardExpiry && <p className="text-sm text-red-11">{errors.cardExpiry}</p>}
        </div>
        <div
          className={`${isMobile ? "w-full" : "flex-1"} flex flex-col gap-2`}
        >
          <div className="flex items-center gap-2">
            <label className="text-base text-gray-12 font-family-dm-sans">CVV</label>
            <Tooltip
              content={<CVVTooltip />}
              position="topRight"
              trigger="hover"
              className="cursor-help"
            >
              <button
                type="button"
                className="text-gray-11 hover:text-gray-12 transition-colors"
              >
                <HelpIcon className="size-4" />
              </button>
            </Tooltip>
          </div>
          <div className="relative w-full">
            <Input
              type="text"
              value={cardCVV || ""}
              onChange={handleCVVChange}
              maxLength={cvvMaxLength}
              className="bg-gray-2"
              placeholder={isAmex ? "4 dígitos" : "3 dígitos"}
              aria-invalid={!!errors?.cardCVV}
            />
          </div>
          {errors?.cardCVV && <p className="text-sm text-red-11">{errors.cardCVV}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-base text-gray-12 font-family-dm-sans">Parcelas</label>
        <Dropdown
          options={installmentOptions}
          dataAttribute="installments"
          width="w-full"
          maxHeight="max-h-[200px]"
          selectedIds={[selectedInstallments]}
          onSelect={(option) => setSelectedInstallments(option.id || "1")}
          trigger={() => (
            <div className="w-full h-12 px-3 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors cursor-pointer hover:border-gray-8 flex items-center justify-between">
              <p className="text-base text-gray-11 font-family-dm-sans">
                {installmentOptions.find(
                  (opt: DropdownOption) => opt.id === selectedInstallments
                )?.label || "Quanto deseja parcelar?"}
              </p>
              <span className="text-gray-12">›</span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function PixModal({
  isOpen,
  onClose,
  pixData,
  registrationId,
  onPaymentConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  pixData: PixPayment | null;
  registrationId: string | null;
  onPaymentConfirmed?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const expirationDate = pixData ? new Date(pixData.expirationDate) : null;

  // Polling de status do pagamento
  const { status } = usePaymentStatusPolling(registrationId, (newStatus) => {
    if (newStatus === 'PAID') {
      toast.success('Pagamento confirmado!');
      if (onPaymentConfirmed) {
        onPaymentConfirmed();
      }
    } else if (newStatus === 'FAILED') {
      toast.error('Pagamento não foi confirmado.');
    }
  });

  useEffect(() => {
    if (!isOpen || !expirationDate) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const diff = Math.max(0, Math.floor((expirationDate.getTime() - now.getTime()) / 1000));
      setTimeLeft(diff);

      if (diff <= 0) {
        onClose();
      }
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [isOpen, expirationDate, onClose]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const copyPixCode = () => {
    if (pixData?.qrCode) {
      navigator.clipboard.writeText(pixData.qrCode);
      toast.success('Código PIX copiado!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl mx-4 shadow-2xl w-[730px]">
        <div className="text-[20px] font-bold text-gray-12 flex items-center justify-between border-b border-gray-6 pb-4 p-4">
          <p>Pix gerado com sucesso</p>
          <button className="cursor-pointer" onClick={onClose}>
            <RemoveIcon className="size-4" />
          </button>
        </div>
        <div className="text-center space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-12 px-4">
              Mantenha esta página aberta. Assim que o banco confirmar o
              pagamento, vamos atualizar automaticamente o status do seu pedido
            </p>

            {/* Countdown */}
            <p className="text-2xl font-bold text-primary-11">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </p>

            <p className="text-sm text-gray-12">
              Tempo para conclusão do pagamento
            </p>
          </div>

          {/* QR Code */}
          <div className="space-y-4">
            <div className="bg-gray-2 p-8 rounded-lg mx-auto max-w-xs">
              {pixData?.qrCodeBase64 ? (
                <Image
                  src={pixData.qrCodeBase64}
                  alt="QR Code PIX"
                  width={192}
                  height={192}
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-5 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-xs text-gray-11 text-center">
                    QR Code PIX
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status do pagamento */}
          {status === 'PAID' && (
            <div className="bg-green-2 border border-green-6 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-11">
                Pagamento confirmado!
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="space-y-3 w-1/2 mx-auto mb-8">
            <Button
              className="w-full py-4 text-lg font-bold"
              onClick={copyPixCode}
            >
              Copiar pix
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PixForm({
  onSuccess,
  pixValue,
  isMobile = false,
  onProcessCheckout,
  loading = false,
  submitDisabled = false,
}: {
  onSuccess?: () => void;
  pixValue?: number;
  isMobile?: boolean;
  onProcessCheckout?: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
}) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center space-y-4 rounded-lg border border-gray-6 p-4">
        <div className="flex items-center justify-center gap-1">
          <p className="text-base text-gray-12 font-family-dm-sans">
            Valor à vista:
          </p>
          <p className="text-lg font-bold text-gray-12 font-manrope">
            {formatPrice(pixValue || 0)}
          </p>
        </div>
        <p className="text-base text-gray-12 font-family-dm-sans">
          Prazo de até 30 minutos para compensar
        </p>
      </div>
      <p className="text-base font-medium text-gray-12 text-center font-family-dm-sans">
        Clique em "finalizar compra" para gerar o PIX
      </p>
      {!isMobile && (
        <Button
          onClick={onProcessCheckout}
          disabled={loading || submitDisabled}
          className="w-full font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processando...' : 'Finalizar compra'}
        </Button>
      )}
    </div>
  );
}

function PaymentMethodOption({
  option,
  isSelected,
  onSelect,
}: {
  option: PaymentOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer ${isSelected
        ? "border border-blue-8 bg-blue-3"
        : "border border-gray-5 hover:bg-gray-2"
        }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`rounded-full size-4 border-[1.5px] ${isSelected
            ? "bg-primary-10 border-primary-10"
            : "bg-transparent border-gray-6"
            }`}
        />
        <span className="text-sm font-semibold font-family-manrope text-gray-12">
          {option.name}{" "}
          {option.badge?.includes("OFF") && (
            <span className="text-xs text-primary-12 font-semibold ml-2 bg-primary-6 px-2 py-1 rounded-full">
              {option.description}
            </span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs ${option.badge?.includes("OFF")
            ? "text-primary-10 font-semibold hidden"
            : "text-gray-11"
            }`}
        >
          {option.description}
        </span>
        {option.icons}
      </div>
    </div>
  );
}

function BillingAddressConfirmedSummary({
  address,
  onEdit,
  className = "",
}: {
  address: CheckoutBillingAddress;
  onEdit: () => void;
  className?: string;
}) {
  return (
    <div
      className={`border border-gray-6 rounded-xl p-5 flex flex-col gap-4 w-full bg-gray-1 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 className="font-manrope font-bold text-xl leading-[1.1] text-gray-12">
          Endereço
        </h2>
        <Button
          type="button"
          variant="outline"
          className="shrink-0 border-gray-6 text-gray-12 font-semibold font-family-dm-sans"
          onClick={onEdit}
        >
          Alterar endereço
        </Button>
      </div>
      <div className="text-sm text-gray-12 font-family-dm-sans leading-[1.4] space-y-1">
        <p>
          {address.street}, {address.number}
          {address.complement?.trim()
            ? ` — ${address.complement.trim()}`
            : ""}
        </p>
        <p>
          {address.neighborhood} — {address.city}
          {address.stateUf ? `/${address.stateUf}` : ""}
        </p>
        <p className="text-gray-11">
          CEP {address.cep}
          {address.country?.trim() && address.country !== "Brasil"
            ? ` · ${address.country}`
            : ""}
        </p>
      </div>
    </div>
  );
}

export function PaymentStep({ event, onBack, onSuccess }: PaymentStepProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("credit");
  const [selectedInstallments, setSelectedInstallments] = useState<string>("1");

  // Form states
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCVV, setCardCVV] = useState("");
  const [cardErrors, setCardErrors] = useState<CardErrors>({});

  const handleSetCardName = (v: string) => { setCardName(v); setCardErrors((p) => { const n = { ...p }; delete n.cardName; return n; }); };
  const handleSetCardNumber = (v: string) => { setCardNumber(v); setCardErrors((p) => { const n = { ...p }; delete n.cardNumber; return n; }); };
  const handleSetCardExpiry = (v: string) => { setCardExpiry(v); setCardErrors((p) => { const n = { ...p }; delete n.cardExpiry; return n; }); };
  const handleSetCardCVV = (v: string) => { setCardCVV(v); setCardErrors((p) => { const n = { ...p }; delete n.cardCVV; return n; }); };

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState<number>(0);
  const [isCouponApplied, setIsCouponApplied] = useState(false);

  // PIX states
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<PixPayment | null>(null);
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  const [billingAddress, setBillingAddress] = useState<CheckoutBillingAddress>(
    () => initialBillingAddress()
  );
  const [billingAddressConfirmed, setBillingAddressConfirmed] = useState(false);

  const { participants, raceQuantities } = useCheckout();
  const eventId = event?.id;
  const { processCheckout, loading: checkoutLoading } = useCheckoutPayment();

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  // Buscar produtos do evento
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.events.products(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { products: [] };
      return organizerService.getProducts(eventId);
    },
    enabled: !!eventId,
    staleTime: 5 * 60 * 1000,
  });

  // Create productsMap for product images in ParticipantSummaryModal
  const productsMap = useMemo(() => {
    if (!productsData?.products) return {};
    const map: Record<string, { id: string; name: string; image: string | null }> = {};
    productsData.products.forEach((product: any) => {
      map[product.id] = {
        id: product.id,
        name: product.name,
        image: product.image || null,
      };
    });
    return map;
  }, [productsData]);

  const loading = ticketsLoading || categoriesLoading || productsLoading;

  // Separar tickets com categoria dos avulsos
  const { categorizedTickets, uncategorizedTickets } = useMemo(() => {
    const categorized: Array<{ id: string; name: string; tickets: Ticket[] }> = [];
    const uncategorized: Ticket[] = [];

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    const ticketsByCategory: Record<string, Ticket[]> = {};
    tickets.forEach((ticket) => {
      const categoryId = ticket.groupId;
      if (categoryId && categoryMap.has(categoryId)) {
        if (!ticketsByCategory[categoryId]) {
          ticketsByCategory[categoryId] = [];
        }
        ticketsByCategory[categoryId].push(ticket);
      } else {
        uncategorized.push(ticket);
      }
    });

    categories.forEach((category) => {
      const categoryTickets = ticketsByCategory[category.id] || [];
      if (categoryTickets.length > 0) {
        categorized.push({
          id: category.id,
          name: category.name,
          tickets: categoryTickets.filter((ticket) => {
            try {
              const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
              return !isNaN(price) && price > 0;
            } catch {
              return false;
            }
          }),
        });
      }
    });

    const validUncategorized = uncategorized.filter((ticket) => {
      try {
        const price = parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
        return !isNaN(price) && price > 0;
      } catch {
        return false;
      }
    });

    return {
      categorizedTickets: categorized,
      uncategorizedTickets: validUncategorized,
    };
  }, [tickets, categories]);

  const getTicketPrice = (ticket: Ticket): number => {
    try {
      return parseFloat(ticket.price.replace(/[^\d,]/g, "").replace(",", "."));
    } catch {
      return 0;
    }
  };

  // Agrupa ingressos por ticket para exibição
  const groupedTickets = useMemo(() => {
    const grouped: Array<{
      quantity: number;
      raceName: string;
      distance: string;
      price: number;
      total: number;
    }> = [];

    const ticketMap = new Map<string, { ticket: Ticket; quantity: number }>();

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          const existing = ticketMap.get(ticket.id);
          if (existing) {
            existing.quantity += quantity;
          } else {
            ticketMap.set(ticket.id, { ticket, quantity });
          }
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        const existing = ticketMap.get(ticket.id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          ticketMap.set(ticket.id, { ticket, quantity });
        }
      }
    });

    ticketMap.forEach(({ ticket, quantity }) => {
      grouped.push({
        quantity,
        raceName: ticket.name,
        distance: ticket.distance ? `${ticket.distance} ${ticket.distanceUnit || ""}` : "",
        price: getTicketPrice(ticket),
        total: getTicketPrice(ticket) * quantity,
      });
    });

    return grouped;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  // Criar lista de participantes baseada nos tickets selecionados
  const participantsWithTickets = useMemo(() => {
    const result: Array<{
      ticketId: string;
      ticket: Ticket;
      participantIndex: number;
    }> = [];
    let participantIndex = 0;

    // Tickets com categoria
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        for (let i = 0; i < quantity; i++) {
          result.push({
            ticketId: ticket.id,
            ticket,
            participantIndex: participantIndex++,
          });
        }
      });
    });

    // Tickets avulsos
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      for (let i = 0; i < quantity; i++) {
        result.push({
          ticketId: ticket.id,
          ticket,
          participantIndex: participantIndex++,
        });
      }
    });

    return result;
  }, [raceQuantities, categorizedTickets, uncategorizedTickets]);

  // Helper para obter produtos de um participante
  const getParticipantProducts = (participantIndex: number): Array<{
    name: string;
    price: number;
    quantity: number;
    size?: string;
  }> => {
    if (!productsData?.products) return [];

    const participant = participants[participantIndex];
    if (!participant?.productVariations) return [];

    const items: Array<{
      name: string;
      price: number;
      quantity: number;
      size?: string;
    }> = [];

    Object.entries(participant.productVariations).forEach(([productId, variationId]) => {
      if (!variationId) return;

      const product = productsData.products.find((p: any) =>
        p.id === productId || p.id.startsWith(productId) || productId.startsWith(p.id)
      );
      if (!product) return;

      // Se o produto está incluído no ingresso, não mostrar como adicional
      if (product.isIncludedInTicket) return;

      const variation = product.variations?.find((v: any, i: number) =>
        (v.id || `${product.id}-${i}`) === variationId
      );

      const price = variation?.price ?? product.basePrice ?? 0;

      if (price > 0) {
        items.push({
          name: product.name,
          price,
          quantity: 1,
          size: variation?.name,
        });
      }
    });

    return items;
  };

  // Generate participants data for the list
  const participantsData = useMemo(() => {
    const data: Array<{
      participantIndex: number;
      ticketName: string;
      ticketPrice: number;
      additionalProducts?: Array<{
        name: string;
        price: number;
        quantity: number;
        size?: string;
      }>;
      participant?: {
        name: string;
        cpf: string;
        email: string;
        birthDate: string;
        phone: string;
        gender?: string;
      };
      couponCode?: string;
      couponDiscount?: number;
      voucherCode?: string;
      voucherDiscount?: number;
    }> = [];

    participantsWithTickets.forEach(({ ticket, participantIndex }) => {
      const participant = participants[participantIndex];
      if (participant && (participant.name || participant.cpf)) {
        const products = getParticipantProducts(participantIndex);
        data.push({
          participantIndex,
          ticketName: ticket.name,
          ticketPrice: getTicketPrice(ticket),
          participant: {
            name: participant.name || "",
            cpf: participant.cpf || "",
            email: participant.email || "",
            birthDate: participant.birthDate || "",
            phone: participant.phone || "",
            gender: participant.gender,
          },
          additionalProducts: products.length > 0 ? products : undefined,
          // TODO: Adicionar cupom e voucher quando estiverem no contexto
          couponCode: undefined,
          couponDiscount: undefined,
          voucherCode: undefined,
          voucherDiscount: undefined,
        });
      }
    });

    return data;
  }, [participantsWithTickets, participants, productsData]);

  // Calcular produtos selecionados a partir do contexto (productVariations de cada participante)
  const orderItems = useMemo((): Array<{
    name: string;
    price: number;
    image?: string;
    size?: string;
    participantIndex: number;
    productId: string;
  }> => {
    if (!productsData?.products) return [];

    const items: Array<{
      name: string;
      price: number;
      image?: string;
      size?: string;
      participantIndex: number;
      productId: string;
    }> = [];

    // Para cada participante, verificar os produtos selecionados
    participantsWithTickets.forEach(({ participantIndex }) => {
      const participant = participants[participantIndex];
      if (!participant?.productVariations) return;

      // Para cada produto selecionado pelo participante
      Object.entries(participant.productVariations).forEach(([productId, variationId]) => {
        if (!variationId) return;

        // Encontrar o produto
        const product = productsData.products.find((p: any) =>
          p.id === productId || p.id.startsWith(productId) || productId.startsWith(p.id)
        );
        if (!product) return;

        // Se o produto está incluído no ingresso, não cobrar
        if (product.isIncludedInTicket) return;

        // Encontrar a variação selecionada
        const variation = product.variations?.find((v: any, i: number) =>
          (v.id || `${product.id}-${i}`) === variationId
        );

        // Calcular preço (variação ou preço base)
        const price = variation?.price ?? product.basePrice ?? 0;

        // Só adicionar se tiver preço > 0
        if (price > 0) {
          items.push({
            name: product.name,
            price,
            image: product.image || undefined,
            size: variation?.name || undefined,
            participantIndex,
            productId: product.id,
          });
        }
      });
    });

    return items;
  }, [productsData, participantsWithTickets, participants]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  };

  const paymentOptions: PaymentOption[] = [
    {
      id: "credit",
      name: "Cartão de crédito",
      description: "",
      icons: (
        <div className="flex gap-2 items-center">
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <VisaIcon />
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <EloIcon />
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <Image
              src="/images/american_express.png"
              alt="Mastercard"
              width={24}
              height={24}
            />
          </div>
          <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
            <MasterCardIcon />
          </div>
        </div>
      ),
    },
    {
      id: "pix",
      name: "PIX",
      description: "",
      badge: "",
    },
  ];

  // Calculate totals
  const { totalParticipants, totalPrice } = useMemo(() => {
    let participants = 0;
    let total = 0;

    participantsWithTickets.forEach(({ ticket }) => {
      participants++;
      total += getTicketPrice(ticket);
    });

    return { totalParticipants: participants, totalPrice: total };
  }, [participantsWithTickets]);

  const serviceFee = event.serviceFee || 0;
  const additionalProductsTotal = orderItems.reduce(
    (sum, item) => sum + item.price,
    0
  );
  const subtotalValue = totalPrice + serviceFee + additionalProductsTotal;
  const totalValue = subtotalValue - couponDiscount;

  // Calcular opções de parcelamento baseado no valor total
  const installmentOptions = useMemo(() => {
    const options: DropdownOption[] = [];
    for (let i = 1; i <= 12; i++) {
      const installmentValue = totalValue / i;
      const label =
        i === 1
          ? `1x de ${formatPrice(totalValue)} (à vista)`
          : `${i}x de ${formatPrice(installmentValue)} sem juros`;
      options.push({ id: String(i), label });
    }
    return options;
  }, [totalValue]);

  const calculatePixValue = () => {
    const discount = totalValue * 0.05;
    return totalValue - discount;
  };

  // Coupon validation
  const validateCoupon = (code: string): boolean => {
    // Remove espaços e converte para maiúsculo
    const cleanCode = code.trim().replace(/\s/g, "");

    // Verifica se tem 6 dígitos
    if (cleanCode.length !== 6) {
      return false;
    }

    // Verifica se é apenas números
    if (!/^\d+$/.test(cleanCode)) {
      return false;
    }

    // Verifica se é o cupom válido
    return cleanCode === "111111";
  };

  const handleApplyCoupon = () => {
    if (!couponCode.trim()) {
      setCouponError("Por favor, digite um código de cupom");
      setIsCouponApplied(false);
      setCouponDiscount(0);
      return;
    }

    if (validateCoupon(couponCode)) {
      // Cupom válido - aplicar desconto de R$ 40,00
      setCouponError(null);
      setIsCouponApplied(true);
      setCouponDiscount(40);
    } else {
      // Cupom inválido
      setCouponError("Cupom inválido");
      setIsCouponApplied(false);
      setCouponDiscount(0);
    }
  };

  // Mapear gender do formulário para o formato da API
  const mapGenderToAPI = (gender: string): 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY' | undefined => {
    if (!gender) return undefined;

    const genderLower = gender.toLowerCase().trim();

    if (genderLower === 'masculino' || genderLower === 'male' || genderLower === 'm') {
      return 'MALE';
    }
    if (genderLower === 'feminino' || genderLower === 'female' || genderLower === 'f') {
      return 'FEMALE';
    }
    if (genderLower === 'outro' || genderLower === 'other' || genderLower === 'o') {
      return 'OTHER';
    }
    if (genderLower === 'prefiro não dizer' || genderLower === 'prefer_not_to_say' || genderLower === 'prefiro-nao-dizer') {
      return 'PREFER_NOT_TO_SAY';
    }

    // Se não corresponder a nenhum, retorna undefined
    return undefined;
  };

  const buildBillingAddressPayload = (): CheckoutBillingAddressRequest | null => {
    if (!billingAddressConfirmed) {
      toast.error("Confirme o endereço de cobrança antes de pagar.");
      return null;
    }
    const a = billingAddress;
    const country = a.country?.trim() || "Brasil";
    const cepDigits = a.cep.replace(/\D/g, "");
    if (!country) {
      toast.error("Selecione o país no endereço de cobrança.");
      return null;
    }
    if (country === "Brasil") {
      if (cepDigits.length !== 8) {
        toast.error("Informe um CEP válido (8 dígitos) no endereço de cobrança.");
        return null;
      }
    } else if (!a.cep.trim()) {
      toast.error("Informe o CEP ou código postal no endereço de cobrança.");
      return null;
    }
    if (!a.stateUf?.trim()) {
      toast.error("Selecione o estado no endereço de cobrança.");
      return null;
    }
    if (!a.street.trim() || !a.number.trim() || !a.neighborhood.trim() || !a.city.trim()) {
      toast.error("Preencha rua, número, bairro e cidade no endereço de cobrança.");
      return null;
    }
    const postalCode =
      country === "Brasil" ? cepDigits : a.cep.trim().replace(/\s+/g, " ");
    return {
      country,
      postalCode,
      stateUf: a.stateUf.trim().toUpperCase(),
      street: a.street.trim(),
      number: a.number.trim(),
      complement: a.complement?.trim() || undefined,
      neighborhood: a.neighborhood.trim(),
      city: a.city.trim(),
    };
  };

  // Preparar dados do checkout
  const prepareCheckoutData = (): CheckoutRequest | null => {
    if (!eventId) return null;

    const billingAddressPayload = buildBillingAddressPayload();
    if (!billingAddressPayload) return null;

    // Agrupar tickets por ticketId para criar a lista de tickets
    const ticketMap = new Map<string, number>();
    participantsWithTickets.forEach(({ ticketId }) => {
      const current = ticketMap.get(ticketId) || 0;
      ticketMap.set(ticketId, current + 1);
    });

    const checkoutTickets: CheckoutRequest['tickets'] = Array.from(ticketMap.entries()).map(
      ([ticketId, quantity]) => ({
        ticketId,
        quantity,
      })
    );

    // Preparar participantes - um para cada ticket
    const checkoutParticipants: CheckoutRequest['participants'] = participantsWithTickets.map(
      ({ participantIndex }) => {
        const participant = participants[participantIndex];
        if (!participant || !participant.name || !participant.cpf || !participant.email) {
          throw new Error(`Dados incompletos do participante ${participantIndex + 1}`);
        }
        if (!isValidCPF(participant.cpf)) {
          throw new Error(`CPF inválido para o participante ${participantIndex + 1}`);
        }

        // Preparar objeto do participante
        const participantData: CheckoutRequest['participants'][0] = {
          name: participant.name,
          cpf: participant.cpf.replace(/\D/g, ''),
          email: participant.email,
          birthDate: participant.birthDate,
          phone: participant.phone?.replace(/\D/g, '') || '',
        };

        // Adicionar gender apenas se mapeado corretamente
        const mappedGender = mapGenderToAPI(participant.gender || '');
        if (mappedGender) {
          participantData.gender = mappedGender;
        }

        // Adicionar campos opcionais apenas se tiverem valor
        if (participant.emergencyContactName?.trim()) {
          participantData.emergencyContactName = participant.emergencyContactName.trim();
        }
        if (participant.emergencyPhone?.trim()) {
          participantData.emergencyPhone = participant.emergencyPhone.replace(/\D/g, '');
        }
        if (participant.hasEmergencyContact) {
          participantData.hasEmergencyContact = participant.hasEmergencyContact;
        }

        // Adicionar questionAnswers se existirem
        if (participant.questionAnswers && Object.keys(participant.questionAnswers).length > 0) {
          participantData.questionAnswers = Object.entries(participant.questionAnswers).map(
            ([questionId, answer]) => ({
              questionId,
              answer: Array.isArray(answer)
                ? JSON.stringify(answer)
                : (answer as string | boolean | number),
            })
          );
        }

        // Adicionar produtos selecionados se existirem
        if (participant.productVariations && productsData?.products) {
          const selectedProducts: Array<{
            productId: string;
            variationId?: string;
            quantity: number;
          }> = [];

          // Iterar sobre as variações selecionadas do participante
          Object.entries(participant.productVariations).forEach(([savedProductId, variationId]) => {
            // Verificar se o produto existe na lista de produtos do evento
            // Suporta tanto ID completo quanto ID parcial (para compatibilidade com dados antigos)
            const product = productsData.products.find((p: any) =>
              p.id === savedProductId ||
              p.id.startsWith(savedProductId) ||
              savedProductId.startsWith(p.id)
            );

            // Se o produto existe e tem uma variação selecionada (não null, undefined ou string vazia)
            if (product && variationId !== null && variationId !== undefined && variationId !== '') {
              selectedProducts.push({
                productId: product.id, // Usar o ID completo do produto
                variationId: variationId,
                quantity: 1, // Por enquanto sempre 1, pode ser ajustado se houver quantidade no futuro
              });
            }
          });

          // Adicionar produtos apenas se houver algum selecionado
          if (selectedProducts.length > 0) {
            participantData.products = selectedProducts;
          }
        }

        return participantData;
      }
    );

    if (checkoutTickets.length === 0 || checkoutParticipants.length === 0) {
      toast.error('Por favor, preencha todos os dados dos participantes');
      return null;
    }

    // Validar que todos os participantes têm dados obrigatórios
    const invalidParticipants = checkoutParticipants.filter(
      (p) => !p.name || !p.cpf || !p.email || !p.birthDate || !p.phone
    );
    if (invalidParticipants.length > 0) {
      toast.error('Por favor, preencha todos os dados obrigatórios dos participantes');
      return null;
    }

    return {
      eventId,
      paymentMethod: selectedPaymentMethod === 'credit' ? 'CREDIT_CARD' : 'PIX',
      payment:
        selectedPaymentMethod === 'credit'
          ? {
            card: {
              name: cardName.toUpperCase().trim(),
              number: cardNumber.replace(/\D/g, ''),
              expiry: cardExpiry.replace(/\s/g, ''), // Remove espaços se houver
              cvv: cardCVV,
              installments: parseInt(selectedInstallments) || 1,
            },
          }
          : {},
      tickets: checkoutTickets,
      participants: checkoutParticipants,
      billingAddress: billingAddressPayload,
      couponCode: isCouponApplied && couponCode ? couponCode : undefined,
      voucherCode: undefined, // TODO: Implementar quando estiver disponível
    };
  };

  // Salvar dados do checkout para a página de sucesso
  const saveCheckoutDataForSuccess = (result: any) => {
    if (typeof window === 'undefined' || !eventId) return;

    const successData = {
      checkoutResponse: result,
      timestamp: Date.now(),
    };

    localStorage.setItem(`checkout_success_${eventId}`, JSON.stringify(successData));
  };

  // Função auxiliar para buscar dados do PIX
  const fetchPixDataFromAPI = async (registrationId: string): Promise<PixPayment | null> => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
    const token = apiClient.getAccessToken();

    if (!token) {
      throw new Error('Você precisa estar autenticado');
    }

    // Tentar buscar os dados do PIX com retry (até 5 tentativas, 2s entre cada)
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/v1/payments/registration/${registrationId}/summary`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Verificar se há dados do PIX no metadata
          if (data.payment?.metadata?.pix) {
            const pixMetadata = data.payment.metadata.pix;

            if (pixMetadata.qrCode && pixMetadata.qrCodeBase64) {
              return {
                qrCode: pixMetadata.qrCode,
                qrCodeBase64: pixMetadata.qrCodeBase64,
                expirationDate: pixMetadata.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              };
            }
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados do PIX:', err);
      }

      // Aguardar antes de tentar novamente (exceto na última tentativa)
      if (attempt < 4) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return null;
  };

  // Processar checkout PIX
  const handleProcessPixCheckout = async () => {
    try {
      const checkoutData = prepareCheckoutData();
      if (!checkoutData) return;

      setPixLoading(true);
      const result = await processCheckout(checkoutData);

      // Salvar dados para a página de sucesso
      saveCheckoutDataForSuccess(result);

      const registrationId = result.registrations[0]?.id || null;
      setRegistrationId(registrationId);

      // Verificar se os dados do PIX vieram na resposta
      let pixData: PixPayment | null = result.payment.pix || null;

      // Se não vieram, tentar buscar do endpoint de summary
      if (!pixData && registrationId) {
        const loadingToast = toast.loading('Gerando QR Code PIX...', { id: 'pix-loading' });

        pixData = await fetchPixDataFromAPI(registrationId);

        toast.dismiss('pix-loading');
      }

      if (pixData) {
        setPixData(pixData);
        setIsPixModalOpen(true);
      } else {
        toast.error('Erro ao gerar QR Code PIX. Aguarde alguns instantes e tente novamente.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar checkout PIX');
    } finally {
      setPixLoading(false);
    }
  };

  // Processar checkout Cartão de Crédito
  const handleProcessCreditCardCheckout = async () => {
    // Validar dados do cartão
    const newCardErrors: CardErrors = {};

    if (!cardName?.trim()) {
      newCardErrors.cardName = 'Informe o nome impresso no cartão.';
    }
    if (!cardNumber) {
      newCardErrors.cardNumber = 'Informe o número do cartão.';
    } else if (!validateCardNumber(cardNumber)) {
      newCardErrors.cardNumber = 'Número do cartão inválido.';
    }
    if (!cardExpiry) {
      newCardErrors.cardExpiry = 'Informe a data de validade.';
    } else if (!validateExpiry(cardExpiry)) {
      newCardErrors.cardExpiry = 'Cartão expirado ou data inválida.';
    }
    if (!cardCVV) {
      newCardErrors.cardCVV = 'Informe o CVV.';
    } else if (!validateCVV(cardCVV)) {
      newCardErrors.cardCVV = 'CVV inválido.';
    }

    if (Object.keys(newCardErrors).length > 0) {
      setCardErrors(newCardErrors);
      toast.error('Por favor, corrija os campos do cartão.');
      return;
    }

    setCardErrors({});

    try {
      const checkoutData = prepareCheckoutData();
      if (!checkoutData) return;

      const result = await processCheckout(checkoutData);

      if (result.payment.status === 'approved') {
        // Salvar dados para a página de sucesso
        saveCheckoutDataForSuccess(result);

        toast.success('Pagamento aprovado!');
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.error('Pagamento não aprovado. Tente novamente.');
      }
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar pagamento');
    }
  };

  const pixValue = calculatePixValue();
  const additionalProductsCount = orderItems.length;

  const [isParticipantsModalOpen, setIsParticipantsModalOpen] = useState(false);
  const [isModalAnimating, setIsModalAnimating] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<
    Record<number, boolean>
  >({});

  // Participant Summary Modal state
  const [isParticipantSummaryModalOpen, setIsParticipantSummaryModalOpen] = useState(false);
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);

  // Handler for opening participant summary modal
  const handleParticipantClick = (participantIndex: number) => {
    setSelectedParticipantIndex(participantIndex);
    setIsParticipantSummaryModalOpen(true);
  };

  const openModal = () => {
    setIsParticipantsModalOpen(true);
    // Trigger animation after modal is mounted
    setTimeout(() => {
      setIsModalAnimating(true);
    }, 10);
  };

  const closeModal = () => {
    setIsModalAnimating(false);
    setTimeout(() => {
      setIsParticipantsModalOpen(false);
    }, 300);
  };

  // Generate participants with tickets dynamically
  const participantsWithTicketsForDisplay = useMemo(() => {
    const result: Array<{
      participantIndex: number;
      participant: (typeof participants)[0];
      ticket: Ticket;
      additionalProducts?: Array<{
        name: string;
        price: number;
        quantity: number;
        size?: string;
        image?: string;
      }>;
    }> = [];

    participantsWithTickets.forEach(({ ticket, participantIndex }) => {
      const participant = participants[participantIndex];
      if (participant) {
        // Obter produtos do participante
        const products = getParticipantProducts(participantIndex);

        result.push({
          participantIndex,
          participant,
          ticket,
          additionalProducts: products.length > 0 ? products.map(p => ({
            ...p,
            image: undefined, // Pode ser adicionado se necessário
          })) : undefined,
        });
      }
    });

    return result;
  }, [participantsWithTickets, participants, productsData]);

  // Generate participant data for the modal
  const participantModalData = useMemo(() => {
    return participantsWithTicketsForDisplay.map(({ participantIndex, participant, ticket }) => ({
      participantIndex,
      participant: {
        name: participant.name || "",
        cpf: participant.cpf || "",
        email: participant.email || "",
        birthDate: participant.birthDate || "",
        phone: participant.phone || "",
        gender: participant.gender,
        emergencyPhone: participant.emergencyPhone,
        emergencyContactName: participant.emergencyContactName,
        productVariations: participant.productVariations,
      },
      ticket,
      event: {
        bannerUrl: event.bannerUrl,
        name: event.name,
        eventDate: event.eventDate,
        eventTime: undefined, // Can be added if available in event data
      },
    }));
  }, [participantsWithTicketsForDisplay, event]);

  const formatDateShort = (date: string) => {
    if (!date) return "";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const maskCPF = (cpf: string) => {
    if (!cpf) return "";
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.***.***-$4");
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="w-full md:hidden flex flex-col pb-24">
        {/* Instructional Text */}
        <div className="pb-6">
          <p className="text-sm text-gray-11 font-family-dm-sans">
            {billingAddressConfirmed
              ? "Escolha cartão ou Pix para concluir. Os ingressos são liberados após aprovação."
              : "Informe e confirme o endereço de cobrança para escolher a forma de pagamento."}
          </p>
        </div>

        {!billingAddressConfirmed ? (
          <CheckoutAddressSection
            values={billingAddress}
            onChange={(patch) =>
              setBillingAddress((prev) => ({ ...prev, ...patch }))
            }
            onConfirmedChange={setBillingAddressConfirmed}
            className="mb-6"
          />
        ) : (
          <BillingAddressConfirmedSummary
            address={billingAddress}
            onEdit={() => setBillingAddressConfirmed(false)}
            className="mb-6"
          />
        )}

        {/* Payment Methods + cupom (só após endereço confirmado) */}
        {billingAddressConfirmed ? (
          <>
            <div className="pb-6 flex flex-col gap-3">
              {/* Credit Card Option */}
              <div
                className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === "credit"
                  ? "border-blue-8 bg-blue-3"
                  : "border-gray-6 bg-gray-3"
                  }`}
                onClick={() => setSelectedPaymentMethod("credit")}
              >
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full size-4 border-[1.5px] flex items-center justify-center ${selectedPaymentMethod === "credit"
                        ? "bg-primary-11 border-primary-11"
                        : "bg-transparent border-gray-6"
                        }`}
                    ></div>
                    <span className="text-base font-semibold text-primary-12 font-manrope">
                      Cartão de crédito
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                      <VisaIcon />
                    </div>
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                      <EloIcon />
                    </div>
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                      <Image
                        src="/images/american_express.png"
                        alt="American Express"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                      <MasterCardIcon />
                    </div>
                  </div>
                </div>

                {selectedPaymentMethod === "credit" && (
                  <div className="mt-4">
                    <CreditCardForm
                      installmentOptions={installmentOptions}
                      selectedInstallments={selectedInstallments}
                      setSelectedInstallments={setSelectedInstallments}
                      onSuccess={onSuccess}
                      cardName={cardName}
                      setCardName={handleSetCardName}
                      cardNumber={cardNumber}
                      setCardNumber={handleSetCardNumber}
                      cardExpiry={cardExpiry}
                      setCardExpiry={handleSetCardExpiry}
                      cardCVV={cardCVV}
                      setCardCVV={handleSetCardCVV}
                      isMobile={true}
                      errors={cardErrors}
                    />
                    <Button
                      onClick={handleProcessCreditCardCheckout}
                      disabled={checkoutLoading || !billingAddressConfirmed}
                      className="w-full mt-4 bg-gray-12 text-gray-1 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkoutLoading ? 'Processando...' : 'Finalizar compra'}
                    </Button>
                  </div>
                )}
              </div>

              {/* PIX Option */}
              <div
                className={`border rounded-lg p-4 transition-colors ${selectedPaymentMethod === "pix"
                  ? "border-blue-8 bg-blue-3"
                  : "border-gray-6 bg-gray-3"
                  }`}
                onClick={() => setSelectedPaymentMethod("pix")}
              >
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full size-4 border-[1.5px] flex items-center justify-center ${selectedPaymentMethod === "pix"
                        ? "bg-primary-11 border-primary-11"
                        : "bg-transparent border-gray-6"
                        }`}
                    ></div>
                    <span className="text-base font-semibold text-gray-12 font-manrope">
                      PIX
                    </span>
                  </div>
                </div>

                {selectedPaymentMethod === "pix" && (
                  <div className="mt-4 flex flex-col gap-4">
                    <PixForm
                      onSuccess={onSuccess}
                      pixValue={pixValue}
                      isMobile={true}
                      onProcessCheckout={handleProcessPixCheckout}
                      loading={checkoutLoading}
                      submitDisabled={!billingAddressConfirmed}
                    />
                    <Button
                      onClick={handleProcessPixCheckout}
                      disabled={checkoutLoading || !billingAddressConfirmed}
                      className="w-full bg-gray-12 text-gray-1 font-bold font-manrope"
                    >
                      {checkoutLoading ? 'Processando...' : 'Gerar QR CODE'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Coupon Section */}
            <div className="pt-6 border-t border-gray-8">
              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="Código de cupom (opcional)"
                  value={couponCode}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").substring(0, 6);
                    setCouponCode(value);
                    setCouponError(null);
                    if (isCouponApplied) {
                      setIsCouponApplied(false);
                      setCouponDiscount(0);
                    }
                  }}
                  maxLength={6}
                  inputMode="numeric"
                  className={
                    couponError
                      ? "border-red-6"
                      : isCouponApplied
                        ? "border-primary-8 bg-primary-3"
                        : ""
                  }
                />
                {couponError && (
                  <p className="text-base font-medium text-red-11 font-family-dm-sans">
                    {couponError}
                  </p>
                )}
                {isCouponApplied && (
                  <p className="text-base font-medium text-primary-11 font-family-dm-sans">
                    Cupom aplicado com sucesso!
                  </p>
                )}
                {!isCouponApplied && (
                  <Button
                    onClick={handleApplyCoupon}
                    className="w-full bg-primary-11 text-primary-2 font-bold font-manrope"
                  >
                    Aplicar cupom
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Mobile Footer Summary - Always Visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        {/* Toggle Button */}
        <div
          className="bg-gray-2 place-self-end w-1/3 border-t border-l border-r border-gray-6 rounded-tl-xl py-2 cursor-pointer transition-transform active:scale-95"
          onClick={openModal}
        >
          <p className="text-sm font-medium text-gray-11 text-center font-family-dm-sans">
            Mostrar resumo
          </p>
        </div>

        {/* Summary Content - Always Visible */}
        <div className="bg-gray-1 border-t border-gray-6 px-4 py-5">
          <div className="flex flex-col gap-2 items-start justify-between mb-4">
            <h1 className="text-base font-bold">{event.name}</h1>
            <div className="flex gap-1 items-center">
              <p className="text-sm text-gray-12 font-family-dm-sans">
                Participantes:
              </p>
              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                {totalParticipants}
              </p>
            </div>

            {groupedTickets.map((ticket, index) => (
              <div key={index} className="flex gap-1 items-center">
                <p className="text-sm text-gray-12 font-family-dm-sans">
                  ({ticket.quantity}x) {ticket.distance} {ticket.raceName}:
                </p>
                <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                  {formatPrice(ticket.total)}
                </p>
              </div>
            ))}

            {additionalProductsCount > 0 && (
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-12 font-family-dm-sans">
                  Produtos adicionais:
                </p>
                <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                  {additionalProductsCount}
                </p>
              </div>
            )}
            <div className="flex gap-1 items-center">
              <p className="text-sm text-gray-12 font-family-dm-sans">
                Taxa de serviço:
              </p>
              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                {formatPrice(serviceFee)}
              </p>
            </div>
            {isCouponApplied && couponDiscount > 0 && (
              <div className="flex gap-1 items-center">
                <p className="text-sm text-gray-12 font-family-dm-sans">Cupom:</p>
                <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                  -{formatPrice(couponDiscount)}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex gap-1 items-center">
              <p className="text-base text-gray-12 font-family-dm-sans">Total:</p>
              <p className="text-base font-bold text-gray-12 font-manrope">
                {formatPrice(totalValue)}
              </p>
            </div>
            <Button
              onClick={() => {
                if (selectedPaymentMethod === "credit") {
                  handleProcessCreditCardCheckout();
                } else if (selectedPaymentMethod === "pix") {
                  handleProcessPixCheckout();
                }
              }}
              disabled={
                totalParticipants === 0 ||
                checkoutLoading ||
                !billingAddressConfirmed
              }
              className="font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {checkoutLoading ? 'Processando...' : 'Finalizar compra'}
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex w-full items-start justify-between gap-11">
        <div className="max-w-2/3 w-full">
          <div className="flex flex-col gap-6">
            {/* Cabeçalho */}
            <div className="w-full">
              <div className="flex items-center gap-3 mb-2">
                <button
                  className="cursor-pointer rotate-180 size-8 flex items-center justify-center rounded-full border border-gray-6 hover:bg-gray-2 transition-colors"
                  onClick={onBack}
                >
                  <ArrowButton isOpen={false} />
                </button>
                <h1 className="text-[28px] font-bold text-gray-12 font-manrope leading-[1.1]">
                  Pagamento
                </h1>
              </div>
              <p className="text-base text-gray-11 font-family-dm-sans leading-[1.3]">
                {billingAddressConfirmed
                  ? "Escolha cartão ou Pix para concluir. Os ingressos são liberados após aprovação."
                  : "Informe e confirme o endereço de cobrança para escolher a forma de pagamento."}
              </p>
            </div>

            {!billingAddressConfirmed ? (
              <CheckoutAddressSection
                values={billingAddress}
                onChange={(patch) =>
                  setBillingAddress((prev) => ({ ...prev, ...patch }))
                }
                onConfirmedChange={setBillingAddressConfirmed}
              />
            ) : (
              <BillingAddressConfirmedSummary
                address={billingAddress}
                onEdit={() => setBillingAddressConfirmed(false)}
              />
            )}

            {/* Métodos de Pagamento */}
            {billingAddressConfirmed ? (
              <div className="space-y-6">
                {paymentOptions.map((option) => {
                  const isNotSelected = selectedPaymentMethod !== option.id;

                  if (isNotSelected) {
                    return (
                      <PaymentMethodOption
                        key={option.id}
                        option={option}
                        isSelected={false}
                        onSelect={() => setSelectedPaymentMethod(option.id)}
                      />
                    );
                  }

                  return (
                    <div key={option.id}>
                      <PaymentMethodOption
                        option={option}
                        isSelected={true}
                        onSelect={() => setSelectedPaymentMethod(option.id)}
                      />

                      <div className="mt-4">
                        {option.id === "credit" && (
                          <>
                            <CreditCardForm
                              installmentOptions={installmentOptions}
                              selectedInstallments={selectedInstallments}
                              setSelectedInstallments={setSelectedInstallments}
                              onSuccess={onSuccess}
                              cardName={cardName}
                              setCardName={handleSetCardName}
                              cardNumber={cardNumber}
                              setCardNumber={handleSetCardNumber}
                              cardExpiry={cardExpiry}
                              setCardExpiry={handleSetCardExpiry}
                              cardCVV={cardCVV}
                              setCardCVV={handleSetCardCVV}
                              isMobile={false}
                              errors={cardErrors}
                            />
                            <Button
                              onClick={handleProcessCreditCardCheckout}
                              disabled={checkoutLoading}
                              className="w-full mt-4 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {checkoutLoading ? 'Processando...' : 'Finalizar compra'}
                            </Button>
                          </>
                        )}
                        {option.id === "pix" && (
                          <PixForm
                            onSuccess={onSuccess}
                            pixValue={pixValue}
                            isMobile={false}
                            onProcessCheckout={handleProcessPixCheckout}
                            loading={checkoutLoading}
                            submitDisabled={!billingAddressConfirmed}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>

        {/* Coluna Direita - Resumo do Pedido */}
        <div className="max-w-1/3 w-full">
          <OrderSummary
            items={orderItems}
            groupedTickets={groupedTickets}
            serviceFee={serviceFee}
            total={totalValue}
            couponCode={couponCode}
            couponDiscount={couponDiscount}
            couponError={couponError}
            isCouponApplied={isCouponApplied}
            onApplyCoupon={handleApplyCoupon}
            onCouponChange={(code) => {
              setCouponCode(code);
              setCouponError(null);
              if (isCouponApplied) {
                setIsCouponApplied(false);
                setCouponDiscount(0);
              }
            }}
            participantsData={participantsData}
            onParticipantClick={handleParticipantClick}
          />
        </div>
      </div>

      {/* Participants Summary Modal */}
      {isParticipantsModalOpen && (
        <>
          {/* Backdrop */}
          <div
            className={`fixed inset-0 z-50 bg-black/90 md:hidden transition-opacity duration-300 ease-out ${isModalAnimating ? "opacity-100" : "opacity-0"
              }`}
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div
            className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-xl max-h-[90vh] flex flex-col md:hidden transition-transform duration-300 ease-out ${isModalAnimating ? "translate-y-0" : "translate-y-full"
              }`}
          >
            {/* Close Button */}
            <div className="bg-gray-2 w-1/3 place-self-end border-t border-l border-r border-gray-6 rounded-tl-xl px-4 py-2 flex items-center justify-center shrink-0">
              <button
                onClick={closeModal}
                className="text-sm font-medium text-gray-11 font-family-dm-sans transition-colors hover:text-gray-12 active:scale-95"
              >
                Fechar resumo
              </button>
            </div>

            {/* Scrollable Content */}
            <div
              className={`flex-1 overflow-y-auto transition-opacity duration-300 ${isModalAnimating ? "opacity-100" : "opacity-0"
                }`}
            >
              <div className="bg-gray-1">
                {/* Participants List */}
                <div className="px-4 flex flex-col">
                  {participantsWithTicketsForDisplay.map(
                    (
                      {
                        participantIndex,
                        participant,
                        ticket,
                        additionalProducts,
                      },
                      index
                    ) => (
                      <div
                        key={participantIndex}
                        className={`py-5 transition-all duration-300 ease-out ${index > 0 ? "border-t border-gray-6" : ""
                          } ${isModalAnimating
                            ? "opacity-100 translate-y-0"
                            : "opacity-0 translate-y-4"
                          }`}
                        style={{
                          transitionDelay: `${index * 50}ms`,
                        }}
                      >
                        <p className="text-base font-semibold text-gray-12 mb-5 font-family-dm-sans">
                          Participantes {participantIndex + 1}
                        </p>

                        {/* Participant Card */}
                        <div className="border border-gray-6 rounded-xl p-2 mb-4 w-full">
                          <div className="flex items-center gap-2">
                            <div className="size-10 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden relative">
                              {participant.name ? (
                                <span className="text-sm font-bold text-gray-12">
                                  {participant.name.charAt(0).toUpperCase()}
                                </span>
                              ) : (
                                <ImageWithInitialFallback
                                  src={event.bannerUrl}
                                  alt={event.name}
                                  name={event.name}
                                  fallbackId={event.id}
                                  fill
                                  sizes="40px"
                                  className="size-full"
                                  imgClassName="object-cover"
                                  letterClassName="text-sm font-bold"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                                {participant.name ||
                                  `Participante ${participantIndex + 1}`}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-gray-11 font-family-dm-sans">
                                {participant.birthDate && (
                                  <>
                                    {formatDateShort(participant.birthDate)}
                                    <span className="size-1 bg-gray-11 rounded-full" />
                                  </>
                                )}
                                {participant.gender && (
                                  <>
                                    {participant.gender}
                                    {participant.cpf && (
                                      <span className="size-1 bg-gray-11 rounded-full" />
                                    )}
                                  </>
                                )}
                                {participant.cpf && maskCPF(participant.cpf)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Ticket Info */}
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-base font-medium text-gray-12 font-family-dm-sans">
                            {ticket.name}
                          </p>
                          <p className="text-base font-bold text-gray-12 font-manrope">
                            {formatPrice(getTicketPrice(ticket))}
                          </p>
                        </div>

                        {/* Additional Products Summary */}
                        {additionalProducts &&
                          additionalProducts.length > 0 && (
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-base font-semibold text-gray-12 font-manrope">
                                {additionalProducts.length}x Itens adicionais:
                              </p>
                              <p className="text-base font-bold text-gray-12 font-manrope">
                                {formatPrice(
                                  additionalProducts.reduce(
                                    (sum, item) =>
                                      sum + item.price * item.quantity,
                                    0
                                  )
                                )}
                              </p>
                            </div>
                          )}

                        {/* Action Buttons */}
                        {additionalProducts &&
                          additionalProducts.length > 0 && (
                            <div className="flex gap-2 items-center mb-4">
                              <button
                                type="button"
                                title="Deletar"
                                className="bg-red-2 border-[1.5px] border-red-6 rounded-lg size-9 flex items-center justify-center"
                                onClick={() => {
                                  // Handle delete
                                }}
                              >
                                <TrashIcon className="size-6 text-red-11" />
                              </button>
                              <button
                                type="button"
                                title="Editar"
                                className="bg-gray-2 border-[1.5px] border-gray-6 rounded-lg size-9 flex items-center justify-center"
                                onClick={() => {
                                  // Handle edit
                                }}
                              >
                                <PencilIcon className="size-6 text-gray-12" />
                              </button>
                            </div>
                          )}

                        {/* Expanded Additional Products */}
                        {expandedProducts[participantIndex] &&
                          additionalProducts &&
                          additionalProducts.length > 0 && (
                            <div className="mb-4">
                              {additionalProducts.map(
                                (product, productIndex) => (
                                  <div
                                    key={productIndex}
                                    className="bg-gray-2 border border-gray-6 rounded-xl mb-3"
                                  >
                                    {/* Product Header */}
                                    <div className="flex gap-3 p-4 border-b border-gray-6">
                                      <div className="size-[100px] rounded-lg border border-gray-6 overflow-hidden shrink-0 relative">
                                        <ImageWithInitialFallback
                                          src={product.image}
                                          alt={product.name}
                                          name={product.name}
                                          fallbackId={String(productIndex)}
                                          fill
                                          sizes="100px"
                                          className="size-full"
                                          letterClassName="text-2xl font-semibold"
                                        />
                                      </div>
                                      <div className="flex flex-col justify-between flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2">
                                          {product.name}
                                        </p>
                                        <p className="text-base font-semibold text-gray-12 font-manrope">
                                          {formatPrice(product.price)}
                                        </p>
                                      </div>
                                    </div>
                                    {/* Product Size */}
                                    <div className="p-4">
                                      <div className="flex gap-1 items-center">
                                        <p className="text-base text-gray-12 font-family-dm-sans">
                                          Tamanho:
                                        </p>
                                        <p className="text-base font-semibold text-gray-12 font-manrope">
                                          {product.size || "N/A"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          )}

                        {/* Show More/Less Button */}
                        {additionalProducts &&
                          additionalProducts.length > 0 && (
                            <button
                              onClick={() => {
                                setExpandedProducts((prev) => ({
                                  ...prev,
                                  [participantIndex]: !prev[participantIndex],
                                }));
                              }}
                              className="text-base font-medium text-gray-11 font-family-dm-sans underline mb-4"
                            >
                              {expandedProducts[participantIndex]
                                ? "Mostrar menos"
                                : "Mostrar mais"}
                            </button>
                          )}

                        {/* Participant Total */}
                        <div className="flex items-center justify-end">
                          <p className="text-base font-bold text-gray-12 font-manrope">
                            {formatPrice(
                              getTicketPrice(ticket) +
                              (additionalProducts?.reduce(
                                (sum, item) =>
                                  sum + item.price * item.quantity,
                                0
                              ) || 0)
                            )}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Summary Footer - Fixed */}
              <div
                className={`bg-gray-1 border-t border-gray-6 px-4 py-5 shrink-0 transition-opacity duration-300 delay-200 ${isModalAnimating ? "opacity-100" : "opacity-0"
                  }`}
              >
                <div className="flex flex-col gap-2 items-start justify-between mb-4">
                  <h1 className="text-base font-bold">{event.name}</h1>
                  <div className="flex gap-1 items-center">
                    <p className="text-sm text-gray-12 font-family-dm-sans">
                      Participantes:
                    </p>
                    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                      {totalParticipants}
                    </p>
                  </div>

                  {groupedTickets.map((ticket, index) => (
                    <div key={index} className="flex gap-1 items-center">
                      <p className="text-sm text-gray-12 font-family-dm-sans">
                        ({ticket.quantity}x) {ticket.distance} {ticket.raceName}:
                      </p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                        {formatPrice(ticket.total)}
                      </p>
                    </div>
                  ))}

                  {additionalProductsCount > 0 && (
                    <div className="flex gap-1 items-center">
                      <p className="text-sm text-gray-12 font-family-dm-sans">
                        Produtos adicionais:
                      </p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                        {additionalProductsCount}
                      </p>
                    </div>
                  )}
                  <div className="flex gap-1 items-center">
                    <p className="text-sm text-gray-12 font-family-dm-sans">
                      Taxa de serviço:
                    </p>
                    <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                      {formatPrice(serviceFee)}
                    </p>
                  </div>
                  {isCouponApplied && couponDiscount > 0 && (
                    <div className="flex gap-1 items-center">
                      <p className="text-sm text-gray-12 font-family-dm-sans">
                        Cupom:
                      </p>
                      <p className="text-sm font-semibold text-gray-12 font-family-dm-sans">
                        -{formatPrice(couponDiscount)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1 items-center">
                    <p className="text-base text-gray-12 font-family-dm-sans">
                      Total:
                    </p>
                    <p className="text-base font-bold text-gray-12 font-manrope">
                      {formatPrice(totalValue)}
                    </p>
                  </div>
                  <Button
                    onClick={() => {
                      closeModal();
                      if (selectedPaymentMethod === "credit") {
                        handleProcessCreditCardCheckout();
                      } else if (selectedPaymentMethod === "pix") {
                        handleProcessPixCheckout();
                      }
                    }}
                    disabled={
                      totalParticipants === 0 ||
                      checkoutLoading ||
                      !billingAddressConfirmed
                    }
                    className="bg-primary-11 text-primary-2 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {checkoutLoading ? 'Processando...' : 'Finalizar compra'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* PIX Modal */}
      <PixModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        pixData={pixData}
        registrationId={registrationId}
        onPaymentConfirmed={() => {
          setIsPixModalOpen(false);
          if (onSuccess) {
            onSuccess();
          }
        }}
      />

      {/* Participant Summary Modal */}
      <ParticipantSummaryModal
        isOpen={isParticipantSummaryModalOpen}
        onClose={() => setIsParticipantSummaryModalOpen(false)}
        participants={participantModalData}
        initialParticipantIndex={selectedParticipantIndex}
        products={productsData?.products || []}
        productsMap={productsMap}
      />
    </>
  );
}
