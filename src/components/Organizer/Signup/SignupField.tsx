"use client";

import { FormField, type FormFieldProps } from "@/components/FormField";

/**
 * Preset do `FormField` compartilhado para o wizard de organizador — apenas
 * ajusta o tamanho do label (`text-sm`, conforme o Figma). Toda a marcação do
 * campo (input, erro, tooltip, rightSlot) vive no `FormField`.
 */
export function SignupField(props: FormFieldProps) {
  return <FormField labelClassName="text-sm" {...props} />;
}
