"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { WhatsappIcon } from "@/components/Icons/WhatsappIcon";
import { useOrganizerPermissions } from "@/contexts/OrganizerPermissionsContext";
import {
  buildAdvisorWhatsappUrl,
  resolveOrganizerAdvisor,
} from "@/lib/organizerAdvisors";
import { Button } from "../Button";

/**
 * Widget flutuante de suporte no canto inferior direito da interface do
 * organizador (Figma 6290:142291 fechado / 6290:143756 aberto). Fechado = avatar
 * do assessor com anel verde; ao clicar abre o card (header escuro «Marina · Online
 * agora», botão «Fale com seu assessor» → WhatsApp, e o horário de atendimento).
 * Fecha no X, no Esc ou clicando fora.
 */
export function OrganizerSupportWidget() {
  const [open, setOpen] = useState(false);
  const { organization } = useOrganizerPermissions();
  /* Assessor definido pelo admin em "Configurações específicas". Organização sem
     valor (ou valor desconhecido por front desatualizado) cai no padrão. */
  const advisor = resolveOrganizerAdvisor(organization?.advisor);
  // Nome de exibição da organização: nome fantasia quando houver, senão razão social.
  const assessorWhatsappUrl = buildAdvisorWhatsappUrl(
    advisor,
    organization?.tradeName || organization?.name,
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const openSoundRef = useRef<HTMLAudioElement | null>(null);
  const closeSoundRef = useRef<HTMLAudioElement | null>(null);

  // Pré-carrega os efeitos sonoros (client-only). Arquivos em `/public/sounds/`.
  useEffect(() => {
    const make = (src: string) => {
      const audio = new Audio(src);
      audio.preload = "auto";
      audio.volume = 0.35;
      return audio;
    };
    openSoundRef.current = make("/sounds/support-open.mp3");
    closeSoundRef.current = make("/sounds/support-close.mp3");
  }, []);

  // Toca o som da transição. Falha silenciosa (autoplay bloqueado / arquivo ausente).
  const playSound = useCallback((isOpening: boolean) => {
    const audio = isOpening ? openSoundRef.current : closeSoundRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => { });
  }, []);

  const toggle = useCallback(() => {
    playSound(!open);
    setOpen(!open);
  }, [open, playSound]);

  const close = useCallback(() => {
    if (open) playSound(false);
    setOpen(false);
  }, [open, playSound]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-12 right-4 md:bottom-8 md:right-8 z-50 flex flex-col gap-3 items-end print:hidden"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            key="support-card"
            initial={{ opacity: 0, scale: 0.9, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            style={{ transformOrigin: "bottom right" }}
            className="w-[min(341px,calc(100vw-2rem))] bg-gray-1 rounded-lg shadow-[0px_2px_6px_0px_rgba(17,17,17,0.15)] overflow-hidden flex flex-col"
          >
            {/* Header (escuro) */}
            <div className="bg-[#111111] flex items-center justify-between px-4 py-3 gap-2">
              <div className="flex gap-2 items-center min-w-0">
                {/* `width`/`height` = tamanho PINTADO (40px do box x 1.5 do
                    `scale-150`), não o do box. Com width numérico o next/image
                    emite srcset com descritor `x` (candidatos em `w` e `w*2`),
                    escolhido só pelo devicePixelRatio — a transform de CSS é
                    invisível pra ele. Declarar 40 servia 96px de imagem para um
                    avatar que pinta 120px em tela 2x, e o rosto saía borrado.
                    O box continua 40px pela classe `size-10`. */}
                <span className="relative size-10 rounded-full overflow-hidden shrink-0">
                  <Image
                    src={advisor.photoUrl}
                    alt={advisor.name}
                    width={60}
                    height={60}
                    className="size-10 rounded-full object-cover scale-150"
                  />
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <p className="font-manrope font-bold text-base leading-[1.1] text-[#eeeeee] truncate">
                    {advisor.name}
                  </p>
                  <div className="flex gap-1 items-center">
                    <span className="size-2 rounded-full bg-primary-11 shrink-0" />
                    <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-[#b4b4b4]">
                      Online agora
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="size-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
              >
                <X className="size-5 text-[#eeeeee]" />
              </button>
            </div>

            {/* Botão principal → WhatsApp. Some quando o assessor ainda não tem
                telefone cadastrado — melhor não oferecer do que abrir um link
                quebrado (ou o WhatsApp de outra pessoa). */}
            {assessorWhatsappUrl && (
            <div className="p-4">
              <a
                href={assessorWhatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant={"default"} className="w-full">
                  <WhatsappIcon variant="solid" className="size-6 text-[#141A15]" />
                  <span className="font-manrope font-bold text-base">
                    Fale com seu assessor
                  </span>
                </Button>
              </a>
            </div>
            )}

            {/* Horário de atendimento */}
            <div className="border-t border-gray-6 p-4">
              <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                Atendimento de segunda a sexta, das 8h às 18h. Fora desse horário, o tempo
                de resposta pode ser maior
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gatilho: avatar (fechado) / X (aberto). O wrapper motion faz o pop no toque
          e o hover; o botão clipa o avatar (overflow), e a bolinha verde de "online"
          fica FORA do clip (irmã do botão) pra não ser cortada. */}
      <motion.div
        className="relative shrink-0"
        whileTap={{ scale: 0.9 }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      >
        <button
          type="button"
          onClick={toggle}
          aria-label={open ? "Fechar suporte" : "Falar com o suporte"}
          aria-expanded={open}
          className="block size-[60px] rounded-full bg-gray-12 border border-primary-11 cursor-pointer overflow-hidden relative"
        >
          <AnimatePresence initial={false} mode="wait">
            {open ? (
              <motion.span
                key="close"
                initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0 rounded-full flex items-center justify-center"
              >
                <X className="size-6 text-gray-2" />
              </motion.span>
            ) : (
              <motion.span
                key="avatar"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ duration: 0.15 }}
                className="absolute inset-0"
              >
                {/* 60px do box x 1.5 do `scale-150` = 90px pintados (94,5 no
                    hover). Ver a nota do avatar do header. */}
                <Image
                  src={advisor.photoUrl}
                  alt={advisor.name}
                  width={90}
                  height={90}
                  className="size-full rounded-full object-cover scale-150"
                />
              </motion.span>
            )}
          </AnimatePresence>
        </button>
        {/* Bolinha verde "online" — só quando fechado (avatar visível). */}
        {!open && (
          <span
            aria-hidden
            className="absolute bottom-0 right-0 size-4 rounded-full bg-primary-11 border-2 border-gray-1 pointer-events-none"
          />
        )}
      </motion.div>
    </div>
  );
}
