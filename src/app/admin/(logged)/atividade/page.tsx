"use client";

import { useState } from "react";
import { cn } from "@/utils/cn";
import { AdminUserActivityTab } from "@/components/Admin/AdminUserActivityTab";
import { AdminUserActivityDashboard } from "@/components/Admin/AdminUserActivityDashboard";
import { AdminUserActivityFunnelTab } from "@/components/Admin/AdminUserActivityFunnelTab";

const TABS = [
  { id: "overview", label: "Visão geral" },
  { id: "funnel", label: "Funil de compra" },
  { id: "records", label: "Registros" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AdminUserActivityPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <div className="max-w-[1222px] mx-auto w-full">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
          <div>
            <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
              Atividade dos Usuários
            </h1>
            <p className="mt-2 md:mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
              Métricas e ações de todos os usuários da plataforma — navegação,
              autenticação, checkout e eventos de sistema, incluindo visitantes
              anônimos.
            </p>
          </div>
        </div>

        {/* Tabs: visão agregada (dashboard) × investigação fina (lista) */}
        <div
          role="tablist"
          aria-label="Visualização de atividade"
          className="inline-flex rounded-lg border border-gray-6 bg-gray-1 p-1 shadow-[0px_2px_6px_0px_rgba(17,17,17,0.08)] mb-4 md:mb-5"
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "h-9 rounded-md px-4 text-sm font-semibold font-family-dm-sans transition-colors cursor-pointer",
                activeTab === tab.id
                  ? "bg-primary-3 text-primary-12"
                  : "text-gray-11 hover:text-gray-12"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Lista mantém estado (filtros/página) ao alternar — esconde em vez
            de desmontar. Dashboard e funil são baratos e montam sob demanda. */}
        {activeTab === "overview" ? <AdminUserActivityDashboard /> : null}
        {activeTab === "funnel" ? <AdminUserActivityFunnelTab /> : null}
        <div className={activeTab === "records" ? "block" : "hidden"}>
          <AdminUserActivityTab />
        </div>
      </div>
    </div>
  );
}
