"use client";
import { SearchInput } from "../SearchInput";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Props = {
  search: string;
  setSearch: (search: string) => void;
  results?: Array<{ id: string; title: string; href: string }>;
  onResultClick?: (result: { id: string; title: string; href: string }) => void;
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

  const dropdownOptions: DropdownOption[] = results.map((result) => ({
    label: result.title,
    href: result.href,
    onClick: () => handleResultClick(result),
  }));

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
              {dropdownOptions.map((option, index) => (
                <div
                  key={option.href || index}
                  className={`h-[50px] px-4 text-sm flex items-center text-gray-12 hover:bg-gray-4 hover:text-primary-11 transition-colors duration-200 cursor-pointer ${
                    index > 0 ? "border-t border-gray-6" : ""
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleResultClick({
                      id: option.href?.split("/").pop() || "",
                      title: option.label,
                      href: option.href || "",
                    });
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

