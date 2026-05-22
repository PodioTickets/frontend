"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";

/**
 * Modal de Termos de Uso da PódioTicket.
 *
 * Renderiza em z-index acima do RegisterModal (z-[100000]) pra abrir em
 * paralelo — usuário lê e clica "Aceitar termos" pra confirmar e voltar
 * pro fluxo de cadastro com o checkbox marcado.
 *
 * Conteúdo: seções estruturadas em `TERMS_SECTIONS` — fonte única que
 * facilita atualização sem mexer no markup. Body texts aceitam blocos
 * literais (paragraph) ou listas (bullets).
 */

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
}

type Section =
  | { title: string; paragraphs: string[] }
  | { title: string; bulletsIntro?: string; bullets: string[]; outro?: string };

const TERMS_SECTIONS: Section[] = [
  {
    title: "1. Definições",
    paragraphs: [
      "PódioTicket: a plataforma de intermediação digital para gestão e venda de inscrições para eventos esportivos e experiências relacionadas.",
      "Usuário: qualquer pessoa que acessa ou utiliza a Plataforma (participante, organizador, grupo esportivo, etc.)",
      "Participante: usuário que adquire ingressos, kits ou serviços ofertados na Plataforma.",
      "Organizador: pessoa física ou jurídica responsável por criar, gerenciar e realizar o evento anunciado na PódioTicket.",
      "Evento: toda atividade esportiva ou correlata divulgada na Plataforma (corridas, trilhas, ciclismo, torneios, etc.).",
      "Ingresso/Inscrição: direito de participação em um evento específico, emitido e gerenciado pelo organizador.",
      "Produtos adicionais: itens vinculados à inscrição (camisetas, kits, acessórios, upgrades, etc.).",
    ],
  },
  {
    title: "2. Objeto da Plataforma",
    bulletsIntro: "A PódioTicket disponibiliza um ambiente digital para:",
    bullets: [
      "Divulgação de eventos esportivos e experiências relacionadas.",
      "Gestão de inscrições e participantes pelos organizadores.",
      "Venda de ingressos, kits e produtos adicionais aos participantes.",
      "Comunicação básica entre participantes e organizadores, quando prevista na Plataforma.",
    ],
    outro:
      "A PódioTicket não é a organizadora dos eventos (exceto quando expressamente indicado). Em regra, a responsabilidade pela realização, alterações, adiamentos e cancelamentos é exclusivamente dos organizadores.",
  },
  {
    title: "3. Alterações destes Termos",
    bulletsIntro: "A PódioTicket poderá atualizar estes Termos periodicamente para:",
    bullets: [
      "Adequações legais e regulatórias.",
      "Inclusão de novos recursos, serviços ou ajustes operacionais.",
    ],
    outro:
      "Sempre que houver alteração relevante, buscaremos informar os usuários por meio da Plataforma ou por e-mail, indicando a data de vigência. A continuidade de uso após a data de vigência significará concordância com os novos Termos.",
  },
  {
    title: "4. Disposições Gerais",
    paragraphs: [
      "Caso qualquer cláusula destes Termos seja considerada inválida ou inexequível, as demais permanecerão em pleno vigor.",
      "A tolerância quanto ao descumprimento de qualquer condição não implicará renúncia de direito, podendo a parte exigir o seu cumprimento a qualquer tempo.",
      "Estes Termos são regidos pela legislação aplicável no país de operação da PódioTicket, cabendo ao foro competente da comarca indicada pela empresa resolver eventuais conflitos, salvo disposições específicas de proteção ao consumidor.",
    ],
  },
  {
    title: "5. Contato",
    paragraphs: [
      "Em caso de dúvidas sobre estes Termos ou sobre o uso da Plataforma, o usuário pode entrar em contato pelos canais de suporte disponíveis na PódioTicket, na seção Central de Ajuda ou pelo e-mail: suporte@podioticket.com.",
    ],
  },
];

function isBulletSection(
  s: Section,
): s is { title: string; bulletsIntro?: string; bullets: string[]; outro?: string } {
  return (s as { bullets?: string[] }).bullets !== undefined;
}

