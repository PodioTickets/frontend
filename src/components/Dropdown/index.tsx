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
} from "react";
import Link from "next/link";
import { Checkbox } from "../CheckBox";
import { VirtualList } from "../VirtualList";

export interface DropdownOption {
  icon?: any;
  href?: string;
  label: string;
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
          <div className="h-[48px] px-4 flex items-center gap-3 text-gray-12 hover:bg-gray-3 transition-colors duration-150 cursor-pointer group">
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
            <span className="text-sm font-normal text-gray-12 truncate">
              {option.label}
            </span>
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

export interface DropdownProps {
  options?: DropdownOption[];
  trigger: ReactNode | ((isOpen: boolean) => ReactNode);
  onSelect?: (option: DropdownOption) => void;
  position?: "top" | "bottom" | "left" | "right";
  align?: "start" | "end" | "center";
  width?: string;
  maxHeight?: string;
  className?: string;
  dataAttribute?: string;
  children?: ReactNode;
  columns?: Array<Array<{ id: string; label: string; icon?: string }>>;
  multiSelect?: boolean;
  selectedIds?: string[];
  onMultiSelectChange?: (selectedIds: string[]) => void;
}

export function Dropdown({
  options = [],
  trigger,
  onSelect,
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
}: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalSelectedIds, setInternalSelectedIds] =
    useState<string[]>(selectedIds);
  const prevSelectedIdsRef = useRef<string[]>(selectedIds);
  const isInternalUpdateRef = useRef(false);

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

  const containerHeight = useMemo(() => {
    if (!maxHeight) return 400;
    const match = maxHeight.match(/\d+/);
    return match ? parseInt(match[0], 10) : 400;
  }, [maxHeight]);

  const shouldUseVirtualList = useMemo(() => {
    return options && options.length > 10;
  }, [options]);

  return (
    <div className="relative h-full">
      <div
        {...buttonDataAttr}
        onClick={() => {
          startTransition(() => {
            setIsOpen(!isOpen);
          });
        }}
        className="cursor-pointer h-full"
      >
        {triggerContent}
      </div>
      <div
        {...dropdownDataAttr}
        className={`absolute ${positionClasses} ${width} ${maxHeight} bg-gray-1 rounded-lg shadow-lg border border-gray-6 z-50 overflow-hidden transition-all duration-200 ease-out origin-top ${className} ${
          isOpen
            ? "opacity-100 scale-y-100 translate-y-0 pointer-events-auto visible"
            : "opacity-0 scale-y-95 -translate-y-2 pointer-events-none invisible"
        }`}
        style={{
          willChange: "transform, opacity",
          contentVisibility: isOpen ? "auto" : "hidden",
          contain: "layout style paint",
        }}
      >
        <div
          className={`${maxHeight} overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full`}
        >
          {children ? (
            children
          ) : columns && multiSelect ? (
            <div
              className="grid grid-cols-4"
              style={{
                contentVisibility: "auto",
                contain: "layout",
              }}
            >
              {columns.map((column, colIndex) => {
                const columnKey = `col-${colIndex}`;
                return (
                  <div
                    key={columnKey}
                    className={`flex flex-col ${
                      colIndex > 0 ? "border-l border-gray-6" : ""
                    }`}
                  >
                    {column.map((item, itemIndex) => {
                      const isSelected = selectedIdsSet.has(item.id);
                      return (
                        <div
                          key={item.id}
                          className={
                            itemIndex > 0 ? "border-t border-gray-6" : ""
                          }
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
              items={options}
              itemHeight={50}
              containerHeight={containerHeight}
              overscan={3}
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
      </div>
    </div>
  );
}
