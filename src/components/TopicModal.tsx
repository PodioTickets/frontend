"use client";

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import { useTopicModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { DeleteTopicModal } from "@/components/Topic/DeleteTopicModal";
import {
  applyTopicImageLayoutToSelectedImage,
  registerTopicQuillImageLayout,
  registerTopicQuillVideoLayout,
} from "@/components/Topic/registerTopicQuillImageLayout";
import {
  registerStravaClipboardMatcher,
  registerTopicQuillStravaEmbed,
} from "@/components/Topic/registerTopicQuillStravaEmbed";
import { createTopicResizeWithSideHandlesClass } from "@/components/Topic/topicQuillResizeWithSideHandles";
import { extractVideoEmbedUrl } from "@/lib/extractVideoEmbedUrl";
import {
  maybeDownscaleImageFileForUpload,
  replaceDataUrlImagesInContainer,
  uploadOrganizerImage,
} from "@/lib/uploadOrganizerImage";
import {
  decodeStoredEmbedsToRenderable,
  encodeRenderableToStoredEmbeds,
  buildSourceViewHtml,
  isEmbedHtml,
  wrapWithTopicDefaultTextColor,
} from "@/lib/topicHtmlSourceMode";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowButton } from "@/components/ArrowButton";
import { cn } from "@/utils/cn";

type QuillInstance = InstanceType<typeof import("quill").default>;

let quillResizeModuleRegistered = false;
let topicQuillImageLayoutRegistered = false;
let topicQuillVideoLayoutRegistered = false;
let topicQuillStravaEmbedRegistered = false;
// Cache da classe custom de Resize (8 handles) — depende do QuillResize
// importado dinamicamente; criada uma vez por sessão.
let topicResizeWithSideHandlesClass: unknown = null;

/**
 * Fluxo tipo quill-image-resize: inline-block permite várias imagens na mesma linha
 * e texto ao lado; só força block em parágrafo justificado (largura total).
 * Não zera width — preserva px definidos pelo módulo de resize.
 */
function isTopicModalNarrowViewport(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 767px)").matches
  );
}

/** Ajusta só tamanhos da toolbar/editor do Quill (mobile vs desktop). */
function applyTopicQuillLayoutSizes(root: HTMLElement | null) {
  if (!root) return;
  const narrow = isTopicModalNarrowViewport();
  const toolbar = root.querySelector(".ql-toolbar") as HTMLElement | null;
  const editor = root.querySelector(".ql-editor") as HTMLElement | null;
  const btnH = narrow ? "44px" : "56px";
  const btnW = narrow ? "44px" : "72px";
  const toolbarPad = narrow ? "10px 8px 6px 12px" : "20px 20px 0 20px";
  const editorPad = narrow ? "12px 12px 16px 12px" : "20px 20px 0 20px";
  const fontPx = narrow ? "15px" : "16px";
  const svgPx = narrow ? "20px" : "24px";
  const fmtGap = narrow ? "4px" : "8px";

  if (toolbar) {
    toolbar.style.padding = toolbarPad;
    toolbar.style.gap = fmtGap;
    toolbar.style.justifyContent = narrow ? "flex-start" : "flex-end";
  }
  if (editor) {
    editor.style.padding = editorPad;
    editor.style.fontSize = fontPx;
    // Texto sem format de cor explícito herda do editor. Quill Snow usa #646464
    // por padrão (cinza) — sobrescrevemos com preto pra que o texto default já
    // saia na cor "neutra" que a paleta do picker oferece como swatch principal.
    editor.style.color = "#000000";
  }

  root
    .querySelectorAll(".ql-toolbar button, .ql-toolbar .ql-picker-label")
    .forEach((button) => {
      const btn = button as HTMLElement;
      btn.style.minHeight = btnH;
      btn.style.minWidth = btnW;
      btn.style.fontSize = fontPx;
      btn.style.padding = narrow ? "4px 6px" : "3px 10px";
      btn.querySelectorAll("svg").forEach((svg) => {
        const el = svg as unknown as HTMLElement;
        el.style.width = svgPx;
        el.style.height = svgPx;
      });
    });

  root.querySelectorAll(".ql-toolbar .ql-picker").forEach((picker) => {
    const pick = picker as HTMLElement;
    pick.style.minHeight = btnH;
    pick.style.minWidth = btnW;
  });

  root.querySelectorAll(".ql-toolbar .ql-formats").forEach((format) => {
    const fmt = format as HTMLElement;
    fmt.style.gap = fmtGap;
  });
}

/**
 * Imagens + vídeos: estilos inline para vencer o Quill Snow (carrega depois do globals)
 * e permitir alinhar à esquerda / texto ao lado no iframe (inline-block quando não é center/right).
 */
function applyQuillEditorMediaStyles(editor: HTMLElement | null) {
  if (!editor) return;
  const href = typeof window !== "undefined" ? window.location.href : "";
  const allImages = editor.querySelectorAll("img");
  allImages.forEach((imgElement) => {
    const img = imgElement as HTMLImageElement;
    if (!img.src || img.src === "" || img.src === href) return;
    if (img.getAttribute("data-layout")) {
      // Layouts (left/right/half) mantêm proporção natural — height auto.
      img.style.height = "auto";
      return;
    }
    img.style.maxWidth = "100%";
    img.style.verticalAlign = "top";
    // IMPORTANTE: NÃO tocar em img.style.height aqui.
    // - Durante o drag o quill-resize-module aplica inline style.height = "200px"
    //   pra preview visual; mexer em height aqui apaga o preview.
    // - Ao soltar, o módulo converte pra atributo HTML (img.height = X) e limpa
    //   o inline (style.height = null). O atributo já é suficiente — height auto
    //   fica como default natural do browser quando não há atributo.
    // Conteúdo legado com `style="height: auto"` é limpo uma única vez no
    // sanitizador de carga (sanitizeImageDimensions), não em todo tick.
    const parent = img.parentElement;
    if (
      parent?.tagName === "P" &&
      parent.classList.contains("ql-align-justify")
    ) {
      img.style.display = "block";
      img.style.width = "100%";
      img.style.marginLeft = "0";
      img.style.marginRight = "0";
      return;
    }
    img.style.display = "inline-block";
    img.style.marginLeft = "";
    img.style.marginRight = "";
    const legacyPct = img.dataset.topicImgWidth;
    if (legacyPct) {
      img.style.width = `${legacyPct}%`;
    }
  });

  editor.querySelectorAll("iframe.ql-video").forEach((node) => {
    const iframe = node as HTMLIFrameElement;
    if (iframe.getAttribute("data-layout")) {
      iframe.style.display = "";
      iframe.style.margin = "";
      iframe.style.verticalAlign = "";
      iframe.style.width = "";
      iframe.style.maxWidth = "";
      iframe.style.height = "auto";
      return;
    }

    const parent = iframe.parentElement;
    const inJustify =
      parent?.tagName === "P" &&
      parent.classList.contains("ql-align-justify");

    if (inJustify) {
      iframe.style.display = "block";
      iframe.style.width = "100%";
      iframe.style.maxWidth = "100%";
      iframe.style.margin = "0.75rem 0";
      iframe.style.verticalAlign = "top";
      return;
    }

    const parentIsP = parent?.tagName === "P";
    const isCenter =
      iframe.classList.contains("ql-align-center") ||
      (!!parentIsP && parent!.classList.contains("ql-align-center"));
    const isRight =
      iframe.classList.contains("ql-align-right") ||
      (!!parentIsP && parent!.classList.contains("ql-align-right"));

    if (isCenter) {
      iframe.style.display = "block";
      iframe.style.margin = "0.75rem auto";
      iframe.style.verticalAlign = "top";
      iframe.style.maxWidth = "100%";
      return;
    }
    if (isRight) {
      iframe.style.display = "block";
      iframe.style.margin = "0.75rem 0 0.75rem auto";
      iframe.style.verticalAlign = "top";
      iframe.style.maxWidth = "100%";
      return;
    }

    iframe.style.display = "inline-block";
    iframe.style.verticalAlign = "top";
    iframe.style.margin = "0.75rem 0";
    iframe.style.maxWidth = "100%";
  });
}

