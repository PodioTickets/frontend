"use client";

import { Button } from "@/components/Button";
import { DatePicker } from "@/components/DatePicker";
import { Input } from "@/components/Input";
import { Radio } from "@/components/Radio";
import { TimePicker } from "@/components/TimePicker";
import { Info, Plus, Trash2 } from "lucide-react";
import type { Batch } from "./TicketForm.types";
import { parseLocalYmd } from "./TicketForm.utils";

interface TicketBatchSectionProps {
  batches: Batch[];
  formErrors: Record<string, string>;
  onAddBatch: () => void;
  onRemoveBatch: (batchId: string) => void;
  onBatchChange: (batchId: string, field: keyof Batch, value: string) => void;
  onBatchSalePeriodChange: (
    batchId: string,
    field: "startDate" | "startTime" | "endDate" | "endTime",
    value: string | undefined,
  ) => void;
  onClearFieldError: (field: string) => void;
  onSetFieldError: (field: string, message: string) => void;
}

export function TicketBatchSection({
  batches,
  formErrors,
  onAddBatch,
  onRemoveBatch,
  onBatchChange,
  onBatchSalePeriodChange,
  onClearFieldError,
  onSetFieldError,
}: TicketBatchSectionProps) {
  return (
    <div className="flex flex-col gap-6 bg-gray-3 border border-gray-6 rounded-xl p-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-gray-12 text-lg font-semibold font-family-dm-sans leading-[1.1]">
          Lotes do ingresso
        </h2>
        <p className="text-gray-11 text-base font-family-dm-sans leading-[1.3]">
          Defina a quantidade, o período de venda e o valor de cada lote.
          Você pode criar vários lotes.
        </p>
      </div>

      {batches.map((batch, index) => {
        const sold = batch.quantitySold ?? 0;
        const qtyParsed =
          batch.quantity.trim() === ""
            ? NaN
            : parseInt(batch.quantity, 10);
        const quantityBelowSold =
          sold > 0 && !Number.isNaN(qtyParsed) && qtyParsed < sold;
        const priceLocked = sold > 0;

        return (
          <div
            key={batch.id}
            className="flex flex-col gap-4 p-5 bg-gray-2 border border-gray-6 rounded-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-gray-12 text-lg font-bold font-family-dm-sans leading-[1.1]">
                Lote {index + 1}
              </h3>
              {index > 0 && sold === 0 && (
                <button
                  type="button"
                  title="Remover lote"
                  onClick={() => onRemoveBatch(batch.id)}
                  className="text-red-11 hover:text-red-12 transition-colors"
                >
                  <Trash2 className="size-5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-sm font-family-dm-sans">
                  Quantidade de vagas
                </label>
                <Input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={batch.quantity}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    onBatchChange(batch.id, "quantity", v);
                    if (v) {
                      onClearFieldError(`batch_quantity_${batch.id}`);
                      onClearFieldError(`batch_quantity_server_${batch.id}`);
                    }
                  }}
                  onBlur={() => {
                    if (!String(batch.quantity).trim())
                      onSetFieldError(`batch_quantity_${batch.id}`, "Quantidade é obrigatória");
                  }}
                  placeholder="Ex: 500"
                  className={`h-12 ${formErrors[`batch_quantity_${batch.id}`] ? "border-red-8 focus-visible:ring-red-8" : ""}`}
                />
                {formErrors[`batch_quantity_${batch.id}`] && (
                  <p className="text-red-11 text-sm font-family-dm-sans">
                    {formErrors[`batch_quantity_${batch.id}`]}
                  </p>
                )}
                {sold >= 1 && (
                  <div className="flex items-start gap-1">
                    <Info className="size-5 text-gray-11 shrink-0" />
                    <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                      {sold} vaga{sold === 1 ? "" : "s"}{" "}
                      {sold === 1 ? "foi" : "foram"} vendida
                      {sold === 1 ? "" : "s"}.
                      {(quantityBelowSold || formErrors[`batch_quantity_server_${batch.id}`]) && (
                        <span className="block mt-0.5 text-red-11">
                          {formErrors[`batch_quantity_server_${batch.id}`] ||
                            "A quantidade precisa ser superior ou igual ao total vendido."}
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-gray-12 text-sm font-family-dm-sans">
                  Preço do ingresso
                </label>
                <Input
                  type="text"
                  value={batch.price}
                  onChange={(e) => {
                    if (priceLocked) return;
                    const value = e.target.value.replace(/\D/g, "");
                    const formatted = value
                      ? `R$${(parseInt(value) / 100).toFixed(2).replace(".", ",")}`
                      : "";
                    onBatchChange(batch.id, "price", formatted);
                    if (formatted) onClearFieldError(`batch_price_${batch.id}`);
                  }}
                  onBlur={() => {
                    if (!priceLocked && !batch.price.trim())
                      onSetFieldError(`batch_price_${batch.id}`, "Preço é obrigatório");
                  }}
                  placeholder="R$0,00"
                  readOnly={priceLocked}
                  className={`h-12 ${priceLocked ? "bg-gray-4 text-gray-11 cursor-not-allowed" : formErrors[`batch_price_${batch.id}`] ? "border-red-8 focus-visible:ring-red-8" : ""}`}
                />
                {formErrors[`batch_price_${batch.id}`] && !priceLocked && (
                  <p className="text-red-11 text-sm font-family-dm-sans">
                    {formErrors[`batch_price_${batch.id}`]}
                  </p>
                )}
                {priceLocked && (
                  <div className="flex items-center gap-1">
                    <Info className="size-5 text-gray-11" />
                    <span className="text-gray-11 text-base font-normal font-family-dm-sans leading-[1.3]">
                      Preço não pode ser alterado — já possui vendas
                    </span>
                  </div>
                )}
              </div>
            </div>

            {index > 0 && (
              <>
                <div className="flex flex-col gap-2">
                  <p className="text-gray-12 text-sm font-family-dm-sans">
                    Como este lote começa a ser vendido?
                  </p>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <Radio
                        name={`startType-${batch.id}`}
                        checked={batch.startType === "date"}
                        onChange={() => onBatchChange(batch.id, "startType", "date")}
                      />
                      <span className="text-gray-12 text-sm font-family-dm-sans">
                        Por data
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Radio
                        name={`startType-${batch.id}`}
                        checked={batch.startType === "previous"}
                        onChange={() => onBatchChange(batch.id, "startType", "previous")}
                      />
                      <span className="text-gray-12 text-sm font-family-dm-sans">
                        Quando esgotar o lote anterior
                      </span>
                    </div>
                  </div>
                </div>

                {batch.startType === "date" && (
                  <div className="flex flex-col gap-6 md:flex-row md:gap-10">
                    <div className="flex flex-col gap-2 w-full md:w-max">
                      <label className="text-gray-12 text-sm font-family-dm-sans">
                        Data de início
                      </label>
                      <div className="flex gap-2">
                        <DatePicker
                          value={batch.startDate}
                          onChange={(value) =>
                            onBatchSalePeriodChange(batch.id, "startDate", value)
                          }
                          maxDate={parseLocalYmd(batch.endDate)}
                          className="w-max"
                        />
                        <TimePicker
                          value={batch.startTime}
                          onChange={(value) =>
                            onBatchSalePeriodChange(batch.id, "startTime", value)
                          }
                          className="w-max"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 w-full md:w-max">
                      <label className="text-gray-12 text-sm font-family-dm-sans">
                        Data de Término
                      </label>
                      <div className="flex gap-2">
                        <DatePicker
                          value={batch.endDate}
                          onChange={(value) =>
                            onBatchSalePeriodChange(batch.id, "endDate", value)
                          }
                          minDate={parseLocalYmd(batch.startDate)}
                          className="w-max"
                        />
                        <TimePicker
                          value={batch.endTime}
                          onChange={(value) =>
                            onBatchSalePeriodChange(batch.id, "endTime", value)
                          }
                          className="w-max"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="flex justify-center w-full">
        <Button
          variant="outline"
          onClick={onAddBatch}
          className="border-gray-6 text-gray-12 w-full"
        >
          <Plus className="size-5" />
          Adicionar lote
        </Button>
      </div>
    </div>
  );
}
