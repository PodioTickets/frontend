import { ptBR, type Messages, type Namespace } from "./messages/pt-BR";

export type TranslateVars = Record<string, string | number>;
export type Translator<N extends Namespace> = (
  key: keyof Messages[N] & string,
  vars?: TranslateVars,
) => string;

/**
 * `t("chave", { nome: "Ana" })` → troca `{nome}` no texto. Chave ausente no idioma
 * cai no pt-BR (nunca mostra a chave crua). Plural: chaves separadas (`xOne`/`xOther`)
 * escolhidas no componente — mais simples que ICU e suficiente pros 3 idiomas.
 */
export function createTranslator<N extends Namespace>(messages: Messages, ns: N): Translator<N> {
  return (key, vars) => {
    const dict = messages[ns] as Record<string, string> | undefined;
    const text = dict?.[key] ?? (ptBR[ns] as Record<string, string>)[key] ?? key;
    if (!vars) return text;
    return text.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in vars ? String(vars[name]) : match,
    );
  };
}

/**
 * Sempre pt-BR, independente do idioma do site — para textos que SAEM para o
 * suporte/organizador (WhatsApp pré-preenchido, assunto e corpo de e-mail), que são
 * brasileiros e não leem o idioma escolhido pelo comprador.
 */
export function ptBRTranslator<N extends Namespace>(ns: N): Translator<N> {
  return createTranslator(ptBR, ns);
}
