"use client";

import { LoginModal } from "@/components/Auth/LoginModal";
import { RegisterModal } from "@/components/Auth/RegisterModal";
import { ChangeEmailModal } from "@/components/Auth/ChangeEmailModal";
import { DeleteParticipantModal } from "@/components/Checkout/DeleteParticipantModal";
import { TopicModal } from "@/components/TopicModal";

export function ModalsProvider() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
      <ChangeEmailModal />
      <DeleteParticipantModal />
      <TopicModal />
    </>
  );
}

export { useLoginModal, useRegisterModal, useChangeEmailModal, useDeleteParticipantModal, useTopicModal } from "@/stores/modalStore";
