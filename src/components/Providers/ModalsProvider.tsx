"use client";

import { LoginModal } from "@/components/Auth/LoginModal";
import { RegisterModal } from "@/components/Auth/RegisterModal";
import { ChangeEmailModal } from "@/components/Auth/ChangeEmailModal";
import { DeleteParticipantModal } from "@/components/Checkout/DeleteParticipantModal";

export function ModalsProvider() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
      <ChangeEmailModal />
      <DeleteParticipantModal />
    </>
  );
}

export { useLoginModal, useRegisterModal, useChangeEmailModal, useDeleteParticipantModal } from "@/stores/modalStore";
