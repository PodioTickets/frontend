"use client";
import { SearchInput } from "../SearchInput";
import { Dropdown, DropdownOption } from "../Dropdown";
import { useState, useEffect, useRef } from "react";

type Props = {
  search: string;
  setSearch: (search: string) => void;
  results?: Array<{ id: string; title: string; href: string }>;
  onResultClick?: (result: { id: string; title: string; href: string }) => void;
  placeholder?: string;
  className?: string;
};

export function SearchBar({
  search,
  setSearch,
  results = [],
  onResultClick,
  placeholder = "Procure seu evento...",
  className = "",
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search.length > 0 && results.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [search, results]);

  const handleClear = () => {
    setSearch("");
    setIsOpen(false);
  };

  const handleResultClick = (result: {
    id: string;
    title: string;
    href: string;
  }) => {
    if (onResultClick) {
      onResultClick(result);
    }
    setSearch("");
    setIsOpen(false);
  };

  const dropdownOptions: DropdownOption[] = results.map((result) => ({
    label: result.title,
    href: result.href,
    onClick: () => handleResultClick(result),
  }));

  const shouldShowDropdown = search.length > 0 && results.length > 0;

  return (
    <div className={`relative w-full ${className}`}>
      {shouldShowDropdown ? (
        <Dropdown
          options={dropdownOptions}
          dataAttribute="search"
          width="w-full"
          maxHeight="max-h-[300px]"
          className="top-full! mt-2"
          trigger={() => (
            <div onClick={() => setIsOpen(!isOpen)}>
              <SearchInput
                ref={inputRef}
                placeholder={placeholder}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (e.target.value.length > 0 && results.length > 0) {
                    setIsOpen(true);
                  }
                }}
                onClear={handleClear}
                showClearButton={true}
                onFocus={() => {
                  if (results.length > 0) setIsOpen(true);
                }}
              />
            </div>
          )}
        />
      ) : (
        <SearchInput
          ref={inputRef}
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={handleClear}
          showClearButton={true}
        />
      )}
    </div>
  );
}
