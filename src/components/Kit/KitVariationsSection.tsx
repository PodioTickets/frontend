"use client";

import { useEffect, useRef, useState } from "react";
import { CircleCheck, MoreVertical, Pencil, Plus } from "lucide-react";
import { Checkbox } from "@/components/CheckBox";
import { Dropdown } from "../Dropdown";
import { TrashIcon } from "../Icons/TrashIcon";
import { cn } from "@/utils/cn";
import { KitOptionStockDialog } from "./KitOptionStockDialog";
import {
  NEW_GROUP_NAME,
  NEW_OPTION_NAME,
  VARIATION_SUGGESTIONS,
  createGroup,
  createOption,
  optionStockLabel,
  sameName,
  type KitVariationGroup,
} from "./kitVariationGroups";

type Editing =
  | { kind: "group"; groupKey: string }
  | { kind: "option"; groupKey: string; optionKey: string; isNew: boolean }
  | null;

/**
 * Campo de nome editável no lugar (renomear variação, editar/adicionar opção).
 * Já abre em foco e com o texto selecionado. Enter, clicar fora ou o botão de
 * confirmar salvam; Esc desfaz. `onCommit` devolve a mensagem de erro (nome
 * repetido) — com erro, nada é salvo e o campo continua aberto.
 */
function InlineNameEditor({
  initial,
  ariaLabel,
  onCommit,
  onCancel,
}: {
  initial: string;
  ariaLabel: string;
  onCommit: (value: string) => string | null;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    if (doneRef.current) return;
    const err = onCommit(value);
    setError(err);
    if (err) {
      inputRef.current?.focus();
      return;
    }
    doneRef.current = true;
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
      <input
        ref={inputRef}
        value={value}
        maxLength={60}
        aria-label={ariaLabel}
        aria-invalid={!!error}
        onChange={(e) => {
          setValue(e.target.value);
          if (error) setError(null);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            doneRef.current = true;
            onCancel();
          }
        }}
        className={cn(
          "h-10 w-full max-w-[240px] rounded-lg border bg-gray-1 px-3 font-family-dm-sans text-base text-gray-12 outline-none",
          error ? "border-red-8" : "border-primary-8",
        )}
      />
      {!error && (
        <button
          type="button"
          aria-label="Confirmar nome"
          // mousedown não tira o foco do input: o blur não salva antes do clique.
          onMouseDown={(e) => e.preventDefault()}
          onClick={commit}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 text-gray-11 hover:text-gray-12"
        >
          <CircleCheck className="size-4" />
        </button>
      )}
      {error && <p className="font-family-dm-sans text-sm leading-[1.3] text-red-11">{error}</p>}
    </div>
  );
}

function YesNo({
  value,
  onChange,
  name,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
  name: string;
}) {
  return (
    <div className="flex items-center gap-6" role="radiogroup" aria-label={name}>
      {[true, false].map((opt) => (
        <label key={String(opt)} className="flex cursor-pointer items-center gap-2">
          <Checkbox checked={value === opt} onCheckedChange={() => onChange(opt)} aria-label={opt ? "Sim" : "Não"} />
          <span className="font-family-dm-sans text-sm leading-[1.3] text-gray-12">{opt ? "Sim" : "Não"}</span>
        </label>
      ))}
    </div>
  );
}

export { YesNo };

const iconButton =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-gray-6 bg-gray-2 hover:bg-gray-3";

/**
 * Seção "Variações" do modal de kit (Figma telas 02–08, 10–12, 16–18): pergunta
 * Sim/Não, uma lista por variação (nome no topo, uma linha por opção, "Adicionar
 * opção" no fim) e a caixa de sugestões para criar a próxima variação.
 */
