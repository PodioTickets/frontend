"use client";

import { LoginModal } from "@/components/Auth/LoginModal";
import { RegisterModal } from "@/components/Auth/RegisterModal";
import { ChangeEmailModal } from "@/components/Auth/ChangeEmailModal";
import { DeleteParticipantModal } from "@/components/Checkout/DeleteParticipantModal";
import { TopicModal } from "@/components/TopicModal";
import { CreateQuestionModal } from "@/components/Questionnaire/CreateQuestionModal";
import { CreateProductModal } from "@/components/Product/CreateProductModal";
import { AddExistingProductsModal } from "@/components/Product/AddExistingProductsModal";

export function ModalsProvider() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
      <ChangeEmailModal />
      <DeleteParticipantModal />
      <TopicModal />
      <CreateQuestionModal />
      <CreateProductModal />
      <AddExistingProductsModal />
    </>
  );
}

export { useLoginModal, useRegisterModal, useChangeEmailModal, useDeleteParticipantModal, useTopicModal, useCreateQuestionModal, useCreateProductModal, useAddExistingProductsModal } from "@/stores/modalStore";
