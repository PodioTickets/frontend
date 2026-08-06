"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Landmark } from "lucide-react";
import { Button } from "../Button";

interface PixKeyRequiredModalProps {
  onClose: () => void;
  /** "Cadastrar": o pai fecha o modal de repasse e navega até a aba de chave Pix. */
  onRegister: () => void;
}

/**
 * Gate exibido quando o organizador tenta solicitar um repasse mas a organização
 * ainda não tem uma chave Pix cadastrada. Design do Figma (6304:125000): ícone de
 * banco, título "Cadastre uma chave Pix", explicação e as ações "Fechar" /
 * "Cadastrar". A navegação fica no pai (contexto do organizador → `useOrganizerNavigate`,
 * respeita o rewrite de subdomínio). Portal em `document.body` (z-80).
 */
export function PixKeyRequiredModal({ onClose, onRegister }: PixKeyRequiredModalProps) {
  // Fecha no Esc.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
      style={{ pointerEvents: "auto" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Cadastre uma chave Pix"
    >
      <div
        className="w-full max-w-[442px] bg-gray-1 rounded-[16px] shadow-2xl flex flex-col items-center gap-6 px-5 pt-6 pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ícone de banco em círculo amarelo */}
        <div className="size-[72px] rounded-full bg-yellow-3 flex items-center justify-center">
          <Landmark className="size-8 text-yellow-11" />
        </div>

        <div className="flex flex-col items-center gap-2 w-full">
          <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 text-center">
            Cadastre uma chave Pix
          </h2>
          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11 text-center">
            Você ainda não cadastrou uma chave Pix para receber seus repasses. Configure
            a chave no perfil da organização e tente novamente
          </p>
        </div>

        <div className="flex items-center gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1 h-12 border-gray-6 text-gray-12 font-manrope font-bold"
          >
            Fechar
          </Button>
          <Button
            type="button"
            variant="default"
            onClick={onRegister}
            className="flex-1 h-12 font-manrope font-bold"
          >
            Cadastrar
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
