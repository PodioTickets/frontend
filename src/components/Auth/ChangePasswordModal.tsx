"use client";

import React, { useState, useEffect } from "react";
import { useChangePasswordModal } from "@/stores/modalStore";
import { Button } from "@/components/Button";
import { X, Lock } from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/Input";
import { userService } from "@/services";
import { useAuth } from "@/hooks/useAuth";

export function ChangePasswordModal() {
  const { isOpen, closeChangePasswordModal } = useChangePasswordModal();
  const { refetchUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!currentPassword) {
      newErrors.currentPassword = "Senha atual é obrigatória";
    }

    if (!newPassword) {
      newErrors.newPassword = "Nova senha é obrigatória";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "A senha deve ter no mínimo 6 caracteres";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Confirmação de senha é obrigatória";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "As senhas não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement API call to change password
      // await userService.changePassword({
      //   currentPassword,
      //   newPassword,
      // });

      // Simulate API call for now
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast.success("Senha alterada com sucesso!");
      closeChangePasswordModal();
      resetForm();
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(
        error?.message || "Erro ao alterar senha. Verifique os dados e tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setErrors({});
  };

  const handleClose = () => {
    closeChangePasswordModal();
    resetForm();
  };

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gray-1 rounded-xl shadow-2xl w-full max-w-[460px] relative overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-6 flex items-center justify-between p-4">
                <h2 className="font-semibold text-[20px] leading-[1.3] text-gray-12 font-family-dm-sans">
                  Alterar senha
                </h2>
                <button
                  onClick={handleClose}
                  className="flex items-center justify-center rounded-lg w-8 h-8 hover:bg-gray-3 transition-colors cursor-pointer"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5 text-gray-11" />
                </button>
              </div>

              {/* Content */}
              <div className="flex flex-col items-start w-full">
                {/* Inputs Section */}
                <div className="flex flex-col gap-6 items-start p-6 w-full">
                  {/* Current Password */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                      Senha atual
                    </label>
                    <div className="border border-gray-6 flex gap-2.5 h-12 items-center px-3 rounded-lg w-full">
                      <Lock className="w-6 h-6 text-gray-11 shrink-0" />
                      <Input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => {
                          setCurrentPassword(e.target.value);
                          if (errors.currentPassword) {
                            setErrors((prev) => ({ ...prev, currentPassword: undefined }));
                          }
                        }}
                        placeholder="Digite sua senha atual"
                        className="flex-1 border-0 p-0 h-auto bg-transparent text-base font-normal text-gray-11 placeholder:text-gray-11 outline-none focus-visible:ring-0 shadow-none"
                      />
                    </div>
                    {errors.currentPassword && (
                      <p className="text-sm text-red-9 font-family-dm-sans">
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                      Nova senha
                    </label>
                    <div className="border border-gray-6 flex gap-2.5 h-12 items-center px-3 rounded-lg w-full">
                      <Lock className="w-6 h-6 text-gray-11 shrink-0" />
                      <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value);
                          if (errors.newPassword) {
                            setErrors((prev) => ({ ...prev, newPassword: undefined }));
                          }
                          // Clear confirm password error if passwords match
                          if (errors.confirmPassword && e.target.value === confirmPassword) {
                            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          }
                        }}
                        placeholder="Digite uma nova senha"
                        className="flex-1 border-0 p-0 h-auto bg-transparent text-base font-normal text-gray-11 placeholder:text-gray-11 outline-none focus-visible:ring-0 shadow-none"
                      />
                    </div>
                    {errors.newPassword && (
                      <p className="text-sm text-red-9 font-family-dm-sans">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="flex flex-col gap-2 items-start w-full">
                    <label className="font-normal text-base leading-[1.3] text-gray-12 font-family-dm-sans">
                      Confirmar nova senha
                    </label>
                    <div className="border border-gray-6 flex gap-2.5 h-12 items-center px-3 rounded-lg w-full">
                      <Lock className="w-6 h-6 text-gray-11 shrink-0" />
                      <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value);
                          if (errors.confirmPassword) {
                            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                          }
                        }}
                        placeholder="Digite sua senha novamente"
                        className="flex-1 border-0 p-0 h-auto bg-transparent text-base font-normal text-gray-11 placeholder:text-gray-11 outline-none focus-visible:ring-0 shadow-none"
                      />
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-sm text-red-9 font-family-dm-sans">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex gap-[10px] items-center justify-end pb-8 pt-4 px-6 w-full">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 h-12 px-8 border-[1.5px] border-gray-6 text-gray-12 font-bold text-base leading-[1.1] font-manrope"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-1 h-12 px-8 bg-[#59E373] text-[#141414] hover:bg-[#59E373]/90 font-bold text-base leading-[1.1] font-manrope disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
