"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import toast from "react-hot-toast";

export type TicketCategoryFormPayload = {
  name: string;
  description: string;
};

type TicketCategoryFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initialName?: string;
  initialDescription?: string;
  onSubmit: (payload: TicketCategoryFormPayload) => void | Promise<void>;
};

export function TicketCategoryFormDrawer({
  open,
  onOpenChange,
  mode,
  initialName = "",
  initialDescription = "",
  onSubmit,
}: TicketCategoryFormDrawerProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setDescription(initialDescription ?? "");
    setSubmitting(false);
  }, [open, initialName, initialDescription]);

  const title = mode === "create" ? "Criar categoria" : "Editar categoria";
  const primaryLabel = mode === "create" ? "Criar categoria" : "Salvar alteração";

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ name: trimmed, description: description.trim() });
      onOpenChange(false);
    } catch {
      // Toast / erro vêm do handler ou do hook
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        overlayClassName="bg-black/50 supports-backdrop-filter:backdrop-blur-[2px]"
        className="border-gray-6 bg-gray-1 px-0 pb-6 [&>div:first-child]:hidden"
      >
        <div className="flex items-center justify-between border-b border-gray-6 px-4 pb-3 pt-1">
          <DrawerTitle className="text-left font-manrope text-base font-extrabold leading-[1.1] text-gray-12">
            {title}
          </DrawerTitle>
          <DrawerClose asChild>
            <button
              type="button"
              className="flex size-9 items-center justify-center rounded-lg text-gray-11 hover:bg-gray-2 hover:text-gray-12"
              aria-label="Fechar"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
          </DrawerClose>
        </div>

        <div className="flex flex-col gap-4 px-4 pt-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="ticket-category-drawer-name"
              className="font-family-dm-sans text-sm font-medium text-gray-12"
            >
              Nome da categoria
            </label>
            <Input
              id="ticket-category-drawer-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Corrida de 10KM"
              className="h-12 rounded-xl border-gray-6 bg-gray-1 px-3 py-3 font-family-dm-sans text-base text-gray-12 placeholder:text-gray-11"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="ticket-category-drawer-note"
              className="font-family-dm-sans text-sm font-medium text-gray-12"
            >
              Observação para o cliente (opcional)
            </label>
            <textarea
              id="ticket-category-drawer-note"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Digite uma observação para o cliente"
              rows={4}
              className="min-h-[100px] w-full resize-none rounded-xl border border-gray-6 bg-gray-1 px-3 py-3 font-family-dm-sans text-base text-gray-12 placeholder:text-gray-11 shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-gray-4 focus-visible:ring-[3px] focus-visible:ring-gray-4/50"
            />
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 px-4">
          <DrawerClose asChild>
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              className="h-12 border-gray-6 font-family-dm-sans text-base font-bold text-gray-12"
            >
              Cancelar
            </Button>
          </DrawerClose>
          <Button
            type="button"
            variant="default"
            disabled={submitting}
            onClick={() => void handleSubmit()}
            className="h-12 font-family-dm-sans text-base font-bold text-gray-12"
          >
            {submitting ? "Salvando…" : primaryLabel}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
