"use client";
import React, {
  useEffect,
  useState,
  useRef,
  ReactNode,
  useMemo,
  memo,
  useCallback,
  startTransition,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Checkbox } from "../CheckBox";
import { VirtualList } from "../VirtualList";

export interface DropdownOption {
  icon?: any;
  href?: string;
  label: string;
  /** Texto à direita (ex.: preço), em negrito — usado em layouts tipo lista com valor alinhado à direita */
  suffix?: string;
  onClick?: () => void;
  isDivider?: boolean;
  id?: string;
}

export interface ModalityColumn {
  id: string;
  label: string;
  icon?: any;
}

const LazyModalityImage = memo(
  ({
    src,
    alt,
    isVisible,
  }: {
    src: string;
    alt: string;
    isVisible: boolean;
  }) => {
    const [shouldLoad, setShouldLoad] = useState(false);
    const imgRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!isVisible || !imgRef.current || shouldLoad) return;

      let observer: IntersectionObserver | null = null;

      const timeoutId = setTimeout(() => {
        if (!imgRef.current) return;

        observer = new IntersectionObserver(
          (entries) => {
            if (entries[0]?.isIntersecting) {
              setShouldLoad(true);
              observer?.disconnect();
            }
          },
          { rootMargin: "50px" }
        );

        observer.observe(imgRef.current);
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        observer?.disconnect();
      };
    }, [isVisible, shouldLoad]);

    return (
      <div
        ref={imgRef}
        className="shrink-0 w-6 h-6 flex items-center justify-center"
      >
        {shouldLoad ? (
          <img
            src={src}
            alt={alt}
            width={24}
            height={24}
            className="shrink-0"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-6 h-6 bg-gray-4 rounded" />
        )}
      </div>
    );
  }
);

LazyModalityImage.displayName = "LazyModalityImage";

const ModalityItem = memo(
  ({
    item,
    isSelected,
    onSelect,
    isVisible,
  }: {
    item: ModalityColumn;
    isSelected: boolean;
    onSelect: () => void;
    isVisible: boolean;
  }) => {
    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        onSelect();
      },
      [onSelect]
    );

    const handleCheckboxChange = useCallback(() => {
      onSelect();
    }, [onSelect]);

    return (
      <div
        onClick={handleClick}
        className="flex items-center gap-3 p-4 h-[60px] cursor-pointer hover:bg-gray-4 transition-colors duration-150"
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={handleCheckboxChange}
          onClick={(e) => e.stopPropagation()}
        />
        {item.icon && (
          <LazyModalityImage
            src={item.icon}
            alt={item.label}
            isVisible={isVisible}
          />
        )}
        <span className="text-sm text-gray-12 flex-1 truncate">
          {item.label}
        </span>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.isVisible === nextProps.isVisible
    );
  }
);

ModalityItem.displayName = "ModalityItem";

const ModalityItemWrapper = memo(
  ({
    item,
    isSelected,
    onSelect,
    isVisible,
  }: {
    item: ModalityColumn;
    isSelected: boolean;
    onSelect: (option: DropdownOption) => void;
    isVisible: boolean;
  }) => {
    const handleSelect = useCallback(() => {
      onSelect({ id: item.id, label: item.label });
    }, [item.id, item.label, onSelect]);

    return (
      <ModalityItem
        item={item}
        isSelected={isSelected}
        onSelect={handleSelect}
        isVisible={isVisible}
      />
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.item.id === nextProps.item.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.onSelect === nextProps.onSelect &&
      prevProps.isVisible === nextProps.isVisible
    );
  }
);

ModalityItemWrapper.displayName = "ModalityItemWrapper";

