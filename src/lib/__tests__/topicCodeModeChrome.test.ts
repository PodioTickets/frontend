import { describe, it, expect, beforeEach } from "vitest";
import {
  DEV_MODE_ACTIVE_CLASS,
  findQuillToolbar,
  syncDevModeButtonState,
} from "../topicCodeModeChrome";

const TOOLBAR_HTML = `
  <div class="ql-toolbar">
    <span class="ql-formats">
      <button class="ql-bold"></button>
      <button class="ql-code-block">
        <svg viewBox="0 0 18 18">
          <polyline class="ql-even ql-stroke" points="5 7 3 9 5 11"></polyline>
          <rect class="ql-fill" x="8" y="4" width="2" height="10"></rect>
        </svg>
      </button>
    </span>
  </div>`;

/**
 * Topologia REAL do `TopicModal`: `new Quill(quillRef.current)` transforma o
 * próprio elemento no `.ql-container` e insere a toolbar como IRMÃ ANTERIOR.
 */
function buildSiblingToolbarDom(): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `${TOOLBAR_HTML}<div class="ql-container"><div class="ql-editor"></div></div>`;
  document.body.appendChild(wrapper);
  return wrapper.querySelector(".ql-container") as HTMLElement;
}

/** Topologia alternativa: o elemento apenas ENVOLVE toolbar + editor. */
function buildNestedToolbarDom(): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = `${TOOLBAR_HTML}<div class="ql-editor"></div>`;
  document.body.appendChild(root);
  return root;
}

const codeButton = (root: HTMLElement) =>
  findQuillToolbar(root)?.querySelector(".ql-code-block") as HTMLElement;

describe("topicCodeModeChrome — botão de modo dev", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("findQuillToolbar", () => {
    it("acha a toolbar quando ela é IRMÃ do container (caso real do TopicModal)", () => {
      const root = buildSiblingToolbarDom();
      // Regressão: `root.querySelector('.ql-toolbar')` devolvia null aqui, e o
      // botão nunca era marcado como ativo.
      expect(root.querySelector(".ql-toolbar")).toBeNull();
      expect(findQuillToolbar(root)).not.toBeNull();
    });

    it("acha a toolbar quando ela é descendente", () => {
      expect(findQuillToolbar(buildNestedToolbarDom())).not.toBeNull();
    });

    it("devolve null sem root / sem toolbar", () => {
      expect(findQuillToolbar(null)).toBeNull();
      expect(findQuillToolbar(document.createElement("div"))).toBeNull();
    });
  });

  describe("syncDevModeButtonState", () => {
    it("liga o destaque ao entrar no modo dev", () => {
      const root = buildSiblingToolbarDom();

      expect(syncDevModeButtonState(root, true)).toBe(true);

      const button = codeButton(root);
      expect(button.classList.contains("ql-active")).toBe(true);
      expect(button.style.backgroundColor).toBe("rgb(232, 232, 232)");
    });

    it("desliga ao voltar ao editor", () => {
      const root = buildSiblingToolbarDom();

      syncDevModeButtonState(root, true);
      syncDevModeButtonState(root, false);

      const button = codeButton(root);
      expect(button.classList.contains("ql-active")).toBe(false);
      expect(button.style.backgroundColor).toBe("rgb(249, 249, 249)");
    });

    it("mantém o destaque azul depois que o Quill remove o `ql-active`", () => {
      // Regressão do sintoma relatado: entrar no modo dev pintava o botão de
      // azul, mas clicar em qualquer outro lugar disparava o `editor-change` do
      // Quill, que recalcula os formatos e limpa o `ql-active` de todo botão —
      // o modo dev seguia LIGADO e o destaque sumia.
      const root = buildSiblingToolbarDom();
      syncDevModeButtonState(root, true);

      const button = codeButton(root);
      button.classList.remove("ql-active"); // <- o que o Quill faz sozinho

      expect(button.classList.contains(DEV_MODE_ACTIVE_CLASS)).toBe(true);
      const stroke = button.querySelector(".ql-stroke") as SVGElement;
      const fill = button.querySelector(".ql-fill") as SVGElement;
      expect(stroke.style.stroke).toBe("rgb(0, 102, 204)");
      expect(fill.style.fill).toBe("rgb(0, 102, 204)");
      expect(button.style.backgroundColor).toBe("rgb(232, 232, 232)");
    });

    it("devolve o ícone ao cinza IMEDIATAMENTE ao sair do modo dev", () => {
      const root = buildSiblingToolbarDom();

      syncDevModeButtonState(root, true);
      syncDevModeButtonState(root, false);

      const button = codeButton(root);
      expect(button.classList.contains(DEV_MODE_ACTIVE_CLASS)).toBe(false);
      expect((button.querySelector(".ql-stroke") as SVGElement).style.stroke).toBe(
        "rgb(68, 68, 68)",
      );
      expect((button.querySelector(".ql-fill") as SVGElement).style.fill).toBe(
        "rgb(68, 68, 68)",
      );
    });

    it("segue cinza se o Quill re-marcar o botão como `ql-active` depois da saída", () => {
      // Regressão: ao voltar ao WYSIWYG o Quill reprocessa o conteúdo (embeds
      // são armazenados como `code-block`) e marca o botão como ativo — o ícone
      // ficava azul até o usuário clicar em qualquer outro lugar.
      const root = buildSiblingToolbarDom();

      syncDevModeButtonState(root, true);
      syncDevModeButtonState(root, false);

      const button = codeButton(root);
      button.classList.add("ql-active"); // <- o que o Quill faz sozinho

      expect((button.querySelector(".ql-stroke") as SVGElement).style.stroke).toBe(
        "rgb(68, 68, 68)",
      );
      expect(button.style.backgroundColor).toBe("rgb(249, 249, 249)");
    });

    it("não mexe nos outros botões da toolbar", () => {
      const root = buildSiblingToolbarDom();

      syncDevModeButtonState(root, true);

      const bold = findQuillToolbar(root)!.querySelector(
        ".ql-bold",
      ) as HTMLElement;
      expect(bold.classList.contains("ql-active")).toBe(false);
      expect(bold.getAttribute("style")).toBeNull();
    });

    it("devolve false quando a toolbar ainda não montou", () => {
      expect(syncDevModeButtonState(document.createElement("div"), true)).toBe(
        false,
      );
      expect(syncDevModeButtonState(null, true)).toBe(false);
    });
  });
});
