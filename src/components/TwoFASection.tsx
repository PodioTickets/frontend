"use client";

import { useState, useEffect, useRef } from "react";
import { Shield, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "@/utils/cn";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { userService } from "@/services";

interface TwoFASectionProps {
  /** E-mail do usuário exibido na instrução de código */
  userEmail: string;
  /** Estado atual do 2FA carregado do perfil (sincronizado via useEffect) */
  initialEnabled: boolean;
  /** Chamado após ativar/desativar com sucesso; deve chamar refetchUser no pai */
  onToggled?: () => Promise<unknown>;
  /**
   * Variante visual:
   * - 'user'      → painel do cliente (Shield, bg-gray-2 no painel, rounded-lg)
   * - 'organizer' → painel do organizador (ShieldCheck, bg-gray-1 no painel, rounded-[8px])
   */
  variant?: "user" | "organizer";
}

/**
 * Seção de segurança 2FA reutilizável entre o painel do cliente e do organizador.
 * Gerencia internamente todo o estado e fluxo (envio, confirmação, cancelamento).
 */
export function TwoFASection({
  userEmail,
  initialEnabled,
  onToggled,
  variant = "user",
}: TwoFASectionProps) {
  const isOrganizer = variant === "organizer";

  const [enabled, setEnabled] = useState(initialEnabled);
  const [showInput, setShowInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<"enable" | "disable" | null>(null);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const otpPanelRef = useRef<HTMLDivElement>(null);

  // Sincroniza quando initialEnabled muda (ex: refetchUser no pai)
  useEffect(() => {
    setEnabled(initialEnabled);
  }, [initialEnabled]);

  // Rola para o painel OTP quando ele aparece (evita que fique fora da viewport)
  useEffect(() => {
    if (showInput && otpPanelRef.current) {
      otpPanelRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [showInput]);

  const handleToggle = async () => {
    const action = enabled ? "disable" : "enable";
    setSending(true);
    setCodeError("");
    try {
      await userService.send2FACode();
      setPendingAction(action);
      setShowInput(true);
      setCode("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao enviar código. Tente novamente.");
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    setSending(true);
    setCodeError("");
    try {
      await userService.send2FACode();
      toast.success("Novo código enviado para o seu e-mail.");
      setCode("");
    } catch (err: any) {
      toast.error(err?.message || "Erro ao reenviar código.");
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;
    if (code.length < 6) {
      setCodeError("Preencha todos os 6 dígitos do código.");
      return;
    }
    setConfirming(true);
    setCodeError("");
    try {
      if (pendingAction === "enable") {
        await userService.enable2FA(code);
        setEnabled(true);
        toast.success("2FA ativado com sucesso!");
      } else {
        await userService.disable2FA(code);
        setEnabled(false);
        toast.success("2FA desativado com sucesso!");
      }
      setShowInput(false);
      setPendingAction(null);
      setCode("");
      // Sincroniza perfil no contexto para refletir mfaEnabled atualizado
      await onToggled?.();
    } catch {
      setCodeError(
        "Código incorreto ou expirado. Tente novamente ou reenvie um novo código."
      );
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = () => {
    setShowInput(false);
    setPendingAction(null);
    setCode("");
    setCodeError("");
  };

  return (
    <div className={cn("flex flex-col items-start w-full", isOrganizer ? "gap-[32px]" : "gap-[32px]")}>
      {/* Cabeçalho */}
      <div className="flex flex-col items-start w-full gap-[16px]">
        <p className="font-manrope font-bold text-gray-12"
          style={{ fontSize: 20, lineHeight: "22px" }}>
          Segurança
        </p>
        <p className="font-family-dm-sans font-normal text-gray-11 w-full"
          style={{ fontSize: 16, lineHeight: "20.8px" }}>
          Ative o 2FA para adicionar uma camada extra de segurança à sua conta.
          Sempre que fizer login em um novo dispositivo, você precisará informar
          um código enviado para o seu e-mail.
        </p>
      </div>

      <div className="flex flex-col gap-4 items-start w-full">
        {/* Botão toggle */}
        <button
          type="button"
          onClick={!sending && !confirming ? handleToggle : undefined}
          disabled={sending || confirming}
          className={cn(
            "h-[48px] px-[12px] overflow-hidden rounded-[8px] border border-gray-6",
            "flex items-center gap-[10px] hover:bg-gray-3 transition-colors",
            "disabled:opacity-60 disabled:cursor-not-allowed",
            isOrganizer ? "w-[462px]" : "w-[400px]"
          )}
        >
          <div className="flex flex-1 items-center gap-2">
            {isOrganizer ? (
              <ShieldCheck className="size-6 text-gray-12 shrink-0" />
            ) : (
              <Shield className="size-6 shrink-0 text-gray-12" />
            )}
            <span className="font-family-dm-sans font-normal text-gray-12 text-left"
              style={{ fontSize: 16, lineHeight: "20.8px" }}>
              {sending ? "Enviando código..." : "Ligar dois fatores de segurança"}
            </span>
          </div>

          {/* Toggle visual — design: ON = primary-12 bg + primary-10 circle; OFF = gray-6 bg + white circle */}
          <div className="flex items-center justify-center shrink-0">
            {enabled ? (
              <div className="w-[37px] h-[20px] rounded-full border border-primary-10 bg-primary-12 flex items-center justify-end transition-all">
                <div className="w-[20px] h-[20px] rounded-full bg-primary-10" />
              </div>
            ) : (
              <div className="w-[37px] h-[20px] rounded-full bg-gray-6 relative transition-all">
                <div className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white" />
              </div>
            )}
          </div>
        </button>

        {/* Painel de confirmação com código */}
        {showInput && (
          <div
            ref={otpPanelRef}
            className={cn(
              "flex flex-col items-start w-full gap-[36px]",
              isOrganizer ? "max-w-[462px]" : "max-w-[462px]"
            )}
          >
            {/* Título e subtítulo */}
            <div className="flex flex-col items-start w-full gap-[28px]">
              <div className="flex flex-col items-start w-full gap-[16px]">
                <p className="font-manrope font-bold text-gray-12"
                  style={{ fontSize: 18, lineHeight: "19.8px" }}>
                  Informe o código de segurança
                </p>
                <p className="font-family-dm-sans font-medium text-gray-11 w-full"
                  style={{ fontSize: 16, lineHeight: "20.8px" }}>
                  Para continuar com a verificação em duas etapas em nossa plataforma, por favor, insira abaixo o código recebido por e-mail em sua caixa de entrada
                </p>
              </div>
            </div>

            {/* Inputs OTP + erro + botões */}
            <div className="flex flex-col items-start w-full gap-[36px]">
              <div className="flex flex-col items-start gap-[16px]">
                <OtpCodeInput
                  value={code}
                  onChange={(v) => {
                    setCode(v);
                    setCodeError("");
                  }}
                  disabled={sending || confirming}
                  error={!!codeError}
                  autoFocus
                  showSeparator={false}
                />

                {codeError && (
                  <p className="font-family-dm-sans text-red-500 whitespace-nowrap"
                    style={{ fontSize: 16, lineHeight: "20.8px" }}>
                    {codeError}
                  </p>
                )}
              </div>

              {/* Botões */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={sending || confirming}
                  className={cn(
                    "h-[48px] px-8 rounded-[8px] border border-gray-6",
                    "font-sans font-semibold text-gray-12 bg-transparent",
                    "hover:bg-gray-3 transition-colors",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                  style={{ fontSize: 16, lineHeight: "17.6px" }}
                >
                  {sending ? "Reenviando..." : "Reenviar código"}
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={sending || confirming || code.length < 6}
                  className={cn(
                    "h-[48px] px-8 rounded-[8px] bg-primary-11",
                    "font-sans font-semibold text-primary-2",
                    "hover:bg-primary-10 transition-colors",
                    "disabled:opacity-60 disabled:cursor-not-allowed"
                  )}
                  style={{ fontSize: 16, lineHeight: "17.6px" }}
                >
                  {confirming ? "Confirmando..." : "Confirmar código"}
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="font-family-dm-sans text-gray-11 hover:text-gray-12 underline"
                  style={{ fontSize: 14 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
