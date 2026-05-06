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
    <div className={cn("flex flex-col items-start w-full", isOrganizer ? "gap-[32px]" : "gap-4")}>
      {/* Cabeçalho */}
      <div className={cn("flex flex-col items-start w-full", isOrganizer ? "gap-[16px]" : "gap-3")}>
        {isOrganizer ? (
          <p className="font-manrope font-bold leading-[1.1] text-[20px] text-gray-12">
            Segurança
          </p>
        ) : (
          <h2 className="text-lg font-bold leading-[1.1] text-gray-12 font-manrope md:text-xl">
            Segurança
          </h2>
        )}
        <p
          className={cn(
            "font-family-dm-sans text-gray-11",
            isOrganizer ? "font-normal leading-[1.3] text-[16px] w-full" : "text-base"
          )}
        >
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
            "border border-gray-6 flex items-center gap-[10px] px-[12px] hover:bg-gray-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
            isOrganizer
              ? "h-[44px] justify-center overflow-clip py-[16px] relative rounded-[8px] shrink-0 w-[462px]"
              : "h-12 w-full max-w-[462px] justify-between rounded-lg bg-transparent"
          )}
        >
          <div className="flex flex-1 items-center gap-2 shrink-0">
            {isOrganizer ? (
              <ShieldCheck className="size-6 text-gray-12 shrink-0" />
            ) : (
              <Shield className="size-6 shrink-0 text-gray-12" />
            )}
            <span
              className={cn(
                "font-family-dm-sans font-medium text-gray-12 text-left",
                isOrganizer
                  ? "flex-1 leading-[1.3] text-[14px] whitespace-pre-wrap"
                  : "text-sm"
              )}
            >
              {sending ? "Enviando código..." : "Ligar dois fatores de segurança"}
            </span>
          </div>
          {/* Toggle visual */}
          <div className="flex h-[20px] items-center justify-center shrink-0">
            <div
              className={cn(
                "h-[20px] relative w-[37px] rounded-full transition-all",
                enabled ? "bg-primary-11" : "bg-gray-6"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 size-4 rounded-full bg-white transition-all",
                  enabled ? "right-0.5" : "left-0.5"
                )}
              />
            </div>
          </div>
        </button>

        {/* Painel de confirmação com código */}
        {showInput && (
          <div
            ref={otpPanelRef}
            className={cn(
              "flex flex-col gap-6 w-full max-w-[462px] border border-gray-6 p-6",
              isOrganizer ? "rounded-[8px] bg-gray-1" : "rounded-lg bg-gray-2"
            )}
          >
            <p
              className={cn(
                "font-family-dm-sans text-gray-11",
                isOrganizer ? "text-[14px]" : "text-sm"
              )}
            >
              Digite o código de 6 dígitos enviado para o seu e-mail{" "}
              <strong className="text-gray-12">{userEmail}</strong>.
            </p>

            <OtpCodeInput
              value={code}
              onChange={(v) => {
                setCode(v);
                setCodeError("");
              }}
              disabled={sending || confirming}
              error={!!codeError}
              autoFocus
            />

            {codeError && (
              <p
                className={cn(
                  "font-family-dm-sans text-red-500 -mt-2",
                  isOrganizer ? "text-[14px]" : "text-sm"
                )}
              >
                {codeError}
              </p>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="button"
                onClick={handleResend}
                disabled={sending || confirming}
                className={cn(
                  "border border-gray-6 font-manrope font-bold text-gray-12 bg-transparent hover:bg-gray-3 transition-colors disabled:opacity-60 disabled:cursor-not-allowed px-6",
                  isOrganizer ? "h-[44px] rounded-[8px] text-[14px]" : "h-11 rounded-lg text-sm"
                )}
              >
                {sending ? "Reenviando..." : "Reenviar código"}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={sending || confirming || code.length < 6}
                className={cn(
                  "bg-primary-11 font-manrope font-bold text-primary-2 hover:bg-primary-10 transition-colors disabled:opacity-60 disabled:cursor-not-allowed px-6",
                  isOrganizer ? "h-[44px] rounded-[8px] text-[14px]" : "h-11 rounded-lg text-sm"
                )}
              >
                {confirming ? "Confirmando..." : "Confirmar código"}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className={cn(
                  "font-family-dm-sans text-gray-11 hover:text-gray-12 underline",
                  isOrganizer ? "text-[14px]" : "text-sm"
                )}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
