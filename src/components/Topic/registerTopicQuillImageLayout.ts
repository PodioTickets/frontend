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

function resolveImageEmbedIndex(
  quill: InstanceType<typeof QuillType>,
  range: { index: number; length: number },
): number | null {
  const { index, length } = range;
  const docLen = quill.getLength();
  const fmt = quill.getFormat(range);

  const candidates: number[] = [];
  if (fmt.image) candidates.push(index);
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
    if (leaf?.statics.blotName === "image") {
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

  const imageIndex = resolveImageEmbedIndex(quill, range);
  if (imageIndex === null) return false;

  quill.formatText(
    imageIndex,
    1,
    "layout",
    layout === "" ? false : layout,
    "user",
  );
  if (layout === "left" || layout === "right" || layout === "inline-half") {
    quill.formatLine(imageIndex, 1, "align", false, "user");
  }
  return true;
}
