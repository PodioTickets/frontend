"use client";

import { useState } from "react";
import { usePublishEventModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/Button";
import { organizerService } from "@/services";
import toast from "react-hot-toast";
import { useOrganizerNavigate } from "@/hooks/useOrganizerNavigate";
import { clearAllCreateEventClientStorage } from "@/lib/createEventWizardPersistence";

export function PublishEventModal() {
  const { isOpen, closePublishEventModal, data } = usePublishEventModal();
  const orgNav = useOrganizerNavigate();
  const [isPublishing, setIsPublishing] = useState(false);

  const eventId = data?.eventId;

  const handlePublish = async () => {
    if (!eventId) {
      toast.error("ID do evento não encontrado");
      return;
    }

    setIsPublishing(true);
    try {
      await organizerService.publishEvent(eventId);
      toast.success("Evento publicado com sucesso!");
      closePublishEventModal();
      clearAllCreateEventClientStorage();

      // Redirecionar para a página de eventos após publicar
      orgNav.push("/organizer/events");
    } catch (error: any) {
      console.error("Error publishing event:", error);
      toast.error(error.response?.data?.message || "Erro ao publicar evento");
    } finally {
      setIsPublishing(false);
    }
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
            className="fixed inset-0 bg-black/90 z-50"
            onClick={closePublishEventModal}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[442px] flex flex-col shadow-2xl"
            >
              <div className="flex flex-col items-center justify-center px-5 pt-6 pb-5 gap-11">
                {/* Conteúdo */}
                <div className="flex flex-col gap-4 items-center justify-center w-full">
                  <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans text-center">
                    Publicar evento?
                  </p>
                  <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans text-center">
                    Ao publicar, seu evento ficará visível para o público e as inscrições poderão ser realizadas pela página do evento
                  </p>
                </div>

                {/* Botões */}
                <div className="flex gap-2 items-start w-full">
                  <Button
                    variant="outline"
                    onClick={closePublishEventModal}
                    disabled={isPublishing}
                    className="flex-1 h-12 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base font-manrope hover:bg-gray-2"
                  >
                    Fechar
                  </Button>
                  <Button
                    variant="default"
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="flex-1 h-12 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? "Publicando..." : "Confirmar e publicar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
