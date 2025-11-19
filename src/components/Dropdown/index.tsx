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
import Image from "next/image";
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

// Ultra-lightweight lazy image component with Intersection Observer
// Uses native img tag instead of Next.js Image for better performance
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
      // Only start observing if dropdown is visible
      if (!isVisible || !imgRef.current || shouldLoad) return;

      let observer: IntersectionObserver | null = null;

      // Small delay to avoid blocking initial render
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

// Wrapper component to memoize the onSelect callback
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

// Memoized option item component for virtual list
const OptionItem = memo(({
  option,
  index,
  onSelect,
}: {
  option: DropdownOption;
  index: number;
  onSelect: (option: DropdownOption) => void;
}) => {
  const handleClick = useCallback(() => {
    onSelect(option);
  }, [option, onSelect]);

  const content = (
    <div
      className="h-[50px] px-4 text-sm flex items-center text-gray-12 hover:bg-gray-4 hover:text-primary-11 transition-colors duration-200"
    >
      {!!option?.icon && (
        <img
          src={option.icon}
          alt={option.label}
          width={24}
          height={24}
          className="mr-2 flex-shrink-0"
          loading="lazy"
          decoding="async"
        />
      )}
      <span className="truncate">{option.label}</span>
    </div>
  );

  return (
    <div
      className={`block h-[50px] ${
        index > 0 ? "border-t border-gray-6" : ""
      }`}
    >
      {option.href ? (
        <Link href={option.href} onClick={handleClick} className="block h-full">
          {content}
        </Link>
      ) : (
        <div onClick={handleClick} className="cursor-pointer h-full">
          {content}
        </div>
      )}
    </div>
  );
});

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
    // Quick length check first
    if (prevIds.length !== selectedIds.length) {
      prevSelectedIdsRef.current = selectedIds;
      setInternalSelectedIds(selectedIds);
      return;
    }

    // Only do deep comparison if lengths match
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
        // Use Set for O(1) lookup instead of O(n) array.includes
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

  // Memoize position classes calculation
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

  // Calculate container height from maxHeight string
  const containerHeight = useMemo(() => {
    if (!maxHeight) return 400;
    const match = maxHeight.match(/\d+/);
    return match ? parseInt(match[0], 10) : 400;
  }, [maxHeight]);

  // Determine if we should use virtual list (more than 10 items)
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
        className={`absolute ${positionClasses} ${width} ${maxHeight} bg-gray-2 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)] border border-gray-6 z-50 overflow-hidden transition-all duration-200 ease-out origin-top ${className} ${
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
                />
              )}
            />
          ) : (
            options?.map((option, index) => (
              <OptionItem
                key={index}
                option={option}
                index={index}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
