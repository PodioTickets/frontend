import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const cep = searchParams.get("cep");

  if (!cep || cep.length !== 8) {
    return NextResponse.json(
      { error: "CEP inválido" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar CEP" },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching CEP:", error);
    return NextResponse.json(
      { error: "Erro ao buscar CEP" },
      { status: 500 }
    );
  }
}
