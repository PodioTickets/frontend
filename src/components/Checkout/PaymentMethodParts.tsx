import { Button } from "../Button";
import { PencilIcon } from "../Icons/PencilIcon";
import { type CheckoutBillingAddress } from "./CheckoutAddressSection";
import type { PaymentOption } from "@/interfaces/payment";

export function PaymentMethodOption({
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
      className={`flex items-center justify-between p-4 rounded-lg transition-colors cursor-pointer border border-gray-6 bg-gray-3`}
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

export function BillingAddressConfirmedSummary({
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
      className={`border border-gray-6 rounded-lg p-4 md:p-5 flex flex-col w-full bg-gray-1 ${className}`}
    >
      <div className="flex md:flex-wrap items-center md:items-center justify-between gap-3">
        <div>
          <h2 className="font-manrope font-bold text-sm md:text-xl leading-[1.1] text-gray-12 pb-1 md:pb-0">
            Endereço
          </h2>
          <p className="md:hidden text-gray-11 text-sm">
            {[
              [address.street, address.number].filter(Boolean).join(", "),
              [address.city, address.stateUf].filter(Boolean).join(" - "),
            ]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>

        <div onClick={onEdit} className="md:hidden p-2 border border-gray-6 rounded-lg text-gray-11">
          <PencilIcon className="size-4" />
        </div>
        <Button onClick={onEdit} variant="outline" className="md:flex hidden border-gray-6 text-gray-12">
          Alterar endereço
        </Button>
      </div>
      <div className="hidden md:block text-sm text-gray-12 font-family-dm-sans leading-[1.4] space-y-1">
        <p>
          {address.street}, {address.number}
          {address.complement?.trim()
            ? ` - ${address.complement.trim()}`
            : ""}
        </p>
        <p>
          {address.neighborhood?.trim() ? `${address.neighborhood} - ` : ""}
          {address.city}
          {address.stateUf ? `/${address.stateUf}` : ""}
        </p>
        <p className="text-gray-12">
          {address.country?.trim() && address.country !== "Brasil"
            ? `Código postal ${address.cep} · ${address.country}`
            : `CEP ${address.cep}`}
        </p>
      </div>
    </div>
  );
}
