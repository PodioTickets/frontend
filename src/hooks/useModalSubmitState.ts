import { useCallback, useState } from "react";

/**
 * Estado de submissão compartilhado pelos modais com formulário. Antes cada
 * modal repetia `setIsSubmitting(true); try { ... } finally { setIsSubmitting(false) }`
 * — propenso a esquecer o `finally` (botão trava "Salvando..." pra sempre).
 *
 * `runSubmit` encapsula esse ciclo: liga o flag, executa o trabalho e SEMPRE
 * desliga no `finally`, mesmo se `fn` lançar. NÃO engole o erro — quem chama
 * mantém seu próprio `try/catch` (toasts) ou deixa propagar.
 *
 * @example
 * const { isSubmitting, runSubmit } = useModalSubmitState();
 * const handleSubmit = () =>
 *   runSubmit(async () => {
 *     try { await api(); toast.success("ok"); onClose(); }
 *     catch (e) { toast.error(msg(e)); }
 *   });
 */
export function useModalSubmitState(initial = false) {
  const [isSubmitting, setIsSubmitting] = useState(initial);

  const runSubmit = useCallback(
    async <T>(fn: () => Promise<T>): Promise<T> => {
      setIsSubmitting(true);
      try {
        return await fn();
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  return { isSubmitting, setIsSubmitting, runSubmit };
}