/**
 * Set módulo-level com os src de scripts já injetados nesta página, para evitar
 * duplicar `<script>` quando vários embeds compartilham o mesmo provedor (ex.:
 * Instagram em tópicos diferentes).
 */
const injectedEmbedScriptSrcs = new Set<string>();

/**
 * Normaliza dimensões de imagens no HTML antes de injetar no Quill / antes de
 * salvar:
 *   1. Remove `style="height: auto"` legado (escrito por applyQuillEditorMediaStyles
 *      antiga — bloqueava resize vertical).
 *   2. Promove atributo HTML `width`/`height` para inline `style` correspondente.
 *      Sem isso o reset do Tailwind preflight (`img { height: auto; max-width: 100% }`)
 *      vence o atributo HTML e o browser calcula altura pela proporção nativa,
 *      ignorando o resize manual. Inline style vence o reset.
 */
function sanitizeImageDimensions(html: string): string {
  if (!html) return html;
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("img").forEach((img) => {
    if (img.style.height === "auto") img.style.removeProperty("height");
    const w = img.getAttribute("width");
    const h = img.getAttribute("height");
    if (w && !/^\d+(\.\d+)?(px|%)?$/.test(img.style.width || "")) {
      img.style.width = /[a-z%]/i.test(w) ? w : `${w}px`;
    }
    if (h && !/^\d+(\.\d+)?(px|%)?$/.test(img.style.height || "")) {
      img.style.height = /[a-z%]/i.test(h) ? h : `${h}px`;
    }
  });
  return tmp.innerHTML;
}

/**
 * Injeta o `<script>` de embed (Instagram, Twitter, etc.) no `<head>` se ainda
 * não estiver presente; quando já está, força reprocessamento (`process()`)
 * para que o blockquote recém-inserido vire iframe.
 */
function injectEmbedScript(src: string) {
  // Strava: embed.js não tem API de reprocessamento — re-injeta sempre pra
  // que ele varra novamente os `.strava-embed-placeholder` do DOM.
  const isStravaScript = src.includes("strava-embeds.com");

  if (injectedEmbedScriptSrcs.has(src) && !isStravaScript) {
    if (
      src.includes("instagram.com/embed") &&
      (window as unknown as { instgrm?: { Embeds: { process: () => void } } }).instgrm
    ) {
      (window as unknown as { instgrm: { Embeds: { process: () => void } } }).instgrm.Embeds.process();
    }
    return;
  }
  const script = document.createElement("script");
  script.async = true;
  script.src = src.startsWith("//") ? `https:${src}` : src;
  script.onload = () => injectedEmbedScriptSrcs.add(src);
  document.head.appendChild(script);
}