export function KitVariationsSection({
  hasVariations,
  setHasVariations,
  groups,
  setGroups,
  errors,
}: {
  hasVariations: boolean | null;
  setHasVariations: (v: boolean) => void;
  groups: KitVariationGroup[];
  setGroups: (updater: (prev: KitVariationGroup[]) => KitVariationGroup[]) => void;
  /** Erros do "Criar kit" por variação (`group.key`). */
  errors: Record<string, string>;
}) {
  const [editing, setEditing] = useState<Editing>(null);
  const [stockTarget, setStockTarget] = useState<{ groupKey: string; optionKey: string } | null>(null);
  /** Chip clicado agora: fica verde só como retorno do clique (~0,4s), não como estado. */
  const [flashedChip, setFlashedChip] = useState<string | null>(null);
  useEffect(() => {
    if (!flashedChip) return;
    const t = setTimeout(() => setFlashedChip(null), 400);
    return () => clearTimeout(t);
  }, [flashedChip]);

  const updateGroup = (groupKey: string, fn: (g: KitVariationGroup) => KitVariationGroup) =>
    setGroups((prev) => prev.map((g) => (g.key === groupKey ? fn(g) : g)));

  const removeOption = (groupKey: string, optionKey: string) =>
    updateGroup(groupKey, (g) => ({ ...g, options: g.options.filter((o) => o.key !== optionKey) }));

  const addSuggestion = (s: (typeof VARIATION_SUGGESTIONS)[number]) => {
    setFlashedChip(s.label);
    const group = createGroup(s.groupName ?? NEW_GROUP_NAME, s.options);
    setGroups((prev) => [...prev, group]);
    if (s.groupName === null) setEditing({ kind: "group", groupKey: group.key });
  };

  const addOption = (groupKey: string) => {
    const option = createOption(NEW_OPTION_NAME);
    updateGroup(groupKey, (g) => ({ ...g, options: [...g.options, option] }));
    setEditing({ kind: "option", groupKey, optionKey: option.key, isNew: true });
  };

  const stockGroup = stockTarget ? groups.find((g) => g.key === stockTarget.groupKey) : undefined;
  const stockOption = stockGroup?.options.find((o) => o.key === stockTarget?.optionKey) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="font-manrope text-base font-bold leading-[1.1] text-gray-12">Variações</h3>
        <p className="font-family-dm-sans text-sm leading-[1.3] text-gray-11">
          Permite ao participante escolher uma opção do item do kit, como o tamanho da camiseta.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <p className="font-family-dm-sans text-sm font-medium leading-[1.3] text-gray-12">
          Algum item deste kit possui variação?
        </p>
        <YesNo value={hasVariations} onChange={setHasVariations} name="Algum item deste kit possui variação?" />
      </div>

      {hasVariations &&
        groups.map((group) => {
          const groupError = errors[group.key];
          const isRenaming = editing?.kind === "group" && editing.groupKey === group.key;
          return (
            <div key={group.key} className="flex flex-col gap-2">
              <div
                className={cn(
                  "overflow-hidden rounded-lg border-[1.5px] bg-gray-2",
                  groupError ? "border-red-8" : "border-gray-6",
                )}
              >
                <div className="flex min-h-11 items-center justify-between gap-3 border-b border-gray-6 bg-gray-3 px-4 py-1.5">
                  {isRenaming ? (
                    <InlineNameEditor
                      initial={group.name}
                      ariaLabel="Nome da variação"
                      onCancel={() => setEditing(null)}
                      onCommit={(value) => {
                        const name = value.trim();
                        if (!name) {
                          setEditing(null);
                          return null;
                        }
                        if (groups.some((g) => g.key !== group.key && sameName(g.name, name))) {
                          return `Já existe a variação ${name} neste kit.`;
                        }
                        updateGroup(group.key, (g) => ({ ...g, name }));
                        setEditing(null);
                        return null;
                      }}
                    />
                  ) : (
                    <p className="min-w-0 truncate font-family-dm-sans text-sm font-medium leading-[1.3] text-gray-12">
                      {group.name}
                    </p>
                  )}
                  <div className="flex shrink-0 items-center gap-2">
                    {!isRenaming && (
                      <button
                        type="button"
                        aria-label={`Renomear ${group.name}`}
                        className={iconButton}
                        onClick={() => setEditing({ kind: "group", groupKey: group.key })}
                      >
                        <Pencil className="size-4 text-gray-12" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Excluir ${group.name}`}
                      className={iconButton}
                      onClick={() => {
                        setGroups((prev) => prev.filter((g) => g.key !== group.key));
                        setEditing(null);
                      }}
                    >
                      <TrashIcon className="size-4 text-red-11" />
                    </button>
                  </div>
                </div>

                {group.options.map((option) => {
                  const isEditingOption =
                    editing?.kind === "option" && editing.groupKey === group.key && editing.optionKey === option.key;
                  const isNewOption = isEditingOption && editing?.kind === "option" && editing.isNew;
                  const stock = optionStockLabel(option);
                  return (
                    <div
                      key={option.key}
                      className="flex min-h-[52px] items-center justify-between gap-3 border-b border-gray-6 px-4 py-1.5"
                    >
                      {isEditingOption ? (
                        <InlineNameEditor
                          initial={option.name}
                          ariaLabel="Nome da opção"
                          onCancel={() => {
                            if (isNewOption) removeOption(group.key, option.key);
                            setEditing(null);
                          }}
                          onCommit={(value) => {
                            const name = value.trim();
                            if (!name) {
                              // Vazio: opção nova some; existente volta ao nome anterior.
                              if (isNewOption) removeOption(group.key, option.key);
                              setEditing(null);
                              return null;
                            }
                            if (group.options.some((o) => o.key !== option.key && sameName(o.name, name))) {
                              return `Já existe a opção ${name} nesta variação.`;
                            }
                            updateGroup(group.key, (g) => ({
                              ...g,
                              options: g.options.map((o) => (o.key === option.key ? { ...o, name } : o)),
                            }));
                            setEditing(null);
                            return null;
                          }}
                        />
                      ) : (
                        <p className="min-w-0 flex-1 truncate font-family-dm-sans text-sm font-medium leading-[1.3] text-gray-12">
                          {option.name}
                        </p>
                      )}
                      {!isEditingOption && (
                        <div className="flex shrink-0 items-center gap-2">
                          {stock.text && (
                            <span
                              className={cn(
                                "font-family-dm-sans text-sm leading-[1.3]",
                                stock.soldOut ? "text-red-11" : "text-gray-11",
                              )}
                            >
                              {stock.text}
                            </span>
                          )}
                          <Dropdown
                            menuInPortal
                            position="bottom"
                            align="end"
                            width="w-[160px]"
                            trigger={
                              <span
                                className="flex size-6 cursor-pointer items-center justify-center rounded-md text-gray-11 hover:bg-gray-4 hover:text-gray-12"
                                aria-label={`Mais ações de ${option.name}`}
                              >
                                <MoreVertical className="size-4" />
                              </span>
                            }
                          >
                            {({ close }) => (
                              <div className="flex flex-col py-1">
                                {[
                                  {
                                    label: "Editar nome",
                                    onClick: () =>
                                      setEditing({ kind: "option", groupKey: group.key, optionKey: option.key, isNew: false }),
                                  },
                                  {
                                    label: "Configurar estoque",
                                    onClick: () => setStockTarget({ groupKey: group.key, optionKey: option.key }),
                                  },
                                  { label: "Excluir opção", danger: true, onClick: () => removeOption(group.key, option.key) },
                                ].map((item, i) => (
                                  <button
                                    key={item.label}
                                    type="button"
                                    onClick={() => {
                                      close();
                                      item.onClick();
                                    }}
                                    className={cn(
                                      "cursor-pointer px-3 py-2.5 text-left font-family-dm-sans text-sm leading-[1.3] hover:bg-gray-3",
                                      i > 0 && "border-t border-gray-4",
                                      "danger" in item && item.danger ? "text-red-11" : "text-gray-12",
                                    )}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </Dropdown>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={() => addOption(group.key)}
                  className="flex h-[52px] w-full cursor-pointer items-center justify-center gap-1 font-family-dm-sans text-sm font-semibold text-gray-11 hover:text-gray-12"
                >
                  <Plus className="size-5" />
                  Adicionar opção
                </button>
              </div>
              {groupError && <p className="font-family-dm-sans text-sm leading-[1.3] text-red-11">{groupError}</p>}
            </div>
          );
        })}

      {hasVariations && (
        <div className="mx-auto flex w-full max-w-fit flex-col items-center gap-4 rounded-xl border-2 border-dashed border-gray-6 p-6">
          <p className="text-center font-family-dm-sans text-base leading-[1.3] text-gray-12">
            {groups.length === 0 ? "O que o participante vai escolher?" : "Adicionar mais uma variação?"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {VARIATION_SUGGESTIONS.map((s) => {
              // Verde só no clique (pressionado + ~0,4s), depois volta ao normal. Tamanho/Cor travam
              // se já existe grupo com o nome (evita duplicar); "Personalizar" sempre clicável.
              const flashing = flashedChip === s.label;
              const locked = s.groupName !== null && groups.some((g) => sameName(g.name, s.groupName!));
              return (
                <button
                  key={s.label}
                  type="button"
                  disabled={locked}
                  onClick={() => addSuggestion(s)}
                  className={cn(
                    "rounded-full border px-4 py-3 font-family-dm-sans text-sm font-medium leading-[1.3]",
                    "transition-colors duration-150",
                    flashing
                      ? "border-primary-8 bg-primary-3 text-primary-12"
                      : "border-gray-6 bg-gray-2 text-gray-12 hover:border-gray-8 active:border-primary-8 active:bg-primary-3 active:text-primary-12",
                    locked ? "cursor-default" : "cursor-pointer",
                    locked && !flashing && "opacity-50",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <KitOptionStockDialog
        open={!!stockOption}
        groupName={stockGroup?.name ?? ""}
        option={stockOption}
        onClose={() => setStockTarget(null)}
        onSave={(next) => {
          if (stockTarget) {
            updateGroup(stockTarget.groupKey, (g) => ({
              ...g,
              options: g.options.map((o) => (o.key === stockTarget.optionKey ? { ...o, ...next } : o)),
            }));
          }
          setStockTarget(null);
        }}
      />
    </div>
  );
}
