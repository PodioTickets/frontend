/**
 * Versão custom do módulo `Resize` do `quill-resize-module` com 8 handles
 * (4 cantos + 4 laterais), em vez dos 4 cantos padrão. Os handles laterais
 * (top, right, bottom, left) restringem o resize a um único eixo — usuário
 * pode esticar só largura (left/right) ou só altura (top/bottom) sem mexer
 * no outro lado.
 *
 * Usar com:
 *   const ResizeWithSides = createTopicResizeWithSideHandlesClass(QuillResize);
 *   new Quill(..., { modules: { resize: { modules: [ResizeWithSides], ... } } })
 *
 * Recebe a classe `QuillResize` no factory porque ela é importada via
 * `await import("quill-resize-module")` (dinâmico) — não dá pra estender em
 * top-level sem pagar SSR.
 */

type QuillResizeStatic = {
  Modules: {
    Resize: new (...args: unknown[]) => unknown;
  };
};

type Direction = -1 | 0 | 1;

// place em CSS class -> [dx, dy] multiplicadores que mapeiam o delta do mouse
// para a mudança de width/height. dx=0 → handle não muda largura; dy=0 → não
// muda altura. Mesma ordem é usada pra adicionar os boxes no `onCreate`.
const HANDLES: Array<readonly [string, Direction, Direction]> = [
  ["tl", -1, -1],
  ["t", 0, -1],
  ["tr", 1, -1],
  ["r", 1, 0],
  ["br", 1, 1],
  ["b", 0, 1],
  ["bl", -1, 1],
  ["l", -1, 0],
];

let sideHandlesStyleInjected = false;

/**
 * O CSS do `quill-resize-module` só posiciona os 4 cantos. Injeta uma vez por
 * página as regras pros 4 handles laterais (mesmo tamanho/visual dos cantos,
 * cursor de eixo único). É idempotente — checa `sideHandlesStyleInjected`.
 */
