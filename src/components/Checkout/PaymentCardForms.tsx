import { memo } from "react";
import { Input } from "../Input";
import { Dropdown, DropdownOption } from "../Dropdown";
import { HelpIcon } from "../Icons/HelpIcon";
import { Tooltip, CVVTooltip } from "../Tooltip";
import { maskCardExpiry } from "@/utils/cardValidation";
import { formatCardNumber, cvvMaxLengthForCard } from "@/lib/paymentValidation";
import type { CardErrors } from "@/interfaces/payment";

export const CreditCardForm = memo(function CreditCardForm({
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
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (setCardNumber) setCardNumber(formatCardNumber(e.target.value));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Máscara deletion-aware: passa o valor ANTERIOR pra permitir apagar "MM/".
    if (setCardExpiry) setCardExpiry(maskCardExpiry(e.target.value, cardExpiry || ""));
  };

  // Detectar se é Amex para permitir 4 dígitos no CVV
  const isAmex = cvvMaxLengthForCard(cardNumber) === 4;
  const cvvMaxLength = cvvMaxLengthForCard(cardNumber);

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

/** Máscara de CPF: 000.000.000-00 (só dígitos, até 11). */
function formatCpfMask(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

export const DebitCardForm = memo(function DebitCardForm({
  cardName,
  setCardName,
  cardNumber,
  setCardNumber,
  cardExpiry,
  setCardExpiry,
  cardCVV,
  setCardCVV,
  cardCpf,
  setCardCpf,
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
  cardCpf?: string;
  setCardCpf?: (value: string) => void;
  isMobile?: boolean;
  errors?: CardErrors;
}) {
  const isAmex = cvvMaxLengthForCard(cardNumber) === 4;
  const cvvMaxLength = cvvMaxLengthForCard(cardNumber);

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

      {/* CPF do TITULAR do cartão — vai pro antifraude do Mercado Pago (token +
          payer.identification). Não é o CPF do participante do ingresso: doc
          divergente/ausente derruba a aprovação (cc_rejected_high_risk). */}
      <div className="flex flex-col gap-2 w-full">
        <label className="text-base text-gray-12 font-family-dm-sans">
          CPF do titular do cartão
        </label>
        <Input
          type="text"
          inputMode="numeric"
          value={cardCpf || ""}
          onChange={(e) => setCardCpf && setCardCpf(formatCpfMask(e.target.value))}
          className="bg-gray-2"
          maxLength={14}
          placeholder="000.000.000-00"
          aria-invalid={!!errors?.cardCpf}
        />
        {errors?.cardCpf && <p className="text-sm text-red-11">{errors.cardCpf}</p>}
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
            onChange={(e) => setCardExpiry && setCardExpiry(maskCardExpiry(e.target.value, cardExpiry || ""))}
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
