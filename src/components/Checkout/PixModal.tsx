import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import Image from "next/image";
import toast from "react-hot-toast";
import { Button } from "../Button";
import { RemoveIcon } from "../Icons/RemoveIcon";
import { formatBRL as formatPrice } from "@/lib/money";
import { useCheckoutReservation } from "@/hooks/useCheckoutReservation";
import { type OrderPixInfo } from "@/interfaces/order";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export function PixModal({
  isOpen,
  onClose,
  pixData,
  orderId,
  onPaymentConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  pixData: OrderPixInfo | null;
  orderId: string | null;
  onPaymentConfirmed?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(30 * 60);
  const [status, setStatus] = useState<"PENDING" | "PAID" | "CANCELLED" | null>(null);
  const { getPaymentStatus } = useCheckoutReservation();

  // Refs estáveis — nunca mudam de referência, evitam re-execução dos effects
  const confirmedRef = useRef(false);
  const onPaymentConfirmedRef = useRef(onPaymentConfirmed);
  onPaymentConfirmedRef.current = onPaymentConfirmed;

  // Callback estável (deps vazias) — lê o callback atual via ref
  const handleConfirmed = useCallback(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;
    setStatus("PAID");
    toast.success("Pagamento confirmado!");
    onPaymentConfirmedRef.current?.();
  }, []);

  // WebSocket — canal primário; só roda quando isOpen/orderId mudam
  useEffect(() => {
    if (!isOpen || !orderId || !API_URL) return;

    const socket: Socket = io(`${API_URL}/payments`, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      socket.emit("subscribe:order", { orderId });
    });

    socket.on("payment:confirmed", (data: { orderId: string; status: string }) => {
      if (data.orderId === orderId && data.status === "PAID") {
        handleConfirmed();
      }
    });

    socket.on("connect_error", () => {
      // polling continua como fallback — não fatal
    });

    return () => {
      socket.disconnect();
    };
  }, [isOpen, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Polling — FALLBACK do WebSocket. O socket pode perder a confirmação
   * (queda de conexão, webhook processado entre disconnect/subscribe, restart
   * do server) e aí o pagamento confirmava no banco mas a tela ficava presa
   * no QR pra sempre. Três gatilhos:
   *   1. Checagem IMEDIATA ao abrir (webhook pode ter chegado antes do subscribe);
   *   2. Intervalo de 5s enquanto o modal está aberto e não confirmado;
   *   3. Volta de foco/visibilidade — o fluxo típico de PIX é sair pro app do
   *      banco e voltar; checar na hora elimina a espera do próximo tick.
   * Erros de rede são ignorados (transitórios — o próximo tick tenta de novo). */
  useEffect(() => {
    if (!isOpen || !orderId) return;
    let cancelled = false;
    let inFlight = false;

    const check = async () => {
      if (cancelled || inFlight || confirmedRef.current) return;
      inFlight = true;
      try {
        const res = await getPaymentStatus(orderId);
        if (cancelled || confirmedRef.current) return;
        // O endpoint pix-status reconsulta a Braspag e, se pago, já confirma+finaliza
        // no backend, retornando { status, paid }. `paid: true` = confirmado;
        // aceita status === "PAID" por robustez.
        if (res.paid === true || String(res.status).toUpperCase() === "PAID") {
          handleConfirmed();
        }
      } catch {
        /* transitório — próximo tick tenta de novo */
      } finally {
        inFlight = false;
      }
    };

    void check();
    const interval = setInterval(() => void check(), 5000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void check();
    };
    const onFocus = () => void check();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
    };
  }, [isOpen, orderId, getPaymentStatus, handleConfirmed]);


  // Countdown baseado no expiresAt do servidor. Fallback de 30min quando o
  // backend omite/manda expiresAt inválido (espelha usePixPayment) — sem isso o
  // contador exibia "NaN:NaN" e o modal nunca fechava por expiração. Depende de
  // `pixData` (ref estável), então o interval é montado uma vez por PIX.
  useEffect(() => {
    if (!isOpen || !pixData) return;
    const parsed = new Date(pixData.expiresAt);
    const expiration = isNaN(parsed.getTime())
      ? new Date(Date.now() + 30 * 60 * 1000)
      : parsed;

    const updateTimeLeft = () => {
      const diff = Math.max(0, Math.floor((expiration.getTime() - Date.now()) / 1000));
      setTimeLeft(diff);
      if (diff <= 0) onClose();
    };

    updateTimeLeft();
    const timer = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [isOpen, pixData, onClose]);

  // Reset ao fechar/abrir
  useEffect(() => {
    if (isOpen) {
      confirmedRef.current = false;
      setStatus(null);
    }
  }, [isOpen]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const copyPixCode = () => {
    const code = pixData?.pixCode ?? pixData?.qrCode;
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Código PIX copiado!");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl mx-4 shadow-2xl w-[730px]">
        <div className="text-[20px] font-bold text-gray-12 flex items-center justify-between border-b border-gray-6 pb-4 p-4">
          <p>Pix gerado com sucesso</p>
          <button className="cursor-pointer" onClick={onClose}>
            <RemoveIcon className="size-4" />
          </button>
        </div>
        <div className="text-center space-y-4 p-4">
          <div className="space-y-2">
            <p className="text-sm text-gray-12 px-4">
              Mantenha esta página aberta. Assim que o banco confirmar o
              pagamento, vamos atualizar automaticamente o status do seu pedido
            </p>

            {/* Countdown */}
            <p className="text-2xl font-bold text-primary-11">
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </p>

            <p className="text-sm text-gray-12">
              Tempo para conclusão do pagamento
            </p>
          </div>

          {/* QR Code */}
          <div className="space-y-4">
            <div className="bg-gray-2 p-8 rounded-lg mx-auto max-w-xs">
              {pixData?.qrCodeBase64 ? (
                <Image
                  src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                  alt="QR Code PIX"
                  width={192}
                  height={192}
                  // QR já vem como data-URI PNG: serve como está (não passa pelo
                  // otimizador). Caminho crítico de pagamento — sem margem de dúvida.
                  unoptimized
                  className="w-48 h-48 mx-auto"
                />
              ) : (
                <div className="w-48 h-48 bg-gray-5 rounded-lg mx-auto flex items-center justify-center">
                  <span className="text-xs text-gray-11 text-center">
                    QR Code PIX
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Status do pagamento */}
          {status === 'PAID' && (
            <div className="bg-green-2 border border-green-6 rounded-lg p-4">
              <p className="text-sm font-semibold text-green-11">
                Pagamento confirmado!
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="space-y-3 w-1/2 mx-auto mb-8">
            <Button
              className="w-full py-4 text-lg font-bold"
              onClick={copyPixCode}
            >
              Copiar pix
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PixForm({
  onSuccess,
  pixValue,
  isMobile = false,
  onProcessCheckout,
  loading = false,
  submitDisabled = false,
}: {
  onSuccess?: (orderId: string) => void;
  pixValue?: number;
  isMobile?: boolean;
  onProcessCheckout?: () => void;
  loading?: boolean;
  submitDisabled?: boolean;
}) {

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center space-y-4 rounded-lg border border-gray-6 p-4">
        <div className="flex items-center justify-center gap-1">
          <p className="text-base text-gray-12 font-family-dm-sans">
            Valor à vista:
          </p>
          <p className="text-lg font-bold text-gray-12 font-manrope">
            {formatPrice(pixValue || 0)}
          </p>
        </div>
        <p className="text-base text-gray-12 font-family-dm-sans">
          Prazo de até 30 minutos para compensar
        </p>
      </div>
      {!isMobile && (
        <Button
          onClick={onProcessCheckout}
          disabled={loading || submitDisabled}
          isLoading={loading}
          className="w-full font-bold font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Gerar QR Code
        </Button>
      )}
    </div>
  );
}
