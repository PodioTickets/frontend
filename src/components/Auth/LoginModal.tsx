"use client";

import { useState } from "react";
import { useLoginModal, useRegisterModal } from "@/stores/modalStore";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Mail, Lock, X } from "lucide-react";
import Image from "next/image";
import { loginSchema, type LoginFormData } from "@/validators/Auth.validator";
import { ZodError } from "zod";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";

const FacebookIcon = () => (
  <svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M14 0C6.268 0 0 6.268 0 14C0 20.956 5.124 26.756 11.812 27.84V18.06H8.26V14H11.812V10.92C11.812 7.532 13.904 5.6 16.996 5.6C18.536 5.6 20.16 5.88 20.16 5.88V9.24H18.396C16.66 9.24 16.188 10.248 16.188 11.284V14H20.02L19.348 18.06H16.188V27.84C22.876 26.756 28 20.956 28 14C28 6.268 21.732 0 14 0Z"
      fill="#1877F2"
    />
  </svg>
);

const GoogleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill="none"
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

const AppleIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="19"
    height="24"
    viewBox="0 0 19 24"
    fill="none"
  >
    <path
      d="M17.384 20.9986C16.4121 22.4865 15.3816 23.9384 13.8125 23.9624C12.2434 23.9984 11.7399 23.0145 9.95998 23.0145C8.16836 23.0145 7.618 23.9384 6.13081 23.9984C4.59682 24.0584 3.43754 22.4145 2.45391 20.9626C0.451521 17.9988 -1.08247 12.5392 0.978465 8.86741C1.99722 7.04353 3.82397 5.89161 5.80293 5.85561C7.30183 5.83161 8.73044 6.89954 9.65552 6.89954C10.5689 6.89954 12.302 5.61563 14.117 5.80761C14.8781 5.84361 17.0093 6.11959 18.3794 8.18346C18.274 8.25545 15.8383 9.71935 15.8618 12.7552C15.8969 16.3789 18.9649 17.5908 19 17.6028C18.9649 17.6868 18.5082 19.3307 17.384 20.9986ZM10.6977 1.79988C11.5525 0.803947 12.9694 0.0479968 14.1404 0C14.2926 1.40391 13.7423 2.81981 12.9226 3.82775C12.1146 4.84768 10.7797 5.63963 9.46816 5.53163C9.29251 4.15172 9.94827 2.71182 10.6977 1.79988Z"
      fill="black"
    />
  </svg>
);

