"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { KitOverlayDialog } from "./KitOverlayDialog";
import type { KitVariationOption } from "./kitVariationGroups";

/**
 * "Configurar estoque" da opção (Figma telas 13 e 14). Desligado: a opção segue o
 * estoque do kit/ingresso. Ligado: "Quantidade disponível no estoque" (restante),
 * que desce a cada venda. Só grava no formulário ao clicar em Salvar.
 */
export function KitOptionStockDialog({
  open,
  groupName,
  option,
  onClose,
  onSave,
}: {
  open: boolean;
  groupName: string;
  option: KitVariationOption | null;
  onClose: () => void;
  onSave: (next: { stockLimited: boolean; available: string }) => void;
}) {
  const [limited, setLimited] = useState(false);
  const [available, setAvailable] = useState("");

  useEffect(() => {
    if (!open || !option) return;
    setLimited(option.stockLimited);
    setAvailable(option.available);
  }, [open, option]);

  const quantity = parseInt(available, 10);
  const invalid = limited && (!Number.isFinite(quantity) || (quantity <= 0 && !(option?.persistedStock ?? 0)));
  const sold = option?.soldCount ?? 0;

  return (
    <KitOverlayDialog
      open={open && !!option}
      idBase="kit-option-stock"
      title="Configurar estoque"
      subtitle={option ? `${groupName} · ${option.name}` : undefined}
      onClose={onClose}
      widthClassName="max-w-[444px]"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="border-gray-6 px-8 text-gray-12">
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={invalid}
            onClick={() => onSave({ stockLimited: limited, available: limited ? String(Math.max(0, quantity || 0)) : "" })}
            className="px-8"
          >
            Salvar
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5 px-6 py-5">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-4">
            <span className="font-family-dm-sans text-base leading-[1.3] text-gray-12">Limitar estoque</span>
            <button
              type="button"
              role="switch"
              aria-checked={limited}
              aria-label="Limitar estoque"
              onClick={() => setLimited((v) => !v)}
              className={`relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                limited ? "bg-primary-11" : "bg-gray-7"
              }`}
            >
              <span
                className={`inline-block size-[18px] rounded-full bg-white shadow transition-transform ${
                  limited ? "translate-x-[19px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </div>
          {!limited && (
            <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11">
              Ao limitar o estoque, a disponibilidade deixa de ser vinculada ao lote de ingressos.
            </p>
          )}
        </div>
        {limited && (
          <div className="flex flex-col gap-2 border-t border-gray-4 pt-5">
            <label htmlFor="kit-option-stock-qty" className="font-family-dm-sans text-base leading-[1.3] text-gray-12">
              Quantidade disponível no estoque
            </label>
            <Input
              id="kit-option-stock-qty"
              type="text"
              inputMode="numeric"
              autoFocus
              value={available}
              onChange={(e) => setAvailable(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="0"
              className="h-12 px-3"
            />
            {sold > 0 && (
              <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11">
                Já {sold === 1 ? "foi vendida 1 unidade" : `foram vendidas ${sold} unidades`} desta opção
              </p>
            )}
          </div>
        )}
      </div>
    </KitOverlayDialog>
  );
}
