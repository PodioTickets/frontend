"use client";

import { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { io, Socket } from "socket.io-client";
import { useThreeDS, ThreeDSError } from "@/hooks/useThreeDS";
import { OrderSummary } from "./OrderSummary";
import { ParticipantSummaryModal } from "./ParticipantSummaryModal";
import {
  CheckoutAddressSection,
  initialBillingAddress,
  type CheckoutBillingAddress,
} from "./CheckoutAddressSection";
import { getPostalCodeConfig } from "@/utils/postalCode";
import { MobileSummaryBar, SummaryRow } from "./MobileSummaryBar";
import { formatDocumentDisplay, isPersonBr } from "@/utils/documentDisplay";
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
import { ProductCardGallery } from "./ProductCardGallery";
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
import {
  useCheckoutReservation,
  generateIdempotencyKey,
} from "@/hooks/useCheckoutReservation";
import { useCheckoutTimer } from "@/contexts/CheckoutTimerContext";
import {
  OrderApiError,
  type OrderPixInfo,
  type OrderResponse,
  type PatchBillingAddressRequest,
  type PayOrderRequest,
  type PayOrderDebitCardRequest,
} from "@/interfaces/order";

const COUPON_ERROR_MESSAGES: Record<string, string> = {
  COUPON_NOT_FOUND: "Cupom inválido ou não encontrado.",
  COUPON_EXPIRED: "Cupom expirado.",
  COUPON_MIN_VALUE: "Pedido abaixo do valor mínimo do cupom.",
  VOUCHER_NOT_FOUND: "Voucher inválido ou não encontrado.",
  VOUCHER_EXPIRED: "Voucher expirado.",
  DISCOUNT_CONFLICT: "Cupom e voucher não podem ser usados juntos.",
};
import { validateCardNumber, validateExpiry, validateCVV, getCardBrand } from "@/utils/cardValidation";
import { isValidCPF } from "@/utils/cpf";
import { getPendingCoupon, getPendingCouponKind } from "@/hooks/usePendingCoupon";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import toast from "react-hot-toast";
import { CheckoutCardErrorModal } from "./CheckoutCardErrorModal";
import { Checkbox } from "@/components/CheckBox";
import { useAuth } from "@/hooks/useAuth";

interface PaymentStepProps {
  event: Event;
  onBack: () => void;
  onSuccess?: (orderId: string) => void;
}

type PaymentMethod = "credit" | "debit" | "pix" | "boleto";

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

const CreditCardForm = memo(function CreditCardForm({
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
  onSuccess?: (orderId: string) => void;
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
});

const DebitCardForm = memo(function DebitCardForm({
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
    return parts.length ? parts.join(" ") : v;
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\D/g, "");
    if (v.length >= 2) return v.substring(0, 2) + "/" + v.substring(2, 4);
    return v;
  };

  const isAmex = cardNumber ? getCardBrand(cardNumber) === "AMEX" : false;
  const cvvMaxLength = isAmex ? 4 : 3;

  return (
    <div className={`${isMobile ? "flex flex-col gap-4" : "space-y-4"}`}>
      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-family-dm-sans">
          Nome impresso no cartão
        </label>
        <Input
          type="text"
          value={cardName || ""}
          onChange={(e) => setCardName && setCardName(e.target.value)}
          className="bg-gray-2"
          placeholder="Ex: João Ribeiro"
          aria-invalid={!!errors?.cardName}
        />
        {errors?.cardName && <p className="text-sm text-red-11">{errors.cardName}</p>}
      </div>

      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-family-dm-sans">
          Número do cartão
        </label>
        <Input
          type="text"
          value={cardNumber || ""}
          onChange={(e) => setCardNumber && setCardNumber(formatCardNumber(e.target.value))}
          className="bg-gray-2"
          maxLength={19}
          placeholder="Ex: 5400 7975 6026 4737"
          aria-invalid={!!errors?.cardNumber}
        />
        {errors?.cardNumber && <p className="text-sm text-red-11">{errors.cardNumber}</p>}
      </div>

      <div className={`flex ${isMobile ? "flex-col gap-4" : "justify-between gap-4"} w-full`}>
        <div className={`${isMobile ? "w-full" : "flex-1"} flex flex-col gap-2`}>
          <label className="text-base text-gray-12 font-family-dm-sans">
            Data de validade
          </label>
          <Input
            type="text"
            value={cardExpiry || ""}
            onChange={(e) => setCardExpiry && setCardExpiry(formatExpiry(e.target.value))}
            className="bg-gray-2"
            maxLength={5}
            placeholder="MM/AA"
            aria-invalid={!!errors?.cardExpiry}
          />
          {errors?.cardExpiry && <p className="text-sm text-red-11">{errors.cardExpiry}</p>}
        </div>
        <div className={`${isMobile ? "w-full" : "flex-1"} flex flex-col gap-2`}>
          <div className="flex items-center gap-2">
            <label className="text-base text-gray-12 font-family-dm-sans">CVV</label>
            <Tooltip
              content={<CVVTooltip />}
              position="topRight"
              trigger="hover"
              className="cursor-help"
            >
              <button type="button" className="text-gray-11 hover:text-gray-12 transition-colors">
                <HelpIcon className="size-4" />
              </button>
            </Tooltip>
          </div>
          <Input
            type="text"
            value={cardCVV || ""}
            onChange={(e) => setCardCVV && setCardCVV(e.target.value.replace(/\D/g, "").substring(0, cvvMaxLength))}
            maxLength={cvvMaxLength}
            className="bg-gray-2"
            placeholder={isAmex ? "4 dígitos" : "3 dígitos"}
            aria-invalid={!!errors?.cardCVV}
          />
          {errors?.cardCVV && <p className="text-sm text-red-11">{errors.cardCVV}</p>}
        </div>
      </div>
    </div>
  );
});

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

function PixModal({
  isOpen,
  onClose,
  pixData,
  orderId,
  onPaymentConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  pixData: OrderPixInfo | null;
  orderId: string | null;
  onPaymentConfirmed?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const expirationDate = pixData ? new Date(pixData.expiresAt) : null;
  const [status, setStatus] = useState<"PENDING" | "PAID" | "CANCELLED" | null>(null);

  // Refs estáveis — nunca mudam de referência, evitam re-execução dos effects
  const confirmedRef = useRef(false);
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed);
  onPaymentConfirmedRef.current = onPaymentConfirmed;

  // Callback estável (deps vazias) — lê o callback atual via ref
  const handleConfirmed = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    setStatus("PAID");
    toast.success("Pagamento confirmado!");
    onPaymentConfirmedRef.current?.();
  }, []);

  // WebSocket — canal primário; só roda quando isOpen/orderId mudam
  useEffect(() => {
    if (!isOpen || !orderId || !API_URL) return;

    const socket: Socket = io(`${API_URL}/payments`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("subscribe:order", { orderId });
    });

    socket.on("payment:confirmed", (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId && data.status === "PAID") {
        handleConfirmed();
      }
    });

    socket.on("connect_error", () => {
      // polling continua como fallback — não fatal
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, orderId]); // eslint-disable-line react-hooks/exhaustive-deps


  // Countdown baseado no expiresAt vindo do servidor
  useEffect(() => {
    if (!isOpen || !expirationDate) return;

    const updateTimeLeft = () => {
      const diff = Math.max(0, Math.floor((expirationDate.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) onClose();
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [isOpen, expirationDate, onClose]);

  // Reset ao fechar/abrir
  useEffect(() => {
    if (isOpen) {
      confirmedRef.current = false;
      setStatus(null);
    }
  }, [isOpen]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const copyPixCode = () => {
    const code = pixData?.pixCode ?? pixData?.qrCode;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Código PIX copiado!");
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
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
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
  onSuccess?: (orderId: string) => void;
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
          isLoading={loading}
          className="w-full font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Finalizar compra
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
          {address.neighborhood?.trim() ? `${address.neighborhood} — ` : ""}
          {address.city}
          {address.stateUf ? `/${address.stateUf}` : ""}
        </p>
        <p className="text-gray-11">
          {address.country?.trim() && address.country !== "Brasil"
            ? `Código postal ${address.cep} · ${address.country}`
            : `CEP ${address.cep}`}
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
  const [cardErrorModalOpen, setCardErrorModalOpen] = useState(false);

  // Identidade estável + bailout quando não há erro a limpar — preserva memo() de CreditCardForm.
  const handleSetCardName = useCallback((v: string) => {
    setCardName(v);
    setCardErrors((p) => {
      if (!p.cardName) return p;
      const n = { ...p }; delete n.cardName; return n;
    });
  }, []);
  const handleSetCardNumber = useCallback((v: string) => {
    setCardNumber(v);
    setCardErrors((p) => {
      if (!p.cardNumber) return p;
      const n = { ...p }; delete n.cardNumber; return n;
    });
  }, []);
  const handleSetCardExpiry = useCallback((v: string) => {
    setCardExpiry(v);
    setCardErrors((p) => {
      if (!p.cardExpiry) return p;
      const n = { ...p }; delete n.cardExpiry; return n;
    });
  }, []);
  const handleSetCardCVV = useCallback((v: string) => {
    setCardCVV(v);
    setCardErrors((p) => {
      if (!p.cardCVV) return p;
      const n = { ...p }; delete n.cardCVV; return n;
    });
  }, []);

  // Order state from server (authoritative for pricing, coupon, voucher)
  const [currentOrder, setCurrentOrder] = useState<OrderResponse | null>(null);
  const orderFetchedRef = useRef(false);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  // Debit card states
  const [debitCardName, setDebitCardName] = useState("");
  const [debitCardNumber, setDebitCardNumber] = useState("");
  const [debitCardExpiry, setDebitCardExpiry] = useState("");
  const [debitCardCVV, setDebitCardCVV] = useState("");
  const [debitCardErrors, setDebitCardErrors] = useState<CardErrors>({});
  const threeDS = useThreeDS();
  const [debitLoading, setDebitLoading] = useState(false);

  // Idem para débito — identidade estável + bailout para preservar memo() de DebitCardForm.
  const handleSetDebitCardName = useCallback((v: string) => {
    setDebitCardName(v);
    setDebitCardErrors((p) => {
      if (!p.cardName) return p;
      const n = { ...p }; delete n.cardName; return n;
    });
  }, []);
  const handleSetDebitCardNumber = useCallback((v: string) => {
    setDebitCardNumber(v);
    setDebitCardErrors((p) => {
      if (!p.cardNumber) return p;
      const n = { ...p }; delete n.cardNumber; return n;
    });
  }, []);
  const handleSetDebitCardExpiry = useCallback((v: string) => {
    setDebitCardExpiry(v);
    setDebitCardErrors((p) => {
      if (!p.cardExpiry) return p;
      const n = { ...p }; delete n.cardExpiry; return n;
    });
  }, []);
  const handleSetDebitCardCVV = useCallback((v: string) => {
    setDebitCardCVV(v);
    setDebitCardErrors((p) => {
      if (!p.cardCVV) return p;
      const n = { ...p }; delete n.cardCVV; return n;
    });
  }, []);

  // PIX states
  const [isPixModalOpen, setIsPixModalOpen] = useState(false);
  const [pixData, setPixData] = useState<OrderPixInfo | null>(null);
  const [pixLoading, setPixLoading] = useState(false);

  const [billingAddress, setBillingAddress] = useState<CheckoutBillingAddress>(
    () => initialBillingAddress()
  );
  const [billingAddressConfirmed, setBillingAddressConfirmed] = useState(false);
  const [billingAddressSaving, setBillingAddressSaving] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutLoadingRef = useRef(false);

  const { participants, raceQuantities } = useCheckout();
  const { user: authUser } = useAuth();
  const eventId = event?.id;
  const { orderId, syncFromOrder, clearTimer, pauseVisibilityRefresh, resumeVisibilityRefresh } = useCheckoutTimer();
  const {
    getOrder,
    patchBillingAddress,
    patchCoupon,
    payOrder,
  } = useCheckoutReservation();

  /**
   * Pré-preenche o endereço de cobrança a partir da conta logada quando o
   * profile (useAuth, assíncrono) chega DEPOIS do mount inicial.
   *
   * - `country` sempre vem do cadastro (nacionalidade) — pré-selecioná-lo é o
   *   que faz a conta estrangeira já abrir o form no modo "gringo": toda a
   *   lógica downstream (esconder complemento/bairro, estado vira texto livre,
   *   payload com `neighborhood: ""`) deriva de `billingAddress.country`.
   * - `city`/`state` vêm de uma confirmação de endereço anterior (o backend
   *   persiste o billing no usuário e devolve no profile). `stateUf` faz
   *   round-trip do nosso próprio formato (UF p/ BR, texto livre p/ estrangeiro),
   *   então é seguro reaplicar no dropdown/input.
   *
   * Roda uma única vez (ref) e só toca campos ainda no default — não sobrescreve
   * o que o usuário já digitou na janela de corrida do useAuth nem um endereço
   * já confirmado.
   */
  const billingPrefillRef = useRef(false);
  useEffect(() => {
    if (billingPrefillRef.current || !authUser) return;
    billingPrefillRef.current = true;
    if (billingAddressConfirmed) return;

    const accountCountry = authUser.country?.trim();
    const accountCity = authUser.city?.trim();
    const accountState = authUser.state?.trim();
    if (!accountCountry && !accountCity && !accountState) return;

    setBillingAddress((prev) => ({
      ...prev,
      // country só substitui o default "Brasil" — preserva troca manual feita antes do profile chegar.
      country:
        accountCountry && prev.country === "Brasil" ? accountCountry : prev.country,
      city: accountCity && !prev.city ? accountCity : prev.city,
      stateUf: accountState && !prev.stateUf ? accountState : prev.stateUf,
    }));
  }, [authUser, billingAddressConfirmed]);

  // Busca o pedido do servidor no mount para obter pricing, coupon e voucher atualizados.
  // Ao final, tenta auto-aplicar cupom pendente capturado da URL via `?coupon=` —
  // ignora silenciosamente qualquer falha (cupom inválido pra esse evento, expirado, etc.).
  useEffect(() => {
    if (!orderId || orderFetchedRef.current) return;
    orderFetchedRef.current = true;
    getOrder(orderId)
      .then(async (order) => {
        setCurrentOrder(order);

        const pending = getPendingCoupon();
        // Já tem cupom OU voucher na order → não reaplica.
        if (!pending || order.coupon || order.voucher) return;
        const payload =
          getPendingCouponKind() === "voucher"
            ? { voucherCode: pending }
            : { couponCode: pending };
        try {
          const updated = await patchCoupon(orderId, payload);
          syncFromOrder(updated);
          setCurrentOrder(updated);
          setCouponCode(pending);
        } catch {
          /* silencioso por design — código de link inválido não interrompe o fluxo */
        }
        // NÃO limpa o pendente: o link (`?coupon=`/`?voucher=`) persiste na URL.
      })
      .catch(() => { /* ignora — usa valores locais como fallback */ });
  }, [orderId, getOrder, patchCoupon, syncFromOrder]);

  /**
   * Idempotency key pro POST /pay. Gerada UMA vez quando o usuário monta
   * a step de pagamento, e reutilizada em qualquer retry até um pagamento
   * bem-sucedido (aí regenera pra próxima tentativa).
   */
  const idempotencyKeyRef = useRef<string>(generateIdempotencyKey());
  const regenerateIdempotencyKey = () => {
    idempotencyKeyRef.current = generateIdempotencyKey();
  };

  // Buscar tickets e categorias do servidor
  const { tickets, loading: ticketsLoading } = useTickets(eventId, !!eventId, false, true);
  const { categories, loading: categoriesLoading } = useTicketCategories(eventId, !!eventId);

  // Buscar produtos do evento
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: queryKeys.events.products(eventId || ""),
    queryFn: async () => {
      if (!eventId) return { products: [] };
      return organizerService.getProducts(eventId);
    },
    enabled: !!eventId,
    // Checkout exige 100% server-driven: nada de cache.
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
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
              return !isNaN(price) && price >= 0;
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
        return !isNaN(price) && price >= 0;
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

  // Lookup local para obter distance/distanceUnit por ticketId
  const localTicketLookup = useMemo(() => {
    const map = new Map<string, Ticket>();
    categorizedTickets.forEach((c) => c.tickets.forEach((t) => map.set(t.id, t)));
    uncategorizedTickets.forEach((t) => map.set(t.id, t));
    return map;
  }, [categorizedTickets, uncategorizedTickets]);

  // Agrupa ingressos por ticket para exibição — usa valores do servidor quando disponíveis
  const groupedTickets = useMemo(() => {
    if (currentOrder?.tickets?.length) {
      const map = new Map<string, { quantity: number; raceName: string; distance: string; price: number; total: number }>();
      currentOrder.tickets.forEach((t) => {
        const local = localTicketLookup.get(t.ticketId);
        const unitPrice = (t.finalUnitPrice ?? t.unitPrice) / 100;
        const lineTotal = (t.finalTotalPrice ?? t.unitPrice) / 100;
        const existing = map.get(t.ticketId);
        if (existing) {
          existing.quantity += t.quantity;
          existing.total += lineTotal;
        } else {
          map.set(t.ticketId, {
            quantity: t.quantity,
            raceName: t.batchName ?? local?.name ?? "",
            distance: local?.distance ? `${local.distance} ${local.distanceUnit || ""}` : "",
            price: unitPrice,
            total: lineTotal,
          });
        }
      });
      return Array.from(map.values());
    }

    // Fallback para quando o pedido ainda não foi carregado
    const map = new Map<string, { ticket: Ticket; quantity: number }>();
    categorizedTickets.forEach((category) => {
      category.tickets.forEach((ticket) => {
        const quantity = raceQuantities[ticket.id] || 0;
        if (quantity > 0) {
          const existing = map.get(ticket.id);
          if (existing) existing.quantity += quantity;
          else map.set(ticket.id, { ticket, quantity });
        }
      });
    });
    uncategorizedTickets.forEach((ticket) => {
      const quantity = raceQuantities[ticket.id] || 0;
      if (quantity > 0) {
        const existing = map.get(ticket.id);
        if (existing) existing.quantity += quantity;
        else map.set(ticket.id, { ticket, quantity });
      }
    });
    return Array.from(map.values()).map(({ ticket, quantity }) => ({
      quantity,
      raceName: ticket.name,
      distance: ticket.distance ? `${ticket.distance} ${ticket.distanceUnit || ""}` : "",
      price: getTicketPrice(ticket),
      total: getTicketPrice(ticket) * quantity,
    }));
  }, [currentOrder, localTicketLookup, raceQuantities, categorizedTickets, uncategorizedTickets]);

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

  // Helper para obter produtos de um participante.
  // Por padrão retorna apenas adicionais cobráveis (uso em cálculo de subtotal/orderItems).
  // Com `includeIncluded: true`, retorna também os produtos inclusos no ingresso —
  // usado no resumo visual mobile pra listar TODOS os itens do participante.
  type ParticipantProduct = {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    size?: string;
    image?: string | null;
    images?: string[];
    isIncluded: boolean;
  };

  const getParticipantProducts = (
    participantIndex: number,
    options: { includeIncluded?: boolean } = {}
  ): ParticipantProduct[] => {
    if (!productsData?.products) return [];

    const participant = participants[participantIndex];
    if (!participant?.productVariations) return [];

    const { includeIncluded = false } = options;
    const items: ParticipantProduct[] = [];

    Object.entries(participant.productVariations).forEach(([productId, variationId]) => {
      if (!variationId) return;

      const product = productsData.products.find((p: any) =>
        p.id === productId || p.id.startsWith(productId) || productId.startsWith(p.id)
      );
      if (!product) return;

      const isIncluded = !!product.isIncludedInTicket;

      // Inclusos só entram quando explicitamente pedido (resumo visual);
      // pra cálculo de preço/orderItems eles são pulados.
      if (isIncluded && !includeIncluded) return;

      const variation = product.variations?.find((v: any, i: number) =>
        (v.id || `${product.id}-${i}`) === variationId
      );

      // Variação "Sem interesse" (opt-out do kit) não aparece no resumo —
      // mesma regra do desktop (orderItems pula isIncludedInTicket que cobre
      // esses casos). Aqui o filtro é explícito porque `includeIncluded: true`
      // deixa inclusos passarem, e queremos ocultar essa variação especial.
      if (variation && isSemInteresseVariation({ name: variation.name ?? "" })) return;

      // Variação só sobrescreve basePrice quando tem preço próprio (> 0).
      // Sem isso, variações de tamanho/cor com price=0 zerariam o produto e o filtro
      // abaixo o esconderia silenciosamente do resumo.
      const variationPrice = Number(variation?.price ?? 0);
      const basePrice = Number(product.basePrice ?? 0);
      const rawPrice = variationPrice > 0 ? variationPrice : basePrice;
      // Inclusos não cobram do participante — preço efetivo é 0.
      const price = isIncluded ? 0 : rawPrice;

      // Adicionais sem preço positivo continuam ocultos (ruído visual).
      // Inclusos passam mesmo com price=0 pra aparecer no resumo expandido.
      if (!isIncluded && rawPrice <= 0) return;

      items.push({
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        size: variation?.name,
        image: product.image ?? null,
        images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
        isIncluded,
      });
    });

    return items;
  };

  // Generate participants data for the list
  const categoryNameMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c.name])),
    [categories]
  );

  // Agrupa reservas por ticketId como array (preserva ordem do servidor).
  // Múltiplos participantes do mesmo tipo de ingresso podem ter cupom aplicado de forma independente.
  const reservedTicketsByTicketId = useMemo(() => {
    type ReservedTicket = NonNullable<typeof currentOrder>["tickets"][0];
    if (!currentOrder) return {} as Record<string, ReservedTicket[]>;
    const map: Record<string, ReservedTicket[]> = {};
    currentOrder.tickets.forEach((t) => {
      if (!map[t.ticketId]) map[t.ticketId] = [];
      map[t.ticketId].push(t);
    });
    return map;
  }, [currentOrder]);

  const participantsData = useMemo(() => {
    const data: Array<{
      participantIndex: number;
      ticketName: string;
      categoryName?: string;
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
        nationality?: string;
      };
      couponCode?: string;
      couponDiscount?: number;
      voucherCode?: string;
      voucherDiscount?: number;
    }> = [];

    const orderCoupon = currentOrder?.coupon;
    const orderVoucher = currentOrder?.voucher;
    // Contador posicional por ticketId — o nth participante pega a nth reserva do ticket.
    const ticketCounters: Record<string, number> = {};

    participantsWithTickets.forEach(({ ticket, participantIndex }) => {
      const participant = participants[participantIndex];
      if (participant && (participant.name || participant.cpf)) {
        const products = getParticipantProducts(participantIndex);

        const reservations = reservedTicketsByTicketId[ticket.id] ?? [];
        const reservationIdx = ticketCounters[ticket.id] ?? 0;
        ticketCounters[ticket.id] = reservationIdx + 1;
        const reservedTicket = reservations[reservationIdx];

        const unitDiscount = reservedTicket?.unitDiscount ?? 0;
        // couponApplied vem do servidor por reserva; fallback para presença do cupom + desconto.
        const couponApplied = reservedTicket?.couponApplied ?? (!!orderCoupon && unitDiscount > 0);

        const hasCoupon = !!orderCoupon && couponApplied && unitDiscount > 0;
        const hasVoucher = !!orderVoucher && !orderCoupon && unitDiscount > 0;

        data.push({
          participantIndex,
          ticketName: ticket.name,
          categoryName: ticket.groupId ? categoryNameMap.get(ticket.groupId) : undefined,
          ticketPrice: reservedTicket ? reservedTicket.unitPrice / 100 : getTicketPrice(ticket),
          participant: {
            name: participant.name || "",
            cpf: participant.cpf || "",
            email: participant.email || "",
            birthDate: participant.birthDate || "",
            phone: participant.phone || "",
            gender: participant.gender,
            nationality: participant.nationality,
          },
          additionalProducts: products.length > 0 ? products : undefined,
          couponCode: hasCoupon ? (orderCoupon!.code ?? "Desconto automático") : undefined,
          couponDiscount: hasCoupon ? unitDiscount / 100 : undefined,
          voucherCode: hasVoucher ? orderVoucher!.code : undefined,
          voucherDiscount: hasVoucher ? unitDiscount / 100 : undefined,
        });
      }
    });

    return data;
  }, [participantsWithTickets, participants, productsData, currentOrder, reservedTicketsByTicketId]);

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

        // Variação só sobrescreve basePrice quando tem preço próprio (> 0).
        const variationPrice = Number(variation?.price ?? 0);
        const basePrice = Number(product.basePrice ?? 0);
        const price = variationPrice > 0 ? variationPrice : basePrice;

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

  const cardIcons = (
    <div className="flex gap-2 items-center">
      <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
        <VisaIcon />
      </div>
      <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
        <EloIcon />
      </div>
      <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
        <Image src="/images/american_express.png" alt="American Express" width={24} height={24} />
      </div>
      <div className="bg-gray-2 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
        <MasterCardIcon />
      </div>
    </div>
  );

  // Totais — usa servidor quando disponível
  const totalParticipants = currentOrder
    ? currentOrder.tickets.reduce((sum, t) => sum + t.quantity, 0)
    : participantsWithTickets.length;

  const totalPrice = currentOrder
    ? currentOrder.pricing.total / 100
    : participantsWithTickets.reduce((sum, { ticket }) => sum + getTicketPrice(ticket), 0);

  // Usa o valor do servidor quando > 0, senão calcula do participantFeePercent
  const ticketSubtotalLocal = participantsWithTickets.reduce(
    (sum, { ticket }) => sum + getTicketPrice(ticket),
    0
  );
  const additionalProductsTotal = orderItems.reduce(
    (sum, item) => sum + item.price / 100,
    0
  );
  // Fallback local inclui produtos adicionais — base da taxa é
  // tickets + produtos (mesma fórmula do backend). Sem isso, a taxa fica
  // subestimada quando a order ainda não foi recalculada com produtos.
  const serverServiceFee = currentOrder?.pricing.serviceFee ?? 0;
  const serviceFee = serverServiceFee > 0
    ? serverServiceFee / 100
    : (ticketSubtotalLocal + additionalProductsTotal) *
      ((event.participantFeePercent ?? 0) / 100);
  // Subtotal e desconto de cupom vêm direto do backend — não recalcular no frontend
  const subtotalValue = currentOrder
    ? currentOrder.pricing.subtotal / 100
    : totalPrice + serviceFee + additionalProductsTotal;

  const couponDiscount = currentOrder?.pricing.couponDiscount
    ? currentOrder.pricing.couponDiscount / 100
    : 0;

  const voucherDiscount = currentOrder?.pricing.voucherDiscount
    ? currentOrder.pricing.voucherDiscount / 100
    : 0;
  const totalValue = currentOrder
    ? currentOrder.pricing.total / 100
    : subtotalValue - couponDiscount - voucherDiscount;

  const isFreeOrder = totalValue <= 0;
  const isCardSelected = selectedPaymentMethod === "credit" || selectedPaymentMethod === "debit";

  const isCouponApplied = !!currentOrder?.coupon;
  const isVoucherApplied = !!currentOrder?.voucher;
  const isAutomaticCoupon = currentOrder?.coupon?.couponType === "QUANTITY" || currentOrder?.coupon?.couponType === "AGE";
  const appliedCouponName = currentOrder?.coupon?.code ?? (isCouponApplied ? (isAutomaticCoupon ? "Cupom automático" : "Desconto automático") : undefined);
  const appliedVoucherName = currentOrder?.voucher?.name ?? currentOrder?.voucher?.code;

  // Percentual do cupom vem diretamente do objeto coupon da API.
  const couponPercent = useMemo(() => {
    if (!currentOrder?.coupon) return undefined;
    if (currentOrder.coupon.type === "PERCENTAGE" && currentOrder.coupon.value > 0) {
      return currentOrder.coupon.value;
    }
    return undefined;
  }, [currentOrder]);

  // Calcular opções de parcelamento baseado no valor total e no máximo permitido pelo evento
  const installmentOptions = useMemo(() => {
    const maxInstallments = event.maxInstallments ?? 1;
    const options: DropdownOption[] = [];
    for (let i = 1; i <= maxInstallments; i++) {
      const installmentValue = totalValue / i;
      const label =
        i === 1
          ? `1x de ${formatPrice(totalValue)} (à vista)`
          : `${i}x de ${formatPrice(installmentValue)} sem juros`;
      options.push({ id: String(i), label });
    }
    return options;
  }, [totalValue, event.maxInstallments]);

  const calculatePixValue = () => {
    const discount = totalValue * 0.05;
    return totalValue - discount;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError("Digite um código de cupom.");
      return;
    }
    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const updated = await patchCoupon(orderId, { couponCode: couponCode.trim().toUpperCase() });
      syncFromOrder(updated);
      setCurrentOrder(updated);
    } catch (err) {
      if (err instanceof OrderApiError) {
        setCouponError(COUPON_ERROR_MESSAGES[err.code] ?? err.message ?? "Cupom inválido.");
      } else {
        setCouponError("Erro ao aplicar cupom. Tente novamente.");
      }
    } finally {
      setCouponLoading(false);
    }
  };

  const buildBillingAddressPayload = (): PatchBillingAddressRequest["billingAddress"] | null => {
    const a = billingAddress;
    const country = a.country?.trim() || "Brasil";
    const isForeign = country !== "Brasil";
    const postalConfig = getPostalCodeConfig(country);
    if (!country) {
      toast.error("Selecione o país no endereço de cobrança.");
      return null;
    }
    if (!postalConfig.isValid(a.cep)) {
      toast.error(
        isForeign
          ? "Informe um código postal válido no endereço de cobrança."
          : "Informe um CEP válido (8 dígitos) no endereço de cobrança."
      );
      return null;
    }
    if (!a.stateUf?.trim()) {
      toast.error("Selecione o estado no endereço de cobrança.");
      return null;
    }
    // Bairro só é exigido no Brasil — estrangeiro não preenche o campo.
    const missingRequired =
      !a.street.trim() ||
      !a.number.trim() ||
      !a.city.trim() ||
      (!isForeign && !a.neighborhood.trim());
    if (missingRequired) {
      toast.error(
        isForeign
          ? "Preencha rua, número e cidade no endereço de cobrança."
          : "Preencha rua, número, bairro e cidade no endereço de cobrança."
      );
      return null;
    }
    return {
      country,
      postalCode: postalConfig.toBackend(a.cep),
      // BR: UF de 2 letras (uppercase). Estrangeiro: nome livre do estado/província.
      stateUf: isForeign ? a.stateUf.trim() : a.stateUf.trim().toUpperCase(),
      street: a.street.trim(),
      number: a.number.trim(),
      // Estrangeiro: complemento omitido, bairro vai vazio (backend exige a chave).
      complement: isForeign ? undefined : a.complement?.trim() || undefined,
      neighborhood: isForeign ? "" : a.neighborhood.trim(),
      city: a.city.trim(),
    };
  };

  // `useModal=false` é passado pelo fluxo de débito: lá o modal "Pagamento
  // não aprovado" deve aparecer SOMENTE em erro/cancelamento do 3DS (tratado
  // no catch do handler de débito). Recusa pós-3DS, erro de rede, etc. caem
  // aqui — viram toast em vez de modal pra não confundir o usuário (3DS
  // autenticou com sucesso, problema é da captura/adquirente).
  const handlePayError = (err: unknown, opts?: { useModal?: boolean }) => {
    const useModal = opts?.useModal ?? true;
    const showFailure = (toastMsg: string) => {
      if (useModal) {
        pauseVisibilityRefresh();
        setCardErrorModalOpen(true);
      } else {
        toast.error(toastMsg);
      }
    };
    if (err instanceof OrderApiError) {
      if (err.code === "ORDER_NOT_PENDING" || err.code === "ORDER_NOT_FOUND") {
        toast.error("Sua reserva expirou.");
        clearTimer();
        return;
      }
      if (err.code === "PAYMENT_REFUSED") {
        regenerateIdempotencyKey();
        showFailure("Pagamento não aprovado. Tente novamente.");
        return;
      }
      if (err.code === "BILLING_ADDRESS_REQUIRED") {
        toast.error("Confirme o endereço de cobrança antes de pagar.");
        return;
      }
      if (err.code === "PARTICIPANTS_REQUIRED") {
        toast.error("Preencha os dados dos participantes antes de pagar.");
        return;
      }
      if (err.code === "IDEMPOTENCY_KEY_MISMATCH") {
        regenerateIdempotencyKey();
        toast.error("Tente novamente.");
        return;
      }
      showFailure("Erro ao processar pagamento. Tente novamente.");
      return;
    }
    showFailure("Erro ao processar pagamento. Tente novamente.");
  };

  /**
   * Wrapper de onConfirmedChange: antes de marcar o endereço como confirmado
   * localmente, dispara PATCH /orders/{id}/billing-address. Só confirma na UI
   * quando o servidor aceita.
   */
  const handleBillingAddressConfirmedChange = async (confirmed: boolean) => {
    if (!confirmed) {
      setBillingAddressConfirmed(false);
      return;
    }
    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      return;
    }
    const payload = buildBillingAddressPayload();
    if (!payload) return;
    setBillingAddressSaving(true);
    try {
      const updated = await patchBillingAddress(orderId, {
        billingAddress: payload,
      });
      syncFromOrder(updated);
      setCurrentOrder(updated);
      setBillingAddressConfirmed(true);
    } catch (err) {
      if (err instanceof OrderApiError) {
        if (
          err.code === "ORDER_NOT_PENDING" ||
          err.code === "ORDER_NOT_FOUND"
        ) {
          toast.error("Sua reserva expirou.");
          clearTimer();
        } else {
          toast.error(err.message || "Erro ao salvar endereço.");
        }
      } else {
        toast.error("Erro ao salvar endereço.");
      }
    } finally {
      setBillingAddressSaving(false);
    }
  };

  // Processar checkout PIX
  const handleProcessPixCheckout = async () => {
    if (checkoutLoadingRef.current) return;
    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      return;
    }
    if (!billingAddressConfirmed) {
      toast.error("Confirme o endereço de cobrança antes de pagar.");
      return;
    }
    checkoutLoadingRef.current = true;
    setPixLoading(true);
    setCheckoutLoading(true);
    try {
      const payload: PayOrderRequest = {
        method: "PIX",
        couponCode: isCouponApplied && couponCode ? couponCode : undefined,
      };
      const result = await payOrder(
        orderId,
        payload,
        idempotencyKeyRef.current,
      );
      // Timer estende +30min automaticamente — o server devolve o novo expiresAt.
      syncFromOrder(result);

      const pix = result.payment?.pix ?? null;
      if (pix) {
        setPixData(pix);
        setIsPixModalOpen(true);
      } else {
        toast.error("Erro ao gerar QR Code PIX. Tente novamente.");
      }
    } catch (err) {
      handlePayError(err);
    } finally {
      checkoutLoadingRef.current = false;
      setPixLoading(false);
      setCheckoutLoading(false);
    }
  };

  const handleProcessFreeCheckout = async () => {
    if (checkoutLoadingRef.current) return;
    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      return;
    }
    if (!billingAddressConfirmed) {
      toast.error("Confirme o endereço de cobrança antes de finalizar.");
      return;
    }
    checkoutLoadingRef.current = true;
    setCheckoutLoading(true);
    try {
      const payload: PayOrderRequest = {
        method: "PIX",
        couponCode: isCouponApplied && couponCode ? couponCode : undefined,
      };
      const result = await payOrder(orderId, payload, idempotencyKeyRef.current);
      clearTimer();
      toast.success("Pedido finalizado!");
      onSuccess?.(result.orderId);
    } catch (err) {
      handlePayError(err);
    } finally {
      checkoutLoadingRef.current = false;
      setCheckoutLoading(false);
    }
  };

  // Processar checkout Cartão de Crédito
  const handleProcessCreditCardCheckout = async () => {
    if (checkoutLoadingRef.current) return;
    // Validar dados do cartão
    const newCardErrors: CardErrors = {};

    if (!cardName?.trim()) {
      newCardErrors.cardName = "Informe o nome impresso no cartão.";
    }
    if (!cardNumber) {
      newCardErrors.cardNumber = "Informe o número do cartão.";
    } else if (!validateCardNumber(cardNumber)) {
      newCardErrors.cardNumber = "Número do cartão inválido.";
    }
    if (!cardExpiry) {
      newCardErrors.cardExpiry = "Informe a data de validade.";
    } else if (!validateExpiry(cardExpiry)) {
      newCardErrors.cardExpiry = "Cartão expirado ou data inválida.";
    }
    if (!cardCVV) {
      newCardErrors.cardCVV = "Informe o CVV.";
    } else if (!validateCVV(cardCVV)) {
      newCardErrors.cardCVV = "CVV inválido.";
    }

    if (Object.keys(newCardErrors).length > 0) {
      setCardErrors(newCardErrors);
      toast.error("Por favor, corrija os campos do cartão.");
      return;
    }
    setCardErrors({});

    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      return;
    }
    if (!billingAddressConfirmed) {
      toast.error("Confirme o endereço de cobrança antes de pagar.");
      return;
    }

    checkoutLoadingRef.current = true;
    setCheckoutLoading(true);
    try {
      const payload: PayOrderRequest = {
        method: "CREDIT_CARD",
        card: {
          name: cardName.toUpperCase().trim(),
          number: cardNumber.replace(/\D/g, ""),
          expiry: cardExpiry.replace(/\s/g, ""),
          cvv: cardCVV,
          installments: parseInt(selectedInstallments) || 1,
        },
        couponCode: isCouponApplied && couponCode ? couponCode : undefined,
      };
      const result = await payOrder(
        orderId,
        payload,
        idempotencyKeyRef.current,
      );

      if (result.status === "PAID") {
        clearTimer();
        toast.success("Pagamento aprovado!");
        onSuccess?.(result.orderId);
      } else {
        // Sincroniza o estado do timer imediatamente.
        // Se o servidor retornou CANCELLED, dispara handleCancelledByServer → redirect silencioso.
        // Se ainda PENDING, apenas atualiza o timer.
        syncFromOrder(result);
        toast.error("Pagamento não aprovado. Tente novamente.");
        regenerateIdempotencyKey();
      }
    } catch (err) {
      handlePayError(err);
    } finally {
      checkoutLoadingRef.current = false;
      setCheckoutLoading(false);
    }
  };

  // Processar checkout Cartão de Débito com autenticação 3DS client-side (Braspag/Cielo SDK)
  const handleProcessDebitCardCheckout = async () => {
    if (checkoutLoadingRef.current) return;

    // 1. Validar campos do cartão
    const newErrors: CardErrors = {};
    if (!debitCardName.trim()) newErrors.cardName = "Informe o nome impresso no cartão.";
    if (!debitCardNumber) {
      newErrors.cardNumber = "Informe o número do cartão.";
    } else if (!validateCardNumber(debitCardNumber)) {
      newErrors.cardNumber = "Número do cartão inválido.";
    }
    if (!debitCardExpiry) {
      newErrors.cardExpiry = "Informe a data de validade.";
    } else if (!validateExpiry(debitCardExpiry)) {
      newErrors.cardExpiry = "Cartão expirado ou data inválida.";
    }
    if (!debitCardCVV) {
      newErrors.cardCVV = "Informe o CVV.";
    } else if (!validateCVV(debitCardCVV)) {
      newErrors.cardCVV = "CVV inválido.";
    }

    if (Object.keys(newErrors).length > 0) {
      setDebitCardErrors(newErrors);
      toast.error("Por favor, corrija os campos do cartão.");
      return;
    }
    setDebitCardErrors({});

    if (!orderId) {
      toast.error("Sua reserva expirou. Volte para selecionar os ingressos.");
      return;
    }
    if (!billingAddressConfirmed) {
      toast.error("Confirme o endereço de cobrança antes de pagar.");
      return;
    }

    checkoutLoadingRef.current = true;
    setDebitLoading(true);
    setCheckoutLoading(true);
    try {
      const auth = await threeDS.authenticate({
        orderId,
        totalAmountCents: Math.round(totalValue * 100),
        card: {
          number: debitCardNumber,
          name: debitCardName,
          expiry: debitCardExpiry,
        },
      });

      // 3. Enviar pagamento com os dados de autenticação retornados pelo SDK
      const payload: PayOrderDebitCardRequest = {
        method: "DEBIT_CARD",
        card: {
          name: debitCardName.toUpperCase().trim(),
          number: debitCardNumber.replace(/\D/g, ""),
          expiry: debitCardExpiry.replace(/\s/g, ""),
          cvv: debitCardCVV,
        },
        threeDs: {
          cavv: auth.cavv,
          eci: auth.eci,
          xid: auth.xid,
          referenceId: auth.referenceId,
          version: auth.version,
        },
        couponCode: isCouponApplied && couponCode ? couponCode : undefined,
      };
      const result = await payOrder(orderId, payload, idempotencyKeyRef.current);
      if (result.status === "PAID") {
        clearTimer();
        toast.success("Pagamento aprovado!");
        onSuccess?.(result.orderId);
        return;
      }

      // 3DS já autenticou com sucesso aqui — uma recusa nesta etapa é da
      // adquirente/emissor no momento da captura, não do 3DS. Mantém o mesmo
      // toast do crédito; o modal "Pagamento não aprovado" fica reservado a
      // erro/cancelamento do 3DS (tratado no catch abaixo).
      syncFromOrder(result);
      toast.error("Pagamento não aprovado. Tente novamente.");
      regenerateIdempotencyKey();
    } catch (err) {
      if (err instanceof ThreeDSError) {
        // Log estruturado pra investigar falhas vindas do SDK Braspag
        console.error("[3DS] erro de autenticação", {
          code: err.code,
          returnCode: err.returnCode,
          message: err.message,
        });
        switch (err.code) {
          case "FAILURE":
            // Recusado/cancelado no challenge do banco — exibe modal de erro
            // de pagamento ao invés de toast.
            pauseVisibilityRefresh();
            setCardErrorModalOpen(true);
            break;
          case "UNSUPPORTED_BRAND":
            toast.error("Bandeira do cartão não suportada para autenticação de débito.");
            break;
          case "TOKEN_ERROR":
            toast.error("Erro ao iniciar autenticação 3DS. Tente novamente.");
            break;
          case "DISABLED":
            toast.error("Autenticação 3DS desabilitada para este estabelecimento.");
            break;
          case "SDK_ERROR":
            toast.error(
              `Erro no 3DS: ${err.message}${err.returnCode ? ` (cod. ${err.returnCode})` : ""}`,
            );
            break;
          default:
            toast.error("Erro na autenticação 3DS. Tente novamente.");
        }
        regenerateIdempotencyKey();
        return;
      }
      // Pós-3DS: 3DS já autenticou — qualquer erro daqui pra frente é da
      // captura/adquirente. Toast em vez de modal (`useModal: false`).
      handlePayError(err, { useModal: false });
    } finally {
      checkoutLoadingRef.current = false;
      setDebitLoading(false);
      setCheckoutLoading(false);
    }
  };

  const pixValue = calculatePixValue();
  const additionalProductsCount = orderItems.length;

  // Expand/collapse dos produtos por participante no detalhe do resumo mobile.
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});

  // Participant Summary Modal state
  const [isParticipantSummaryModalOpen, setIsParticipantSummaryModalOpen] = useState(false);
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0);

  // Handler for opening participant summary modal
  const handleParticipantClick = (participantIndex: number) => {
    setSelectedParticipantIndex(participantIndex);
    setIsParticipantSummaryModalOpen(true);
  };

  // Generate participants with tickets dynamically.
  // No resumo mobile incluímos os produtos inclusos (isIncluded=true) pra listar
  // todos os itens do participante quando expande "Mostrar mais".
  const participantsWithTicketsForDisplay = useMemo(() => {
    const result: Array<{
      participantIndex: number;
      participant: (typeof participants)[0];
      ticket: Ticket;
      categoryName?: string;
      additionalProducts?: Array<{
        productId: string;
        name: string;
        price: number;
        quantity: number;
        size?: string;
        image?: string | null;
        images?: string[];
        isIncluded: boolean;
      }>;
    }> = [];

    participantsWithTickets.forEach(({ ticket, participantIndex }) => {
      const participant = participants[participantIndex];
      if (participant) {
        const products = getParticipantProducts(participantIndex, { includeIncluded: true });

        result.push({
          participantIndex,
          participant,
          ticket,
          categoryName: ticket.groupId ? categoryNameMap.get(ticket.groupId) : undefined,
          additionalProducts: products.length > 0 ? products : undefined,
        });
      }
    });

    return result;
  }, [participantsWithTickets, participants, productsData, categoryNameMap]);

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
        // Nacionalidade decide label do documento (CPF/Documento) e máscara de
        // telefone/CPF no resumo — mesmo critério do preenchimento (InformationStep).
        nationality: participant.nationality,
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

  if (loading) {
    return <Loading />;
  }

  // Detalhe rico do resumo mobile (cards de participante + imagens dos produtos),
  // renderizado dentro do bottom-sheet do MobileSummaryBar via `extraDetails`.
  const paymentSummaryDetails = (
    <div className="flex flex-col">
      {participantsWithTicketsForDisplay.map(
        (
          { participantIndex, participant, ticket, categoryName, additionalProducts },
          index
        ) => (
          <div
            key={participantIndex}
            className={`${index > 0 ? "border-t border-gray-6 pt-4" : "pb-4"}`}
          >
            <p className="text-sm font-semibold text-gray-12 mb-4 font-family-dm-sans">
              Participante {participantIndex + 1}
            </p>

            {/* Card do participante */}
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
                    {participant.name || `Participante ${participantIndex + 1}`}
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
                    {participant.cpf &&
                      formatDocumentDisplay(
                        participant.cpf,
                        isPersonBr({
                          country: participant.nationality,
                          document: participant.cpf,
                        })
                      )}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingresso — categoria acima do nome */}
            <div className="flex items-end justify-between gap-3 mb-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11 truncate">
                  {categoryName || "Ingresso Avulso"}
                </p>
                <p className="font-manrope font-bold text-sm leading-[1.2] text-gray-12 truncate">
                  {ticket.name}
                </p>
              </div>
              <p className="font-manrope font-bold text-sm leading-[1.2] text-gray-12 shrink-0">
                {formatPrice(getTicketPrice(ticket))}
              </p>
            </div>

            {/* Resumo de produtos: adicionais (cobrados) + inclusos (grátis). */}
            {(() => {
              const optionalProducts =
                additionalProducts?.filter((p) => !p.isIncluded) ?? [];
              const includedProducts =
                additionalProducts?.filter((p) => p.isIncluded) ?? [];
              const optionalTotal = optionalProducts.reduce(
                (sum, item) => sum + (item.price / 100) * item.quantity,
                0
              );
              const hasAnyProduct =
                optionalProducts.length > 0 || includedProducts.length > 0;

              return (
                <>
                  {optionalProducts.length > 0 && (
                    <div className="mb-3">
                      <SummaryRow
                        label={`${optionalProducts.length}x Itens adicionais`}
                        value={formatPrice(optionalTotal)}
                      />
                    </div>
                  )}
                  {includedProducts.length > 0 && (
                    <div className="mb-3">
                      <SummaryRow
                        label={`${includedProducts.length}x Itens inclusos`}
                        value="Grátis"
                      />
                    </div>
                  )}

                  {/* Lista expandida — todos os produtos com imagem (ProductCardGallery) */}
                  {expandedProducts[participantIndex] && hasAnyProduct && (
                    <div className="mb-4">
                      {additionalProducts!.map((product, productIndex) => (
                        <div
                          key={product.productId ?? productIndex}
                          className="bg-gray-2 border border-gray-6 rounded-xl mb-3"
                        >
                          <div className="flex gap-3 p-4 border-b border-gray-6">
                            <ProductCardGallery
                              productId={product.productId ?? String(productIndex)}
                              productName={product.name}
                              image={product.image}
                              images={product.images}
                            />
                            <div className="flex flex-col justify-between flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <p className="text-sm font-semibold text-gray-12 font-family-dm-sans line-clamp-2 flex-1 min-w-0">
                                  {product.name}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-gray-12 font-manrope">
                                {product.isIncluded
                                  ? "Grátis"
                                  : formatPrice(product.price / 100)}
                              </p>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="flex gap-1 items-center">
                              <p className="text-sm text-gray-12 font-family-dm-sans">
                                Tamanho:
                              </p>
                              <p className="text-sm font-semibold text-gray-12 font-manrope">
                                {product.size || "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {hasAnyProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedProducts((prev) => ({
                          ...prev,
                          [participantIndex]: !prev[participantIndex],
                        }));
                      }}
                      className="text-sm font-medium text-gray-11 font-family-dm-sans underline"
                    >
                      {expandedProducts[participantIndex] ? "Mostrar menos" : "Mostrar mais"}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
        )
      )}
    </div>
  );

  return (
    <>
      <CheckoutCardErrorModal
        open={cardErrorModalOpen}
        onConfirm={() => {
          setCardErrorModalOpen(false);
          resumeVisibilityRefresh();
        }}
      />

      {/* Mobile Layout */}
      <div className="w-full md:hidden flex flex-col pb-24">
        {/* Instructional Text */}
        <div className="pb-6">
          <p className="text-sm text-gray-11 font-family-dm-sans">
            {billingAddressConfirmed
              ? "Revise seu pedido e finalize com cartão ou Pix. Os ingressos serão liberados após a aprovação do pagamento."
              : "Informe e confirme o endereço de cobrança para escolher a forma de pagamento."}
          </p>
        </div>

        {!billingAddressConfirmed ? (
          <CheckoutAddressSection
            values={billingAddress}
            onChange={(patch) =>
              setBillingAddress((prev) => ({ ...prev, ...patch }))
            }
            onConfirmedChange={handleBillingAddressConfirmedChange}
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
            {isFreeOrder && (
              <div className="pb-6">
                <Button
                  onClick={handleProcessFreeCheckout}
                  disabled={checkoutLoading || totalParticipants === 0}
                  isLoading={checkoutLoading}
                  className="w-full bg-gray-12 text-gray-1 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalizar pedido
                </Button>
              </div>
            )}
            {!isFreeOrder && <div className="pb-6 flex flex-col gap-3">
              {/* Card Option (crédito + débito unificados) */}
              <div
                className={`border rounded-lg p-4 transition-colors ${isCardSelected
                  ? "border-blue-8 bg-blue-3"
                  : "border-gray-6 bg-gray-3"
                  }`}
                onClick={() => { if (!isCardSelected) setSelectedPaymentMethod("credit"); }}
              >
                <div className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full size-4 border-[1.5px] flex items-center justify-center ${isCardSelected
                        ? "bg-primary-11 border-primary-11"
                        : "bg-transparent border-gray-6"
                        }`}
                    />
                    <span className="text-base font-semibold text-primary-12 font-manrope">
                      Cartão
                    </span>
                  </div>
                  <div className="flex gap-1 items-center">
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center"><VisaIcon /></div>
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center"><EloIcon /></div>
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center">
                      <Image src="/images/american_express.png" alt="American Express" width={24} height={24} />
                    </div>
                    <div className="bg-gray-1 border border-gray-6 rounded h-6 w-[42px] flex items-center justify-center"><MasterCardIcon /></div>
                  </div>
                </div>

                {isCardSelected && (
                  <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                    {/* Seleção crédito / débito */}
                    <div className="flex gap-6 mb-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedPaymentMethod === "credit"}
                          onCheckedChange={() => setSelectedPaymentMethod("credit")}
                        />
                        <span className="text-sm font-semibold text-gray-12 font-manrope">Crédito</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={selectedPaymentMethod === "debit"}
                          onCheckedChange={() => setSelectedPaymentMethod("debit")}
                        />
                        <span className="text-sm font-semibold text-gray-12 font-manrope">Débito</span>
                      </label>
                    </div>

                    {selectedPaymentMethod === "credit" && (
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
                          isMobile={true}
                          errors={cardErrors}
                        />
                        <Button
                          onClick={handleProcessCreditCardCheckout}
                          disabled={checkoutLoading || !billingAddressConfirmed}
                          isLoading={checkoutLoading}
                          className="w-full mt-4 bg-gray-12 text-gray-1 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Finalizar compra
                        </Button>
                      </>
                    )}

                    {selectedPaymentMethod === "debit" && (
                      <>
                        <DebitCardForm
                          cardName={debitCardName}
                          setCardName={handleSetDebitCardName}
                          cardNumber={debitCardNumber}
                          setCardNumber={handleSetDebitCardNumber}
                          cardExpiry={debitCardExpiry}
                          setCardExpiry={handleSetDebitCardExpiry}
                          cardCVV={debitCardCVV}
                          setCardCVV={handleSetDebitCardCVV}
                          isMobile={true}
                          errors={debitCardErrors}
                        />
                        <Button
                          onClick={handleProcessDebitCardCheckout}
                          disabled={checkoutLoading || !billingAddressConfirmed}
                          isLoading={debitLoading}
                          className="w-full mt-4 bg-gray-12 text-gray-1 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Finalizar compra
                        </Button>
                      </>
                    )}
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
                      isLoading={checkoutLoading}
                      className="w-full bg-gray-12 text-gray-1 font-bold font-manrope"
                    >
                      Gerar QR CODE
                    </Button>
                  </div>
                )}
              </div>
            </div>}

            {/* Coupon Section */}
            <div className="pt-6 border-t border-gray-8">
              <div className="flex flex-col gap-3">
                <Input
                  type="text"
                  placeholder="Código de cupom"
                  value={couponCode}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase().substring(0, 30);
                    setCouponCode(value);
                    setCouponError(null);
                  }}
                  maxLength={30}
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

      {/* Barra de resumo fixa (mobile) — unificada entre os steps do checkout. */}
      <MobileSummaryBar
        eventName={event.name}
        totalParticipants={totalParticipants}
        tickets={groupedTickets.map((t) => ({
          name: t.raceName,
          quantity: t.quantity,
          total: t.total,
        }))}
        subtotal={ticketSubtotalLocal + additionalProductsTotal}
        discount={
          isCouponApplied && couponDiscount > 0
            ? {
                label: `${
                  isAutomaticCoupon
                    ? "Cupom automático"
                    : appliedCouponName
                      ? `Cupom ${appliedCouponName}`
                      : "Cupom"
                }${couponPercent != null && couponPercent > 0 ? ` (-${couponPercent}%)` : ""}`,
                amount: couponDiscount,
              }
            : isVoucherApplied && voucherDiscount > 0
              ? {
                  label: appliedVoucherName ? `Voucher ${appliedVoucherName}` : "Voucher",
                  amount: voucherDiscount,
                }
              : null
        }
        additionalProducts={
          additionalProductsCount > 0
            ? { count: additionalProductsCount, total: additionalProductsTotal }
            : null
        }
        serviceFee={serviceFee}
        total={totalValue}
        cta={{
          label: isFreeOrder ? "Finalizar pedido" : "Finalizar compra",
          loading: checkoutLoading,
          disabled: totalParticipants === 0 || checkoutLoading || !billingAddressConfirmed,
          onClick: () => {
            if (isFreeOrder) {
              handleProcessFreeCheckout();
            } else if (selectedPaymentMethod === "credit") {
              handleProcessCreditCardCheckout();
            } else if (selectedPaymentMethod === "debit") {
              handleProcessDebitCardCheckout();
            } else if (selectedPaymentMethod === "pix") {
              handleProcessPixCheckout();
            }
          },
        }}
        extraDetails={paymentSummaryDetails}
      />

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
              <p className="text-sm text-gray-11 font-family-dm-sans leading-[1.3]">
                {!billingAddressConfirmed
                  ? "Informe e confirme o endereço de cobrança para escolher a forma de pagamento."
                  : isFreeOrder
                    ? "Clique em Finalizar pedido para confirmar. Os ingressos serão liberados imediatamente."
                    : "Revise seu pedido e finalize com cartão ou Pix. Os ingressos serão liberados após a aprovação do pagamento."}
              </p>
            </div>

            {!billingAddressConfirmed ? (
              <CheckoutAddressSection
                values={billingAddress}
                onChange={(patch) =>
                  setBillingAddress((prev) => ({ ...prev, ...patch }))
                }
                onConfirmedChange={handleBillingAddressConfirmedChange}
              />
            ) : (
              <BillingAddressConfirmedSummary
                address={billingAddress}
                onEdit={() => setBillingAddressConfirmed(false)}
              />
            )}

            {/* Métodos de Pagamento */}
            {billingAddressConfirmed && isFreeOrder && (
              <Button
                onClick={handleProcessFreeCheckout}
                disabled={checkoutLoading || totalParticipants === 0}
                isLoading={checkoutLoading}
                className="w-full font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Finalizar pedido
              </Button>
            )}
            {billingAddressConfirmed && !isFreeOrder ? (
              <div className="space-y-6">
                {/* Cartão (crédito + débito unificados) */}
                <div>
                  <PaymentMethodOption
                    option={{ id: "credit", name: "Cartão", description: "", icons: cardIcons }}
                    isSelected={isCardSelected}
                    onSelect={() => { if (!isCardSelected) setSelectedPaymentMethod("credit"); }}
                  />
                  {isCardSelected && (
                    <div className="mt-4">
                      {/* Seleção crédito / débito */}
                      <div className="flex gap-6 mb-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedPaymentMethod === "credit"}
                            onCheckedChange={() => setSelectedPaymentMethod("credit")}
                          />
                          <span className="text-sm font-semibold text-gray-12 font-manrope">Crédito</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedPaymentMethod === "debit"}
                            onCheckedChange={() => setSelectedPaymentMethod("debit")}
                          />
                          <span className="text-sm font-semibold text-gray-12 font-manrope">Débito</span>
                        </label>
                      </div>

                      {selectedPaymentMethod === "credit" && (
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
                            isLoading={checkoutLoading}
                            className="w-full mt-4 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Finalizar compra
                          </Button>
                        </>
                      )}

                      {selectedPaymentMethod === "debit" && (
                        <>
                          <DebitCardForm
                            cardName={debitCardName}
                            setCardName={handleSetDebitCardName}
                            cardNumber={debitCardNumber}
                            setCardNumber={handleSetDebitCardNumber}
                            cardExpiry={debitCardExpiry}
                            setCardExpiry={handleSetDebitCardExpiry}
                            cardCVV={debitCardCVV}
                            setCardCVV={handleSetDebitCardCVV}
                            isMobile={false}
                            errors={debitCardErrors}
                          />
                          <Button
                            onClick={handleProcessDebitCardCheckout}
                            disabled={checkoutLoading}
                            isLoading={debitLoading}
                            className="w-full mt-4 font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Finalizar compra
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* PIX */}
                <div>
                  <PaymentMethodOption
                    option={{ id: "pix", name: "PIX", description: "" }}
                    isSelected={selectedPaymentMethod === "pix"}
                    onSelect={() => setSelectedPaymentMethod("pix")}
                  />
                  {selectedPaymentMethod === "pix" && (
                    <div className="mt-4">
                      <PixForm
                        onSuccess={onSuccess}
                        pixValue={pixValue}
                        isMobile={false}
                        onProcessCheckout={handleProcessPixCheckout}
                        loading={checkoutLoading}
                        submitDisabled={!billingAddressConfirmed}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Coluna Direita - Resumo do Pedido */}
        <div className="max-w-1/3 w-full">
          <OrderSummary
            event={event}
            items={orderItems}
            groupedTickets={groupedTickets}
            serviceFee={serviceFee}
            subtotalOverride={currentOrder ? subtotalValue : undefined}
            total={totalValue}
            coupon={{
              code: couponCode,
              discount: couponDiscount,
              name: appliedCouponName,
              percent: couponPercent,
              type: currentOrder?.coupon?.type ?? undefined,
              couponType: currentOrder?.coupon?.couponType ?? undefined,
              fixedValue: currentOrder?.coupon?.type === "FIXED" ? currentOrder.coupon.value / 100 : undefined,
              error: couponError,
              isApplied: isCouponApplied,
              isLoading: couponLoading,
              onApply: () => { void handleApplyCoupon(); },
              onChange: (code) => {
                setCouponCode(code);
                setCouponError(null);
              },
            }}
            voucher={currentOrder?.voucher ? {
              code: currentOrder.voucher.code,
              discount: voucherDiscount,
              name: appliedVoucherName,
            } : undefined}
            participantsData={participantsData}
            onParticipantClick={handleParticipantClick}
          />
        </div>
      </div>

      {/* PIX Modal */}
      <PixModal
        isOpen={isPixModalOpen}
        onClose={() => setIsPixModalOpen(false)}
        pixData={pixData}
        orderId={orderId}
        onPaymentConfirmed={() => {
          setIsPixModalOpen(false);
          if (onSuccess && orderId) {
            onSuccess(orderId);
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
