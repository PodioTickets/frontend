/**
 * Máscaras de documento/contato/CEP compartilhadas.
 *
 * Extraídas das versões antes privadas em `components/Admin/OrganizerEditDrawer.tsx`
 * para reuso (auto-cadastro de organizador, drawers admin, etc). Todas aplicam a
 * máscara enquanto o usuário digita: removem não-dígitos e re-aplicam o formato.
 */

/** Remove tudo que não for dígito. */
export function onlyDigits(v?: string | null): string {
  return (v ?? "").replace(/\D/g, "");
}

/** `00.000.000/0000-00` (progressivo). */
export function formatCNPJ(v?: string | null): string {
  if (!v) return "";
  const d = onlyDigits(v).slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/** `000.000.000-00` (progressivo). */
export function formatCPF(v?: string | null): string {
  if (!v) return "";
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Escolhe CPF (≤11 dígitos) ou CNPJ pela quantidade de dígitos. */
export function formatCPFOrCNPJ(v?: string | null): string {
  if (!v) return "";
  const d = onlyDigits(v);
  return d.length <= 11 ? formatCPF(d) : formatCNPJ(d);
}

/** `(00) 00000-0000` — descarta DDI +55 quando presente. */
export function formatPhone(v?: string | null): string {
  if (!v) return "";
  let d = onlyDigits(v);
  if (d.startsWith("55") && d.length > 11) d = d.slice(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** `00000-000`. */
export function formatCEP(v?: string | null): string {
  if (!v) return "";
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}
