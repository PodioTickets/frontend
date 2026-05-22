"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useLinkedUsers, type LinkedUser } from "@/hooks/useLinkedUsers";
import { cn } from "@/utils/cn";
import Image from "next/image";
import { getAvatarUrl } from "@/utils/avatar";
import { X } from "lucide-react";
import { isBrazilianCountry } from "@/validators/Auth.validator";

interface UserAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectUser?: (user: LinkedUser) => void;
  onDeleteUser?: (userId: string) => Promise<void>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function UserAutocomplete({
  value,
  onChange,
  onSelectUser,
  onDeleteUser,
  placeholder = "Digite o nome ou selecione um usuário",
  className,
  disabled = false,
}: UserAutocompleteProps) {
  const { linkedUsers, isLoading } = useLinkedUsers();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) {
      return linkedUsers;
    }

    const term = searchTerm.toLowerCase().trim();

    return linkedUsers.filter((user) => {
      const fullName = `${user.firstName} ${user.lastName}`.toLowerCase();
      const firstName = user.firstName?.toLowerCase() || "";
      const lastName = user.lastName?.toLowerCase() || "";

      // Busca por nome completo
      if (fullName.includes(term)) return true;

      // Busca por partes do nome (primeiro ou último nome)
      if (firstName.includes(term) || lastName.includes(term)) return true;

      // Busca por palavras separadas (ex: "joão silva" encontra "João da Silva")
      const searchWords = term.split(/\s+/).filter(w => w.length > 0);
      if (searchWords.length > 1) {
        const allWordsMatch = searchWords.every(word =>
          firstName.includes(word) || lastName.includes(word) || fullName.includes(word)
        );
        if (allWordsMatch) return true;
      }

      return false;
    });
  }, [linkedUsers, searchTerm]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectUser = (user: LinkedUser) => {
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    setSearchTerm(fullName);
    onChange(fullName);
    setIsOpen(false);

    if (onSelectUser) {
      onSelectUser(user);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  /**
   * Exibe o documento adequado ao tipo:
   * - CPF (BR): aplica máscara `xxx.xxx.xxx-xx` quando 11 dígitos.
   * - PASSPORT/estrangeiro: mostra cru (preserva letras de passaporte/RNE).
   * Prioriza `documentType` quando vier; senão usa `country` (via
   * `isBrazilianCountry`) como fallback compat.
   */
  const formatDocumentForDisplay = (user: LinkedUser): string => {
    const raw = user.documentNumber || "";
    if (!raw) return "";
    const isBr = user.documentType
      ? user.documentType === "CPF"
      : isBrazilianCountry(user.country);
    if (!isBr) return raw;
    const cleaned = raw.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return raw;
  };

  const getDocumentLabel = (user: LinkedUser): string => {
    const isBr = user.documentType
      ? user.documentType === "CPF"
      : isBrazilianCountry(user.country);
    return isBr ? "CPF" : "Documento";
  };

  // Componente para item do usuário (permite usar useState para erro de imagem)
  const UserItem = ({ user }: { user: LinkedUser }) => {
    const [imageError, setImageError] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const fullName = `${user.firstName} ${user.lastName}`.trim();
    const firstLetter = fullName.charAt(0).toUpperCase();
    const hasAvatar = !!user.avatarUrl && !imageError;

    const handleDelete = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!onDeleteUser || deleting) return;
      setDeleting(true);
      try {
        await onDeleteUser(user.id);
      } finally {
        setDeleting(false);
      }
    };

    return (
      <div className="flex items-center relative">
        <button
          type="button"
          onClick={() => handleSelectUser(user)}
          className="flex-1 min-w-0 px-4 py-3 text-left hover:bg-gray-3 transition-colors focus:outline-none focus:bg-gray-3"
        >
          <div className="flex items-center gap-3">
            {hasAvatar ? (
              <div className="relative size-10 rounded-full overflow-hidden shrink-0">
                <Image
                  src={getAvatarUrl(user.avatarUrl!)}
                  alt={fullName}
                  fill
                  className="object-cover"
                  onError={() => setImageError(true)}
                />
              </div>
            ) : (
              <div className="size-10 rounded-full bg-primary-10/20 flex items-center justify-center shrink-0">
                <span className="text-primary-11 font-semibold text-sm">
                  {firstLetter}
                </span>
              </div>
            )}

            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-12 text-sm truncate">
                  {fullName}
                </span>
                {user.isMainUser && (
                  <span className="text-xs px-2 py-0.5 rounded bg-primary-5 text-primary-11 font-medium shrink-0">
                    Você
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-gray-11 truncate">{user.email}</span>
                {user.documentNumber && (
                  <span className="text-xs text-gray-11">
                    {getDocumentLabel(user)}: {formatDocumentForDisplay(user)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {!user.isMainUser && onDeleteUser && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="absolute right-3 size-6 flex items-center justify-center rounded bg-gray-4 hover:bg-gray-5 transition-colors disabled:opacity-50"
            title="Remover usuário vinculado"
          >
            <X className="size-3 text-gray-11" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="relative w-full">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "w-full px-4 py-3 rounded-lg border border-gray-6 bg-gray-2 text-gray-12 focus:outline-none focus:border-primary-10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          className
        )}
      />

      {/* Dropdown de sugestões */}
      {isOpen && !disabled && filteredUsers.length > 0 && !isLoading && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-1 border border-gray-6 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          <div className="py-1">
            {filteredUsers.map((user) => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

