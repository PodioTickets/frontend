"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/utils/cn";
import { Input } from "@/components/Input";
import { FieldHelpTooltip } from "@/components/Organizer/FieldHelpTooltip";

export interface FormFieldProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  maxLength?: number;
  disabled?: boolean;
  readOnly?: boolean;
  /** Dica exibida num ícone de info ao lado do label (ex.: "Nome fantasia"). */
  tooltip?: string;
  /** Nó à direita do campo, sobreposto (ex.: botão "Consultar"). */
  rightSlot?: React.ReactNode;
  /** Classe do wrapper (largura/min-width). */
  className?: string;
  /** Classe do label (default `text-base`; o wizard usa `text-sm`). */
  labelClassName?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

/**
 * Campo de formulário rotulado compartilhado (label em cima, input h-12
 * arredondado, erro em vermelho embaixo). Consolida o padrão que era duplicado
 * — antes privado como `FieldInput` no `OrganizerEditDrawer` e como `SignupField`
 * no wizard de organizador. Suporta `readOnly`, `tooltip` no label e `rightSlot`
 * (botão embutido, ex.: "Consultar").
 *
 * Usa o primitivo `@/components/Input` por dentro, com overrides de classe para
 * o visual do campo rotulado (h-12/rounded-lg, sem focus-ring). `maxLength` é
 * aplicado no onChange (não repassado ao Input, que exibiria o contador de
 * caracteres).
 */
export function FormField({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  inputMode,
  autoComplete,
  maxLength,
  disabled,
  readOnly,
  tooltip,
  rightSlot,
  className,
  labelClassName,
  onKeyDown,
  onBlur,
}: FormFieldProps) {
  const handleChange = onChange
    ? (e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value;
        onChange(maxLength ? v.slice(0, maxLength) : v);
      }
    : undefined;

  // Campos de senha ganham o botão "olho" (mostrar/ocultar), igual aos logins.
  const [showPassword, setShowPassword] = React.useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && showPassword ? "text" : type;

  return (
    <div className={cn("flex flex-1 flex-col gap-2 min-w-0", className)}>
      <label
        className={cn(
          // `min-h-6` (24px) cobre a altura do botão do tooltip (ícone size-5 20px
          // + padding p-0.5), mantendo o label com a MESMA altura com ou sem
          // tooltip → campos lado a lado no grid alinham.
          "flex min-h-6 items-center gap-1.5 font-normal font-family-dm-sans text-gray-12 leading-[1.3]",
          labelClassName ?? "text-base",
        )}
      >
        {label}
        {tooltip ? <FieldHelpTooltip label={label} text={tooltip} /> : null}
      </label>
      <div className="relative">
        <Input
          type={effectiveType}
          value={value}
          onChange={handleChange}
          onKeyDown={onKeyDown}
          onBlur={onBlur}
          placeholder={placeholder}
          inputMode={inputMode}
          autoComplete={autoComplete}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={!!error}
          className={cn(
            // Overrides do primitivo Input (h-10/rounded-md/ring) para o campo rotulado.
            "h-12 rounded-lg py-0 shadow-none font-family-dm-sans focus-visible:ring-0",
            readOnly
              ? "bg-gray-3 border-gray-4 text-gray-12 cursor-default focus-visible:border-gray-4"
              : "bg-gray-1 focus-visible:border-gray-8",
            error && !readOnly &&
              "border-red-8 focus-visible:border-red-8 aria-invalid:border-red-8",
            !error && "border-gray-6",
            "aria-invalid:ring-0",
            rightSlot ? "pr-[110px]" : isPassword ? "pr-11" : "",
          )}
        />
        {rightSlot ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {rightSlot}
          </div>
        ) : isPassword ? (
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="size-5" />
            ) : (
              <Eye className="size-5" />
            )}
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-red-11 font-family-dm-sans leading-[1.3]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
