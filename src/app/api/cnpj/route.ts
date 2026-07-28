import { NextRequest, NextResponse } from "next/server";

/**
 * Consulta CNPJ na BrasilAPI (dados públicos da Receita) — usada pelo botão
 * "Consultar" do auto-cadastro de organizador para autopreencher razão social /
 * nome fantasia. Mesmo padrão de proxy interno do `/api/cep`.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cnpj = (searchParams.get("cnpj") ?? "").replace(/\D/g, "");

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: "CNPJ inválido" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      { method: "GET", headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      // 404 = CNPJ não encontrado na base; demais = erro do provedor.
      const status = response.status === 404 ? 404 : 502;
      return NextResponse.json(
        { error: status === 404 ? "CNPJ não encontrado" : "Erro ao consultar CNPJ" },
        { status },
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching CNPJ:", error);
    return NextResponse.json({ error: "Erro ao consultar CNPJ" }, { status: 500 });
  }
}
