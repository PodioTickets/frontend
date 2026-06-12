import { XCircle } from "lucide-react";
import { CheckIcon } from "@/components/Icons/Organizer/CheckIcon";
import { CartIcon } from "@/components/Icons/CartIcon";
import type { RegistrationStats } from "@/services/organizer/OrganizerService";
import { RegistrationsWeekTrend } from "./RegistrationsWeekTrend";

/**
 * Cartões de resumo (4 métricas) da página de inscrições — mobile + desktop.
 * Compartilhado entre admin e organizer (antes duplicado byte a byte).
 */
export function RegistrationsStatsCards({ stats }: { stats: RegistrationStats }) {
  const revenue = `R$ ${(stats.totalCollected / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  return (
    <>
      {/* Mobile: 4 summary cards (espelha desktop) */}
      <div className="md:hidden grid grid-cols-2 gap-2 mb-5 mt-4">
        {/* Inscrições Confirmadas */}
        <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-4 flex items-center justify-center shrink-0">
              <CheckIcon className="size-5 text-gray-12" />
            </div>
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Inscrições Confirmadas</p>
          </div>
          <p className="font-manrope font-extrabold text-lg text-gray-12">{stats.total.toLocaleString()}</p>
          <RegistrationsWeekTrend change={stats.totalChange} compact />
        </div>
        {/* Cancelados */}
        <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-4 flex items-center justify-center shrink-0">
              <XCircle className="size-5 text-red-12" />
            </div>
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Cancelados</p>
          </div>
          <p className="font-manrope font-extrabold text-lg text-gray-12">{stats.cancelled.toLocaleString()}</p>
          <RegistrationsWeekTrend change={stats.cancelledChange} compact />
        </div>
        {/* Estornos / Chargebacks — cores espelhadas no desktop (neutro). */}
        <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-3 flex items-center justify-center shrink-0">
              <XCircle className="size-5 text-gray-12" />
            </div>
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Estornos / Chargebacks</p>
          </div>
          <p className="font-manrope font-extrabold text-lg text-gray-12">{stats.refunded.toLocaleString()}</p>
          <RegistrationsWeekTrend change={stats.refundedChange} compact />
        </div>
        {/* Receita Líquida */}
        <div className="bg-gray-1 border border-gray-6 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex flex-col gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-4 flex items-center justify-center shrink-0">
              <CartIcon className="size-5 text-blue-12" />
            </div>
            <p className="font-family-dm-sans font-normal text-base text-gray-11">Receita Líquida</p>
          </div>
          <p className="font-manrope font-extrabold text-lg text-gray-12">{revenue}</p>
          <RegistrationsWeekTrend change={stats.totalCollectedChange} compact />
        </div>
      </div>

      {/* Summary Cards - Desktop */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Inscrições Confirmadas */}
        <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-11 mb-1">Inscrições Confirmadas</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-primary-4 flex items-center justify-center">
                <CheckIcon className="size-5 text-gray-12" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-12">{stats.total.toLocaleString()}</p>
          </div>
          <RegistrationsWeekTrend change={stats.totalChange} />
        </div>

        {/* Cancelados */}
        <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-11 mb-1">Cancelados</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-red-4 flex items-center justify-center">
                <XCircle className="size-5 text-red-12" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-12">{stats.cancelled.toLocaleString()}</p>
          </div>
          <RegistrationsWeekTrend change={stats.cancelledChange} />
        </div>

        {/* Estornos / Chargebacks — cores espelhadas no card de Receita Líquida (neutro). */}
        <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-11 mb-1">Estornos / Chargebacks</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-gray-3 flex items-center justify-center">
                <XCircle className="size-5 text-gray-12" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-12">{stats.refunded.toLocaleString()}</p>
          </div>
          <RegistrationsWeekTrend change={stats.refundedChange} />
        </div>

        {/* Receita Líquida */}
        <div className="bg-gray-1 rounded-lg px-4 py-3 border border-gray-6">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-11 mb-1">Receita Líquida</p>
              <div className="w-[28px] h-[28px] p-1 rounded-lg bg-blue-4 flex items-center justify-center">
                <CartIcon className="size-5 text-blue-12" />
              </div>
            </div>

            <p className="text-2xl font-bold text-gray-12">{revenue}</p>
          </div>
          <RegistrationsWeekTrend change={stats.totalCollectedChange} />
        </div>
      </div>
    </>
  );
}
