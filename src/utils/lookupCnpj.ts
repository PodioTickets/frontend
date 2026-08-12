/**
 * Consulta CNPJ via rota interna `/api/cnpj` (cnpj.ws público + fallback
 * BrasilAPI). Espelha `lookupCep.ts`. Usada no auto-cadastro de organizador para
 * autopreencher organização + endereço + contatos ao completar o CNPJ.
 *
 * A rota já NORMALIZA a resposta para `CnpjLookupData` (shape estável),
 * independente do provedor.
 */

/** Shape estável retornado por `/api/cnpj`. */
export interface CnpjLookupData {
  legalName: string;
  tradeName: string;
  responsibleName: string; // nome do responsável (1º sócio/administrador)
  zipCode: string; // só dígitos
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string; // UF
  email: string;
  phone: string; // só dígitos (DDD + número)
}

export type LookupCnpjResult =
  | { ok: true; data: CnpjLookupData }
  | { ok: false; message: string };

export async function lookupCnpjDigits(
  cnpjDigits: string,
): Promise<LookupCnpjResult> {
  const clean = cnpjDigits.replace(/\D/g, "");
  if (clean.length !== 14) {
    return { ok: false, message: "CNPJ inválido" };
  }

  let response: Response;
  try {
    response = await fetch(`/api/cnpj?cnpj=${clean}`);
  } catch {
    return { ok: false, message: "Erro ao consultar CNPJ" };
  }

  if (!response.ok) {
    const message =
      response.status === 404
        ? "CNPJ não encontrado"
        : "Erro ao consultar CNPJ";
    return { ok: false, message };
  }

  const data = (await response.json()) as CnpjLookupData;
  return { ok: true, data };
}