function SectionBlock({ section }: { section: Section }) {
  return (
    <div className="flex flex-col gap-4 md:gap-6 items-start w-full text-gray-12">
      <h3 className="font-manrope font-extrabold leading-[1.1] text-lg md:text-xl w-full">
        {section.title}
      </h3>
      {isBulletSection(section) ? (
        <div className="font-family-dm-sans text-sm md:text-base text-gray-12 w-full flex flex-col gap-3">
          {section.bulletsIntro && (
            <p className="leading-[1.3]">{section.bulletsIntro}</p>
          )}
          <ul className="list-disc pl-5 flex flex-col gap-1">
            {section.bullets.map((b, i) => (
              <li key={i} className="leading-[1.3]">
                {b}
              </li>
            ))}
          </ul>
          {section.outro && <p className="leading-[1.3]">{section.outro}</p>}
        </div>
      ) : (
        <div className="font-family-dm-sans text-sm md:text-base text-gray-12 w-full flex flex-col gap-3">
          {section.paragraphs.map((p, i) => (
            <p key={i} className="leading-[1.3]">
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function TermsOfServiceModal({
  isOpen,
  onClose,
  onAccept,
}: TermsOfServiceModalProps) {
  // Trava scroll do body enquanto aberto — evita scroll duplo (modal + página).
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  const handleAccept = () => {
    onAccept();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile: fullscreen */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-[100000] bg-gray-1 flex flex-col"
          >
            <div className="border-b border-gray-6 flex items-center justify-between h-[52px] px-4 py-2 shrink-0 w-full">
              <div className="flex gap-2 items-center flex-1 min-w-0">
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
                  aria-label="Voltar"
                >
                  <ArrowButton isOpen={true} />
                </button>
                <p className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 truncate">
                  Termos de uso
                </p>
              </div>
              <button
                onClick={onClose}
                className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
                aria-label="Fechar"
              >
                <X className="size-5 text-gray-12" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="flex flex-col gap-6">
                {TERMS_SECTIONS.map((section, idx) => (
                  <div key={idx} className="flex flex-col gap-6">
                    <SectionBlock section={section} />
                    {idx < TERMS_SECTIONS.length - 1 && (
                      <div className="h-px bg-gray-6 w-full" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-1 border-t border-gray-6 px-4 py-4 shrink-0 w-full">
              <Button
                onClick={handleAccept}
                className="w-full h-12"
              >
                Aceitar termos
              </Button>
            </div>
          </motion.div>

          {/* Desktop: dialog centralizado em z-index acima do RegisterModal */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-[100000] items-center justify-center bg-black/50 p-4"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[688px] h-[674px] flex flex-col overflow-hidden"
            >
              <div className="border-b border-gray-6 flex items-center justify-between px-4 py-3 shrink-0 w-full">
                <div className="flex gap-0.5 items-center flex-1 min-w-0">
                  <button
                    onClick={onClose}
                    className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
                    aria-label="Voltar"
                  >
                    <ArrowButton isOpen={true} />
                  </button>
                  <p className="font-family-dm-sans font-semibold text-xl leading-[1.3] text-gray-12">
                    Termos de uso
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center rounded-lg size-8 transition-colors cursor-pointer hover:bg-gray-3 shrink-0"
                  aria-label="Fechar"
                >
                  <X className="size-5 text-gray-12" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-8 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-gray-4 [&::-webkit-scrollbar-track]:rounded-full">
                <div className="flex flex-col gap-6">
                  {TERMS_SECTIONS.map((section, idx) => (
                    <div key={idx} className="flex flex-col gap-6">
                      <SectionBlock section={section} />
                      {idx < TERMS_SECTIONS.length - 1 && (
                        <div className="h-px bg-gray-6 w-full" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-1 border-t border-gray-6 flex items-center justify-end px-6 py-4 shrink-0 w-full">
                <Button
                  onClick={handleAccept}
                  className="px-8 font-bold text-base font-manrope"
                >
                  Aceitar termos
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
