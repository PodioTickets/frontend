/**
 * Consulta CNPJ via rota interna `/api/cnpj` (BrasilAPI). Espelha `lookupCep.ts`.
 * Usada pelo botão "Consultar" do auto-cadastro de organizador para autopreencher
 * razão social e nome fantasia.
 */
export interface BrasilApiCnpjResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  // A BrasilAPI retorna muitos outros campos (endereço, sócios, etc.); só
  // tipamos os que consumimos.
  [key: string]: unknown;
}

export type LookupCnpjResult =
  | { ok: true; data: BrasilApiCnpjResponse }
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

  const data = (await response.json()) as BrasilApiCnpjResponse;
  return { ok: true, data };
}