const OptionItem = memo(
  ({
    option,
    index,
    onSelect,
    allOptions,
  }: {
    option: DropdownOption;
    index: number;
    onSelect: (option: DropdownOption) => void;
    allOptions?: DropdownOption[];
  }) => {
    const handleClick = useCallback(() => {
      if (option.onClick) {
        option.onClick();
      }
      onSelect(option);
    }, [option, onSelect]);

    const isOrganizerRequest = option.label === "organizer";
    const isIconComponent = option?.icon && typeof option.icon !== "string";
    const isIconString = option?.icon && typeof option.icon === "string";

    const content = (
      <>
        {isOrganizerRequest ? (
          <div className="min-h-[112px] px-4 flex flex-col items-start justify-center gap-2 bg-[url('/images/become-organizer.png')] bg-cover bg-center">
            <h1 className="text-sm font-bold text-gray-12">
              Torne-se um organizador
            </h1>
            <p className="text-sm font-normal text-gray-12 pr-4">
              Quer tirar seu evento do papel? Vire organizador e publique
            </p>
          </div>
        ) : (
          <div className="h-[48px] px-4 flex items-center gap-3 text-gray-12 hover:bg-gray-3 transition-colors duration-150 cursor-pointer group min-w-0">
            {isIconComponent && (
              <div className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-11 group-hover:text-gray-12 transition-colors">
                {React.createElement(option.icon, { className: "w-5 h-5" })}
              </div>
            )}
            {isIconString && (
              <img
                src={option.icon}
                alt={option.label}
                width={20}
                height={20}
                className="shrink-0"
                loading="lazy"
                decoding="async"
              />
            )}
            {option.suffix != null ? (
              <div className="flex flex-1 min-w-0 items-center gap-1">
                <span className="text-sm font-normal text-gray-12 truncate min-w-0">
                  {option.label}
                </span>
                <span className="text-sm font-normal text-gray-12 truncate min-w-0">-</span>
                <span className="text-sm font-bold text-gray-12 shrink-0 tabular-nums">
                  {option.suffix}
                </span>
              </div>
            ) : (
              <span className="text-sm font-normal text-gray-12 truncate">
                {option.label}
              </span>
            )}
          </div>
        )}
      </>
    );

    if (option.isDivider) {
      return <div className="h-px bg-gray-6 mx-0 my-0" />;
    }

    const prevOption = allOptions && index > 0 ? allOptions[index - 1] : null;
    const shouldShowBorder = index > 0 && !prevOption?.isDivider;

    return (
      <div
        className={`block ${shouldShowBorder ? "border-t border-gray-6" : ""}`}
      >
        {option.href ? (
          <Link
            href={option.href}
            onClick={handleClick}
            className="block h-full"
          >
            {content}
          </Link>
        ) : (
          <div onClick={handleClick} className="cursor-pointer h-full">
            {content}
          </div>
        )}
      </div>
    );
  }
);

OptionItem.displayName = "OptionItem";

export type DropdownChildrenRender = (helpers: {
  close: () => void;
}) => ReactNode;

export interface DropdownProps {
  options?: DropdownOption[];
  trigger: ReactNode | ((isOpen: boolean) => ReactNode);
  onSelect?: (option: DropdownOption) => void;
  onOpenChange?: (open: boolean) => void;
  position?: "top" | "bottom" | "left" | "right";
  align?: "start" | "end" | "center";
  width?: string;
  maxHeight?: string;
  className?: string;
  dataAttribute?: string;
  children?: ReactNode | DropdownChildrenRender;
  columns?: Array<Array<{ id: string; label: string; icon?: string }>>;
  multiSelect?: boolean;
  selectedIds?: string[];
  onMultiSelectChange?: (selectedIds: string[]) => void;
  /** Renderiza o painel com position:fixed no body — evita corte dentro de modais com overflow */
  menuInPortal?: boolean;
  /**
   * Lista abaixo do gatilho em fluxo normal (sem fixed/absolute). Ideal para prévias dentro de modal.
   * Se `true`, ignora `menuInPortal`.
   */
  menuInline?: boolean;
  /**
   * Ao abrir, rola a lista (virtualizada) até deixar o item selecionado
   * (`selectedIds[0]`) no topo. Útil para listas longas como anos de nascimento
   * — abre ancorado no ano corrente em vez de no início. Só tem efeito quando a
   * lista é virtualizada (>10 itens).
   */
  scrollToSelectedOnOpen?: boolean;
}