function injectSideHandlesStyle(): void {
  if (sideHandlesStyleInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.setAttribute("data-topic-resize-side-handles", "");
  style.textContent = `
    .ql-resize-handle.t { top: -6px; left: 50%; margin-left: -6px; cursor: ns-resize; }
    .ql-resize-handle.r { right: -6px; top: 50%; margin-top: -6px; cursor: ew-resize; }
    .ql-resize-handle.b { bottom: -6px; left: 50%; margin-left: -6px; cursor: ns-resize; }
    .ql-resize-handle.l { left: -6px; top: 50%; margin-top: -6px; cursor: ew-resize; }
  `;
  document.head.appendChild(style);
  sideHandlesStyleInjected = true;
}

interface ResizeInternals {
  blot: { statics: { blotName: string } };
  blotOptions: {
    attribute?: string[];
    limit?: {
      minWidth?: number;
      maxWidth?: number;
      minHeight?: number;
      maxHeight?: number;
      ratio?: number;
    };
  };
  options: {
    parchment?: Record<string, ResizeInternals["blotOptions"]>;
  };
  boxes: HTMLElement[];
  dragBox: HTMLElement;
  dragStartX: number;
  dragStartY: number;
  preDragSize: { width: number; height: number };
  activeEle: HTMLElement;
  quill: { root: HTMLElement };
  requestUpdate: () => void;
  addBox: (place: string) => void;
  // Método (não propriedade) — a subclasse sobrescreve `handleDrag` como método;
  // declarar como propriedade aqui dispara TS2425 (kinds incompatíveis).
  handleDrag(evt: MouseEvent | TouchEvent): void;
}

export function createTopicResizeWithSideHandlesClass(
  QuillResize: unknown,
): new (...args: unknown[]) => unknown {
  const Resize = (QuillResize as QuillResizeStatic).Modules.Resize;

  // `extends` em uma classe vinda de `import("…").default` exige que o
  // construtor do pai seja chamado pelo super — Resize só faz Object.assign
  // dos campos do BaseModule no constructor, então herda direto sem ajuste.
  class TopicResizeWithSideHandles extends (Resize as new (
    ...args: unknown[]
  ) => unknown as new (...args: unknown[]) => ResizeInternals) {
    onCreate(): void {
      injectSideHandlesStyle();
      this.blotOptions =
        this.options.parchment![this.blot.statics.blotName] ?? {};
      this.boxes = [];
      HANDLES.forEach(([place]) => this.addBox(place));
    }

    /**
     * Auto-scroll do `.ql-editor` durante o resize. Sem isso, ao puxar o handle
     * de baixo (b/br/bl) e fazer o embed crescer além da área visível, a barra
     * de scroll subia (porque o tamanho do conteúdo aumentava mas o scrollTop
     * ficava fixo) e o usuário perdia o handle de vista. A gente segue o eixo
     * do handle: handles inferiores mantêm a borda de baixo visível, handles
     * superiores mantêm a borda de cima. Mesmo comportamento de quando o
     * cursor de texto vai descendo/subindo no editor.
     *
     * IMPORTANTE: aqui re-implementamos a aplicação do resize visual em vez de
     * chamar `super.handleDrag` — o base faz `Object.assign(style, calcSize)`
     * com valores SEM unidade ("450"). Para `<img>` isso é CSS inválido e o
     * browser ignora, então a imagem não acompanha o drag (só a HUD mexe).
     * Forçando `unit: true` em img, `style.width = "450px"` vence o reset do
     * Tailwind preflight (`img { height: auto }`).
     */
    handleDrag(evt: MouseEvent | TouchEvent): void {
      if (evt.cancelable) evt.preventDefault();
      if (!this.activeEle) return;

      const limit = this.blotOptions.limit ?? {};
      const isImage = this.activeEle instanceof HTMLImageElement;
      const limitForCalc = isImage ? { ...limit, unit: true } : limit;
      Object.assign(this.activeEle.style, this.calcSize(evt, limitForCalc));
      this.requestUpdate();
      const idx = this.boxes.indexOf(this.dragBox);
      const handle = HANDLES[idx];
      if (!handle) return;
      const dy = handle[2];
      if (dy === 0) return; // handle puramente horizontal — não precisa scrollar

      const scroller = this.quill.root;
      const scrollerRect = scroller.getBoundingClientRect();
      const eleRect = this.activeEle.getBoundingClientRect();
      const PAD = 8;
      let scrolled = false;

      if (dy === 1 && eleRect.bottom > scrollerRect.bottom - PAD) {
        scroller.scrollTop += eleRect.bottom - scrollerRect.bottom + PAD;
        scrolled = true;
      } else if (dy === -1 && eleRect.top < scrollerRect.top + PAD) {
        scroller.scrollTop += eleRect.top - scrollerRect.top - PAD;
        scrolled = true;
      }

      // Reposiciona o overlay (e os handles) considerando o novo scrollTop —
      // `repositionElements` soma `quill.root.scrollTop` no `top` do overlay.
      if (scrolled) {
        this.requestUpdate();
      }
    }

    calcSize(
      evt: MouseEvent | TouchEvent,
      limit: ResizeInternals["blotOptions"]["limit"] & { unit?: boolean } = {},
    ): { width?: number | string; height?: number | string } {
      let clientX: number;
      let clientY: number;
      if (
        typeof window !== "undefined" &&
        window.TouchEvent &&
        evt instanceof TouchEvent
      ) {
        clientX = evt.changedTouches[0].clientX;
        clientY = evt.changedTouches[0].clientY;
      } else {
        clientX = (evt as MouseEvent).clientX;
        clientY = (evt as MouseEvent).clientY;
      }

      const deltaX = clientX - this.dragStartX;
      const deltaY = clientY - this.dragStartY;

      // Direção depende de qual handle foi pego. boxes[i] casa com HANDLES[i]
      // porque addBox é chamado na mesma ordem.
      const idx = this.boxes.indexOf(this.dragBox);
      const [, dx, dy] = HANDLES[idx] ?? (["", 0, 0] as const);

      const attrs = this.blotOptions.attribute || ["width"];
      const size: { width?: number; height?: number } = {};
      attrs.forEach((key) => {
        const k = key as "width" | "height";
        size[k] = this.preDragSize[k];
      });

      // Só aplica delta no eixo que o handle controla.
      if (dx !== 0 && size.width !== undefined) {
        size.width = Math.round(this.preDragSize.width + deltaX * dx);
      }
      if (dy !== 0 && size.height !== undefined) {
        size.height = Math.round(this.preDragSize.height + deltaY * dy);
      }

      let width: number | string | undefined = size.width;
      let height: number | string | undefined = size.height;

      // `ratio` é 16:9 etc. — só faz sentido em handle de canto (controla os
      // dois eixos). Em handle lateral o usuário quer esticar um eixo só, então
      // ignoramos ratio. (Hoje o config de `video` no TopicModal nem passa
      // ratio, mas mantém a regra pra futuros consumidores.)
      const isCornerHandle = dx !== 0 && dy !== 0;
      if (limit.ratio && isCornerHandle) {
        let limitHeight = false;
        if (limit.minWidth) width = Math.max(limit.minWidth, width as number);
        if (limit.maxWidth) width = Math.min(limit.maxWidth, width as number);
        height = (width as number) * limit.ratio;
        if (limit.minHeight && (height as number) < limit.minHeight) {
          limitHeight = true;
          height = limit.minHeight;
        }
        if (limit.maxHeight && (height as number) > limit.maxHeight) {
          limitHeight = true;
          height = limit.maxHeight;
        }
        if (limitHeight) width = (height as number) / limit.ratio;
      } else {
        if (size.width !== undefined) {
          if (limit.minWidth) width = Math.max(limit.minWidth, width as number);
          if (limit.maxWidth) width = Math.min(limit.maxWidth, width as number);
        }
        if (size.height !== undefined) {
          if (limit.minHeight)
            height = Math.max(limit.minHeight, height as number);
          if (limit.maxHeight)
            height = Math.min(limit.maxHeight, height as number);
        }
      }

      if (limit.unit) {
        if (width) width = `${width}px`;
        if (height) height = `${height}px`;
      }

      const res: { width?: number | string; height?: number | string } = {};
      if (width) res.width = width;
      if (height) res.height = height;
      return res;
    }
  }

  return TopicResizeWithSideHandles as unknown as new (
    ...args: unknown[]
  ) => unknown;
}
