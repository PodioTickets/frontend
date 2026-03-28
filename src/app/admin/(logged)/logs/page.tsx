"use client";

import { AdminAuditLogTab } from "@/components/Admin/AdminAuditLogTab";

export default function AdminLogsPage() {
  return (
    <div className="min-h-screen bg-gray-2 pb-10">
      <div className="max-w-[1222px] mx-auto w-full">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-4 md:mb-6">
          <div>
            <h1 className="text-gray-12 tracking-tight text-2xl font-extrabold font-manrope leading-[1.1]">
              Log Geral do Sistema
            </h1>
            <p className="mt-2 md:mt-1 text-gray-11 font-family-dm-sans leading-[1.3] text-sm">
              Histórico completo de atividades de todos os usuários do sistema,
              em todas as organizações da plataforma.
            </p>
          </div>
        </div>

        <AdminAuditLogTab />
      </div>
    </div>
  );
}
