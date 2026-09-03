"use client";

import { useDeleteQuestionModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import toast from "react-hot-toast";

export function DeleteQuestionModal() {
  const { isOpen, closeDeleteQuestionModal, data } = useDeleteQuestionModal();

  const handleConfirm = async () => {
    if (data?.onConfirm) {
      try {
        await data.onConfirm();
        closeDeleteQuestionModal();
      } catch (error: any) {
        console.error("Error deleting question:", error);
        toast.error(error.response?.data?.message || "Erro ao deletar pergunta");
      }
    } else {
      closeDeleteQuestionModal();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-99999 flex items-center justify-center bg-black/90"
          onClick={closeDeleteQuestionModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[442px] mx-4 relative overflow-hidden"
          >
            <div className="flex flex-col items-center justify-center px-5 pt-6 pb-5 gap-11">
              <div className="flex flex-col gap-4 items-center justify-center w-full">
                <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                  Deletar pergunta permanentemente?
                </p>
                <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                  A pergunta será removida para novas inscrições. As respostas já registradas serão mantidas.
                </p>
              </div>

              <div className="flex gap-2 items-start w-full">
                <Button
                  variant="outline"
                  onClick={closeDeleteQuestionModal}
                  className="flex-1 h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
                >
                  Fechar
                </Button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 h-12 bg-red-11 cursor-pointer text-red-2 font-bold text-base font-manrope hover:bg-red-12 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  Deletar pergunta
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
