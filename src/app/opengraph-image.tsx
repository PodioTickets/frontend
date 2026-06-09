import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Imagem Open Graph da HOME gerada dinamicamente (Next App Router file
 * convention) — injeta `og:image` automaticamente e o crawler do Twitter cai
 * nela na ausência de `twitter:image`.
 *
 * Por que gerar em vez de apontar pro PNG: a logo é um asset "justo" (sem
 * margem). Em `summary_large_image` ela apareceria colada nas bordas/cortada.
 * Aqui compomos a logo centralizada com PADDING generoso sobre fundo branco,
 * no tamanho recomendado de 1200×630.
 *
 * Runtime Node (não edge) porque lemos o arquivo do `public/` via `fs`.
 */
export const runtime = "nodejs";
export const alt = "PódioTicket";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  // Logo horizontal em alta resolução (1400×240) — nítida ao escalar.
  const logo = await readFile(
    join(process.cwd(), "public/images/logo_graph.jpeg"),
  );
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  // 1400×240 ⇒ proporção ~5.83. Largura 760 → altura ~130. O padding do
  // container (140px) garante a margem ("respiro") pedida ao redor da logo.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          padding: "140px",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoSrc}
          width={760}
          height={130}
          alt="PódioTicket"
          style={{ objectFit: "contain" }}
        />
      </div>
    ),
    { ...size },
  );
}
