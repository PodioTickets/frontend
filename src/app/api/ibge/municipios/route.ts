import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const uf = request.nextUrl.searchParams.get("uf");

  if (!uf || uf.length !== 2) {
    return NextResponse.json({ error: "UF inválida" }, { status: 400 });
  }

  try {
    const response = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf.toUpperCase()}/municipios?orderBy=nome`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar municípios" },
        { status: response.status },
      );
    }

    const data: { nome: string }[] = await response.json();
    return NextResponse.json(data.map((m) => m.nome));
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar municípios" },
      { status: 500 },
    );
  }
}
