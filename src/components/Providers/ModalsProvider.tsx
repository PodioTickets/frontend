"use client";

import { LoginModal } from "@/components/Auth/LoginModal";
import { RegisterModal } from "@/components/Auth/RegisterModal";
import { ChangeEmailModal } from "@/components/Auth/ChangeEmailModal";

export function ModalsProvider() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
      <ChangeEmailModal />
    </>
  );
}

export { useLoginModal, useRegisterModal, useChangeEmailModal } from "@/stores/modalStore";