export function LoginModal() {
  const { isOpen, closeLoginModal } = useLoginModal();
  const { openRegisterModal } = useRegisterModal();
  const { login, isLoading: authLoading } = useAuth();

  // Form data state
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validatedData: LoginFormData = loginSchema.parse(formData);

      // Chama a função de login do contexto
      await login({
        emailOrCpf: validatedData.email,
        password: validatedData.password,
      });

      toast.success("Login realizado com sucesso!");
      closeLoginModal();
      // Limpa o formulário
      setFormData({ email: "", password: "" });
      setErrors({});
    } catch (error) {
      console.log("error", error);
      if (error instanceof ZodError) {
        const newErrors: Record<string, string> = {};
        error.issues.forEach((err) => {
          if (err.path.length > 0) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        console.log("newErrors", newErrors);
        setErrors(newErrors);
        // Show first error as toast
        const firstError = error.issues[0];
        if (firstError) {
          toast.error(firstError.message);
        }
      } else {
        // Erro da API ou do contexto
        console.log("error", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao fazer login. Tente novamente.";
        toast.error(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {/* Header with glow effect */}
              <div className="relative h-[164px] flex items-end justify-between pb-7 pt-8 px-4 overflow-hidden">
                {/* Glow effect background */}
                <div className="absolute top-[-190px] left-1/2 -translate-x-1/2 w-[390px] h-[312px] flex items-center justify-center pointer-events-none">
                  <div className="rotate-90 w-[312px] h-[390px] relative">
                    <div className="absolute inset-[-60.87%_-76.09%] opacity-20">
                      <div className="w-full h-full bg-primary-5 rounded-full blur-3xl" />
                    </div>
                  </div>
                </div>

                {/* Left decorative */}
                <div className="absolute left-0 top-0 w-[162px] h-[80px]">
                  <Image
                    src="/images/login_left.png"
                    alt="Decorative left"
                    width={162}
                    height={80}
                    draggable={false}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Logo */}
                <div className="relative z-10 flex items-center gap-2.5">
                  <Image
                    src="/images/logo_horizontal_black.png"
                    alt="Pódio Ticket"
                    width={33}
                    height={33}
                    priority
                    className="h-8 w-auto"
                    draggable={false}
                  />
                </div>

                {/* Right decorative */}
                <div className="absolute right-0 top-0 w-[162px] h-[80px]">
                  <Image
                    src="/images/login_right.png"
                    alt="Decorative right"
                    width={162}
                    height={80}
                    draggable={false}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex flex-col items-center w-full min-h-[648px]">
                {/* Welcome text */}
                <div className="flex flex-col items-center justify-center pt-3 px-4 pb-0">
                  <h2 className="font-extrabold text-2xl leading-[1.1] text-gray-12 font-manrope">
                    Bem-vindo de volta
                  </h2>
                </div>

                {/* Form inputs */}
                <form
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5 items-start px-4 py-6 w-full"
                >
                  <div className="flex flex-col gap-5 items-start w-full">
                    {/* Email input */}
                    <div className="flex flex-col gap-2 items-start w-full">
                      <label className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans">
                        Email
                      </label>
                      <div className="relative w-full">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                        <Input
                          type="email"
                          placeholder="Digite seu email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className={`pl-10 h-12 ${
                            errors.email
                              ? "border-red-9 focus-visible:border-red-9"
                              : ""
                          }`}
                          aria-invalid={!!errors.email}
                        />
                      </div>
                      {errors.email && (
                        <p className="text-sm text-red-9 font-dm-sans">
                          {errors.email}
                        </p>
                      )}
                    </div>

                    {/* Password input */}
                    <div className="flex flex-col gap-2 items-start w-full">
                      <label className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans">
                        Senha
                      </label>
                      <div className="relative w-full">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                        <Input
                          type="password"
                          placeholder="Digite sua senha"
                          value={formData.password}
                          onChange={(e) =>
                            handleInputChange("password", e.target.value)
                          }
                          className={`pl-10 h-12 ${
                            errors.password
                              ? "border-red-9 focus-visible:border-red-9"
                              : ""
                          }`}
                          aria-invalid={!!errors.password}
                        />
                      </div>
                      {errors.password && (
                        <p className="text-sm text-red-9 font-dm-sans">
                          {errors.password}
                        </p>
                      )}
                    </div>

                    {/* Forgot password link */}
                    <button
                      type="button"
                      className="font-semibold text-sm leading-[1.3] text-gray-11 hover:text-primary-10 transition-colors font-dm-sans cursor-pointer underline"
                    >
                      Esqueci minha senha
                    </button>
                  </div>

                  {/* Login button */}
                  <Button
                    type="submit"
                    disabled={isSubmitting || authLoading}
                    className="w-full h-11 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-base font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting || authLoading
                      ? "Conectando..."
                      : "Conectar-se"}
                  </Button>
                </form>

                {/* Social login section */}
                <div className="flex-1 flex flex-col gap-6 items-center justify-between pb-8 pt-4 px-4 w-full">
                  <div className="flex flex-col gap-6 items-start w-full">
                    {/* Divider */}
                    <div className="flex gap-2.5 items-center justify-center w-full">
                      <div className="flex-1 h-px bg-gray-6" />
                      <p className="font-normal text-sm leading-[1.3] text-gray-11 text-center font-dm-sans whitespace-nowrap">
                        Ou conecte-se com
                      </p>
                      <div className="flex-1 h-px bg-gray-6" />
                    </div>

                    {/* Social login buttons */}
                    <div className="flex flex-wrap gap-2 items-center w-full">
                      <Button
                        variant="ghost"
                        className="border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors flex-1 min-w-[167px]"
                      >
                        <GoogleIcon />
                        <span className="font-normal text-sm leading-[1.3] text-gray-12 font-dm-sans">
                          Entrar Google
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors flex-1 min-w-[167px]"
                      >
                        <FacebookIcon />
                        <span className="font-normal text-sm leading-[1.3] text-gray-12 font-dm-sans">
                          Entrar Facebook
                        </span>
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-gray-6 rounded-lg h-11 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors w-full"
                      >
                        <AppleIcon />
                        <span className="font-normal text-sm leading-[1.3] text-gray-12 font-dm-sans">
                          Entrar Apple
                        </span>
                      </Button>
                    </div>
                  </div>

                  {/* Sign up link */}
                  <div className="flex gap-1 items-center">
                    <p className="font-medium text-sm leading-[1.3] text-gray-12 text-center font-dm-sans">
                      Ainda não possui uma conta?
                    </p>
                    <button
                      onClick={() => {
                        closeLoginModal();
                        openRegisterModal();
                      }}
                      className="font-semibold text-base leading-[1.3] text-primary-10 underline hover:text-primary-11 transition-colors font-dm-sans cursor-pointer"
                    >
                      Cadastrar-se
                    </button>
                  </div>

                  {/* Terms and privacy */}
                  <p className="text-xs leading-[1.3] text-gray-11 text-center font-dm-sans">
                    Ao continuar você concorda com nossos{" "}
                    <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                      Termos de serviço
                    </button>{" "}
                    e{" "}
                    <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                      Política de privacidade
                    </button>
                  </p>
                </div>
              </div>
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
              className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[600px] mx-4 relative overflow-hidden"
            >
              <div className="relative pt-8 pb-3 px-6 flex items-center justify-center">
                <div className="absolute left-0 top-0 w-[162px] h-[80px] flex items-center justify-center">
                  <Image
                    src="/images/login_left.png"
                    alt="Decorative left"
                    width={162}
                    height={80}
                    draggable={false}
                  />
                </div>

                <div className="relative z-10 flex items-center">
                  <Image
                    src="/images/logo_horizontal_black.png"
                    alt="Pódio Ticket"
                    width={210}
                    height={36}
                    priority
                    className="h-9 w-auto"
                    draggable={false}
                  />
                </div>

                <div className="absolute right-0 top-0 w-[162px] h-[80px]">
                  <Image
                    src="/images/login_right.png"
                    alt="Decorative right"
                    width={162}
                    height={80}
                    draggable={false}
                  />
                </div>
              </div>

            {/* Content */}
            <div className="flex flex-col items-center w-full">
              {/* Welcome text */}
              <div className="flex flex-col gap-4 items-center justify-center pt-8 pb-0 px-6 text-center">
                <h2 className="font-extrabold text-[28px] leading-[1.1] text-gray-12 font-manrope">
                  Bem-vindo de volta
                </h2>
                <p className="font-normal text-lg leading-[1.3] text-gray-11 font-dm-sans">
                  Por favor, preencha os campos para conectar-se
                </p>
              </div>

              {/* Form inputs */}
              <form
                onSubmit={handleSubmit}
                className="flex flex-col gap-5 items-start p-6 w-full"
              >
                <div className="flex flex-col gap-5 items-start w-full">
                  {/* Email input */}
                  <div className="flex flex-col gap-1 items-start w-full">
                    <label className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans">
                      Email
                    </label>
                    <div className="relative w-full">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                      <Input
                        type="email"
                        placeholder="Digite seu email"
                        value={formData.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        className={`pl-10 h-12 ${
                          errors.email
                            ? "border-red-9 focus-visible:border-red-9"
                            : ""
                        }`}
                        aria-invalid={!!errors.email}
                      />
                    </div>
                    {errors.email && (
                      <p className="text-sm text-red-9 font-dm-sans">
                        {errors.email}
                      </p>
                    )}
                  </div>

                  {/* Password input */}
                  <div className="flex flex-col gap-1 items-start w-full">
                    <label className="font-normal text-base leading-[1.3] text-gray-11 font-dm-sans">
                      Senha
                    </label>
                    <div className="relative w-full">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-11" />
                      <Input
                        type="password"
                        placeholder="Digite sua senha"
                        value={formData.password}
                        onChange={(e) =>
                          handleInputChange("password", e.target.value)
                        }
                        className={`pl-10 h-12 ${
                          errors.password
                            ? "border-red-9 focus-visible:border-red-9"
                            : ""
                        }`}
                        aria-invalid={!!errors.password}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-sm text-red-9 font-dm-sans">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Forgot password link */}
                  <button
                    type="button"
                    className="font-semibold text-base leading-[1.3] text-gray-11 hover:text-primary-10 transition-colors font-dm-sans cursor-pointer underline"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                {/* Login button */}
                <Button
                  type="submit"
                  disabled={isSubmitting || authLoading}
                  className="w-full h-12 bg-primary-11 text-primary-2 hover:bg-primary-10 font-bold text-xl font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting || authLoading
                    ? "Conectando..."
                    : "Conectar-se"}
                </Button>
              </form>

              {/* Social login section */}
              <div className="flex flex-col gap-6 items-center justify-center pb-8 px-6 w-full">
                <div className="flex flex-col gap-6 items-start w-full">
                  {/* Divider */}
                  <div className="flex gap-2.5 items-center justify-center w-full">
                    <div className="flex-1 h-px bg-gray-6" />
                    <p className="font-normal text-base leading-[1.3] text-gray-11 text-center font-dm-sans whitespace-nowrap">
                      Ou conecte-se com
                    </p>
                    <div className="flex-1 h-px bg-gray-6" />
                  </div>

                  {/* Social login buttons */}
                  <div className="flex gap-2 items-center w-full">
                    <Button
                      variant="ghost"
                      className="flex-1 border border-gray-6 rounded-lg h-12 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                    >
                      <FacebookIcon />
                      <span className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
                        Entrar Facebook
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 border border-gray-6 rounded-lg h-12 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                    >
                      <GoogleIcon />
                      <span className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
                        Entrar Google
                      </span>
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1 border border-gray-6 rounded-lg h-12 flex items-center justify-center gap-2 hover:bg-gray-3 transition-colors"
                    >
                      <AppleIcon />
                      <span className="font-normal text-base leading-[1.3] text-gray-12 font-dm-sans">
                        Entrar Apple
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Sign up link */}
                <div className="flex gap-1 items-start">
                  <p className="font-normal text-base leading-[1.3] text-gray-12 text-center font-dm-sans">
                    Ainda não possui uma conta?
                  </p>
                  <button
                    onClick={() => {
                      closeLoginModal();
                      openRegisterModal();
                    }}
                    className="font-semibold text-base leading-[1.3] text-primary-10 underline hover:text-primary-11 transition-colors font-dm-sans cursor-pointer"
                  >
                    Cadastrar-se
                  </button>
                </div>

                {/* Terms and privacy */}
                <p className="text-xs leading-[1.3] text-gray-11 text-center font-dm-sans">
                  Ao continuar você concorda com nossos{" "}
                  <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                    Termos de serviço
                  </button>{" "}
                  e{" "}
                  <button className="font-bold text-gray-12 underline hover:text-primary-10 transition-colors cursor-pointer">
                    Política de privacidade
                  </button>
                </p>
              </div>
            </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
