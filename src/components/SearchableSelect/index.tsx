"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { ArrowButton } from "@/components/ArrowButton";

export interface SearchableSelectOption {
  id: string;
  label: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  emptyText?: string;
  error?: boolean;
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione",
  searchPlaceholder = "Pesquisar...",
  disabled = false,
  loading = false,
  loadingText = "Carregando...",
  emptyText = "Nenhum resultado encontrado",
  error = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [portalStyle, setPortalStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = normalize(search.trim());
    return options.filter((o) => normalize(o.label).includes(q));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    // RAF garante que o portal já foi montado no DOM antes de focar
    const id = requestAnimationFrame(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;

    const update = () => {
      const r = triggerRef.current!.getBoundingClientRect();
      setPortalStyle({
        position: "fixed",
        top: r.bottom + 4,
        left: r.left,
        width: r.width,
        zIndex: 9999,
      });
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // fechar se clicar fora do trigger e fora do painel (portal)
      const panelEl = document.getElementById("searchable-select-portal-panel");
      const isInsideTrigger = triggerRef.current?.contains(target);
      const isInsidePanel = panelEl?.contains(target);
      if (!isInsideTrigger && !isInsidePanel) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleToggle() {
    if (disabled || loading) return;
    setOpen((prev) => {
      if (!prev) setSearch("");
      return !prev;
    });
  }

  function handleSelect(option: SearchableSelectOption) {
    onChange(option.id);
    setOpen(false);
    setSearch("");
  }

  const panel = open && mounted && typeof document !== "undefined"
    ? createPortal(
        <div
          id="searchable-select-portal-panel"
          style={portalStyle}
          className="overflow-hidden rounded-lg border border-gray-6 bg-gray-1 shadow-lg"
        >
          <div className="border-b border-gray-6 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-11" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
                className="h-9 w-full rounded-md border border-gray-6 bg-gray-2 pl-8 pr-3 font-family-dm-sans text-sm text-gray-12 placeholder:text-gray-10 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary-8"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] [touch-action:pan-y] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar]:w-2">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center font-family-dm-sans text-sm text-gray-11">
                {emptyText}
              </div>
            ) : (
              filtered.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full px-3 py-2.5 text-left font-family-dm-sans text-sm text-gray-12 transition-colors hover:bg-gray-3"
                >
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={[
          "flex h-12 w-full items-center justify-between rounded-lg border bg-transparent px-3 transition-colors",
          error ? "border-red-10" : "border-gray-6",
          disabled || loading
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer hover:bg-gray-3",
        ].join(" ")}
      >
        <span
          className={`truncate font-family-dm-sans text-base leading-[1.3] ${value && !loading ? "text-gray-12" : "text-gray-11"}`}
        >
          {loading ? loadingText : value || placeholder}
        </span>
        <ArrowButton isOpen={open} />
      </button>
      {panel}
    </>
  );
}
