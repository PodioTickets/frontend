"use client";

import { useDeleteParticipantModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { X } from "lucide-react";
import Image from "next/image";
import toast from "react-hot-toast";

// Ícone customizado baseado no design do Figma
const LockIcon = () => (
  <div className="relative w-[90px] h-[102px] flex items-center justify-center">
    {/* Cartão superior (laranja claro) */}
    <div className="absolute top-0 left-0 w-[76px] h-[85px] bg-[#E8D5B7] rounded-lg shadow-sm flex flex-col items-center justify-start pt-3 pb-2 px-2 z-10">
      {/* Ícone de usuário (silhueta) */}
      <div className="w-6 h-6 mb-2 flex items-center justify-center">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
            fill="#202020"
          />
          <path
            d="M12 14C7.58172 14 4 16.6863 4 20V22H20V20C20 16.6863 16.4183 14 12 14Z"
            fill="#202020"
          />
        </svg>
      </div>
      {/* Linhas de texto */}
      <div className="w-full space-y-1 mt-auto">
        <div className="h-1 bg-gray-12/30 rounded w-full" />
        <div className="h-1 bg-gray-12/30 rounded w-3/4" />
      </div>
    </div>
    {/* X vermelho */}
    <div className="absolute top-[-8px] right-[-8px] w-8 h-8 bg-red-10 rounded-full flex items-center justify-center z-20 shadow-sm border-2 border-red-2">
      <X className="w-4 h-4 text-red-2" strokeWidth={3} />
    </div>
    {/* Cartão inferior (sombra) */}
    <div className="absolute top-[8px] left-[8px] w-[76px] h-[85px] bg-gray-6 rounded-lg opacity-50" />
  </div>
);

export function DeleteParticipantModal() {
  const { isOpen, closeDeleteParticipantModal, data } =
    useDeleteParticipantModal();

  const handleConfirm = () => {
    if (data?.onConfirm) {
      data.onConfirm();
    }
    toast.success("Participante removido com sucesso");
    closeDeleteParticipantModal();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50"
          onClick={closeDeleteParticipantModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[500px] mx-4 relative overflow-hidden"
          >
            <div className="flex flex-col items-center justify-center p-5 gap-11">
              {/* Topo com ícone */}
              <div className="flex flex-col gap-6 items-center w-full">
                <Image
                  src="/images/remove_participant.png"
                  alt="Delete Participant"
                  width={102}
                  height={80}
                  draggable={false}
                />

                {/* Conteúdo */}
                <div className="flex flex-col gap-4 items-center justify-center w-full">
                  <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-dm-sans text-center">
                    Remover participante da inscrição?
                  </p>
                  <p className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans text-center max-w-[400px]">
                    Ao remover este participante, todos os ingressos e produtos
                    vinculados a ele serão excluídos do seu pedido. O valor
                    total será atualizado antes do pagamento.
                  </p>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-2 items-start w-full">
                <Button
                  variant="outline"
                  onClick={closeDeleteParticipantModal}
                  className="flex-1 h-12 border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
                >
                  Fechar
                </Button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-12 bg-red-10 cursor-pointer text-red-2 font-bold text-base font-manrope hover:bg-red-11 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  Remover participante
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
