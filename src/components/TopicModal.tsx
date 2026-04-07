"use client";

import { useState, useEffect, useRef } from "react";
import { useTopicModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { DeleteTopicModal } from "@/components/Topic/DeleteTopicModal";
import {
  applyTopicImageLayoutToSelectedImage,
  registerTopicQuillImageLayout,
} from "@/components/Topic/registerTopicQuillImageLayout";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { ArrowButton } from "@/components/ArrowButton";
import { cn } from "@/utils/cn";

type QuillInstance = InstanceType<typeof import("quill").default>;

let quillResizeModuleRegistered = false;
let topicQuillImageLayoutRegistered = false;

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

function applyQuillEditorImageStyles(editor: HTMLElement | null) {
  if (!editor) return;
  const href = typeof window !== "undefined" ? window.location.href : "";
  const allImages = editor.querySelectorAll("img");
  allImages.forEach((imgElement) => {
    const img = imgElement as HTMLImageElement;
    if (!img.src || img.src === "" || img.src === href) return;
    if (img.getAttribute("data-layout")) {
      img.style.height = "auto";
      return;
    }
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.verticalAlign = "top";
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
}

export function TopicModal() {
  const { isOpen, closeTopicModal, data, onModalSave, onModalDelete } = useTopicModal();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<QuillInstance | null>(null);
  const quillLoadedRef = useRef(false);
  const quillToolbarMousedownCleanupRef = useRef<(() => void) | null>(null);

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
        if (!topicQuillImageLayoutRegistered) {
          registerTopicQuillImageLayout(Quill);
          topicQuillImageLayoutRegistered = true;
        }

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
                modules: ["Resize"],
                parchment: {
                  image: {
                    attribute: ["width"],
                    limit: { minWidth: 48, maxWidth: 2000 },
                  },
                },
                onChangeSize: () => {
                  const q = quillInstanceRef.current;
                  if (q) setContent(q.root.innerHTML);
                },
              },
              toolbar: {
                container: [
                  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'color': [] }, { 'background': [] }],
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
                  image: function () {
                    const input = document.createElement('input');
                    input.setAttribute('type', 'file');
                    input.setAttribute('accept', 'image/*');
                    input.click();

                    input.onchange = () => {
                      const file = input.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                          const url = e.target?.result as string;
                          const range = quill.getSelection(true);
                          if (range) {
                            // Insert image
                            quill.insertEmbed(range.index, 'image', url, 'user');

                            // After insertion, apply center alignment using Quill's API
                            setTimeout(() => {
                              // Get the line containing the image
                              const [line, offset] = quill.getLine(range.index);
                              if (line) {
                                // Apply center alignment to the line
                                quill.formatLine(range.index, 1, 'align', 'center');

                                // Select the line so user can change alignment
                                quill.setSelection(line.offset(), 0);

                                // Style the image to respect alignment
                                setTimeout(() => {
                                  const ed = quillRef.current?.querySelector(
                                    ".ql-editor",
                                  ) as HTMLElement | null;
                                  applyQuillEditorImageStyles(ed);
                                }, 150);
                              }
                            }, 100);
                          }
                        };
                        reader.readAsDataURL(file);
                      }
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
              'layout'
            ]
          });

          quillInstanceRef.current = quill;

          /** quill-resize-module sets user-select:none on the document while an image is active; it only clears on hide(), which does not run for toolbar clicks (outside .ql-editor). */
          const hideQuillResizer = () => {
            const r = (quill as unknown as { resizer?: { activeEle?: unknown; hide?: () => void } }).resizer;
            if (r?.activeEle) r.hide?.();
          };

          const styleImages = () => {
            const editor = quillRef.current?.querySelector(
              ".ql-editor",
            ) as HTMLElement | null;
            applyQuillEditorImageStyles(editor);
          };


          // Listen for content changes
          quill.on('text-change', () => {
            const html = quill.root.innerHTML;
            setContent(html);
            // Update image alignment after content changes
            setTimeout(() => {
              styleImages();
            }, 100);
          });

          quill.on('selection-change', (range) => {
            if (range != null) {
              hideQuillResizer();
            }
            setTimeout(() => {
              styleImages();
            }, 50);
          });

          // Also listen for format changes (when alignment is applied)
          quill.on('editor-change', (eventName: string) => {
            if (eventName === 'format-change' || eventName === 'text-change') {
              setTimeout(() => {
                styleImages();
              }, 50);
            }
          });

          // Initial styling of images
          setTimeout(() => {
            styleImages();
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

          // Set initial content if provided
          if (initialContent) {
            quill.root.innerHTML = initialContent;
            setContent(initialContent);
            // Style images for initial content
            setTimeout(() => {
              styleImages();
            }, 300);
          } else {
            setContent("");
          }
        }, 100);
      };

      initQuill();
    }

    return () => {
      quillToolbarMousedownCleanupRef.current?.();
      quillToolbarMousedownCleanupRef.current = null;
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
        if (currentContent !== initialContent) {
          quillInstanceRef.current.root.innerHTML = initialContent || "";
          setContent(initialContent || "");

          // Apply image alignment after loading saved content
          setTimeout(() => {
            const editor = quillRef.current?.querySelector(
              ".ql-editor",
            ) as HTMLElement | null;
            applyQuillEditorImageStyles(editor);
          }, 200);
        }
      }
    } else {
      // Clean up when modal closes
      setTitle("");
      setContent("");
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

  const handleSave = async () => {
    if (onModalSave) {
      try {
        // Get the current HTML from Quill
        let htmlToSave = content;

        if (quillInstanceRef.current) {
          htmlToSave = quillInstanceRef.current.root.innerHTML;

          // Process HTML to ensure images have inline styles for alignment
          // This ensures images render correctly even outside Quill editor
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = htmlToSave;

          const allImages = tempDiv.querySelectorAll('img');
          allImages.forEach((imgElement) => {
            const img = imgElement as HTMLImageElement;
            if (img.getAttribute("data-layout")) {
              img.style.height = "auto";
              return;
            }
            const parent = img.parentElement;

            if (parent && parent.tagName === "P") {
              img.style.maxWidth = "100%";
              img.style.height = "auto";
              img.style.verticalAlign = "top";
              if (parent.classList.contains("ql-align-justify")) {
                img.style.display = "block";
                img.style.width = "100%";
                img.style.marginLeft = "0";
                img.style.marginRight = "0";
              } else {
                img.style.display = "inline-block";
                img.style.marginLeft = "";
                img.style.marginRight = "";
                const legacyPct = img.dataset.topicImgWidth;
                if (legacyPct) {
                  img.style.width = `${legacyPct}%`;
                }
              }
            }
          });

          // Get the processed HTML with inline styles
          htmlToSave = tempDiv.innerHTML;
        }

        await onModalSave({ title, content: htmlToSave });
        closeTopicModal();
      } catch (error) {
        // Error is already handled in the callback
        // Don't close modal on error
      }
    } else {
      closeTopicModal();
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
                "flex min-h-0 w-full flex-col overflow-visible bg-gray-1 shadow-2xl",
                "max-md:h-dvh max-md:max-h-dvh max-md:rounded-none max-md:border-0",
                "md:max-h-[90vh] md:max-w-[1098px] md:rounded-xl md:border md:border-gray-6",
              )}
            >
              {/* Header */}
              <div
                className={cn(
                  "flex shrink-0 items-center justify-between border-b border-gray-6",
                  "max-md:h-[52px] max-md:bg-gray-2 max-md:px-4 max-md:py-2",
                  "md:px-5 md:py-3",
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2 md:contents">
                  <button
                    type="button"
                    onClick={closeTopicModal}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-gray-6 text-gray-12 transition-colors hover:bg-gray-3 md:hidden"
                    aria-label="Voltar"
                  >
                    <ArrowButton isOpen={false} className="rotate-180" />
                  </button>
                  <h2
                    className={cn(
                      "min-w-0 text-gray-12 leading-[1.1]",
                      "max-md:font-manrope max-md:text-base max-md:font-extrabold",
                      "md:font-family-dm-sans md:text-[20px] md:font-semibold md:leading-[1.3]",
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
                    Cancelar
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