import { Button } from "@/components/Button";
import { cn } from "@/utils/cn";

/**
 * Rodapé canônico de modal: botão "Cancelar" (outline) + botão de ação
 * (default = verde `#59E373`), lado a lado, ocupando a largura. Substitui o
 * footer copy-paste `<div className="flex gap-2 ..."><Button outline/><Button/>`
 * repetido nos modais — inclusive os que reimplementavam o verde à mão (já é a
 * `variant="default"` do `<Button>`).
 *
 * Aplicar SÓ onde o footer segue esse shape de 2 botões. Modais multi-step, com
 * botões extras (reenviar) ou layout próprio continuam com markup dedicado.
 */
export interface ModalFooterActionsProps {
  /** Texto do botão de ação. */
  submitLabel: string;
  /** Texto enquanto submetendo (default: "Salvando..."). */
  submitLoadingLabel?: string;
  /** Callback do Cancelar. */
  onCancel: () => void;
  /** Estado de submissão: troca o label e desabilita ambos. */
  isSubmitting?: boolean;
  /** Desabilita o botão de ação por validação (combinado com `isSubmitting`). */
  submitDisabled?: boolean;
  /**
   * `id` do `<form>` quando o botão de ação dispara um form externo via atributo
   * `form` (submit fora da árvore do form). Omita para um `onClick` direto.
   */
  formId?: string;
  /** Handler de clique do botão de ação (quando não usa `formId`/submit nativo). */
  onSubmit?: () => void;
  /** Texto do Cancelar (default: "Cancelar"). */
  cancelLabel?: string;
  /** Override de className do wrapper (ex.: padding/justify específicos do modal). */
  className?: string;
  /** Override de className do botão de ação (ex.: `px-8` específico do modal). */
  submitClassName?: string;
  /** Override de className do Cancelar. */
  cancelClassName?: string;
}

export function ModalFooterActions({
  submitLabel,
  submitLoadingLabel = "Salvando...",
  onCancel,
  isSubmitting = false,
  submitDisabled = false,
  formId,
  onSubmit,
  cancelLabel = "Cancelar",
  className,
  submitClassName,
  cancelClassName,
}: ModalFooterActionsProps) {
  return (
    <div className={cn("flex gap-2 w-full", className)}>
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
        className={cn(
          "flex-1 h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope",
          cancelClassName,
        )}
      >
        {cancelLabel}
      </Button>
      <Button
        type={formId ? "submit" : "button"}
        form={formId}
        onClick={onSubmit}
        disabled={isSubmitting || submitDisabled}
        className={cn("flex-1 h-12 font-bold text-base font-manrope", submitClassName)}
      >
        {isSubmitting ? submitLoadingLabel : submitLabel}
      </Button>
    </div>
  );
}
