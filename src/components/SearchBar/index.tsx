"use client";
import { SearchInput } from "../SearchInput";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

type SearchResult = {
  id: string;
  title: string;
  href: string;
  logoUrl?: string;
  location?: string;
  date?: string;
};

type Props = {
  search: string;
  setSearch: (search: string) => void;
  results?: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
  onSearch?: () => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  search,
  setSearch,
  results = [],
  onResultClick,
  onSearch,
  placeholder = "Procure seu evento...",
  className = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const shouldShowDropdown =
    search.length > 0 && results.length > 0 && isFocused;

  useEffect(() => {
    if (shouldShowDropdown) {
      setIsOpen(true);
    } else if (!isFocused) {
      setIsOpen(false);
    }
  }, [shouldShowDropdown, isFocused]);

  const handleClear = useCallback(() => {
    setSearch("");
    setIsOpen(false);
    inputRef.current?.focus();
  }, [setSearch]);

  const handleResultClick = useCallback(
    (result: { id: string; title: string; href: string }) => {
      if (onResultClick) {
        onResultClick(result);
      } else {
        router.push(result.href);
      }
      setSearch("");
      setIsOpen(false);
      setIsFocused(false);
    },
    [onResultClick, router, setSearch]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && search.trim().length > 0) {
        if (onSearch) {
          onSearch();
        } else {
          router.push(`/search?q=${encodeURIComponent(search.trim())}`);
        }
        setSearch("");
        setIsOpen(false);
        setIsFocused(false);
      } else if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    },
    [search, onSearch, router, setSearch]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
    },
    [setSearch]
  );

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (search.length > 0 && results.length > 0) {
      setIsOpen(true);
    }
  }, [search, results]);

  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    setTimeout(() => {
      if (!containerRef.current?.contains(document.activeElement)) {
        setIsFocused(false);
        setIsOpen(false);
      }
    }, 200);
  }, []);


  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <div className="relative">
        <SearchInput
          ref={inputRef}
          placeholder={placeholder}
          value={search}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onClear={handleClear}
          onFocus={handleFocus}
          onBlur={handleBlur}
          showClearButton={true}
        />
        {shouldShowDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 w-full max-h-[300px] bg-gray-2 rounded-xl shadow-[0_0_10px_rgba(0,0,0,0.1)] border border-gray-6 z-50 overflow-hidden">
            <div className="max-h-[300px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
              {results.map((result, index) => (
                <div
                  key={result.id || index}
                  className={`min-h-[56px] px-4 py-3 flex items-center gap-3 text-gray-12 hover:bg-gray-4 transition-colors duration-200 cursor-pointer ${index > 0 ? "border-t border-gray-6" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleResultClick(result);
                  }}
                >
                  <div className="w-9 h-9 shrink-0 rounded-lg border border-gray-6 overflow-hidden bg-gray-3 relative">
                    {result.logoUrl ? (
                      <Image
                        src={result.logoUrl}
                        alt={result.title}
                        fill
                        sizes="36px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="size-full flex items-center justify-center text-gray-11 text-xs font-semibold">
                        {result.title.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-sm font-semibold text-gray-12 leading-[1.3]">
                      {result.title}
                    </span>
                    {(result.location || result.date) && (
                      <span className="truncate text-xs text-gray-11 leading-[1.3] mt-0.5">
                        {[result.location, result.date].filter(Boolean).join(" • ")}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