export function Dropdown({
  options = [],
  trigger,
  onSelect,
  onOpenChange,
  position = "bottom",
  align = "start",
  width = "w-48",
  maxHeight = "max-h-[427px]",
  className = "",
  dataAttribute = "dropdown",
  children,
  columns,
  multiSelect = false,
  selectedIds = [],
  onMultiSelectChange,
  menuInPortal = false,
  menuInline = false,
  scrollToSelectedOnOpen = false,
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [portalPlacement, setPortalPlacement] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    /** Limite vertical baseado no espaço disponível na viewport. */
    maxHeight?: number;
  } | null>(null);
  const [internalSelectedIds, setInternalSelectedIds] =
    useState<string[]>(selectedIds);
  const prevSelectedIdsRef = useRef<string[]>(selectedIds);
  const isInternalUpdateRef = useRef(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const selectedIdsSet = useMemo(
    () => new Set(internalSelectedIds),
    [internalSelectedIds]
  );

  useEffect(() => {
    if (isInternalUpdateRef.current) {
      isInternalUpdateRef.current = false;
      return;
    }

    const prevIds = prevSelectedIdsRef.current;
    if (prevIds.length !== selectedIds.length) {
      prevSelectedIdsRef.current = selectedIds;
      setInternalSelectedIds(selectedIds);
      return;
    }

    const prevSet = new Set(prevIds);
    const hasChanged =
      selectedIds.some((id) => !prevSet.has(id)) ||
      prevIds.some((id) => !new Set(selectedIds).has(id));

    if (hasChanged) {
      prevSelectedIdsRef.current = selectedIds;
      setInternalSelectedIds(selectedIds);
    }
  }, [selectedIds]);

  useEffect(() => {
    onOpenChangeRef.current?.(isOpen);
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Altura desejada do menu em px (parseada de `maxHeight` prop tipo "max-h-[200px]")
  // — usada tanto pelo cálculo de placement no portal quanto pelo `menuBody` interno.
  const containerHeight = useMemo(() => {
    if (!maxHeight) return 400;
    const match = maxHeight.match(/\d+/);
    return match ? parseInt(match[0], 10) : 400;
  }, [maxHeight]);

  useLayoutEffect(() => {
    if (!menuInPortal || menuInline || !isOpen || !triggerRef.current) {
      setPortalPlacement(null);
      return;
    }

    const el = triggerRef.current;

    const update = () => {
      const r = el.getBoundingClientRect();
      const gap = 8;
      const viewportMargin = 16; // respiro pra não colar nas bordas
      const desired = containerHeight;
      const spaceBelow = window.innerHeight - r.bottom - gap - viewportMargin;
      const spaceAbove = r.top - gap - viewportMargin;

      // Flip automático: se o consumidor preferiu "bottom" mas não cabe E há
      // mais espaço acima, abre pra cima (mantém o menu DENTRO da viewport).
      // Mesmo princípio pra "top".
      const preferBottom = position !== "top";
      const useBottom =
        preferBottom
          ? spaceBelow >= Math.min(desired, 200) || spaceBelow >= spaceAbove
          : !(spaceAbove >= Math.min(desired, 200) || spaceAbove >= spaceBelow);

      if (useBottom) {
        // Limita maxHeight ao espaço disponível pra evitar que o menu transborde
        // a viewport (e o usuário não consiga rolar pra ver mais variações).
        const cappedHeight = Math.max(120, Math.min(desired, spaceBelow));
        setPortalPlacement({
          top: r.bottom + gap,
          left: r.left,
          width: r.width,
          maxHeight: cappedHeight,
        });
      } else {
        const cappedHeight = Math.max(120, Math.min(desired, spaceAbove));
        setPortalPlacement({
          bottom: window.innerHeight - r.top + gap,
          left: r.left,
          width: r.width,
          maxHeight: cappedHeight,
        });
      }
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [menuInPortal, menuInline, isOpen, position, containerHeight]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const dropdown = target.closest(`[data-${dataAttribute}-dropdown]`);
      const button = target.closest(`[data-${dataAttribute}-button]`);

      if (!dropdown && !button && isOpen) {
        startTransition(() => {
          setIsOpen(false);
        });
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, dataAttribute]);

  const handleSelect = useCallback(
    (option: DropdownOption) => {
      if (multiSelect && option.id) {
        const isCurrentlySelected = selectedIdsSet.has(option.id);
        const newSelectedIds = isCurrentlySelected
          ? internalSelectedIds.filter((id) => id !== option.id)
          : [...internalSelectedIds, option.id];

        isInternalUpdateRef.current = true;
        setInternalSelectedIds(newSelectedIds);
        prevSelectedIdsRef.current = newSelectedIds;

        if (onMultiSelectChange) {
          onMultiSelectChange(newSelectedIds);
        }
        return;
      }

      if (option.onClick) {
        option.onClick();
      }
      if (onSelect) {
        onSelect(option);
      }
      startTransition(() => {
        setIsOpen(false);
      });
    },
    [
      multiSelect,
      internalSelectedIds,
      selectedIdsSet,
      onMultiSelectChange,
      onSelect,
    ]
  );

  const positionClasses = useMemo(() => {
    const hasCustomTop = className.match(/\btop-\d+/);
    const hasCustomBottom = className.match(/\bbottom-\d+/);
    const hasCustomLeft = className.match(/\bleft-\d+/);
    const hasCustomRight = className.match(/\bright-\d+/);

    if (hasCustomTop || hasCustomBottom || hasCustomLeft || hasCustomRight) {
      const alignMap = {
        start: position === "top" || position === "bottom" ? "left-0" : "top-0",
        end:
          position === "top" || position === "bottom" ? "right-0" : "bottom-0",
        center:
          position === "top" || position === "bottom"
            ? "left-1/2 -translate-x-1/2"
            : "top-1/2 -translate-y-1/2",
      };
      return alignMap[align];
    }

    const positionMap = {
      top: "bottom-full mb-2",
      bottom: "top-full mt-2",
      left: "right-full mr-2",
      right: "left-full ml-2",
    };

    const alignMap = {
      start: position === "top" || position === "bottom" ? "left-0" : "top-0",
      end: position === "top" || position === "bottom" ? "right-0" : "bottom-0",
      center:
        position === "top" || position === "bottom"
          ? "left-1/2 -translate-x-1/2"
          : "top-1/2 -translate-y-1/2",
    };

    return `${positionMap[position]} ${alignMap[align]}`;
  }, [className, position, align]);

  const buttonDataAttr = { [`data-${dataAttribute}-button`]: true };
  const dropdownDataAttr = { [`data-${dataAttribute}-dropdown`]: true };

  const triggerContent =
    typeof trigger === "function" ? trigger(isOpen) : trigger;

  const shouldUseVirtualList = useMemo(() => {
    return options && options.length > 10;
  }, [options]);

  // Índice do item selecionado pra ancorar o scroll ao ABRIR (só quando opt-in).
  // `undefined` quando fechado → na próxima abertura o valor muda de novo e a
  // `VirtualList` reposiciona (efeito dispara a cada open).
  const scrollToIndex = useMemo(() => {
    if (!scrollToSelectedOnOpen || !isOpen) return undefined;
    const sel = internalSelectedIds[0];
    if (sel == null) return undefined;
    const idx = options.findIndex((o) => (o.id ?? o.label) === sel);
    return idx >= 0 ? idx : undefined;
  }, [scrollToSelectedOnOpen, isOpen, internalSelectedIds, options]);

  // No modo portal, o pai (do portal) já clampa a altura ao espaço disponível
  // na viewport — aqui usamos o mesmo valor pra evitar bug em que o filho
  // tem max-h maior que o pai e itens ficam cortados sem aparecer no scroll.
  const effectiveMenuMaxHeight =
    portalPlacement?.maxHeight ?? containerHeight;
  const menuBody = (
    <div
      className="overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full"
      style={{ maxHeight: effectiveMenuMaxHeight }}
    >
      {children ? (
        typeof children === "function" ? (
          children({
            close: () => {
              startTransition(() => {
                setIsOpen(false);
              });
            },
          })
        ) : (
          children
        )
      ) : columns && multiSelect ? (
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))`,
            contentVisibility: "auto",
            contain: "layout",
          }}
        >
          {columns.map((column, colIndex) => {
            const columnKey = `col-${colIndex}`;
            return (
              <div
                key={columnKey}
                className={`flex flex-col ${colIndex > 0 ? "border-l border-gray-6" : ""
                  }`}
              >
                {column.map((item, itemIndex) => {
                  const isSelected = selectedIdsSet.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={itemIndex > 0 ? "border-t border-gray-6" : ""}
                    >
                      <ModalityItemWrapper
                        item={item}
                        isSelected={isSelected}
                        onSelect={handleSelect}
                        isVisible={isOpen}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : shouldUseVirtualList ? (
        <VirtualList
          // Remonta quando o índice alvo muda (cada abertura) pra reaplicar o
          // scroll inicial sem setState em effect.
          key={`vlist-${scrollToIndex ?? "top"}`}
          items={options}
          itemHeight={50}
          containerHeight={effectiveMenuMaxHeight}
          overscan={3}
          initialScrollIndex={scrollToIndex}
          className="[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full"
          renderItem={(option, index) => (
            <OptionItem
              key={option.id || option.label || index}
              option={option}
              index={index}
              onSelect={handleSelect}
              allOptions={options}
            />
          )}
        />
      ) : (
        options?.map((option, index) => {
          return (
            <OptionItem
              key={index}
              option={option}
              index={index}
              onSelect={handleSelect}
              allOptions={options}
            />
          );
        })
      )}
    </div>
  );

  const portalMenu =
    mounted &&
      menuInPortal &&
      !menuInline &&
      isOpen &&
      portalPlacement &&
      typeof document !== "undefined"
      ? createPortal(
        <div
          {...dropdownDataAttr}
          className={`bg-gray-1 rounded-lg shadow-lg border border-gray-6 z-300 overflow-hidden ${className}`}
          style={{
            position: "fixed",
            left: portalPlacement.left,
            width: portalPlacement.width,
            // Usa o limite calculado dinamicamente quando disponível
            // (mantém o menu dentro da viewport), ou o máximo configurado.
            maxHeight: portalPlacement.maxHeight ?? containerHeight,
            ...(portalPlacement.top != null
              ? { top: portalPlacement.top }
              : {}),
            ...(portalPlacement.bottom != null
              ? { bottom: portalPlacement.bottom }
              : {}),
          }}
        >
          {menuBody}
        </div>,
        document.body,
      )
      : null;

  return (
    <div
      className={
        menuInline ? "relative flex w-full flex-col" : "relative h-full"
      }
    >
      <div
        ref={triggerRef}
        {...buttonDataAttr}
        onClick={() => {
          startTransition(() => {
            setIsOpen(!isOpen);
          });
        }}
        className={menuInline ? "cursor-pointer w-full" : "cursor-pointer h-full"}
      >
        {triggerContent}
      </div>
      {menuInline && isOpen && (
        <div
          {...dropdownDataAttr}
          className={`${width} ${maxHeight} mt-2 bg-gray-1 rounded-lg shadow-lg border border-gray-6 z-10 overflow-hidden ${className}`}
        >
          {menuBody}
        </div>
      )}
      {!menuInPortal && !menuInline && (
        <div
          {...dropdownDataAttr}
          className={`absolute ${positionClasses} ${width} ${maxHeight} bg-gray-1 rounded-lg shadow-lg border border-gray-6 z-50 overflow-hidden transition-all duration-200 ease-out origin-top ${className} ${isOpen
              ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto visible"
              : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none invisible"
            }`}
          style={{
            willChange: "transform, opacity",
            contentVisibility: isOpen ? "auto" : "hidden",
            contain: "layout style paint",
          }}
        >
          {menuBody}
        </div>
      )}
      {portalMenu}
    </div>
  );
}
