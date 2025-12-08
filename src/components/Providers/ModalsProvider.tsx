"use client";

import { LoginModal } from "@/components/Auth/LoginModal";
import { RegisterModal } from "@/components/Auth/RegisterModal";

export function ModalsProvider() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
    </>
  );
}

export { useLoginModal, useRegisterModal } from "@/stores/modalStore";
