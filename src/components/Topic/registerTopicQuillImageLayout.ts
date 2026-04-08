import type QuillType from "quill";

export type TopicImageLayout = "left" | "right" | "inline-half" | "";

/**
 * Substitui o blot de imagem do Quill para persistir `data-layout` (texto ao lado / duas imagens).
 * Deve ser chamado antes de `new Quill(...)`.
 */
export function registerTopicQuillImageLayout(Quill: typeof QuillType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Parent = Quill.import("formats/image") as any;

  class TopicImage extends Parent {
    static blotName = "image";
    static tagName = "IMG";

    static formats(domNode: HTMLImageElement) {
      const formats = super.formats(domNode) as Record<string, string | undefined>;
      const layout = domNode.getAttribute("data-layout");
      if (
        layout === "left" ||
        layout === "right" ||
        layout === "inline-half"
      ) {
        formats.layout = layout;
      }
      return formats;
    }

    format(name: string, value: unknown) {
      if (name === "layout") {
        if (value === "left" || value === "right" || value === "inline-half") {
          this.domNode.setAttribute("data-layout", value);
        } else {
          this.domNode.removeAttribute("data-layout");
        }
        return;
      }
      super.format(name, value);
    }
  }

  Quill.register(TopicImage, true);
}

/**
 * Substitui o blot de vídeo por um embed **inline** (como Image), não BlockEmbed.
 * O vídeo padrão do Quill é bloco — ocupa uma linha só e impede texto/imagem na mesma <p>.
 * Com INLINE_BLOT, iframe fica no mesmo parágrafo que texto e imagens.
 * Mantém `data-layout` e width/height como o formato nativo.
 */
export function registerTopicQuillVideoLayout(Quill: typeof QuillType) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Link = Quill.import("formats/link") as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Parchment = Quill.import("parchment") as any;
  const EmbedBlot = Parchment.EmbedBlot;

  const ATTRIBUTES = ["height", "width"] as const;

  class TopicVideo extends EmbedBlot {
    static blotName = "video";
    static className = "ql-video";
    static tagName = "IFRAME";
    static scope = Parchment.Scope.INLINE_BLOT;

    static create(value: string) {
      const node = super.create(value) as HTMLIFrameElement;
      node.setAttribute("frameborder", "0");
      node.setAttribute("allowfullscreen", "true");
      node.setAttribute("src", Link.sanitize(value));
      return node;
    }

    static formats(domNode: HTMLIFrameElement) {
      const formats = ATTRIBUTES.reduce(
        (acc: Record<string, string>, attribute) => {
          if (domNode.hasAttribute(attribute)) {
            acc[attribute] = domNode.getAttribute(attribute) as string;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      const layout = domNode.getAttribute("data-layout");
      if (
        layout === "left" ||
        layout === "right" ||
        layout === "inline-half"
      ) {
        formats.layout = layout;
      }
      return formats;
    }

    static value(domNode: HTMLIFrameElement) {
      return domNode.getAttribute("src");
    }

    format(name: string, value: unknown) {
      if ((ATTRIBUTES as readonly string[]).includes(name)) {
        if (value) {
          this.domNode.setAttribute(name, String(value));
        } else {
          this.domNode.removeAttribute(name);
        }
        return;
      }
      if (name === "layout") {
        if (value === "left" || value === "right" || value === "inline-half") {
          this.domNode.setAttribute("data-layout", value as string);
        } else {
          this.domNode.removeAttribute("data-layout");
        }
        return;
      }
      super.format(name, value);
    }
  }

  Quill.register(TopicVideo, true);
}

function resolveEmbedIndex(
  quill: InstanceType<typeof QuillType>,
  range: { index: number; length: number },
): number | null {
  const { index, length } = range;
  const docLen = quill.getLength();
  const fmt = quill.getFormat(range);

  const candidates: number[] = [];
  if (fmt.image || fmt.video) candidates.push(index);
  candidates.push(index, index - 1, index + 1);
  if (length > 1) {
    for (let i = index; i < index + length; i++) {
      candidates.push(i);
    }
  }

  const seen = new Set<number>();
  for (const i of candidates) {
    if (seen.has(i)) continue;
    seen.add(i);
    if (i < 0 || i >= docLen) continue;
    const [leaf] = quill.getLeaf(i);
    if (
      leaf?.statics.blotName === "image" ||
      leaf?.statics.blotName === "video"
    ) {
      return i;
    }
  }
  return null;
}

export function applyTopicImageLayoutToSelectedImage(
  quill: InstanceType<typeof QuillType>,
  layout: TopicImageLayout,
) {
  const range = quill.getSelection(true);
  if (!range) return false;

  const embedIndex = resolveEmbedIndex(quill, range);
  if (embedIndex === null) return false;

  quill.formatText(
    embedIndex,
    1,
    "layout",
    layout === "" ? false : layout,
    "user",
  );
  if (layout === "left" || layout === "right" || layout === "inline-half") {
    quill.formatLine(embedIndex, 1, "align", false, "user");
  }
  return true;
}
