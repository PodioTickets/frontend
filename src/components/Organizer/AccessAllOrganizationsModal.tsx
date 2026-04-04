"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useAccessAllOrganizationsModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { organizerService } from "@/services";
import { getAvatarUrl } from "@/utils/avatar";
import { RemoveIcon } from "../Icons/RemoveIcon";
import { ArrowButton } from "../ArrowButton";
import { Building2, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import type { OrganizationMember } from "@/services/organizer/OrganizerService";

interface OrganizationAccount {
  id: string;
  type: "user" | "organization";
  name: string;
  subtitle: string;
  avatarUrl?: string;
  organizationId?: string;
}

export function AccessAllOrganizationsModal() {
  const { isOpen, closeAccessAllOrganizationsModal } = useAccessAllOrganizationsModal();
  const { user } = useAuth();
  const router = useRouter();
  const orgNav = useOrganizerNavigate();
  const [organizations, setOrganizations] = useState<OrganizationAccount[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOrganizations();
    }
  }, [isOpen]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      // Primeiro, adicionar a conta do usuário
      const accounts: OrganizationAccount[] = [];
      
      if (user) {
        accounts.push({
          id: user.id,
          type: "user",
          name: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.email || "Nome do usuário",
          subtitle: "Usuário",
          avatarUrl: user.avatarUrl,
        });
      }

      // Buscar organizações do usuário
      try {
        // TODO: Implementar endpoint para buscar todas as organizações do usuário
        // Por enquanto, vamos tentar buscar a organização atual
        const currentOrg = await organizerService.getOrganization();
        if (currentOrg) {
          // Buscar membros da organização para encontrar o papel do usuário
          const members = await organizerService.getOrganizationMembers();
          const userMember = members.find((m: OrganizationMember) => m.userId === user?.id);
          
          accounts.push({
            id: currentOrg.id,
            type: "organization",
            name: userMember?.user?.firstName && userMember?.user?.lastName
              ? `${userMember.user.firstName} ${userMember.user.lastName}`
              : user?.email || "Nome do usuário dentro da organização",
            subtitle: currentOrg.name,
            avatarUrl: currentOrg.logoUrl,
            organizationId: currentOrg.id,
          });
        }
      } catch (error) {
        // Se não conseguir buscar, continua sem adicionar organizações
        console.error("Error loading organizations:", error);
      }

      setOrganizations(accounts);
    } catch (error) {
      console.error("Error loading accounts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAccount = (account: OrganizationAccount) => {
    if (account.type === "organization" && account.organizationId) {
      // TODO: Implementar lógica para trocar de organização
      // Por enquanto, apenas fecha o modal
      closeAccessAllOrganizationsModal();
      // Recarregar a página para atualizar o contexto
      router.refresh();
    } else {
      // Se for usuário, apenas fecha o modal
      closeAccessAllOrganizationsModal();
    }
  };

  const handleCreateOrganization = () => {
    closeAccessAllOrganizationsModal();
    orgNav.push("/organizer/create");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-99999 bg-black/50"
            onClick={closeAccessAllOrganizationsModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-99999 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-[12px] w-full max-w-[562px] shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-6 flex items-center justify-between px-4 py-3">
                <p className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                  Acessar mais contas
                </p>
                <button
                  onClick={closeAccessAllOrganizationsModal}
                  className="flex items-center justify-center rounded-lg size-8 hover:bg-gray-3 transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <RemoveIcon className="size-[15px] text-gray-11" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-col items-start px-4 py-5">
                <div className="flex flex-col gap-4 items-start w-full">
                  <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-11 w-full">
                    Organizações que seu email está associado
                  </p>

                  {/* Organizations List */}
                  <div className="border border-gray-6 flex flex-col items-start justify-center rounded-lg overflow-hidden w-full">
                    {loading ? (
                      <div className="px-4 py-3 w-full text-center text-gray-11">
                        Carregando...
                      </div>
                    ) : organizations.length > 0 ? (
                      organizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => handleSelectAccount(org)}
                          className="border-b border-gray-6 last:border-b-0 flex items-center justify-between px-4 py-3 w-full hover:bg-gray-3 transition-colors cursor-pointer"
                        >
                          <div className="flex flex-1 gap-2 items-center min-w-0">
                            <div className="relative shrink-0 size-9 rounded-full overflow-hidden bg-gray-6">
                              {org.avatarUrl ? (
                                <Image
                                  src={getAvatarUrl(org.avatarUrl)}
                                  alt={org.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-6">
                                  <span className="text-gray-11 text-sm font-medium">
                                    {org.name[0]?.toUpperCase() || "O"}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-1 flex-col gap-2 items-start justify-center min-w-0 text-ellipsis whitespace-nowrap">
                              <p className="font-family-dm-sans font-normal text-[14px] leading-[1.3] text-gray-11 overflow-hidden w-full">
                                {org.subtitle}
                              </p>
                              <p className="font-family-dm-sans font-medium text-[16px] leading-[1.3] text-gray-12 overflow-hidden w-full">
                                {org.name}
                              </p>
                            </div>
                            <div className="flex items-center relative shrink-0">
                              <div className="size-6 -rotate-90">
                                <ArrowButton isOpen={true} />
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 w-full text-center text-gray-11">
                        Nenhuma organização encontrada
                      </div>
                    )}
                  </div>

                  {/* Create Organization Button */}
                  <div className="border border-gray-6 flex flex-col items-start justify-center rounded-lg p-3 w-full">
                    <button
                      onClick={handleCreateOrganization}
                      className="border border-gray-6 flex gap-[10px] h-[52px] items-center justify-center px-3 py-4 rounded-lg w-full hover:bg-gray-3 transition-colors cursor-pointer"
                    >
                      <div className="flex flex-1 gap-2 items-center min-w-0">
                        <Building2 className="size-6 text-gray-12 shrink-0" />
                        <p className="font-family-dm-sans font-normal text-[16px] leading-[1.3] text-gray-12">
                          Criar nova organização
                        </p>
                      </div>
                      <ChevronRight className="size-6 text-gray-12 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
