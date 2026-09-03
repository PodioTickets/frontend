import type Quill from "quill";
import { describe, expect, it } from "vitest";
import {
  registerTopicQuillPasteBackgroundStripper,
  stripBackgroundFromDelta,
  withPastedBackgroundPreserved,
} from "../registerTopicQuillPasteBackground";

type Matcher = (node: Node, delta: unknown) => { ops?: { attributes?: Record<string, unknown> }[] };

/**
 * Quill mínimo: captura o matcher registrado para que o teste possa dispará-lo
 * do mesmo jeito que a cadeia do clipboard faria numa colagem real.
 */
function fakeQuillCapturingMatcher(): () => Matcher {
  let captured: Matcher | undefined;
  const quill = {
    getModule: () => ({
      addMatcher: (_selector: string | number, matcher: Matcher) => {
        captured = matcher;
      },
    }),
  } as unknown as Quill;
  registerTopicQuillPasteBackgroundStripper(quill);
  return () => {
    if (!captured) throw new Error("matcher não foi registrado");
    return captured;
  };
}

/** Delta como o `matchStyles` do Quill entrega depois de ler o style inline. */
function pastedFromChatGpt() {
  return {
    ops: [
      {
        insert: "Texto colado",
        attributes: { background: "#ffffff", color: "rgb(0, 0, 0)" },
      },
    ],
  };
}

describe("stripBackgroundFromDelta", () => {
  it("remove o background que o ChatGPT/Google Docs trazem", () => {
    const delta = stripBackgroundFromDelta(pastedFromChatGpt());
    expect(delta.ops[0].attributes).not.toHaveProperty("background");
  });

  it("preserva o color — só o fundo foi acordado", () => {
    const delta = stripBackgroundFromDelta(pastedFromChatGpt());
    expect(delta.ops[0].attributes).toEqual({ color: "rgb(0, 0, 0)" });
  });

  it("preserva formatação de texto (negrito, link, lista)", () => {
    const delta = stripBackgroundFromDelta({
      ops: [
        { insert: "negrito", attributes: { bold: true, background: "#fff" } },
        { insert: "link", attributes: { link: "https://podiotickets.com" } },
        { insert: "\n", attributes: { list: "bullet" } },
      ],
    });
    expect(delta.ops[0].attributes).toEqual({ bold: true });
    expect(delta.ops[1].attributes).toEqual({
      link: "https://podiotickets.com",
    });
    expect(delta.ops[2].attributes).toEqual({ list: "bullet" });
  });

  it("apaga o `attributes` quando o background era o único formato", () => {
    // `attributes: {}` não equivale a op sem attributes na comparação do Quill.
    const delta = stripBackgroundFromDelta({
      ops: [{ insert: "só fundo", attributes: { background: "#ffffff" } }],
    });
    expect(delta.ops[0]).not.toHaveProperty("attributes");
  });

  it("não quebra em ops sem attributes nem em delta sem ops", () => {
    expect(() =>
      stripBackgroundFromDelta({ ops: [{ insert: "puro" }] }),
    ).not.toThrow();
    expect(() => stripBackgroundFromDelta({})).not.toThrow();
  });
});

describe("withPastedBackgroundPreserved", () => {
  it("mantém o background das cargas de conteúdo salvo", () => {
    // Simula o `dangerouslyPasteHTML` de abertura do tópico: dentro da trava o
    // matcher devolve o delta intacto, então o marca-texto da toolbar sobrevive.
    const matcher = fakeQuillCapturingMatcher()();
    const node = document.createElement("span");
    const grifado = () => ({
      ops: [{ insert: "grifado", attributes: { background: "#ffff00" } }],
    });

    const preserved = withPastedBackgroundPreserved(() =>
      matcher(node, grifado()),
    );
    expect(preserved.ops?.[0].attributes).toEqual({ background: "#ffff00" });

    // Fora da trava — colagem de verdade — o mesmo matcher limpa.
    const pasted = matcher(node, grifado());
    expect(pasted.ops?.[0]).not.toHaveProperty("attributes");
  });

  it("devolve o valor de fn e religa a trava mesmo se fn lançar", () => {
    const matcher = fakeQuillCapturingMatcher()();
    const node = document.createElement("span");

    expect(withPastedBackgroundPreserved(() => 42)).toBe(42);
    expect(() =>
      withPastedBackgroundPreserved(() => {
        throw new Error("boom");
      }),
    ).toThrow("boom");

    const depois = matcher(node, pastedFromChatGpt());
    expect(depois.ops?.[0].attributes).not.toHaveProperty("background");
  });
});
