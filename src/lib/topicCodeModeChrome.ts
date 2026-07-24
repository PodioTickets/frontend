/**
 * Estado ativo do botão de MODO DEV (código-fonte) na toolbar do Quill, usado
 * pelo `TopicModal`.
 *
 * O botão é o `code-block`, com o handler sobrescrito para alternar a área de
 * edição inteira em vez de aplicar o formato. Como não é um formato de verdade,
 * o `ql-active` que o Quill gerencia por seleção nunca dispara nele — o estado
 * é sincronizado aqui.
 *
 * O detalhe que fazia isso falhar em silêncio: o `TopicModal` chama
 * `new Quill(quillRef.current)`, então esse elemento VIRA o `.ql-container` e a
 * `.ql-toolbar` é inserida como IRMÃ ANTERIOR dele — fora do seu escopo. Um
 * `root.querySelector(".ql-toolbar")` devolve `null` e o botão nunca era
 * marcado. `findQuillToolbar` cobre as duas topologias.
 */

/** Fundo do botão ativo — mesma cor da regra `.ql-active` aplicada no init. */
const ACTIVE_BG = "#e8e8e8";
/** Fundo padrão dos botões da toolbar. */
const IDLE_BG = "#f9f9f9";
/** Azul do estado ativo do tema snow (`.ql-snow .ql-active .ql-stroke`). */
const ACTIVE_ACCENT = "#06c";
/** Cinza padrão dos ícones da toolbar (`.ql-snow .ql-stroke`/`.ql-fill`). */
const IDLE_ACCENT = "#444";

/**
 * Marcação PRÓPRIA do modo dev. Existe porque o Quill é dono do `ql-active`:
 * a cada `editor-change` (clicar fora, perder a seleção, focar o textarea) o
 * módulo toolbar recalcula os formatos da seleção e REMOVE `ql-active` de todo
 * botão que não corresponda a um formato ativo — o que fazia o destaque azul
 * sumir enquanto o modo dev continuava ligado. Esta classe o Quill não toca.
 */
export const DEV_MODE_ACTIVE_CLASS = "pt-code-mode-active";

/**
 * Localiza a toolbar a partir do container do editor, tolerando as duas formas:
 * irmã anterior (Quill inicializado sobre o próprio elemento) ou descendente
 * (elemento apenas envolvendo o editor).
 */
export function findQuillToolbar(
  root: HTMLElement | null | undefined,
): HTMLElement | null {
  if (!root) return null;

  const previous = root.previousElementSibling;
  if (previous instanceof HTMLElement && previous.classList.contains("ql-toolbar")) {
    return previous;
  }
  return (root.parentElement?.querySelector(".ql-toolbar") ??
    root.querySelector(".ql-toolbar")) as HTMLElement | null;
}

/**
 * Liga/desliga o destaque do botão de modo dev.
 * Retorna `false` quando o botão não foi encontrado (toolbar ainda não montada).
 */
export function syncDevModeButtonState(
  root: HTMLElement | null | undefined,
  isCodeMode: boolean,
): boolean {
  const button = findQuillToolbar(root)?.querySelector(
    ".ql-code-block",
  ) as HTMLElement | null;
  if (!button) return false;

  button.classList.toggle("ql-active", isCodeMode);
  button.classList.toggle(DEV_MODE_ACTIVE_CLASS, isCodeMode);
  // Inline porque o resto da toolbar também é estilizado inline no init e
  // venceria uma regra de CSS para `.ql-active`.
  button.style.backgroundColor = isCodeMode ? ACTIVE_BG : IDLE_BG;

  // Cor do ícone aplicada INLINE nos dois sentidos, nunca via `.ql-active`:
  // essa classe é do Quill, que a adiciona e remove sozinho a cada
  // `editor-change`. Fixar o cinza na saída (em vez de limpar para "") é o que
  // impede o botão de continuar azul quando o Quill re-marca o `code-block`
  // como formato ativo logo depois de voltar ao WYSIWYG — aqui ele não é um
  // formato de verdade, é um toggle de modo.
  const accent = isCodeMode ? ACTIVE_ACCENT : IDLE_ACCENT;
  button.querySelectorAll<SVGElement>(".ql-stroke").forEach((el) => {
    el.style.stroke = accent;
  });
  button.querySelectorAll<SVGElement>(".ql-fill").forEach((el) => {
    el.style.fill = accent;
  });
  return true;
}
