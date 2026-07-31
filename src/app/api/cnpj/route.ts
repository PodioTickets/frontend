import { NextRequest, NextResponse } from "next/server";

/**
 * Consulta CNPJ (dados públicos da Receita) para autopreencher o auto-cadastro
 * de organizador — razão social, nome fantasia, endereço e contatos.
 *
 * Provedor primário: cnpj.ws. Com `CNPJ_WS_TOKEN` usa a API comercial autenticada
 * (rate-limit alto); sem token cai no endpoint público (~3 req/min). Como o proxy
 * é server-side (todos os usuários compartilham o IP), há FALLBACK automático para
 * a BrasilAPI em caso de erro/limite — disponibilidade é prioridade. A resposta é
 * NORMALIZADA para um shape estável, isolando o cliente do formato de cada provedor.
 */

const digitsOnly = (v: string) => v.replace(/\D/g, "");

// Token da API autenticada do cnpj.ws (server-only). Presente → usa o endpoint
// comercial (rate-limit alto); ausente → cai no público (~3 req/min).
const CNPJ_WS_TOKEN = process.env.CNPJ_WS_TOKEN?.trim();

/** Shape estável consumido pelo front (independente do provedor). */
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

const empty: CnpjLookupData = {
  legalName: "",
  tradeName: "",
  responsibleName: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  email: "",
  phone: "",
};

/**
 * Extrai o nome do responsável do quadro societário. Preferimos o
 * administrador; se não houver qualificação clara, o primeiro sócio.
 */
function pickResponsible(
  socios: any[],
  nameKey: string,
  qualKey?: (s: any) => string,
): string {
  if (!Array.isArray(socios) || socios.length === 0) return "";
  const admin = qualKey
    ? socios.find((s) => /administrador/i.test(qualKey(s) ?? ""))
    : undefined;
  const chosen = admin ?? socios[0];
  return String(chosen?.[nameKey] ?? "").trim();
}

/** Normaliza a resposta do cnpj.ws público (estabelecimento aninhado). */
function fromCnpjWs(raw: any): CnpjLookupData {
  const est = raw?.estabelecimento ?? {};
  const street = [est.tipo_logradouro, est.logradouro]
    .filter(Boolean)
    .join(" ")
    .trim();
  const phone = `${digitsOnly(String(est.ddd1 ?? ""))}${digitsOnly(
    String(est.telefone1 ?? ""),
  )}`;
  return {
    ...empty,
    legalName: (raw?.razao_social ?? "").trim(),
    tradeName: (est.nome_fantasia ?? "").trim(),
    responsibleName: pickResponsible(
      raw?.socios,
      "nome",
      (s) => s?.qualificacao_socio?.descricao ?? "",
    ),
    zipCode: digitsOnly(String(est.cep ?? "")),
    street,
    number: (est.numero ?? "").trim(),
    neighborhood: (est.bairro ?? "").trim(),
    city: (est.cidade?.nome ?? "").trim(),
    state: (est.estado?.sigla ?? "").trim(),
    email: (est.email ?? "").trim().toLowerCase(),
    phone,
  };
}

/** Normaliza a resposta da BrasilAPI (shape plano). */
function fromBrasilApi(raw: any): CnpjLookupData {
  return {
    ...empty,
    legalName: (raw?.razao_social ?? "").trim(),
    tradeName: (raw?.nome_fantasia ?? "").trim(),
    responsibleName: pickResponsible(
      raw?.qsa,
      "nome_socio",
      (s) => s?.qualificacao_socio ?? "",
    ),
    zipCode: digitsOnly(String(raw?.cep ?? "")),
    street: (raw?.logradouro ?? "").trim(),
    number: (raw?.numero ?? "").trim(),
    neighborhood: (raw?.bairro ?? "").trim(),
    city: (raw?.municipio ?? "").trim(),
    state: (raw?.uf ?? "").trim(),
    email: (raw?.email ?? "").trim().toLowerCase(),
    phone: digitsOnly(String(raw?.ddd_telefone_1 ?? "")),
  };
}

/** Marca 404 (não encontrado) para diferenciar de falha do provedor. */
class NotFoundError extends Error {}

async function fetchCnpjWs(cnpj: string): Promise<CnpjLookupData> {
  // Com token → API comercial (autenticada, x_api_token). Sem token → pública.
  // Mesmo shape de resposta nos dois, então `fromCnpjWs` serve para ambos.
  const url = CNPJ_WS_TOKEN
    ? `https://comercial.cnpj.ws/cnpj/${cnpj}`
    : `https://publica.cnpj.ws/cnpj/${cnpj}`;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (CNPJ_WS_TOKEN) headers.x_api_token = CNPJ_WS_TOKEN;

  const res = await fetch(url, { headers });
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`cnpj.ws ${res.status}`);
  return fromCnpjWs(await res.json());
}

async function fetchBrasilApi(cnpj: string): Promise<CnpjLookupData> {
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) throw new NotFoundError();
  if (!res.ok) throw new Error(`brasilapi ${res.status}`);
  return fromBrasilApi(await res.json());
}

export async function GET(request: NextRequest) {
  const cnpj = digitsOnly(request.nextUrl.searchParams.get("cnpj") ?? "");
  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  try {
    // Primário: cnpj.ws público.
    const data = await fetchCnpjWs(cnpj);
    return NextResponse.json(data);
  } catch (primaryError) {
    if (primaryError instanceof NotFoundError) {
      return NextResponse.json({ error: "CNPJ não encontrado" }, { status: 404 });
    }
    // Falha/limite do primário → tenta BrasilAPI.
    try {
      const data = await fetchBrasilApi(cnpj);
      return NextResponse.json(data);
    } catch (fallbackError) {
      if (fallbackError instanceof NotFoundError) {
        return NextResponse.json(
          { error: "CNPJ não encontrado" },
          { status: 404 },
        );
      }
      console.error("Error fetching CNPJ:", primaryError, fallbackError);
      return NextResponse.json(
        { error: "Erro ao consultar CNPJ" },
        { status: 502 },
      );
    }
  }
}
