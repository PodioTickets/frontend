"use client";

import type { ReactNode } from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { X } from "lucide-react";
import type { AdminAuditLogItem } from "@/services/admin/AdminService";
import { formatDateBRT, formatTimeBRT } from "@/utils/datetimeBR";

function formatLogDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  // occurredAt é INSTANTE real → fuso de Brasília (BRT), não UTC (igual à lista).
  const date = formatDateBRT(iso, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const time = formatTimeBRT(iso, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date} • ${time}`;
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function FieldRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-3 py-2 border-b border-gray-6 last:border-b-0">
      <p className="text-sm font-medium text-gray-11 font-family-dm-sans shrink-0">
        {label}
      </p>
      <div className="text-sm font-semibold text-gray-12 font-family-dm-sans min-w-0 break-words">
        {value}
      </div>
    </div>
  );
}

export interface AdminAuditLogDetailsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: AdminAuditLogItem | null;
}

export function AdminAuditLogDetailsDrawer({
  isOpen,
  onClose,
  item,
}: AdminAuditLogDetailsDrawerProps) {
  const meta = item?.metadata;
  const prettyMeta =
    meta != null ? JSON.stringify(meta, null, 2) : "—";

  const details = item?.changeDetails;

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      direction="right"
    >
      <DrawerContent className="bg-gray-1 h-full w-full sm:max-w-[720px] border-l border-gray-6 rounded-l-xl flex flex-col">
        <DrawerTitle className="sr-only">Detalhes do registro</DrawerTitle>
        <DrawerHeader className="border-b border-gray-6 px-5 py-3 flex flex-row items-center justify-between shrink-0">
          <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
            Detalhes do registro
          </p>
          <DrawerClose asChild>
            <button
              type="button"
              className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              aria-label="Fechar"
            >
              <X className="size-6 text-gray-12" />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {item ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-lg border border-gray-6 bg-gray-2 p-4">
                <FieldRow label="ID" value={item.id} />
                <FieldRow
                  label="Organização (ID)"
                  value={item.organizationId ?? item.organization?.id ?? "—"}
                />
                <FieldRow
                  label="Organização (nome)"
                  value={item.organizationName ?? item.organization?.name ?? "—"}
                />
                <FieldRow
                  label="Organização (e-mail)"
                  value={item.organizationEmail ?? item.organization?.email ?? "—"}
                />
                <FieldRow label="IP" value={item.ip} />
                <FieldRow label="Usuário (ID)" value={item.userId ?? "—"} />
                <FieldRow label="Usuário (nome)" value={item.userName} />
                <FieldRow label="Tipo (kind)" value={item.kind ?? "—"} />
                <FieldRow label="Ação (exibição)" value={item.action} />
                <FieldRow
                  label="Ação (armazenada)"
                  value={item.storedAction ?? "—"}
                />
                <FieldRow
                  label="Campos editados"
                  value={item.editedFields ?? "—"}
                />
                <FieldRow
                  label="Data/Hora"
                  value={formatLogDateTime(item.occurredAt)}
                />
              </div>

              {details && details.length > 0 ? (
                <div>
                  <p className="text-sm font-semibold text-gray-12 font-family-dm-sans mb-2">
                    Alterações (changeDetails)
                  </p>
                  <div className="rounded-lg border border-gray-6 bg-gray-2 overflow-hidden">
                    {details.map((d, i) => (
                      <div
                        key={`${d.field}-${i}`}
                        className="px-3 py-3 border-b border-gray-6 last:border-b-0"
                      >
                        <p className="text-xs font-semibold text-gray-12 font-mono">
                          {d.field}
                          {d.fieldLabel ? (
                            <span className="text-gray-11 font-normal font-family-dm-sans ml-2">
                              ({d.fieldLabel})
                            </span>
                          ) : null}
                        </p>
                        <div className="mt-2 grid gap-2 text-xs font-family-dm-sans">
                          <div>
                            <span className="text-gray-11 font-medium">
                              Anterior:{" "}
                            </span>
                            <pre className="mt-0.5 whitespace-pre-wrap break-words text-gray-12 bg-gray-3 rounded p-2 font-mono">
                              {formatMetadataValue(d.oldValue)}
                            </pre>
                          </div>
                          <div>
                            <span className="text-gray-11 font-medium">
                              Novo:{" "}
                            </span>
                            <pre className="mt-0.5 whitespace-pre-wrap break-words text-gray-12 bg-gray-3 rounded p-2 font-mono">
                              {formatMetadataValue(d.newValue)}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <p className="text-sm font-semibold text-gray-12 font-family-dm-sans mb-2">
                  Metadata (JSON completo)
                </p>
                <pre className="rounded-lg border border-gray-6 bg-gray-3 p-3 text-xs font-mono text-gray-12 overflow-x-auto whitespace-pre-wrap break-words">
                  {prettyMeta}
                </pre>
              </div>

              {meta && typeof meta === "object" && !Array.isArray(meta) ? (
                <div>
                  <p className="text-sm font-semibold text-gray-12 font-family-dm-sans mb-2">
                    Metadata (chave / valor)
                  </p>
                  <div className="rounded-lg border border-gray-6 bg-gray-2 overflow-hidden">
                    {Object.entries(meta).map(([k, v]) => (
                      <div
                        key={k}
                        className="grid grid-cols-[minmax(0,140px)_1fr] gap-3 px-3 py-2.5 border-b border-gray-6 last:border-b-0"
                      >
                        <span className="text-xs font-medium text-gray-11 font-family-dm-sans break-all">
                          {k}
                        </span>
                        <span className="text-xs font-family-dm-sans text-gray-12 whitespace-pre-wrap break-words">
                          {formatMetadataValue(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-gray-11 font-family-dm-sans">
              Nenhum registro selecionado.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
