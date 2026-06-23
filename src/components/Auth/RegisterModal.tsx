"use client";

import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Mail, Lock, User, Phone, Search, Eye, EyeOff } from "lucide-react";
import { ArrowButton } from "../ArrowButton";
import { FlagIcon } from "../Icons/FlagIcon";
import { motion, AnimatePresence } from "framer-motion";
import { CPFIcon } from "../Icons/CPFIcon";
import { HeartIcon } from "../Icons/HeartIcon";
import { DatePickerWithConfirm } from "../DateOfBirthPicker/DatePickerWithConfirm";
import Image from "next/image";
import { Turnstile } from "@marsidev/react-turnstile";
import { Checkbox } from "@/components/CheckBox";
import { TermsOfServiceModal } from "./TermsOfServiceModal";
import { useRegisterFlow } from "./useRegisterFlow";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

export function RegisterModal() {
  const {
    isOpen,
    closeRegisterModal,
    authLoading,
    user,
    isCompletingProfile,
    canGoBack,
    currentStep,
    handleBack,
    handleNext,
    handleFinish,
    isSubmitting,
    formData,
    setFormData,
    errors,
    setErrors,
    handleInputChange,
    handleCPFChange,
    handlePhoneChange,
    showPassword,
    setShowPassword,
    showConfirmPassword,
    setShowConfirmPassword,
    isBrUser,
    docLabel,
    docPlaceholder,
    docMaxLength,
    phonePlaceholder,
    phoneMaxLength,
    showNationalityDropdown,
    setShowNationalityDropdown,
    nationalitySearch,
    setNationalitySearch,
    nationalityDropdownRef,
    filteredNacionalidadeOptions,
    sexoOptions,
    acceptedTermsChecked,
    setAcceptedTermsChecked,
    showTermsModal,
    setShowTermsModal,
    turnstileToken,
    setTurnstileToken,
    mobileTurnstileRef,
    desktopTurnstileRef,
  } = useRegisterFlow();

  /* Checkbox de aceite — única fonte de verdade compartilhada entre mobile e
   * desktop. Renderizada antes do Turnstile + botão de submit no Step 3 (UX).
   * Clicar no texto "Termos de uso" abre o modal em paralelo (z-[100000]). */
  const renderAcceptTermsCheckbox = () => {
    if (isCompletingProfile) return null;
    return (
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <Checkbox
          checked={acceptedTermsChecked}
          onCheckedChange={(checked) => setAcceptedTermsChecked(checked === true)}
          aria-label="Aceitar termos de uso"
        />
        <span className="text-sm leading-[1.3] text-gray-12 font-family-dm-sans">
          Li e aceito os{" "}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              setShowTermsModal(true);
            }}
            className="text-primary-11 hover:text-primary-12 underline-offset-2 underline cursor-pointer"
          >
            Termos de uso
          </button>{" "}
          da PódioTicket
        </span>
      </label>
    );
  };

  // Header mobile compartilhado entre as duas sub-etapas de dados pessoais.
  const renderPersonalInfoMobileHeader = () => (
    <div className="md:hidden border-b border-gray-6 flex items-center justify-center h-[52px] px-4 py-2 relative shrink-0 w-full">
      <div className="flex gap-2 items-center flex-1">
        {canGoBack && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3 rounded-lg"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={true} />
          </button>
        )}
        <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
          Informações pessoais
        </p>
      </div>
    </div>
  );

  // Step 2 (UX): nome + nacionalidade. Botão "Continuar" → Step 3.
  const renderStep1aMobile = () => (
    <div className="md:hidden h-screen">
      {renderPersonalInfoMobileHeader()}

      <div className="md:hidden flex flex-col gap-8 items-center px-4 py-6 relative shrink-0 w-full overflow-y-auto h-full">
        <div className="flex flex-col gap-5 items-start relative shrink-0 w-full">
          {/* Nome */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nome completo
            </label>
            <div className="relative w-full">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                className={`pl-10 h-12 ${errors.nome ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.nome}
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.nome}</p>
            )}
          </div>

          {/* Nacionalidade */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nacionalidade
            </label>
            <div className="w-full relative" ref={nationalityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNationalityDropdown((v) => !v);
                  if (!showNationalityDropdown) setNationalitySearch("");
                }}
                className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer text-left"
              >
                <div className="flex gap-1 items-center flex-1 min-w-0">
                  <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
                  <span
                    className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.nacionalidade
                      ? "text-gray-12"
                      : "text-gray-11"
                      }`}
                  >
                    {formData.nacionalidade || "Selecione"}
                  </span>
                </div>
                <div className="flex-none -scale-y-100 shrink-0">
                  <ArrowButton isOpen={showNationalityDropdown} />
                </div>
              </button>
              {showNationalityDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-6">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-11" />
                      <input
                        type="text"
                        placeholder="Pesquisar país"
                        value={nationalitySearch}
                        onChange={(e) => setNationalitySearch(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredNacionalidadeOptions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                        Nenhum país encontrado
                      </div>
                    ) : (
                      filteredNacionalidadeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            handleInputChange("nacionalidade", option.label);
                            setShowNationalityDropdown(false);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.nacionalidade && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.nacionalidade}
              </p>
            )}
          </div>
        </div>

        {/* Botão "Continuar" — só avança pra Step 3 (sem hit no backend). */}
        <div className="flex flex-col items-start relative shrink-0 w-full gap-4">
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </Button>
        </div>
      </div>
    </div>
  );

  // Step 3 (UX): documentos + contato. Botão final dispara o cadastro.
  const renderStep1bMobile = () => (
    <div className="md:hidden h-screen">
      {renderPersonalInfoMobileHeader()}

      <div className="md:hidden flex flex-col gap-8 items-center px-4 py-6 relative shrink-0 w-full overflow-y-auto h-full">
        <div className="flex flex-col gap-5 items-start relative shrink-0 w-full">
          {/* CPF / Documento (depende da nacionalidade) */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              {docLabel}
            </label>
            <div className="relative w-full">
              <CPFIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder={docPlaceholder}
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                maxLength={docMaxLength}
                className={`pl-10 h-12 ${errors.cpf ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.cpf}
              />
            </div>
            {errors.cpf && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.cpf}</p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Data de nascimento
            </label>
            <div className="w-full">
              <DatePickerWithConfirm
                value={formData.dataNascimento}
                onChange={(date) => {
                  setFormData((prev) => ({
                    ...prev,
                    dataNascimento: date,
                  }));
                  if (errors.dataNascimento && date) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.dataNascimento;
                      return newErrors;
                    });
                  }
                }}
                error={!!errors.dataNascimento}
              />
            </div>
            {errors.dataNascimento && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.dataNascimento}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Telefone
            </label>
            <div className="relative w-full">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="tel"
                placeholder={phonePlaceholder}
                value={formData.telefone}
                onChange={(e) => handlePhoneChange("telefone", e.target.value)}
                maxLength={phoneMaxLength}
                className={`pl-10 h-12 ${errors.telefone
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!errors.telefone}
              />
            </div>
            {errors.telefone && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.telefone}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Sexo
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <HeartIcon className="w-5 h-5 text-gray-11 shrink-0" />
                      <span
                        className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.sexo ? "text-gray-12" : "text-gray-11"
                          }`}
                      >
                        {formData.sexo || "Selecione"}
                      </span>
                    </div>
                    <div className="flex-none -scale-y-100 shrink-0">
                      <ArrowButton isOpen={open} />
                    </div>
                  </div>
                )}
                options={sexoOptions}
                onSelect={(option) => handleInputChange("sexo", option.label)}
              />
            </div>
            {errors.sexo && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.sexo}</p>
            )}
          </div>
        </div>

        {/* Step final (UX): Turnstile + checkbox de termos + botão. */}
        <div className="flex flex-col items-start relative shrink-0 w-full gap-4">
          {renderAcceptTermsCheckbox()}
          {/* Captcha Turnstile — mesmo padrão do login mobile: retângulo
              "normal" reduzido via scale (~255×55); wrapper com altura fixa
              absorve o espaço extra do scale. */}
          {!isCompletingProfile && TURNSTILE_SITE_KEY && (
            <div className="flex h-14 w-full items-center justify-center">
              <div className="w-full scale-[0.85]">
                <Turnstile
                  ref={mobileTurnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onError={() => setTurnstileToken(null)}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: "light", size: "flexible" }}
                />
              </div>
            </div>
          )}
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading || (!isCompletingProfile && (!acceptedTermsChecked || (!!TURNSTILE_SITE_KEY && !turnstileToken)))}
            className="w-full h-12 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading
              ? isCompletingProfile
                ? "Finalizando cadastro..."
                : "Criando conta..."
              : isCompletingProfile
                ? "Finalizar cadastro"
                : "Criar conta"}
          </Button>
        </div>
      </div>
    </div>
  );

  // Header desktop compartilhado entre as duas sub-etapas de dados pessoais.
  const renderPersonalInfoDesktopHeader = () => (
    <div className="hidden md:flex border-b border-gray-6 gap-0.5 items-center px-4 py-3 relative shrink-0 w-full overflow-visible">
      {canGoBack && (
        <button
          onClick={handleBack}
          className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
          aria-label="Voltar"
        >
          <ArrowButton isOpen={true} />
        </button>
      )}
      <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
        Informações pessoais
      </p>
    </div>
  );

  // Step 2 (UX): nome + nacionalidade. Botão "Continuar" → Step 3.
  const renderStep1a = () => (
    <>
      {renderPersonalInfoDesktopHeader()}

      <div className="hidden md:flex flex-col items-start relative shrink-0 w-full overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start p-6 relative shrink-0 w-full overflow-visible">
          {/* Nome */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nome completo
            </label>
            <div className="relative w-full">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder="Digite seu nome completo"
                value={formData.nome}
                onChange={(e) => handleInputChange("nome", e.target.value)}
                className={`pl-10 h-12 ${errors.nome ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.nome}
              />
            </div>
            {errors.nome && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.nome}</p>
            )}
          </div>

          {/* Nacionalidade */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Nacionalidade
            </label>
            <div className="w-full relative" ref={nationalityDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setShowNationalityDropdown((v) => !v);
                  if (!showNationalityDropdown) setNationalitySearch("");
                }}
                className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer text-left"
              >
                <div className="flex gap-1 items-center flex-1 min-w-0">
                  <FlagIcon className="w-5 h-5 text-gray-11 shrink-0" />
                  <span
                    className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.nacionalidade
                      ? "text-gray-12"
                      : "text-gray-11"
                      }`}
                  >
                    {formData.nacionalidade || "Selecione"}
                  </span>
                </div>
                <ArrowButton isOpen={showNationalityDropdown} />
              </button>
              {showNationalityDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 z-60 bg-gray-1 border border-gray-6 rounded-lg shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-gray-6">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-11" />
                      <input
                        type="text"
                        placeholder="Pesquisar país"
                        value={nationalitySearch}
                        onChange={(e) => setNationalitySearch(e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="w-full h-9 pl-8 pr-3 rounded-md border border-gray-6 bg-gray-2 text-sm font-family-dm-sans text-gray-12 placeholder:text-gray-10 focus:outline-none focus:ring-2 focus:ring-primary-8 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="max-h-[220px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-gray-6 [&::-webkit-scrollbar-thumb]:rounded-full">
                    {filteredNacionalidadeOptions.length === 0 ? (
                      <div className="px-3 py-4 text-sm text-gray-11 font-family-dm-sans text-center">
                        Nenhum país encontrado
                      </div>
                    ) : (
                      filteredNacionalidadeOptions.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => {
                            handleInputChange("nacionalidade", option.label);
                            setShowNationalityDropdown(false);
                          }}
                          className="w-full px-3 py-2.5 text-left text-sm font-family-dm-sans text-gray-12 hover:bg-gray-3 transition-colors"
                        >
                          {option.label}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {errors.nacionalidade && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.nacionalidade}
              </p>
            )}
          </div>
        </div>

        {/* Botão "Continuar" — só avança pra Step 3 (sem hit no backend). */}
        <div className="flex flex-col items-end justify-end pb-8 pt-4 px-6 relative shrink-0 w-full gap-4">
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="px-8 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar
          </Button>
        </div>
      </div>
    </>
  );

  // Step 3 (UX): documentos + contato. Botão final dispara o cadastro.
  const renderStep1b = () => (
    <>
      {renderPersonalInfoDesktopHeader()}

      <div className="hidden md:flex flex-col items-start relative shrink-0 w-full overflow-visible">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 items-start p-6 pb-0 relative shrink-0 w-full overflow-visible">
          {/* CPF / Documento (depende da nacionalidade) */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              {docLabel}
            </label>
            <div className="relative w-full">
              <CPFIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="text"
                placeholder={docPlaceholder}
                value={formData.cpf}
                onChange={(e) => handleCPFChange(e.target.value)}
                maxLength={docMaxLength}
                className={`pl-10 h-12 ${errors.cpf ? "border-red-9 focus-visible:border-red-9" : ""
                  }`}
                aria-invalid={!!errors.cpf}
              />
            </div>
            {errors.cpf && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.cpf}</p>
            )}
          </div>

          {/* Data de nascimento */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Data de nascimento
            </label>
            <div className="w-full">
              <DatePickerWithConfirm
                value={formData.dataNascimento}
                onChange={(date) => {
                  setFormData((prev) => ({
                    ...prev,
                    dataNascimento: date,
                  }));
                  if (errors.dataNascimento && date) {
                    setErrors((prev) => {
                      const newErrors = { ...prev };
                      delete newErrors.dataNascimento;
                      return newErrors;
                    });
                  }
                }}
                error={!!errors.dataNascimento}
              />
            </div>
            {errors.dataNascimento && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.dataNascimento}
              </p>
            )}
          </div>

          {/* Telefone */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Telefone
            </label>
            <div className="relative w-full">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="tel"
                placeholder={phonePlaceholder}
                value={formData.telefone}
                onChange={(e) => handlePhoneChange("telefone", e.target.value)}
                maxLength={phoneMaxLength}
                className={`pl-10 h-12 ${errors.telefone
                  ? "border-red-9 focus-visible:border-red-9"
                  : ""
                  }`}
                aria-invalid={!!errors.telefone}
              />
            </div>
            {errors.telefone && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.telefone}
              </p>
            )}
          </div>

          {/* Sexo */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Sexo
            </label>
            <div className="w-full">
              <Dropdown
                width="w-full"
                className="z-60"
                trigger={(open: boolean) => (
                  <div className="border border-gray-6 rounded-lg h-12 flex items-center justify-between px-3 w-full hover:bg-gray-3 transition-colors cursor-pointer">
                    <div className="flex gap-1 items-center flex-1 min-w-0">
                      <HeartIcon className="w-5 h-5 text-gray-11 shrink-0" />
                      <span
                        className={`font-normal text-base leading-[1.3] font-family-dm-sans truncate ${formData.sexo ? "text-gray-12" : "text-gray-11"
                          }`}
                      >
                        {formData.sexo || "Selecione"}
                      </span>
                    </div>
                    <div className="flex-none -scale-y-100 shrink-0">
                      <ArrowButton isOpen={open} />
                    </div>
                  </div>
                )}
                options={sexoOptions}
                onSelect={(option) => handleInputChange("sexo", option.label)}
              />
            </div>
            {errors.sexo && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.sexo}</p>
            )}
          </div>
        </div>

        {/* Step final (UX): Turnstile + checkbox de termos + botão. */}
        <div className="flex flex-col items-stretch justify-end pb-8 pt-4 px-6 relative shrink-0 w-full gap-4">
          {renderAcceptTermsCheckbox()}
          {!isCompletingProfile && TURNSTILE_SITE_KEY && (
            <Turnstile
              ref={desktopTurnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={setTurnstileToken}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: "light", size: "flexible" }}
              className="w-full"
            />
          )}
          <div className="flex justify-end">
            <Button
              onClick={handleNext}
              disabled={isSubmitting || authLoading || (!isCompletingProfile && (!acceptedTermsChecked || (!!TURNSTILE_SITE_KEY && !turnstileToken)))}
              className="px-8 font-bold text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || authLoading
                ? isCompletingProfile
                  ? "Finalizando cadastro..."
                  : "Criando conta..."
                : isCompletingProfile
                  ? "Finalizar cadastro"
                  : "Criar conta"}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  const renderStep2Mobile = () => (
    <>
      {/* Mobile Header */}
      <div className="md:hidden border-b border-gray-6 flex items-center justify-center h-[52px] px-4 py-2 relative shrink-0 w-full">
        <div className="flex gap-2 items-center flex-1">
          {!isCompletingProfile && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3 rounded-lg"
              aria-label="Voltar"
            >
              <ArrowButton isOpen={true} />
            </button>
          )}
          <p className="font-medium text-base leading-[1.3] text-gray-12 font-family-dm-sans">
            Dados de acesso a conta
          </p>
        </div>
      </div>

      {/* Mobile Form content */}
      <div className="md:hidden flex flex-col gap-8 items-center px-4 py-6 relative shrink-0 w-full overflow-y-auto">
        <div className="flex flex-col gap-5 items-start relative shrink-0 w-full">
          {/* Email input */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Email
            </label>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="email"
                placeholder="Digite seu email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isCompletingProfile}
                className={`pl-10 h-12 ${errors.email ? "border-red-9 focus-visible:border-red-9" : ""
                  } ${isCompletingProfile ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.email}</p>
            )}
          </div>

          {/* Password input */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Crie sua senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Digite uma senha"
                value={formData.senha}
                onChange={(e) => handleInputChange("senha", e.target.value)}
                className={`pl-10 pr-10 h-12 ${errors.senha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                aria-invalid={!!errors.senha}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errors.senha && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.senha}</p>
            )}
          </div>

          {/* Confirm password input */}
          <div className="flex flex-col gap-2 items-start relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Confirme sua senha
            </label>
            <div className="relative w-full">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Digite novamente"
                value={formData.confirmarSenha}
                onChange={(e) => handleInputChange("confirmarSenha", e.target.value)}
                className={`pl-10 pr-10 h-12 ${errors.confirmarSenha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                aria-invalid={!!errors.confirmarSenha}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {errors.confirmarSenha && (
              <p className="text-sm text-red-9 font-family-dm-sans">
                {errors.confirmarSenha}
              </p>
            )}
          </div>
        </div>

        {/* Mobile: step 1 = dados de acesso, botão Próximo */}
        <div className="flex flex-col items-start relative shrink-0 w-full">
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading}
            className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-lg font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading ? "Verificando..." : "Próximo"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep2 = () => (
    <>
      {/* Desktop Header */}
      <div className="hidden md:flex border-b border-gray-6 gap-0.5 items-center px-4 py-3 relative shrink-0 w-full overflow-visible">
        {!isCompletingProfile && (
          <button
            onClick={handleBack}
            className="flex items-center justify-center rounded-lg shrink-0 size-8 transition-colors rotate-90 cursor-pointer hover:bg-gray-3"
            aria-label="Voltar"
          >
            <ArrowButton isOpen={true} />
          </button>
        )}
        <p className="font-semibold text-xl leading-[1.3] text-gray-12 font-family-dm-sans">
          Dados de acesso a conta
        </p>
      </div>

      {/* Desktop Form content */}
      <div className="hidden md:flex flex-col items-start relative shrink-0 w-full overflow-visible">
        {/* Input fields */}
        <div className="flex flex-col gap-6 items-start p-6 relative shrink-0 w-full">
          {/* Email input */}
          <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
            <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
              Email
            </label>
            <div className="relative w-full">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
              <Input
                type="email"
                placeholder="Digite seu email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                disabled={isCompletingProfile}
                className={`pl-10 h-12 ${errors.email ? "border-red-9 focus-visible:border-red-9" : ""
                  } ${isCompletingProfile ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                aria-invalid={!!errors.email}
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-9 font-family-dm-sans">{errors.email}</p>
            )}
          </div>

          {/* Password input - oculto quando for completar cadastro */}
          {!isCompletingProfile && (
            <>
              <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Crie sua senha
                </label>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite uma senha"
                    value={formData.senha}
                    onChange={(e) => handleInputChange("senha", e.target.value)}
                    className={`pl-10 pr-10 h-12 ${errors.senha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                    aria-invalid={!!errors.senha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.senha && (
                  <p className="text-sm text-red-9 font-family-dm-sans">
                    {errors.senha}
                  </p>
                )}
              </div>

              {/* Confirm password input */}
              <div className="flex flex-col gap-2 items-start min-w-[230px] relative shrink-0 w-full">
                <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                  Confirme sua senha
                </label>
                <div className="relative w-full">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                  <Input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Digite novamente"
                    value={formData.confirmarSenha}
                    onChange={(e) => handleInputChange("confirmarSenha", e.target.value)}
                    className={`pl-10 pr-10 h-12 ${errors.confirmarSenha ? "border-red-9 focus-visible:border-red-9" : ""}`}
                    aria-invalid={!!errors.confirmarSenha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-11 hover:text-gray-12 transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showConfirmPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
                {errors.confirmarSenha && (
                  <p className="text-sm text-red-9 font-family-dm-sans">
                    {errors.confirmarSenha}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Desktop: step 1 = dados de acesso, botão Próximo */}
        <div className="flex flex-col items-end justify-end pb-8 pt-4 px-6 relative shrink-0 w-full">
          <Button
            onClick={handleNext}
            disabled={isSubmitting || authLoading}
            className="px-8 font-bold text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting || authLoading ? "Verificando..." : "Próximo"}
          </Button>
        </div>
      </div>
    </>
  );

  const renderStep3 = () => (
    <>
      {/* Success content */}
      <div className="flex flex-col items-center justify-center relative shrink-0 w-full">
        <div className="flex flex-col gap-4 items-center justify-center pb-[52px] pt-6 px-6 relative shrink-0 w-full max-w-[460px] mx-auto">
          <Image src="/images/successIcon.png" alt="Success" width={100} height={100} />

          <div className="flex flex-col gap-4 items-center justify-center relative shrink-0 w-full">
            <h2 className="font-extrabold text-xl leading-[1.1] text-gray-12 font-manrope text-center">
              Cadastro realizado!
            </h2>
            <div className="font-normal text-base leading-[1.3] text-gray-11 text-center font-family-dm-sans">
              <p className="mb-0">Sua conta PódioTicket foi criada.</p>
            </div>
          </div>
        </div>

        {/* Continue button */}
        <div className="flex flex-col items-center justify-center pb-8 pt-4 px-6 relative shrink-0 w-full">
          <Button onClick={handleFinish} className="px-8 font-bold text-xl">
            Continuar navegando
          </Button>
        </div>
      </div>
    </>
  );

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
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1-mobile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep2Mobile()}
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="step2-mobile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep1aMobile()}
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="step3-mobile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep1bMobile()}
                  </motion.div>
                )}
                {currentStep === 4 && (
                  <motion.div
                    key="step4-mobile"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStep3()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Desktop Version */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="hidden md:flex fixed inset-0 z-99999 items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[600px] mx-4 relative overflow-visible"
            >
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1-desktop"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep2()}
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div
                    key="step2-desktop"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep1a()}
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div
                    key="step3-desktop"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {renderStep1b()}
                  </motion.div>
                )}
                {currentStep === 4 && (
                  <motion.div
                    key="step4-desktop"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                  >
                    {renderStep3()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Modal de Termos — renderiza em paralelo (z-[100000]) sobre o
              RegisterModal sem fechar o fluxo de cadastro. */}
          <TermsOfServiceModal
            isOpen={showTermsModal}
            onClose={() => setShowTermsModal(false)}
            onAccept={() => setAcceptedTermsChecked(true)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
