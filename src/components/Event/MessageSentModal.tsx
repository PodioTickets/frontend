"use client";

interface MessageSentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessageSentModal({ isOpen, onClose }: MessageSentModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Mobile: bottom sheet */}
      <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-gray-1 rounded-tl-[12px] rounded-tr-[12px] flex flex-col">
          <div className="flex flex-col items-center gap-11 p-5">
            <div className="flex flex-col items-center gap-6 w-full">
              <div
                className="size-[88px] rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(to bottom, var(--color-primary-2, #f5fbf5), var(--color-primary-4, #c8f4cc))" }}
              >
                <svg
                  className="size-[52px] text-primary-11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-4 w-full text-center">
                <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans">
                  Mensagem enviada
                </p>
                <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                  Mensagem encaminhada. O organizador responderá conforme disponibilidade.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-lg font-bold text-base font-manrope transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#59e373", color: "#141a15" }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Desktop: centered dialog */}
      <div
        className="hidden md:flex fixed inset-0 bg-black/50 items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div
          className="bg-gray-1 rounded-xl border border-gray-6 w-full max-w-[440px] shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-11 p-5">
            <div className="flex flex-col items-center gap-6 w-full">
              <div
                className="size-[88px] rounded-full flex items-center justify-center shrink-0"
                style={{ background: "linear-gradient(to bottom, var(--color-primary-2, #f5fbf5), var(--color-primary-4, #c8f4cc))" }}
              >
                <svg
                  className="size-[52px] text-primary-11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex flex-col items-center gap-4 w-full text-center">
                <p className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans">
                  Mensagem enviada
                </p>
                <p className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                  Mensagem encaminhada. O organizador responderá conforme disponibilidade.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-lg font-bold text-base font-manrope transition-opacity hover:opacity-90"
              style={{ backgroundColor: "#59e373", color: "#141a15" }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
