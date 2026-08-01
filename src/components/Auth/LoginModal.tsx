"use client";

import { useLoginModal, useRegisterModal } from "@/stores/modalStore";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { OtpCodeInput } from "@/components/OtpCodeInput";
import { X, Eye, EyeOff, Info, Shield } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Turnstile } from "@marsidev/react-turnstile";
import { EmailIcon } from "../Icons/EmailIcon";
import { PasswordIcon } from "../Icons/PasswordIcon";
import { ForgotPasswordPanel, ForgotPasswordEnterCodePanel, ForgotPasswordNewPasswordPanel } from "./ForgotPasswordPanels";
import { useForgotPasswordFlow } from "./useForgotPasswordFlow";
import { useLoginFlow } from "./useLoginFlow";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";


const GoogleIcon = ({ className = "size-6" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    className={className}
  >
    <path
      d="M25.4404 11.7148H24.5007V11.6663H14.0007V16.333H20.5941C19.6322 19.0496 17.0474 20.9997 14.0007 20.9997C10.1349 20.9997 7.00065 17.8654 7.00065 13.9997C7.00065 10.1339 10.1349 6.99967 14.0007 6.99967C15.7851 6.99967 17.4085 7.67284 18.6446 8.77242L21.9445 5.47251C19.8608 3.53059 17.0737 2.33301 14.0007 2.33301C7.55773 2.33301 2.33398 7.55676 2.33398 13.9997C2.33398 20.4426 7.55773 25.6663 14.0007 25.6663C20.4436 25.6663 25.6673 20.4426 25.6673 13.9997C25.6673 13.2174 25.5868 12.4538 25.4404 11.7148Z"
      fill="#FBC02D"
    />
    <path
      d="M3.67773 8.56942L7.51082 11.3805C8.54799 8.81267 11.0598 6.99967 13.9992 6.99967C15.7837 6.99967 17.4071 7.67284 18.6432 8.77242L21.9431 5.47251C19.8594 3.53059 17.0722 2.33301 13.9992 2.33301C9.51807 2.33301 5.6319 4.86292 3.67773 8.56942Z"
      fill="#E53935"
    />
    <path
      d="M13.9995 25.6671C17.013 25.6671 19.7512 24.5138 21.8214 22.6384L18.2106 19.5829C17.0393 20.4702 15.5833 21.0004 13.9995 21.0004C10.965 21.0004 8.38845 19.0655 7.41778 16.3652L3.61328 19.2965C5.54411 23.0747 9.46528 25.6671 13.9995 25.6671Z"
      fill="#4CAF50"
    />
    <path
      d="M25.4398 11.7154L25.4304 11.667H24.5H14V16.3337H20.5934C20.1314 17.6386 19.292 18.7638 18.2093 19.5834L18.2111 19.5822L21.8219 22.6377C21.5664 22.8699 25.6667 19.8337 25.6667 14.0003C25.6667 13.2181 25.5862 12.4545 25.4398 11.7154Z"
      fill="#1565C0"
    />
  </svg>
);

export function LoginModal() {
  const { isOpen, closeLoginModal, openLoginModal } = useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const {
    forgotFlow,
    forgotMethod,
    forgotEmail,
    forgotCpf,
    forgotEmailError,
    resetCode,
    resetCodeError,
    passwordResetEmail,
    passwordResetMaskedEmail,
    newPassword,
    confirmNewPassword,
    resetPasswordFieldErrors,
    forgotResendCooldown,
    forgotPasswordPending,
    forgotPasswordResending,
    forgotPasswordVerifying,
    resetPasswordPending,
    startForgotFlowFrom,
    backToEmailStep,
    handleForgotMethodChange,
    handleForgotEmailChange,
    handleForgotCpfChange,
    handleResetCodeChange,
    handleForgotPasswordSubmit,
    handleCodeSubmit,
    handleResendResetEmail,
    handleNewPasswordChange,
    handleConfirmNewPasswordChange,
    handleBackFromNewPassword,
    handleNewPasswordSubmit,
  } = useForgotPasswordFlow();

  const {
    formData,
    errors,
    isSubmitting,
    credentialsError,
    showPassword,
    setShowPassword,
    turnstileToken,
    setTurnstileToken,
    authLoading,
    mfaToken,
    mfaCode,
    mfaError,
    mfaConfirming,
    mfaResendCooldown,
    handleMfaCodeChange,
    mobileTurnstileRef,
    desktopTurnstileRef,
    handleGoogleLogin,
    handleInputChange,
    handleSubmit,
    fecharMfa,
    handleMfaResend,
    handleMfaConfirm,
  } = useLoginFlow();

  const mfaStepContent = mfaToken ? (
    <div className="bg-[#FCFCFC] rounded-xl w-full overflow-hidden flex flex-col border border-gray-6 md:border-0">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center px-4 py-3 border-b border-[#D9D9D9]">
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-[#646464] shrink-0" strokeWidth={1.5} />
          <span className="font-family-dm-sans font-semibold text-xl text-[#202020] leading-[1.3]">
            Verifique sua identidade
          </span>
        </div>
        <button
          type="button"
          onClick={fecharMfa}
          className="flex items-center justify-center size-8 rounded-lg hover:bg-gray-3 transition-colors shrink-0"
          aria-label="Fechar"
        >
          <X className="size-[18px] text-[#646464]" strokeWidth={1.5} />
        </button>
      </div>

      {/* Corpo */}
      <div className="flex flex-col gap-6 p-6">
        <p className="font-family-dm-sans text-base text-[#646464] leading-[1.3]">
          Enviamos um código de 6 dígitos para o seu e-mail. Digite ou cole o código abaixo para acessar sua conta.
        </p>

        <OtpCodeInput
          value={mfaCode}
          onChange={handleMfaCodeChange}
          disabled={mfaConfirming}
          error={!!mfaError}
          autoFocus
        />

        {/* Banner de erro */}
        {mfaError && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg border border-[#FDBDBE]"
            style={{ background: "linear-gradient(90deg, #FFDBDC 0%, #FEEBEC 100%)" }}
          >
            <Info className="size-5 shrink-0 text-[#641723]" strokeWidth={1.5} aria-hidden />
            <p className="font-family-dm-sans font-medium text-sm text-[#641723]">
              Código inválido. Verifique e tente novamente
            </p>
          </div>
        )}

        {/* Reenviar código */}
        <div className="flex justify-end">
          {mfaResendCooldown > 0 ? (
            <span className="font-family-dm-sans font-semibold text-sm text-[#646464]">
              Aguarde ({mfaResendCooldown} seg) para reenviar
            </span>
          ) : (
            <button
              type="button"
              onClick={handleMfaResend}
              className="font-family-dm-sans font-semibold text-sm text-[#646464] hover:text-[#202020] transition-colors"
            >
              Enviar código
            </button>
          )}
        </div>
      </div>

      {/* Rodapé */}
      <div className="px-6 pb-8 pt-4 flex justify-end items-center">
        <button
          type="button"
          onClick={handleMfaConfirm}
          disabled={mfaConfirming || mfaCode.length < 6}
          className="h-12 px-8 bg-[#59E373] rounded-lg font-manrope font-bold text-lg text-[#141A15] disabled:opacity-50 hover:bg-[#4fd066] transition-colors"
        >
          {mfaConfirming ? "Verificando..." : "Confirmar"}
        </button>
      </div>
    </div>
  ) : null;

  const showForgotFlow = forgotFlow !== "idle";

  const forgotStepContent =
    forgotFlow === "email" ? (
      <ForgotPasswordPanel
        method={forgotMethod}
        onMethodChange={handleForgotMethodChange}
        email={forgotEmail}
        onEmailChange={handleForgotEmailChange}
        cpf={forgotCpf}
        onCpfChange={handleForgotCpfChange}
        error={forgotEmailError}
        onSubmit={handleForgotPasswordSubmit}
        isPending={forgotPasswordPending}
        onClose={closeLoginModal}
      />
    ) : forgotFlow === "enter-code" ? (
      <ForgotPasswordEnterCodePanel
        sentToEmail={passwordResetEmail || passwordResetMaskedEmail}
        code={resetCode}
        onCodeChange={handleResetCodeChange}
        error={resetCodeError}
        onSubmit={handleCodeSubmit}
        onBack={backToEmailStep}
        onClose={closeLoginModal}
        onResend={handleResendResetEmail}
        isResending={forgotPasswordResending}
        isVerifying={forgotPasswordVerifying}
        resendCooldownSeconds={forgotResendCooldown}
      />
    ) : forgotFlow === "new-password" ? (
      <ForgotPasswordNewPasswordPanel
        password={newPassword}
        confirmPassword={confirmNewPassword}
        onPasswordChange={handleNewPasswordChange}
        onConfirmPasswordChange={handleConfirmNewPasswordChange}
        fieldErrors={resetPasswordFieldErrors}
        onSubmit={handleNewPasswordSubmit}
        onBack={handleBackFromNewPassword}
        onClose={closeLoginModal}
        isPending={resetPasswordPending}
      />
    ) : null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Mobile Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden fixed inset-0 z-99999 bg-gray-2 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-t-[12px] min-h-full relative overflow-hidden"
            >
              {mfaToken ? (
                <div className="flex flex-col min-h-full p-4 pt-6 pb-8">
                  {mfaStepContent}
                </div>
              ) : showForgotFlow ? (
                <div className="flex flex-col min-h-full p-4 pt-6 pb-8">
                  {forgotStepContent}
                </div>
              ) : (
                <>
                  {/* Header — mesmo padrão do desktop: logo central + linhas
                      decorativas em gradiente (Figma 883:50467/50468). */}
                  <div className="relative h-[68px] px-4 flex items-center justify-center overflow-hidden">
                    {/* Close button */}
                    <button
                      onClick={closeLoginModal}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center size-8 rounded-full bg-gray-1 hover:bg-gray-3 transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5 text-gray-12" />
                    </button>

                    {/* Linhas decorativas — versão REDUZIDA (~65%) das do
                        desktop: em 390px de viewport, dois lados de 162px
                        quase encostariam no logo. Lado esquerdo é espelho. */}
                    <div className="pointer-events-none absolute right-0 top-0 h-[68px] w-[106px]" aria-hidden>
                      <div className="absolute bottom-[42px] left-[33px] h-1.5 w-[73px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[31px] left-[53px] h-1.5 w-[53px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[20px] left-[73px] h-1.5 w-[33px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>
                    <div className="pointer-events-none absolute left-0 top-0 h-[68px] w-[106px] -scale-x-100" aria-hidden>
                      <div className="absolute bottom-[42px] left-[33px] h-1.5 w-[73px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[31px] left-[53px] h-1.5 w-[53px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[20px] left-[73px] h-1.5 w-[33px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>

                    {/* Logo */}
                    <div className="relative z-10 flex items-center justify-center">
                      <Image
                        src="/images/logo_horizontal_black.png"
                        alt="Pódio Ticket"
                        width={210}
                        height={36}
                        priority
                        className="h-8 w-auto"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center justify-center w-full min-h-[648px] h-full">
                    {/* Welcome text — mesmo texto do desktop */}
                    <div className="flex flex-col items-center justify-center pt-6 px-4 pb-0 text-center">
                      <p className="font-normal text-lg leading-[1.3] text-gray-11 font-family-dm-sans">
                        Sua próxima largada começa aqui!
                      </p>
                    </div>

                    {/* Form inputs */}
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-5 items-start px-4 py-6 w-full"
                    >
                      <div className="flex flex-col gap-5 items-start w-full">
                        {/* Email input */}
                        <div className="flex flex-col gap-2 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Email
                          </label>
                          <div className="relative w-full">
                            <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                            <Input
                              type="email"
                              placeholder="Digite seu email"
                              value={formData.email}
                              onChange={(e) =>
                                handleInputChange("email", e.target.value)
                              }
                              className={`pl-10 h-12 ${errors.email
                                ? "border-red-9 focus-visible:border-red-9"
                                : ""
                                }`}
                              aria-invalid={!!errors.email}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Password input */}
                        <div className="flex flex-col gap-2 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Senha
                          </label>
                          <div className="relative w-full">
                            <PasswordIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`pl-10 pr-10 h-12 ${errors.password
                                ? "border-red-9 focus-visible:border-red-9"
                                : ""
                                }`}
                              aria-invalid={!!errors.password}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Credentials error banner */}
                        {credentialsError && (
                          <div className="flex items-center gap-2 w-full rounded-lg border border-red-6 bg-gradient-to-r from-red-4 to-red-3 p-3">
                            <Info className="size-5 shrink-0 text-red-12" strokeWidth={1.75} aria-hidden />
                            <p className="font-medium text-sm leading-[1.3] text-red-12 font-family-dm-sans">
                              E-mail ou senha incorretos. Verifique suas credenciais e tente novamente
                            </p>
                          </div>
                        )}

                        {/* Forgot password link */}
                        <button
                          type="button"
                          onClick={() => startForgotFlowFrom(formData.email)}
                          className="font-semibold text-sm leading-[1.3] text-gray-11 hover:text-primary-10 transition-colors font-family-dm-sans cursor-pointer underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      {/* Captcha Turnstile — retângulo "normal" (300×65)
                          reduzido via scale pra ~255×55: não existe tamanho
                          fino nativo no widget. Wrapper com altura fixa
                          absorve o espaço extra do scale. */}
                      {TURNSTILE_SITE_KEY && (
                        <div className="flex w-full items-center justify-center empty:hidden">
                          <div className="w-full">
                            <Turnstile
                              ref={mobileTurnstileRef}
                              siteKey={TURNSTILE_SITE_KEY}
                              onSuccess={setTurnstileToken}
                              onError={() => setTurnstileToken(null)}
                              onExpire={() => setTurnstileToken(null)}
                              options={{ theme: "light", size: "flexible", appearance: "interaction-only" }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Login button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || authLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                        className="w-full h-11 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || authLoading
                          ? "Conectando..."
                          : "Entrar"}
                      </Button>
                    </form>

                    {/* Social login section */}
                    <div className="flex-1 flex flex-col gap-6 items-center justify-between pb-8 px-4 w-full">
                      <div className="flex flex-col gap-6 items-start w-full">
                        {/* Divider */}
                        <div className="flex gap-2.5 items-center justify-center w-full">
                          <div className="flex-1 h-px bg-gray-6" />
                          <p className="font-normal text-sm leading-[1.3] text-gray-11 text-center font-family-dm-sans whitespace-nowrap">
                            Ou conecte-se com
                          </p>
                          <div className="flex-1 h-px bg-gray-6" />
                        </div>

                        <div className="w-full">
                          <Button
                            variant="ghost"
                            onClick={handleGoogleLogin}
                            className="w-full border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                          >
                            <GoogleIcon />
                            <span className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                              Entrar com Google
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Sign up link */}
                      <div className="flex gap-1 items-center">
                        <p className="font-medium text-sm leading-[1.3] text-gray-12 text-center font-family-dm-sans">
                          Ainda não possui uma conta?
                        </p>
                        <button
                          onClick={() => {
                            closeLoginModal();
                            openRegisterModal();
                          }}
                          className="font-semibold text-base leading-[1.3] text-primary-10 underline hover:text-primary-11 transition-colors font-family-dm-sans cursor-pointer"
                        >
                          Criar conta
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Desktop Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-99999 items-center justify-center bg-black/50"
            onClick={closeLoginModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className={`rounded-xl shadow-2xl w-full mx-4 relative overflow-hidden max-h-[calc(100dvh-32px)] ${mfaToken || showForgotFlow
                ? "max-w-[460px] bg-transparent"
                : "max-w-[624px] bg-gray-1 overflow-y-auto"
                }`}
            >
              {mfaToken ? (
                mfaStepContent
              ) : showForgotFlow ? (
                forgotStepContent
              ) : (
                <>
                  <div className="relative h-[68px] px-6 flex items-center justify-center">
                    {/* Close button */}
                    <button
                      onClick={closeLoginModal}
                      className="absolute top-4 right-4 z-20 flex items-center justify-center size-8 rounded-full bg-gray-1 hover:bg-gray-3 transition-colors"
                      aria-label="Fechar modal"
                    >
                      <X className="size-5 text-gray-12" />
                    </button>

                    {/* Linhas decorativas em gradiente (Figma 883:50467/50468) —
                        lado esquerdo é o espelho horizontal do direito. */}
                    <div className="pointer-events-none absolute right-0 top-0 h-[68px] w-[162px]" aria-hidden>
                      <div className="absolute bottom-[46px] left-[50px] h-2 w-[112px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[30px] left-[81px] h-2 w-[81px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[14px] left-[111px] h-2 w-[51px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>
                    <div className="pointer-events-none absolute left-0 top-0 h-[68px] w-[162px] -scale-x-100" aria-hidden>
                      <div className="absolute bottom-[46px] left-[50px] h-2 w-[112px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[30px] left-[81px] h-2 w-[81px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                      <div className="absolute bottom-[14px] left-[111px] h-2 w-[51px] rounded-l-full bg-gradient-to-l from-[rgba(62,155,79,0)] to-[#3e9b4f]" />
                    </div>

                    <div className="relative z-10 flex items-center">
                      <Image
                        src="/images/logo_horizontal_black.png"
                        alt="Pódio Ticket"
                        width={210}
                        height={36}
                        priority
                        className="h-8 w-auto"
                        draggable={false}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex flex-col items-center w-full">
                    {/* Welcome text */}
                    <div className="flex flex-col gap-4 items-center justify-center pt-6 pb-0 px-6 text-center">
                      <p className="font-normal text-lg leading-[1.3] text-gray-11 font-family-dm-sans">
                        Sua próxima largada começa aqui!
                      </p>
                    </div>

                    {/* Form inputs */}
                    <form
                      onSubmit={handleSubmit}
                      className="flex flex-col gap-3 items-start p-6 w-full"
                    >
                      <div className="flex flex-col gap-3 items-start w-full">
                        {/* Email input */}
                        <div className="flex flex-col gap-1 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Email
                          </label>
                          <div className="relative w-full">
                            <EmailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                            <Input
                              type="email"
                              placeholder="Digite seu email"
                              value={formData.email}
                              onChange={(e) =>
                                handleInputChange("email", e.target.value)
                              }
                              className={`pl-10 h-12 ${errors.email
                                ? "border-red-9 focus-visible:border-red-9"
                                : ""
                                }`}
                              aria-invalid={!!errors.email}
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.email}
                            </p>
                          )}
                        </div>

                        {/* Password input */}
                        <div className="flex flex-col gap-1 items-start w-full">
                          <label className="font-normal text-base leading-[1.3] text-gray-11 font-family-dm-sans">
                            Senha
                          </label>
                          <div className="relative w-full">
                            <PasswordIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11 pointer-events-none" />
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="Digite sua senha"
                              value={formData.password}
                              onChange={(e) =>
                                handleInputChange("password", e.target.value)
                              }
                              className={`pl-10 pr-10 h-12 ${errors.password
                                ? "border-red-9 focus-visible:border-red-9"
                                : ""
                                }`}
                              aria-invalid={!!errors.password}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-9 font-family-dm-sans">
                              {errors.password}
                            </p>
                          )}
                        </div>

                        {/* Credentials error banner */}
                        {credentialsError && (
                          <div className="flex items-center gap-2 w-full rounded-lg border border-red-6 bg-gradient-to-r from-red-4 to-red-3 p-3">
                            <Info className="size-5 shrink-0 text-red-12" strokeWidth={1.75} aria-hidden />
                            <p className="font-medium text-sm leading-[1.3] text-red-12 font-family-dm-sans">
                              E-mail ou senha incorretos. Verifique suas credenciais e tente novamente
                            </p>
                          </div>
                        )}

                        {/* Forgot password link */}
                        <button
                          type="button"
                          onClick={() => startForgotFlowFrom(formData.email)}
                          className="font-semibold text-base leading-[1.3] text-gray-11 hover:text-primary-10 transition-colors font-family-dm-sans cursor-pointer underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>

                      {/* Captcha Turnstile — retângulo "normal" (300×65)
                          reduzido via scale pra ~255×55: não existe tamanho
                          fino nativo no widget. Wrapper com altura fixa
                          absorve o espaço extra do scale. */}
                      {TURNSTILE_SITE_KEY && (
                        <div className="flex w-full items-center justify-center empty:hidden">
                          <div className="w-full">
                            <Turnstile
                              ref={desktopTurnstileRef}
                              siteKey={TURNSTILE_SITE_KEY}
                              onSuccess={setTurnstileToken}
                              onError={() => setTurnstileToken(null)}
                              onExpire={() => setTurnstileToken(null)}
                              options={{ theme: "light", size: "flexible", appearance: "interaction-only" }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Login button */}
                      <Button
                        type="submit"
                        disabled={isSubmitting || authLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
                        className="w-full h-12 font-bold text-lg font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting || authLoading
                          ? "Conectando..."
                          : "Entrar"}
                      </Button>
                    </form>

                    {/* Social login section */}
                    <div className="flex flex-col gap-8 items-center justify-center pt-2 pb-8 px-6 w-full">
                      <div className="flex flex-col gap-6 items-start w-full">
                        {/* Divider */}
                        <div className="flex gap-2.5 items-center justify-center w-full">
                          <div className="flex-1 h-px bg-gray-6" />
                          <p className="font-normal text-base leading-[1.3] text-gray-11 text-center font-family-dm-sans whitespace-nowrap">
                            Ou conecte-se com
                          </p>
                          <div className="flex-1 h-px bg-gray-6" />
                        </div>

                        <div className="w-full">
                          <Button
                            variant="ghost"
                            onClick={handleGoogleLogin}
                            className="w-full border border-gray-6 rounded-lg h-12 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                          >
                            <GoogleIcon className="size-6" />
                            <span className="font-normal text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
                              Entrar com Google
                            </span>
                          </Button>
                        </div>
                      </div>

                      {/* Sign up link */}
                      <div className="flex gap-1 items-start">
                        <p className="font-normal text-base leading-[1.3] text-gray-12 text-center font-family-dm-sans">
                          Ainda não possui uma conta?
                        </p>
                        <button
                          onClick={() => {
                            closeLoginModal();
                            openRegisterModal();
                          }}
                          className="font-semibold text-base leading-[1.3] text-primary-10 underline hover:text-primary-11 transition-colors font-family-dm-sans cursor-pointer"
                        >
                          Criar conta
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
