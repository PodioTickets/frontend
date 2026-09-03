import type Quill from "quill";

/**
 * Remove o `background` do conteúdo COLADO no editor de tópicos.
 *
 * ChatGPT e Google Docs põem `style="background-color:#ffffff"` em praticamente
 * todo `<span>` do HTML que mandam pro clipboard. O `matchStyles` do Quill
 * (`BackgroundStyle` está em `STYLE_ATTRIBUTORS`) converte isso no atributo
 * `background` do Delta — o branco é gravado no banco e o tópico fica ilegível
 * no tema escuro.
 *
 * A limpeza acontece no Delta, e não no HTML, porque assim cobre de uma vez as
 * duas origens que o Quill reconhece: o `style` inline (via `matchStyles`) e as
 * classes `ql-bg-*` (via `matchAttributor`). As duas desembocam no MESMO
 * atributo, então um único ponto de corte basta.
 *
 * Só `background` sai; `color` continua passando — decisão de produto, para não
 * apagar destaques de cor intencionais.
 *
 * Trade-off aceito: copiar de dentro do próprio editor e colar de volta também
 * perde o marca-texto, porque o Quill trata isso como uma colagem qualquer.
 */

/** Recorte mínimo do Delta do Quill — só o que este módulo precisa tocar. */
interface DeltaOp {
  insert?: unknown;
  attributes?: Record<string, unknown>;
}

interface DeltaLike {
  ops?: DeltaOp[];
}

interface ClipboardWithMatcher {
  addMatcher(
    selector: string | number,
    matcher: (node: Node, delta: DeltaLike) => DeltaLike,
  ): void;
}

/**
 * Trava de bypass para as cargas que NÃO são colagem do usuário.
 *
 * `dangerouslyPasteHTML` roda a mesma cadeia de matchers de uma colagem real.
 * Sem esta trava, abrir um tópico salvo apagaria o marca-texto aplicado de
 * propósito pela paleta da toolbar — e o save seguinte gravaria a perda.
 */
let preserveBackground = false;

/**
 * Executa `fn` com o stripper desligado.
 *
 * Síncrono de propósito: `dangerouslyPasteHTML` converte e aplica o Delta na
 * mesma pilha de chamada, então o `finally` religa o stripper antes que
 * qualquer colagem do usuário possa acontecer. Guarda o valor anterior em vez
 * de assumir `false` para aguentar chamadas aninhadas.
 */
export function withPastedBackgroundPreserved<T>(fn: () => T): T {
  const previous = preserveBackground;
  preserveBackground = true;
  try {
    return fn();
  } finally {
    preserveBackground = previous;
  }
}

/** Remove o atributo `background` das ops, in-place. Exportada para teste. */
export function stripBackgroundFromDelta<T extends DeltaLike>(delta: T): T {
  delta.ops?.forEach((op) => {
    if (!op.attributes || !("background" in op.attributes)) return;
    delete op.attributes.background;
    // Um `attributes: {}` vazio não é equivalente a op sem `attributes` na
    // comparação do Quill — zerado, o campo tem que sumir de vez.
    if (Object.keys(op.attributes).length === 0) delete op.attributes;
  });
  return delta;
}

/**
 * Registra o matcher. Chamar DEPOIS do `new Quill(...)`: matchers customizados
 * entram no fim da fila (`clipboard.matchers.push`), então este roda depois do
 * `matchStyles`/`matchAttributor` e já encontra o `background` materializado.
 */
export function registerTopicQuillPasteBackgroundStripper(quill: Quill): void {
  const clipboard = quill.getModule(
    "clipboard",
  ) as unknown as ClipboardWithMatcher;
  clipboard.addMatcher(Node.ELEMENT_NODE, (_node, delta) =>
    preserveBackground ? delta : stripBackgroundFromDelta(delta),
  );
}
