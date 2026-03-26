"use client";

import { useState, useEffect, useRef } from "react";
import { useTopicModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type QuillInstance = InstanceType<typeof import("quill").default>;

let quillResizeModuleRegistered = false;

export function TopicModal() {
  const { isOpen, closeTopicModal, data, onModalSave } = useTopicModal();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstanceRef = useRef<QuillInstance | null>(null);
  const quillLoadedRef = useRef(false);
  const quillToolbarMousedownCleanupRef = useRef<(() => void) | null>(null);

  const initialTitle = data?.title || "";
  const initialContent = data?.content || "";
  const isEditing = data?.isEditing || false;

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
                [{ 'table': true }],
                ['clean']
              ],
              handlers: {
                image: function() {
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
                                updateImageAlignment();
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
            'table'
          ]
        });

        quillInstanceRef.current = quill;

        /** quill-resize-module sets user-select:none on the document while an image is active; it only clears on hide(), which does not run for toolbar clicks (outside .ql-editor). */
        const hideQuillResizer = () => {
          const r = (quill as unknown as { resizer?: { activeEle?: unknown; hide?: () => void } }).resizer;
          if (r?.activeEle) r.hide?.();
        };

        // Function to update image alignment based on parent paragraph
        const updateImageAlignment = () => {
          const editor = quillRef.current?.querySelector('.ql-editor') as HTMLElement;
          if (!editor) return;

          const allImages = editor.querySelectorAll('img');
          allImages.forEach((imgElement) => {
            const img = imgElement as HTMLImageElement;
            const parent = img.parentElement;
            
            if (parent && parent.tagName === 'P') {
              img.style.marginLeft = '';
              img.style.marginRight = '';

              if (parent.classList.contains('ql-align-justify')) {
                img.style.width = '100%';
                img.style.marginLeft = '0';
                img.style.marginRight = '0';
              } else {
                const legacyPct = img.dataset.topicImgWidth;
                img.style.width = legacyPct ? `${legacyPct}%` : '';
                if (parent.classList.contains('ql-align-center')) {
                  img.style.marginLeft = 'auto';
                  img.style.marginRight = 'auto';
                } else if (parent.classList.contains('ql-align-right')) {
                  img.style.marginLeft = 'auto';
                  img.style.marginRight = '0';
                } else if (parent.classList.contains('ql-align-left')) {
                  img.style.marginLeft = '0';
                  img.style.marginRight = 'auto';
                } else {
                  img.style.marginLeft = '0';
                  img.style.marginRight = 'auto';
                }
              }
            }
          });
        };

        // Only apply layout CSS to images — do not call formatLine here (DOM text length ≠ Quill index and was resetting alignment on unrelated lines).
        const styleImages = () => {
          const editor = quillRef.current?.querySelector('.ql-editor') as HTMLElement;
          if (!editor) return;

          const allImages = editor.querySelectorAll('img');
          allImages.forEach((imgElement) => {
            const img = imgElement as HTMLImageElement;
            if (!img.src || img.src === '' || img.src === window.location.href) return;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.style.display = 'block';
          });
          updateImageAlignment();
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
            updateImageAlignment();
          }, 50);
        });

        // Also listen for format changes (when alignment is applied)
        quill.on('editor-change', (eventName: string) => {
          if (eventName === 'format-change' || eventName === 'text-change') {
            setTimeout(() => {
              updateImageAlignment();
            }, 50);
          }
        });

        // Initial styling of images
        setTimeout(() => {
          styleImages();
          updateImageAlignment();
        }, 200);

        // Apply custom styles to match Figma design
        setTimeout(() => {
          const toolbar = quillRef.current?.querySelector('.ql-toolbar') as HTMLElement;
          const container = quillRef.current?.querySelector('.ql-container') as HTMLElement;
          const editor = quillRef.current?.querySelector('.ql-editor') as HTMLElement;

          if (toolbar) {
            quillToolbarMousedownCleanupRef.current?.();
            const onToolbarMousedown = () => hideQuillResizer();
            toolbar.addEventListener('mousedown', onToolbarMousedown);
            quillToolbarMousedownCleanupRef.current = () => {
              toolbar.removeEventListener('mousedown', onToolbarMousedown);
            };

            toolbar.style.backgroundColor = '#fcfcfc';
            toolbar.style.padding = '20px';
            toolbar.style.display = 'flex';
            toolbar.style.gap = '8px';
            toolbar.style.justifyContent = 'flex-end';
            toolbar.style.flexWrap = 'wrap';
          }

          if (container) {
            container.style.border = 'none';
          }

          if (editor) {
            editor.style.color = '#646464';
            editor.style.fontSize = '16px';
            editor.style.fontFamily = 'DM Sans, sans-serif';
            editor.style.lineHeight = '1.3';
            editor.style.minHeight = '300px';
            editor.style.padding = '20px';
          }

          // Style all toolbar buttons to match Figma design
          const buttons = quillRef.current?.querySelectorAll('.ql-toolbar button, .ql-toolbar .ql-picker-label');
          buttons?.forEach((button) => {
            const btn = button as HTMLElement;
            btn.style.backgroundColor = '#f9f9f9';
            btn.style.padding = '3px 10px';
            btn.style.minHeight = '56px';
            btn.style.minWidth = '72px';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.cursor = 'pointer';
            btn.style.transition = 'all 0.2s ease';
            btn.style.color = '#202020';
            btn.style.fontSize = '16px';
            btn.style.fontWeight = '600';
            btn.style.margin = '0';

            // Style SVG icons inside buttons
            const svgs = btn.querySelectorAll('svg');
            svgs?.forEach((svg) => {
              svg.style.width = '24px';
              svg.style.height = '24px';
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
          const activeButtons = quillRef.current?.querySelectorAll('.ql-toolbar .ql-active');
          activeButtons?.forEach((button) => {
            const btn = button as HTMLElement;
            btn.style.backgroundColor = '#e8e8e8';
          });

          // Style picker dropdowns
          const pickers = quillRef.current?.querySelectorAll('.ql-toolbar .ql-picker');
          pickers?.forEach((picker) => {
            const pick = picker as HTMLElement;
            pick.style.backgroundColor = '#f9f9f9';
            pick.style.border = '1px solid #d9d9d9';
            pick.style.borderRadius = '12px';
            pick.style.padding = '3px 10px';
            pick.style.minHeight = '56px';
            pick.style.minWidth = '72px';
            pick.style.margin = '0';
          });

          // Remove or hide separators
          const separators = quillRef.current?.querySelectorAll('.ql-toolbar .ql-formats');
          separators?.forEach((format) => {
            const fmt = format as HTMLElement;
            fmt.style.gap = '8px';
            fmt.style.display = 'flex';
            fmt.style.alignItems = 'center';
          });

          // Hide default separators (vertical lines)
          const spacerLines = quillRef.current?.querySelectorAll('.ql-toolbar .ql-stroke');
          spacerLines?.forEach((line) => {
            const parent = (line as HTMLElement).closest('.ql-separator');
            if (parent) {
              (parent as HTMLElement).style.display = 'none';
            }
          });
        }, 150);

          // Set initial content if provided
          if (initialContent) {
            quill.root.innerHTML = initialContent;
            setContent(initialContent);
            // Style images for initial content
            setTimeout(() => {
              styleImages();
              updateImageAlignment();
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
            const editor = quillRef.current?.querySelector('.ql-editor') as HTMLElement;
            if (editor) {
              const allImages = editor.querySelectorAll('img');
              allImages.forEach((imgElement) => {
                const img = imgElement as HTMLImageElement;
                const parent = img.parentElement;
                
                if (parent && parent.tagName === 'P') {
                  img.style.maxWidth = '100%';
                  img.style.height = 'auto';
                  img.style.display = 'block';
                  img.style.marginLeft = '';
                  img.style.marginRight = '';
                  if (parent.classList.contains('ql-align-justify')) {
                    img.style.width = '100%';
                    img.style.marginLeft = '0';
                    img.style.marginRight = '0';
                  } else {
                    const legacyPct = img.dataset.topicImgWidth;
                    img.style.width = legacyPct ? `${legacyPct}%` : '';
                    if (parent.classList.contains('ql-align-center')) {
                      img.style.marginLeft = 'auto';
                      img.style.marginRight = 'auto';
                    } else if (parent.classList.contains('ql-align-right')) {
                      img.style.marginLeft = 'auto';
                      img.style.marginRight = '0';
                    } else if (parent.classList.contains('ql-align-left')) {
                      img.style.marginLeft = '0';
                      img.style.marginRight = 'auto';
                    } else {
                      img.style.marginLeft = '0';
                      img.style.marginRight = 'auto';
                    }
                  }
                }
              });
            }
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
            const parent = img.parentElement;
            
            if (parent && parent.tagName === 'P') {
              img.style.maxWidth = '100%';
              img.style.height = 'auto';
              img.style.display = 'block';
              img.style.marginLeft = '';
              img.style.marginRight = '';
              if (parent.classList.contains('ql-align-justify')) {
                img.style.width = '100%';
                img.style.marginLeft = '0';
                img.style.marginRight = '0';
              } else {
                const legacyPct = img.dataset.topicImgWidth;
                img.style.width = legacyPct ? `${legacyPct}%` : '';
                if (parent.classList.contains('ql-align-center')) {
                  img.style.marginLeft = 'auto';
                  img.style.marginRight = 'auto';
                } else if (parent.classList.contains('ql-align-right')) {
                  img.style.marginLeft = 'auto';
                  img.style.marginRight = '0';
                } else if (parent.classList.contains('ql-align-left')) {
                  img.style.marginLeft = '0';
                  img.style.marginRight = 'auto';
                } else {
                  img.style.marginLeft = '0';
                  img.style.marginRight = 'auto';
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


  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/90 z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[1098px] max-h-[90vh] min-h-0 flex flex-col shadow-2xl">
              {/* Header */}
              <div className="shrink-0 border-b border-gray-6 flex items-center justify-between px-5 py-3">
                <h2 className="text-gray-12 text-[20px] font-semibold font-family-dm-sans leading-[1.3]">
                  {isEditing ? "Editar seção" : "Criar seção"}
                </h2>
                <button
                  onClick={closeTopicModal}
                  className="text-gray-11 hover:text-gray-12 transition-colors p-1"
                >
                  <X className="size-6" />
                </button>
              </div>

              {/* Content — min-h-0 lets this flex child shrink so overflow-y-auto can scroll */}
              <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                  <div className="flex flex-col gap-6 p-6">
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Digite o título do tópico"
                        className="w-full text-gray-12 text-2xl font-medium focus:outline-none focus:border-primary-8 transition-colors"
                      />
                    </div>

                    {/* Content Editor */}
                    <div className="flex min-w-0 flex-col gap-2">
                      <div className="min-w-0">
                        <div
                          ref={quillRef}
                          className="min-h-[300px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="shrink-0 border-t border-gray-6 flex items-center justify-end gap-3 px-6 py-4">
                <Button
                  variant="outline"
                  onClick={closeTopicModal}
                  className="border-gray-6 text-gray-11 px-4 py-2"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={!title.trim()}
                  className="bg-primary-11 hover:bg-primary-10 disabled:bg-gray-6 disabled:cursor-not-allowed text-primary-2 px-6 py-2"
                >
                  {isEditing ? "Salvar alteração" : "Criar"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}