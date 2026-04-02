/**
 * Consulta CEP via rota interna `/api/cep` (ViaCEP), mesmo fluxo das telas de informações do evento.
 */
export interface ViaCEPAddressResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export type LookupCepResult =
  | { ok: true; data: ViaCEPAddressResponse }
  | { ok: false; message: string };

export async function lookupCepDigits(
  cepDigits: string
): Promise<LookupCepResult> {
  const clean = cepDigits.replace(/\D/g, "");
  if (clean.length !== 8) {
    return { ok: false, message: "CEP inválido" };
  }

  const response = await fetch(`/api/cep?cep=${clean}`);
  if (!response.ok) {
    return { ok: false, message: "Erro ao buscar CEP" };
  }

  const data = (await response.json()) as ViaCEPAddressResponse;
  if (data.erro) {
    return { ok: false, message: "CEP não encontrado" };
  }

  return { ok: true, data };
}