export function TopicModal() {
  const { isOpen, closeTopicModal, data, onModalSave, onModalDelete } = useTopicModal();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isCodeMode, setIsCodeMode] = useState(false);
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<QuillInstance | null>(null);
  const quillLoadedRef = useRef(false);
  const quillToolbarMousedownCleanupRef = useRef<(() => void) | null>(null);
  const quillPasteCleanupRef = useRef<(() => void) | null>(null);
  // Scripts de embed extraídos do conteúdo — re-anexados ao salvar e exibidos no source view.
  const embedScriptSrcsRef = useRef<string[]>([]);
  // Textarea do "view source" e ref para a função toggle (acessada pelo handler do Quill).
  const codeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const toggleCodeModeRef = useRef<() => void>(() => {});

  const initialTitle = data?.title || "";
  const initialContent = data?.content || "";
  const isEditing = data?.isEditing || false;
  const allowDelete = data?.allowDelete === true;

  useEffect(() => {
    if (!isOpen) setDeleteModalOpen(false);
  }, [isOpen]);

  // Initialize Quill
  useEffect(() => {
    if (isOpen && quillRef.current && typeof window !== 'undefined') {
      // Dynamically import Quill only when modal is open
      const initQuill = async () => {
        // Load CSS only once
        if (!quillLoadedRef.current) {
          try {
            // @ts-ignore - CSS import doesn't have type declarations
            await import("quill/dist/quill.snow.css");
            await import("quill-resize-module/dist/resize.css");
          } catch (e) {
            // CSS import might fail in SSR, that's okay
          }
          quillLoadedRef.current = true;
        }

        // Import Quill dynamically
        const QuillModule = await import("quill");
        const Quill = QuillModule.default;
        const QuillResize = (await import("quill-resize-module")).default;
        if (!quillResizeModuleRegistered) {
          Quill.register("modules/resize", QuillResize);
          quillResizeModuleRegistered = true;
        }
        if (!topicResizeWithSideHandlesClass) {
          topicResizeWithSideHandlesClass =
            createTopicResizeWithSideHandlesClass(QuillResize);
        }
        if (!topicQuillImageLayoutRegistered) {
          registerTopicQuillImageLayout(Quill);
          topicQuillImageLayoutRegistered = true;
        }
        if (!topicQuillVideoLayoutRegistered) {
          registerTopicQuillVideoLayout(Quill);
          topicQuillVideoLayoutRegistered = true;
        }
        if (!topicQuillStravaEmbedRegistered) {
          registerTopicQuillStravaEmbed(Quill);
          topicQuillStravaEmbedRegistered = true;
        }

        /* Ícones dos botões custom de layout de imagem.
         * Quill NÃO gera ícone para formato custom → o botão nasce vazio (ficavam
         * invisíveis mas clicáveis, entre "vídeo" e "limpar"). Registrar no
         * registry `ui/icons` ANTES do `new Quill` faz o PRÓPRIO Quill desenhar o
         * SVG ao montar a toolbar — imune a timing/exceções de styling pós-init.
         * Classes `ql-stroke`/`ql-fill` herdam cor, hover e estado `ql-active`
         * como os ícones nativos. `viewBox="0 0 18 18"` = grade dos ícones padrão. */
        const quillIcons = Quill.import("ui/icons") as Record<string, string>;
        quillIcons["topicLayoutLeft"] =
          '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="3" y="4" width="7" height="7"></rect><line class="ql-stroke" x1="11.5" y1="5.5" x2="15" y2="5.5"></line><line class="ql-stroke" x1="11.5" y1="9" x2="15" y2="9"></line><line class="ql-stroke" x1="3" y1="14" x2="15" y2="14"></line></svg>';
        quillIcons["topicLayoutRight"] =
          '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="8" y="4" width="7" height="7"></rect><line class="ql-stroke" x1="3" y1="5.5" x2="6.5" y2="5.5"></line><line class="ql-stroke" x1="3" y1="9" x2="6.5" y2="9"></line><line class="ql-stroke" x1="3" y1="14" x2="15" y2="14"></line></svg>';
        quillIcons["topicLayoutHalf"] =
          '<svg viewBox="0 0 18 18"><rect class="ql-fill" x="2.5" y="5" width="5.5" height="8"></rect><rect class="ql-fill" x="10" y="5" width="5.5" height="8"></rect></svg>';
        quillIcons["topicLayoutClear"] =
          '<svg viewBox="0 0 18 18"><rect class="ql-stroke" x="3.5" y="3.5" width="11" height="6" fill="none"></rect><line class="ql-stroke" x1="3.5" y1="13" x2="14.5" y2="13"></line><line class="ql-stroke" x1="3.5" y1="15.5" x2="14.5" y2="15.5"></line></svg>';

        // Clean up previous instance if exists
        if (quillInstanceRef.current) {
          quillInstanceRef.current = null;
        }

        // Clear the ref content
        if (quillRef.current) {
          quillRef.current.innerHTML = '';
        }

        // Small delay to ensure DOM is ready
        setTimeout(() => {
          if (!quillRef.current) return;

          const quill = new Quill(quillRef.current!, {
            theme: 'snow',
            placeholder: 'Descreva sobre o tópico...',
            modules: {
              clipboard: {
                matchVisual: false,
              },
              resize: {
                // Substitui o módulo "Resize" padrão (4 cantos) pela versão
                // com 8 handles (4 cantos + 4 laterais), permitindo redimensionar
                // só largura ou só altura.
                modules: [topicResizeWithSideHandlesClass],
                parchment: {
                  image: {
                    // width + height permite redimensionar nos 8 handles (4 cantos
                    // + 4 laterais) — laterais ajustam só uma dimensão, então o
                    // usuário pode esticar/encolher a imagem horizontalmente OU
                    // verticalmente de forma independente, igual aos embeds/vídeos.
                    attribute: ["width", "height"],
                    limit: {
                      minWidth: 48,
                      maxWidth: 2000,
                      minHeight: 24,
                      maxHeight: 2000,
                    },
                  },
                  // Sem `ratio` aqui: o usuário pode esticar o iframe (vídeo,
                  // Instagram/Twitter pós-script, etc.) na horizontal e na
                  // vertical de forma independente. Com ratio fixo o resize
                  // ficava preso a 16:9 e altura nunca crescia além do calculado.
                  video: {
                    attribute: ["width", "height"],
                    limit: {
                      minWidth: 160,
                      maxWidth: 1200,
                      minHeight: 90,
                      maxHeight: 1200,
                    },
                  },
                },
                onChangeSize: (
                  _blot: unknown,
                  ele: HTMLElement | null,
                  size: { width?: number | string; height?: number | string },
                ) => {
                  // O base módulo já fez:
                  //   Object.assign(ele, size)         → img.width=450 (vira atributo)
                  //   Object.assign(ele.style, {width:null, height:null})  → limpa inline
                  // Re-aplica como inline style com px para sobreviver ao reset
                  // do Tailwind preflight (`img { height: auto }`) que vence o
                  // atributo HTML. Inline style vence tudo.
                  if (ele instanceof HTMLImageElement) {
                    if (size.width != null)
                      ele.style.width =
                        typeof size.width === "number" ? `${size.width}px` : size.width;
                    if (size.height != null)
                      ele.style.height =
                        typeof size.height === "number" ? `${size.height}px` : size.height;
                  }
                  const q = quillInstanceRef.current;
                  if (q) {
                    // Força sync Delta ← DOM: o resize module aplica
                    // img.width/img.height como property/atributo, mas o
                    // mutation observer do Quill não dispara text-change pra
                    // mudança de atributo em embed inline. Sem `update('user')`
                    // o Delta interno fica sem width/height; no próximo
                    // text-change o Quill regenera o <img> a partir do Delta
                    // antigo e a imagem volta ao tamanho original.
                    (q as unknown as { update: (source: string) => void }).update("user");
                    setContent(q.root.innerHTML);
                  }
                  setTimeout(() => {
                    const ed = quillRef.current?.querySelector(
                      ".ql-editor",
                    ) as HTMLElement | null;
                    applyQuillEditorMediaStyles(ed);
                  }, 0);
                },
              },
              toolbar: {
                container: [
                  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  // Paleta explícita (mesmas cores da default do Quill snow). Sem isso,
                  // `{ color: [] }` deixa o picker tratar o swatch preto como "remover
                  // format" — o usuário clica preto, Quill drop-a o <span> e o texto fica
                  // com a cor herdada do editor (#646464). Passando como array explícito,
                  // #000000 vira VALOR concreto e o format é aplicado como inline style.
                  [
                    {
                      color: [
                        '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff',
                        '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff',
                        '#bbbbbb', '#f06666', '#ffc266', '#ffff66', '#66b966', '#66a3e0', '#c285ff',
                        '#888888', '#a10000', '#b26b00', '#b2b200', '#006100', '#0047b2', '#6b24b2',
                        '#444444', '#5c0000', '#663d00', '#666600', '#003700', '#002966', '#3d1466',
                      ],
                    },
                    {
                      background: [
                        '#000000', '#e60000', '#ff9900', '#ffff00', '#008a00', '#0066cc', '#9933ff',
                        '#ffffff', '#facccc', '#ffebcc', '#ffffcc', '#cce8cc', '#cce0f5', '#ebd6ff',
                        '#bbbbbb', '#f06666', '#ffc266', '#ffff66', '#66b966', '#66a3e0', '#c285ff',
                        '#888888', '#a10000', '#b26b00', '#b2b200', '#006100', '#0047b2', '#6b24b2',
                        '#444444', '#5c0000', '#663d00', '#666600', '#003700', '#002966', '#3d1466',
                      ],
                    },
                  ],
                  [{ 'script': 'sub' }, { 'script': 'super' }],
                  [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                  [{ 'indent': '-1' }, { 'indent': '+1' }],
                  [{ 'align': [] }],
                  ['blockquote', 'code-block'],
                  ['link', 'image', 'video'],
                  [
                    'topicLayoutLeft',
                    'topicLayoutRight',
                    'topicLayoutHalf',
                    'topicLayoutClear',
                  ],
                  ['clean']
                ],
                handlers: {
                  // Sobrescreve o comportamento padrão do botão `code-block`.
                  // Em vez de formatar a linha selecionada como bloco de código,
                  // alterna a área de edição inteira para um <textarea> com o
                  // HTML cru — incluindo as `<script>` dos embeds.
                  "code-block": function () {
                    toggleCodeModeRef.current();
                  },
                  topicLayoutLeft: function (this: {
                    quill: InstanceType<typeof import("quill").default>;
                  }) {
                    if (
                      !applyTopicImageLayoutToSelectedImage(this.quill, "left")
                    ) {
                      toast.error(
                        "Clique na imagem para selecioná-la e depois use o botão de layout na barra.",
                      );
                    }
                  },
                  topicLayoutRight: function (this: {
                    quill: InstanceType<typeof import("quill").default>;
                  }) {
                    if (
                      !applyTopicImageLayoutToSelectedImage(this.quill, "right")
                    ) {
                      toast.error(
                        "Clique na imagem para selecioná-la e depois use o botão de layout na barra.",
                      );
                    }
                  },
                  topicLayoutHalf: function (this: {
                    quill: InstanceType<typeof import("quill").default>;
                  }) {
                    if (
                      !applyTopicImageLayoutToSelectedImage(
                        this.quill,
                        "inline-half",
                      )
                    ) {
                      toast.error(
                        "Clique na imagem para selecioná-la e depois use o botão de layout na barra.",
                      );
                    }
                  },
                  topicLayoutClear: function (this: {
                    quill: InstanceType<typeof import("quill").default>;
                  }) {
                    if (!applyTopicImageLayoutToSelectedImage(this.quill, "")) {
                      toast.error(
                        "Clique na imagem para selecioná-la e depois use o botão de layout na barra.",
                      );
                    }
                  },
                  video: function () {
                    // Aceita URL (YouTube/Vimeo/etc) OU código <iframe ...> completo;
                    // normaliza para a URL de embed esperada pelo Video blot do Quill.
                    const raw = window.prompt(
                      "Cole a URL do YouTube/Vimeo ou o código completo do embed (<iframe ...>):",
                    );
                    if (!raw) return;
                    const embedUrl = extractVideoEmbedUrl(raw);
                    if (!embedUrl) {
                      toast.error(
                        "URL ou código de embed inválido. Cole um link do YouTube/Vimeo ou o <iframe> completo.",
                      );
                      return;
                    }
                    const range = quill.getSelection(true);
                    const index = range ? range.index : quill.getLength();
                    quill.insertEmbed(index, "video", embedUrl, "user");
                    quill.setSelection(index + 1, 0);
                    setTimeout(() => {
                      const ed = quillRef.current?.querySelector(
                        ".ql-editor",
                      ) as HTMLElement | null;
                      applyQuillEditorMediaStyles(ed);
                    }, 100);
                  },
                  image: function () {
                    const input = document.createElement("input");
                    input.setAttribute("type", "file");
                    input.setAttribute("accept", "image/*");
                    input.click();

                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (!file) return;

                      void (async () => {
                        const range = quill.getSelection(true);
                        if (!range) {
                          toast.error(
                            "Posicione o cursor no texto antes de inserir a imagem.",
                          );
                          return;
                        }

                        const tid = toast.loading("Enviando imagem…");
                        try {
                          const prepared =
                            await maybeDownscaleImageFileForUpload(file);
                          const url = await uploadOrganizerImage(prepared);
                          quill.insertEmbed(range.index, "image", url, "user");

                          setTimeout(() => {
                            const [line] = quill.getLine(range.index);
                            if (line) {
                              quill.formatLine(
                                range.index,
                                1,
                                "align",
                                "center",
                              );
                              quill.setSelection(line.offset(), 0);
                              setTimeout(() => {
                                const ed = quillRef.current?.querySelector(
                                  ".ql-editor",
                                ) as HTMLElement | null;
                                applyQuillEditorMediaStyles(ed);
                              }, 150);
                            }
                          }, 100);
                        } catch (err: unknown) {
                          const msg =
                            err instanceof Error
                              ? err.message
                              : "Erro ao enviar imagem";
                          toast.error(msg);
                        } finally {
                          toast.dismiss(tid);
                        }
                      })();
                    };
                  }
                }
              }
            },
            formats: [
              'header', 'font', 'size',
              'bold', 'italic', 'underline', 'strike',
              'color', 'background',
              'script',
              'list', 'indent',
              'align',
              'blockquote', 'code-block',
              'link', 'image', 'video',
              'layout',
              /* width/height — imagem e vídeo redimensionáveis (TopicImage + TopicVideo).
                 Sem isso o Delta drop-a os atributos no próximo text-change e o resize não persiste. */
              'width', 'height',
              /* quill-resize-module — sem isso o Quill remove ql-resize-style-* da linha ao editar */
              'resize-inline',
              'resize-block',
              /* Strava embed (BlockEmbed custom — preserva data-* do placeholder) */
              'stravaPlaceholder',
            ]
          });

          quillInstanceRef.current = quill;
          // Garante que paste HTML do Strava vire delta `stravaPlaceholder`
          // (evita que o matcher genérico do Quill strippe os data-*).
          registerStravaClipboardMatcher(quill);

          /**
           * Paste handler — detecta embeds (Instagram, Twitter, Facebook, iframes
           * de YouTube/Vimeo/etc) colados direto no editor e os processa
           * automaticamente, sem precisar abrir o modo código.
           *
           * Notas críticas:
           *
           * 1. O botão "Copiar código de incorporação" do Instagram entrega o
           *    HTML do embed como **`text/plain`** (texto cru do textarea da
           *    modal), NÃO `text/html`. Tentamos `text/html` primeiro e caímos
           *    pra `text/plain` se vier vazio ou não-embed.
           *
           * 2. O `quill.clipboard.dangerouslyPasteHTML` aplica matchers do
           *    Quill que **removem `class="instagram-media"`/`twitter-tweet`**
           *    do blockquote — sem essas classes os scripts dos provedores não
           *    processam o blockquote em iframe. Inserimos como **DOM direto**
           *    (`insertBefore` no editor) pra preservar 100% dos atributos.
           *
           * 3. O `<script>` é removido pelo Quill por segurança; chamamos
           *    `injectEmbedScript` separadamente pra adicionar no `<head>`.
           *
           * Roda em fase de captura (`true`) pra interceptar antes do clipboard
           * module do Quill (que está em bubble phase).
           */
          quillPasteCleanupRef.current?.();
          const onPaste = (event: ClipboardEvent) => {
            const cd = event.clipboardData;
            if (!cd) return;

            // 1. Tenta text/html; fallback pra text/plain (caso do Instagram).
            let pastedHtml = cd.getData("text/html");
            if (!pastedHtml || !isEmbedHtml(pastedHtml)) {
              const plain = cd.getData("text/plain").trim();
              if (plain.startsWith("<") && isEmbedHtml(plain)) {
                pastedHtml = plain;
              }
            }
            if (!pastedHtml || !isEmbedHtml(pastedHtml)) return;

            event.preventDefault();
            event.stopPropagation();

            const { html: renderable, scriptSrcs } =
              decodeStoredEmbedsToRenderable(pastedHtml);

            // Dedup scripts no array de instância (será re-anexado ao salvar).
            scriptSrcs.forEach((src) => {
              if (!embedScriptSrcsRef.current.includes(src)) {
                embedScriptSrcsRef.current.push(src);
              }
            });

            // Strava precisa passar pelo `dangerouslyPasteHTML` p/ o matcher
            // do clipboard converter a div em blot `stravaPlaceholder` (DOM
            // direto é strippado pelo normalizador).
            if (/strava-embed-placeholder/i.test(renderable)) {
              const sel = quill.getSelection(true);
              const index = sel ? sel.index : quill.getLength();
              quill.clipboard.dangerouslyPasteHTML(index, renderable, "user");
              setContent(quill.root.innerHTML);
              setTimeout(() => {
                scriptSrcs.forEach(injectEmbedScript);
                const ed = quillRef.current?.querySelector(
                  ".ql-editor",
                ) as HTMLElement | null;
                applyQuillEditorMediaStyles(ed);
              }, 50);
              return;
            }

            // 2. Inserção via DOM direto pra preservar classes/atributos.
            // Determina o bloco onde inserir: depois do <p> que contém o cursor,
            // ou no fim do editor se sem seleção.
            const editor = quill.root;
            const sel = window.getSelection();
            let anchorBlock: HTMLElement | null = null;
            if (sel && sel.rangeCount > 0 && editor.contains(sel.anchorNode)) {
              let node: Node | null = sel.anchorNode;
              while (
                node &&
                node.parentElement &&
                node.parentElement !== editor
              ) {
                node = node.parentElement;
              }
              anchorBlock =
                node && node.nodeType === Node.ELEMENT_NODE
                  ? (node as HTMLElement)
                  : null;
            }

            const wrapper = document.createElement("div");
            wrapper.innerHTML = renderable;
            const newNodes = Array.from(wrapper.childNodes);
            if (newNodes.length === 0) return;

            let cursor: Node | null = anchorBlock;
            for (const node of newNodes) {
              if (cursor && cursor.parentNode === editor) {
                editor.insertBefore(node, cursor.nextSibling);
                cursor = node;
              } else {
                editor.appendChild(node);
                cursor = node;
              }
            }

            // Garante um parágrafo vazio depois do embed pra o cursor poder
            // continuar digitando abaixo (Quill exige bloco trailing pra navegar).
            if (!editor.lastElementChild || editor.lastElementChild.tagName !== "P") {
              const trailing = document.createElement("p");
              trailing.innerHTML = "<br>";
              editor.appendChild(trailing);
            }

            // IMPORTANTE: não chamamos `quill.update()` aqui — ele força
            // sincronização Delta↔DOM e o normalizador remove classes como
            // `instagram-media` (sem essas classes os scripts dos provedores
            // não convertem o blockquote em iframe). O `text-change` da próxima
            // edição do usuário fará sync natural; até lá, o `content` state
            // reflete o DOM atual com classes intactas.
            setContent(editor.innerHTML);

            // Injeta scripts no head (dedup global via injectedEmbedScriptSrcs)
            // e re-aplica estilos a iframes/imagens inseridos.
            setTimeout(() => {
              scriptSrcs.forEach(injectEmbedScript);
              applyQuillEditorMediaStyles(editor);
            }, 50);
          };
          quill.root.addEventListener("paste", onPaste, true);
          quillPasteCleanupRef.current = () => {
            quill.root.removeEventListener("paste", onPaste, true);
          };

          /** quill-resize-module sets user-select:none on the document while an image is active; it only clears on hide(), which does not run for toolbar clicks (outside .ql-editor). */
          const hideQuillResizer = () => {
            const r = (quill as unknown as { resizer?: { activeEle?: unknown; hide?: () => void } }).resizer;
            if (r?.activeEle) r.hide?.();
          };

          const styleMedia = () => {
            const editor = quillRef.current?.querySelector(
              ".ql-editor",
            ) as HTMLElement | null;
            applyQuillEditorMediaStyles(editor);
          };


          // Listen for content changes
          quill.on('text-change', () => {
            const html = quill.root.innerHTML;
            setContent(html);
            // Update image alignment after content changes
            setTimeout(() => {
              styleMedia();
            }, 100);
          });

          quill.on('selection-change', (range) => {
            if (range != null) {
              hideQuillResizer();
            }
            setTimeout(() => {
              styleMedia();
            }, 50);
          });

          // Also listen for format changes (when alignment is applied)
          quill.on('editor-change', (eventName: string) => {
            if (eventName === 'format-change' || eventName === 'text-change') {
              setTimeout(() => {
                styleMedia();
              }, 50);
            }
          });

          // Initial styling of images
          setTimeout(() => {
            styleMedia();
          }, 200);

          // Apply custom styles to match Figma design
          setTimeout(() => {
            const root = quillRef.current;
            const narrow = isTopicModalNarrowViewport();
            const toolbar = root?.querySelector(".ql-toolbar") as HTMLElement;
            const container = root?.querySelector(".ql-container") as HTMLElement;
            const editor = root?.querySelector(".ql-editor") as HTMLElement;

            if (root) {
              root.style.display = "flex";
              root.style.flexDirection = "column";
              root.style.flex = "1";
              root.style.minHeight = "0";
              /* visible: .ql-tooltip do link não pode ser cortado por overflow */
              root.style.overflow = "visible";
            }

            if (toolbar) {
              quillToolbarMousedownCleanupRef.current?.();
              /** Sem preventDefault o editor perde o foco e a seleção antes do handler do botão — layout na imagem falha. */
              const onToolbarMousedown = (e: MouseEvent) => {
                e.preventDefault();
                hideQuillResizer();
              };
              toolbar.addEventListener("mousedown", onToolbarMousedown);
              quillToolbarMousedownCleanupRef.current = () => {
                toolbar.removeEventListener('mousedown', onToolbarMousedown);
              };

              toolbar.style.backgroundColor = '#fcfcfc';
              toolbar.style.display = 'flex';
              toolbar.style.flexWrap = 'wrap';
              toolbar.style.flexShrink = "0";
            }

            if (container) {
              container.style.border = "none";
              container.style.flex = "1";
              container.style.minHeight = narrow ? "120px" : "0";
              container.style.display = "flex";
              container.style.flexDirection = "column";
              container.style.overflow = "hidden";
              container.style.height = "auto";
            }

            if (editor) {
              editor.style.color = "#646464";
              editor.style.fontFamily = "DM Sans, sans-serif";
              editor.style.lineHeight = "1.3";
              editor.style.flex = "1";
              editor.style.minHeight = narrow ? "min(42vh, 280px)" : "0";
              editor.style.overflowY = "auto";
            }

            // Style all toolbar buttons to match Figma design
            const buttons = quillRef.current?.querySelectorAll(
              ".ql-toolbar button, .ql-toolbar .ql-picker-label",
            );
            buttons?.forEach((button) => {
              const btn = button as HTMLElement;
              btn.style.backgroundColor = '#f9f9f9';
              btn.style.display = 'flex';
              btn.style.alignItems = 'center';
              btn.style.justifyContent = 'center';
              btn.style.cursor = 'pointer';
              btn.style.transition = 'all 0.2s ease';
              btn.style.color = '#202020';
              btn.style.fontWeight = '600';
              btn.style.margin = '0';

              // Style SVG icons inside buttons
              const svgs = btn.querySelectorAll('svg');
              svgs?.forEach((svg) => {
                svg.style.color = '#202020';
              });

              // Hover effect
              btn.addEventListener('mouseenter', () => {
                btn.style.backgroundColor = '#f0f0f0';
              });

              btn.addEventListener('mouseleave', () => {
                if (!btn.classList.contains('ql-active')) {
                  btn.style.backgroundColor = '#f9f9f9';
                }
              });
            });

            // Style active buttons
            const activeButtons = quillRef.current?.querySelectorAll(
              ".ql-toolbar .ql-active",
            );
            activeButtons?.forEach((button) => {
              const btn = button as HTMLElement;
              btn.style.backgroundColor = '#e8e8e8';
            });

            // Style picker dropdowns
            const pickers = quillRef.current?.querySelectorAll(
              ".ql-toolbar .ql-picker",
            );
            pickers?.forEach((picker) => {
              const pick = picker as HTMLElement;
              pick.style.backgroundColor = '#f9f9f9';
              pick.style.border = '1px solid #d9d9d9';
              pick.style.borderRadius = narrow ? '8px' : '12px';
              pick.style.margin = '0';
            });

            // Remove or hide separators
            const separators = quillRef.current?.querySelectorAll(
              ".ql-toolbar .ql-formats",
            );
            separators?.forEach((format) => {
              const fmt = format as HTMLElement;
              fmt.style.display = 'flex';
              fmt.style.alignItems = 'center';
            });

            // Hide default separators (vertical lines)
            const spacerLines = quillRef.current?.querySelectorAll(
              ".ql-toolbar .ql-stroke",
            );
            spacerLines?.forEach((line) => {
              const parent = (line as HTMLElement).closest('.ql-separator');
              if (parent) {
                (parent as HTMLElement).style.display = 'none';
              }
            });

            // Tooltips dos botões de layout (os ícones vêm do registry `ui/icons`).
            const layoutBtnTips: [string, string][] = [
              [
                ".ql-topicLayoutLeft",
                "Imagem à esquerda — texto ao lado (à direita)",
              ],
              [
                ".ql-topicLayoutRight",
                "Imagem à direita — texto ao lado (à esquerda)",
              ],
              [
                ".ql-topicLayoutHalf",
                "Meia largura — duas imagens na mesma linha (Shift+Enter entre elas)",
              ],
              [
                ".ql-topicLayoutClear",
                "Layout normal da imagem (sem flutuar)",
              ],
            ];
            layoutBtnTips.forEach(([sel, tip]) => {
              const el = quillRef.current?.querySelector(sel) as
                | HTMLButtonElement
                | undefined;
              if (el) {
                el.setAttribute("title", tip);
                el.setAttribute("aria-label", tip);
              }
            });

            applyTopicQuillLayoutSizes(root);
          }, 150);

          // Set initial content if provided.
          // Decodificamos `ql-code-block-container` para os elementos reais
          // (blockquote/script) antes de injetar no Quill, e injetamos o
          // `embed.js` correspondente — assim o Instagram processa o blockquote
          // como iframe DENTRO do editor (modo WYSIWYG real).
          if (initialContent) {
            const { html: renderable, scriptSrcs } =
              decodeStoredEmbedsToRenderable(initialContent);
            embedScriptSrcsRef.current = scriptSrcs;
            // dangerouslyPasteHTML aplica os matchers do Quill — incluindo
            // o do Strava — então `<div class="strava-embed-placeholder">`
            // vira blot `stravaPlaceholder` ao invés de ser strippado.
            quill.clipboard.dangerouslyPasteHTML(
              0,
              sanitizeImageDimensions(renderable),
              "silent",
            );
            setContent(quill.root.innerHTML);
            scriptSrcs.forEach(injectEmbedScript);
            setTimeout(() => {
              styleMedia();
            }, 300);
          } else {
            embedScriptSrcsRef.current = [];
            setContent("");
          }
        }, 100);
      };

      initQuill();
    }

    return () => {
      quillToolbarMousedownCleanupRef.current?.();
      quillToolbarMousedownCleanupRef.current = null;
      quillPasteCleanupRef.current?.();
      quillPasteCleanupRef.current = null;
      if (!isOpen && quillInstanceRef.current) {
        quillInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  // Update title and content when modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle || "");

      // Update Quill content if it's already initialized
      if (quillInstanceRef.current && initialContent !== undefined) {
        const currentContent = quillInstanceRef.current.root.innerHTML;
        const { html: renderable, scriptSrcs } =
          decodeStoredEmbedsToRenderable(initialContent || "");
        if (currentContent !== renderable) {
          embedScriptSrcsRef.current = scriptSrcs;
          // Usa dangerouslyPasteHTML p/ que os matchers do Quill (incluindo
          // o do Strava) sejam aplicados — innerHTML direto strippa data-*.
          const q = quillInstanceRef.current;
          q.setContents([], "silent");
          q.clipboard.dangerouslyPasteHTML(
            0,
            sanitizeImageDimensions(renderable),
            "silent",
          );
          setContent(q.root.innerHTML);
          scriptSrcs.forEach(injectEmbedScript);

          // Apply image alignment after loading saved content
          setTimeout(() => {
            const editor = quillRef.current?.querySelector(
              ".ql-editor",
            ) as HTMLElement | null;
            applyQuillEditorMediaStyles(editor);
          }, 200);
        }
      }
    } else {
      // Clean up when modal closes
      setTitle("");
      setContent("");
      setIsCodeMode(false);
      embedScriptSrcsRef.current = [];
      if (quillInstanceRef.current) {
        // Clear content
        quillInstanceRef.current.root.innerHTML = "";
      }
      // Clear the ref to allow re-initialization
      if (quillRef.current) {
        quillRef.current.innerHTML = "";
      }
      quillInstanceRef.current = null;
    }
  }, [isOpen, initialTitle, initialContent, isEditing]);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => applyTopicQuillLayoutSizes(quillRef.current);
    const onOrientation = () => window.setTimeout(apply, 200);
    mq.addEventListener("change", apply);
    window.addEventListener("orientationchange", onOrientation);
    return () => {
      mq.removeEventListener("change", apply);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, [isOpen]);

  /**
   * Alterna entre o editor WYSIWYG do Quill e um <textarea> com o HTML cru.
   * Apenas prepara o conteúdo e flipa a flag — feedback visual da toolbar é
   * feito no `useLayoutEffect` abaixo. Crítico: a altura da toolbar precisa
   * ser medida ANTES de `setIsCodeMode(true)` para que o primeiro render do
   * textarea já tenha o `top` correto (senão, fica com `top: 0` e cobre a
   * toolbar até o segundo render). Os `setState` no mesmo handler são
   * batched pelo React → uma única render com os valores certos.
   */
  const toggleCodeMode = () => {
    const quill = quillInstanceRef.current;
    if (!quill) return;

    if (!isCodeMode) {
      // WYSIWYG → código: decodifica code-blocks (Strava etc.) pra mostrar
      // o HTML cru no textarea ao invés da estrutura `ql-code-block-container`.
      const decoded = decodeStoredEmbedsToRenderable(quill.root.innerHTML);
      const mergedScripts = Array.from(
        new Set([...embedScriptSrcsRef.current, ...decoded.scriptSrcs]),
      );
      embedScriptSrcsRef.current = mergedScripts;
      const sourceHtml = buildSourceViewHtml(decoded.html, mergedScripts);
      setContent(sourceHtml);
      setIsCodeMode(true);
    } else {
      // Código → WYSIWYG: parsear textarea, extrair scripts e re-injetar.
      // O blot custom do Strava (`stravaPlaceholder`) + matcher do clipboard
      // preservam os data-* da div quando passado via `dangerouslyPasteHTML`.
      // Usar `quill.root.innerHTML =` direto strippa os data-*.
      const raw = codeTextareaRef.current?.value ?? "";
      const { html: renderable, scriptSrcs } =
        decodeStoredEmbedsToRenderable(raw);
      embedScriptSrcsRef.current = scriptSrcs;
      quill.setContents([], "silent");
      quill.clipboard.dangerouslyPasteHTML(0, renderable, "silent");
      setContent(quill.root.innerHTML);
      scriptSrcs.forEach(injectEmbedScript);
      setIsCodeMode(false);
      setTimeout(() => {
        const editor = quillRef.current?.querySelector(
          ".ql-editor",
        ) as HTMLElement | null;
        applyQuillEditorMediaStyles(editor);
      }, 100);
    }
  };

  // Mantém a ref atualizada — o handler `code-block` registrado no Quill
  // (criado uma vez na inicialização) acessa a função via ref.
  useEffect(() => {
    toggleCodeModeRef.current = toggleCodeMode;
  });

  /**
   * Em modo código, oculta o Quill inteiro (toolbar + conteúdo) — o usuário
   * vê apenas o textarea com seu próprio header de "voltar". Quando volta ao
   * WYSIWYG, restauramos `display: flex` (valor que o Quill aplica no init).
   * O conteúdo Quill permanece no modelo interno, só não é renderizado.
   */
  useLayoutEffect(() => {
    const root = quillRef.current;
    if (!root) return;
    root.style.display = isCodeMode ? "none" : "flex";
  }, [isCodeMode]);

  /**
   * Mantém o botão `code-block` da toolbar em estado ativo enquanto o modo
   * código está ligado. O handler foi sobrescrito para toggle de modo (em vez
   * de aplicar o formato `code-block`), então o `ql-active` que o Quill
   * gerencia por seleção nunca dispara aqui — sincronizamos manualmente.
   * O background inline duplica a cor aplicada à regra `.ql-active` no init
   * (#e8e8e8) porque os outros estilos da toolbar também são inline e
   * sobrescreveriam um `:hover`/classe via CSS.
   */
  useEffect(() => {
    const button = quillRef.current?.querySelector(
      ".ql-toolbar .ql-code-block",
    ) as HTMLElement | null;
    if (!button) return;
    if (isCodeMode) {
      button.classList.add("ql-active");
      button.style.backgroundColor = "#e8e8e8";
    } else {
      button.classList.remove("ql-active");
      button.style.backgroundColor = "#f9f9f9";
    }
  }, [isCodeMode]);

  const handleSave = async () => {
    if (!onModalSave) {
      closeTopicModal();
      return;
    }

    try {
      // Decide a fonte do HTML conforme o modo atual:
      // - Code mode: textarea (HTML cru, scripts inclusos).
      // - Normal: quill.root.innerHTML + scripts armazenados na ref.
      let renderableHtml: string;
      let scriptSrcs: string[];

      if (isCodeMode && codeTextareaRef.current) {
        const decoded = decodeStoredEmbedsToRenderable(
          codeTextareaRef.current.value,
        );
        renderableHtml = decoded.html;
        scriptSrcs = decoded.scriptSrcs;
      } else if (quillInstanceRef.current) {
        renderableHtml = quillInstanceRef.current.root.innerHTML;
        scriptSrcs = embedScriptSrcsRef.current;
      } else {
        renderableHtml = content;
        scriptSrcs = embedScriptSrcsRef.current;
      }

      // Defesa: `innerHTML = undefined` coage pra a string "undefined" e contamina
      // o conteúdo salvo (depois aparece "undefined" na lista/prévia). Garante string.
      if (typeof renderableHtml !== "string") renderableHtml = "";

      // Imagens em data: URL (coladas pelo usuário) — fazer upload antes de salvar.
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = renderableHtml;
      const hadDataUrls = tempDiv.querySelector('img[src^="data:"]') != null;
      if (hadDataUrls) {
        const uploadToast = toast.loading("Otimizando imagens (upload)…");
        try {
          await replaceDataUrlImagesInContainer(tempDiv);
        } finally {
          toast.dismiss(uploadToast);
        }
      }
      applyQuillEditorMediaStyles(tempDiv);

      // Promove atributos width/height → inline style. Inline vence o reset do
      // Tailwind preflight (`img { height: auto; max-width: 100% }`) que se
      // aplica ao TopicRichContent no render externo — sem isso, o resize do
      // usuário some quando o tópico é exibido fora do editor.
      const normalizedHtml = sanitizeImageDimensions(tempDiv.innerHTML);

      // Re-encapsula embeds em ql-code-block-container para o backend / TopicRichContent.
      const encoded = encodeRenderableToStoredEmbeds(
        normalizedHtml,
        scriptSrcs,
      );

      // Envolve em `<div style="color:#000000">` para que o texto sem cor
      // explícita seja renderizado em preto no preview / página do evento —
      // espelha o default visual do editor (`.ql-editor { color: #000 }`).
      // Spans coloridos vencem por proximidade; `<a>` mantém o azul via CSS.
      const htmlToSave = wrapWithTopicDefaultTextColor(encoded);

      await onModalSave({ title, content: htmlToSave });
      closeTopicModal();
    } catch (error) {
      // Error is already handled in the callback — don't close modal on error
    }
  };


  const handleConfirmDeleteTopic = async () => {
    if (!onModalDelete) {
      throw new Error("Exclusão indisponível");
    }
    await onModalDelete();
    closeTopicModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <DeleteTopicModal
            open={deleteModalOpen}
            onClose={() => setDeleteModalOpen(false)}
            topicTitle={title.trim() || initialTitle.trim() || undefined}
            onConfirm={handleConfirmDeleteTopic}
          />
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
          />

          {/* Modal — opacity-only: evita transform + teclado mobile quebrando layout */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex max-md:min-h-0 max-md:items-stretch max-md:justify-center max-md:p-0 md:items-center md:justify-center md:p-4"
          >
            <div
              className={cn(
                // pt-16 (64px) reserva o topo no mobile: Organizer/AdminMobileNav são
                // `fixed top-0 z-50 h-16` e vêm DEPOIS dos modais no DOM
                // (ModalsProvider é irmão anterior de `children`), então com z-50
                // empatado pintam por cima e engoliriam o header (52px) deste modal.
                // Vale nas duas superfícies — as navs têm a mesma geometria.
                "flex min-h-0 w-full flex-col overflow-visible bg-gray-1 shadow-2xl pt-16 md:pt-0",
                "max-md:h-dvh max-md:max-h-dvh max-md:rounded-none max-md:border-0",
                "md:max-h-[90vh] md:max-w-[1098px] md:rounded-xl md:border md:border-gray-6",
              )}
            >
              {/* Header — mesmo padrão do `CreateQuestionModal` (mobile: barra de 52px
                  com seta de voltar; desktop: título + X). */}
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between border-b border-gray-6",
                  "max-md:h-[52px] max-md:bg-gray-2 max-md:px-4 md:px-5 md:py-3",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                  <button
                    type="button"
                    onClick={closeTopicModal}
                    className="flex size-8 shrink-0 items-center justify-center rounded-[52px] md:border border-gray-6 transition-colors hover:bg-gray-3 md:hidden rotate-180"
                    aria-label="Fechar"
                  >
                    <ArrowButton isOpen={false} />
                  </button>
                  <h2
                    className={cn(
                      "truncate leading-[1.3] text-gray-12",
                      "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                      "md:font-family-dm-sans md:text-[20px] md:font-semibold",
                    )}
                  >
                    {isEditing ? "Editar seção" : "Criar seção"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeTopicModal}
                  className="hidden p-1 text-gray-11 transition-colors hover:text-gray-12 md:block"
                  aria-label="Fechar"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* overflow-visible: tooltip de link do Quill não pode ser cortado pelos ancestrais */}
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden md:overflow-visible">
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-visible p-4 md:gap-6 md:p-6">
                  <div className="flex shrink-0 flex-col gap-2">
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Digite o título do tópico"
                      className="w-full border-0 border-b border-transparent bg-transparent text-gray-12 transition-colors placeholder:text-gray-11 focus:border-primary-8 focus:outline-none max-md:text-lg max-md:font-semibold max-md:font-manrope md:text-2xl md:font-medium"
                    />
                  </div>

                  <div className="flex min-h-[min(42vh,280px)] min-w-0 flex-1 flex-col md:min-h-[240px]">
                    <div
                      ref={quillRef}
                      className="[&_.ql-tooltip]:z-200 flex min-h-[inherit] flex-1 flex-col"
                    />
                    {isCodeMode && (
                      <div className="flex min-h-[inherit] flex-1 flex-col overflow-hidden border border-gray-12 bg-gray-12">
                        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-11 bg-gray-12 px-4 py-2">
                          <span
                            className="text-xs font-semibold uppercase tracking-wide text-[#59E373]"
                            style={{
                              fontFamily:
                                'ui-monospace, SFMono-Regular, "SF Mono", Consolas, monospace',
                            }}
                          >
                            Código fonte
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleCodeModeRef.current()}
                            className="flex items-center gap-1.5 rounded-md border border-[#1f1f1f] bg-gray-12 px-3 py-1 font-manrope text-xs font-semibold text-[#59E373] transition-colors hover:bg-[#141414] [&_svg]:text-[#59E373]"
                          >
                            <ArrowButton isOpen={false} className="rotate-180 size-3" />
                            Voltar ao editor
                          </button>
                        </div>
                        <textarea
                          ref={codeTextareaRef}
                          defaultValue={content}
                          spellCheck={false}
                          style={{
                            fontFamily:
                              'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", monospace',
                            caretColor: "#59E373",
                          }}
                          className="flex min-h-0 w-full flex-1 resize-none border-t border-black bg-gray-12 px-5 py-4 text-[13px] leading-[1.5] text-[#59E373] placeholder:text-[#2f6f3a] focus:outline-none selection:bg-[#59E373]/30"
                          placeholder='<p>HTML cru aqui...</p>&#10;<blockquote class="instagram-media">...</blockquote>&#10;<script async src="//www.instagram.com/embed.js"></script>'
                          aria-label="Código fonte do tópico"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div
                className={cn(
                  "flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-gray-6 px-4 py-4",
                  "max-md:flex-col max-md:items-stretch max-md:bg-gray-1 max-md:pb-[max(1rem,env(safe-area-inset-bottom))]",
                  "md:px-6",
                )}
              >
                <div className="min-w-0 max-md:order-2 max-md:w-full md:order-0">
                  {isEditing && allowDelete ? (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setDeleteModalOpen(true)}
                      className="flex w-full items-center justify-center rounded-lg bg-red-11 py-2 font-manrope font-bold leading-[1.1] text-red-2 transition-colors duration-200 hover:bg-red-12 disabled:pointer-events-none disabled:opacity-50 md:w-auto"
                    >
                      Deletar tópico
                    </Button>
                  ) : null}
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 max-md:order-1 md:w-auto md:flex-row md:justify-end md:gap-3">
                  <Button
                    variant="outline"
                    onClick={closeTopicModal}
                    className="h-11 w-full border-gray-6 text-gray-12 md:h-auto md:w-auto md:px-4 md:py-2"
                  >
                    Fechar
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!title.trim()}
                    className="h-11 w-full disabled:cursor-not-allowed disabled:bg-gray-6 md:h-auto md:w-auto md:px-6 md:py-2"
                  >
                    {isEditing ? "Salvar alteração" : "Criar"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}