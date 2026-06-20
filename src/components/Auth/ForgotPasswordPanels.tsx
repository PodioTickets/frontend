import { useState, type FormEvent } from "react";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { Mail, Lock, X, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { EmailIcon } from "../Icons/EmailIcon";
import { CPFIcon } from "../Icons/CPFIcon";
import { Checkbox } from "@/components/CheckBox";

/** Identificador escolhido para recuperar a senha. */
export type ForgotMethod = "email" | "cpf";

export function ForgotPasswordPanel({
  method,
  onMethodChange,
  email,
  onEmailChange,
  cpf,
  onCpfChange,
  error,
  onSubmit,
  isPending,
  onClose,
}: {
  method: ForgotMethod;
  onMethodChange: (method: ForgotMethod) => void;
  email: string;
  onEmailChange: (value: string) => void;
  cpf: string;
  onCpfChange: (value: string) => void;
  error?: string;
  onSubmit: (e: FormEvent) => void;
  isPending: boolean;
  onClose: () => void;
}) {
  const isCpf = method === "cpf";
  return (
    <div className="bg-gray-1 rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-6 shrink-0">
        <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
          Esqueceu sua senha?
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar modal"
        >
          <X className="size-[18px] text-gray-12" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col w-full">
        <div className="flex flex-col gap-8 pt-4 pb-6 px-6">
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Informe o e-mail ou CPF da sua conta. Enviaremos um código de 6
            dígitos para que você possa criar uma nova senha.
          </p>
          <div className="flex flex-col gap-5 w-full min-w-0">
            {/* Toggle email/CPF: visual de checkbox (design), semântica de radio */}
            <div
              role="radiogroup"
              aria-label="Como deseja recuperar a senha"
              className="flex gap-4 items-center"
            >
              <label className="flex gap-2 items-center cursor-pointer">
                <Checkbox
                  checked={!isCpf}
                  onCheckedChange={() => onMethodChange("email")}
                  role="radio"
                  aria-checked={!isCpf}
                />
                <span className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans select-none">
                  Informar email
                </span>
              </label>
              <label className="flex gap-2 items-center cursor-pointer">
                <Checkbox
                  checked={isCpf}
                  onCheckedChange={() => onMethodChange("cpf")}
                  role="radio"
                  aria-checked={isCpf}
                />
                <span className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans select-none">
                  Informar CPF
                </span>
              </label>
            </div>
            {isCpf ? (
              <div className="flex flex-col gap-2 w-full min-w-0">
                <label
                  htmlFor="forgot-password-cpf"
                  className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
                >
                  CPF cadastrado
                </label>
                <div className="relative w-full">
                  <CPFIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                  <Input
                    id="forgot-password-cpf"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={(e) => onCpfChange(e.target.value)}
                    className={`pl-10 h-12 rounded-lg ${error ? "border-red-9 focus-visible:border-red-9" : ""
                      }`}
                    aria-invalid={!!error}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-red-9 font-family-dm-sans">{error}</p>
                ) : null}
              </div>
            ) : (
              <div className="flex flex-col gap-2 w-full min-w-0">
                <label
                  htmlFor="forgot-password-email"
                  className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
                >
                  E-mail cadastrado
                </label>
                <div className="relative w-full">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                  <Input
                    id="forgot-password-email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => onEmailChange(e.target.value)}
                    className={`pl-10 h-12 rounded-lg ${error ? "border-red-9 focus-visible:border-red-9" : ""
                      }`}
                    aria-invalid={!!error}
                  />
                </div>
                {error ? (
                  <p className="text-sm text-red-9 font-family-dm-sans">{error}</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
        <div className="flex px-6 pt-4 pb-8 w-full">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 leading-[1.1] font-manrope rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Enviando..." : "Recuperar senha"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ForgotPasswordEnterCodePanel({
  sentToEmail,
  code,
  onCodeChange,
  error,
  onSubmit,
  onBack,
  onClose,
  onResend,
  isResending,
  isVerifying,
  resendCooldownSeconds,
}: {
  /** E-mail digitado pelo usuário; vazio quando o fluxo foi por CPF (não revelamos o e-mail da conta). */
  sentToEmail: string;
  code: string;
  onCodeChange: (value: string) => void;
  error?: string;
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
  onResend: () => void;
  isResending: boolean;
  isVerifying: boolean;
  resendCooldownSeconds: number;
}) {
  return (
    <div className="bg-gray-1 rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      <div className="flex items-start justify-between px-4 py-4 border-b border-gray-6 shrink-0 gap-2">
        <div className="flex gap-0.5 items-center min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-[18px] text-gray-12" />
          </button>
          <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans truncate pl-0.5">
            Verifique seu e-mail
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar modal"
        >
          <X className="size-[18px] text-gray-12" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col w-full">
        <div className="flex flex-col gap-6 pt-4 pb-2 px-6 w-full">
          <div className="flex flex-col items-center gap-2">
            <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Vamos enviar um código de 6 dígitos para o e-mail abaixo para que você possa criar uma nova senha.
            </p>
            <div className="flex items-center justify-center gap-2 px-3 py-2 w-min bg-gray-3 rounded-lg border border-gray-6">
              <EmailIcon className="w-4 h-4 text-gray-11 shrink-0" />
              <span className="font-normal text-sm leading-[1.3] text-gray-11 font-family-dm-sans">
                {sentToEmail}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full min-w-0">
            <OtpCodeInput
              value={code}
              onChange={onCodeChange}
              disabled={isVerifying}
              error={!!error}
            />
            {error ? (
              <p className="text-sm text-red-9 font-family-dm-sans">{error}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-center w-full">
            <p className="font-medium text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
              Não recebeu o código?
            </p>
            <button
              type="button"
              onClick={onResend}
              disabled={isResending || resendCooldownSeconds > 0}
              className="font-semibold text-sm leading-[1.3] text-primary-10 font-family-dm-sans hover:text-primary-11 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer bg-transparent border-0 p-0"
            >
              {isResending
                ? "Reenviando..."
                : resendCooldownSeconds > 0
                  ? `Reenviar em ${resendCooldownSeconds}s`
                  : "Reenviar código"}
            </button>
          </div>
        </div>
        <div className="flex px-6 pt-4 pb-8 w-full">
          <Button
            type="submit"
            disabled={isVerifying || code.length !== 6}
            className="w-full h-12 leading-[1.1] font-manrope rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isVerifying ? "Verificando..." : "Verificar código"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function ForgotPasswordNewPasswordPanel({
  password,
  confirmPassword,
  onPasswordChange,
  onConfirmPasswordChange,
  fieldErrors,
  onSubmit,
  onBack,
  onClose,
  isPending,
}: {
  password: string;
  confirmPassword: string;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  fieldErrors: { password?: string; confirmPassword?: string };
  onSubmit: (e: FormEvent) => void;
  onBack: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <div className="bg-gray-1 rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      <div className="flex items-start justify-between px-4 py-4 border-b border-gray-6 shrink-0 gap-2">
        <div className="flex gap-0.5 items-center min-w-0 flex-1">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="size-[18px] text-gray-12" />
          </button>
          <h2 className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans truncate pl-0.5">
            Alterar senha
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar modal"
        >
          <X className="size-[18px] text-gray-12" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="flex flex-col w-full">
        <div className="flex flex-col gap-6 p-6 w-full">
          <div className="flex flex-col gap-2 w-full min-w-0">
            <label
              htmlFor="new-password-field"
              className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
            >
              Nova senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
              <Input
                id="new-password-field"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Digite uma nova senha"
                value={password}
                onChange={(e) => onPasswordChange(e.target.value)}
                className={`pl-10 pr-10 h-12 rounded-lg ${fieldErrors.password
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!fieldErrors.password}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showNewPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.password ? (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {fieldErrors.password}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 w-full min-w-0">
            <label
              htmlFor="confirm-new-password-field"
              className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans"
            >
              Confirmar nova senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
              <Input
                id="confirm-new-password-field"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Digite sua senha novamente"
                value={confirmPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className={`pl-10 pr-10 h-12 rounded-lg ${fieldErrors.confirmPassword
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!fieldErrors.confirmPassword}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.confirmPassword ? (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {fieldErrors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex px-6 pt-4 pb-8 w-full">
          <Button
            type="submit"
            disabled={isPending}
            className="w-full h-12 font-bold text-lg leading-[1.1] font-manrope rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
