/**
 * Primeira letra exibível do nome (suporta emojis / surrogate pairs) para placeholders.
 */
export function itemInitialLetter(
  name: string | null | undefined,
  fallbackId?: string | null
): string {
  const trimmed = name?.trim();
  if (trimmed) {
    const ch = [...trimmed][0];
    return ch ? ch.toLocaleUpperCase("pt-BR") : "?";
  }
  const id = fallbackId?.trim();
  if (id) {
    const ch = [...id][0];
    return ch ? ch.toLocaleUpperCase("pt-BR") : "?";
  }
  return "?";
}
