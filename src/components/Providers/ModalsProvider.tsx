"use client";

import { LoginModal } from "@/components/Auth/LoginModal";
import { RegisterModal } from "@/components/Auth/RegisterModal";
import { ChangeEmailModal } from "@/components/Auth/ChangeEmailModal";
import { DeleteParticipantModal } from "@/components/Checkout/DeleteParticipantModal";
import { TopicModal } from "@/components/TopicModal";
import { CreateQuestionModal } from "@/components/Questionnaire/CreateQuestionModal";
import { CreateProductModal } from "@/components/Product/CreateProductModal";
import { AddExistingProductsModal } from "@/components/Product/AddExistingProductsModal";
import { CreateCouponModal } from "@/components/Coupon/CreateCouponModal";
import { DeleteCouponModal } from "@/components/Coupon/DeleteCouponModal";
import { CreateVoucherModal } from "@/components/Voucher/CreateVoucherModal";
import { DeleteVoucherModal } from "@/components/Voucher/DeleteVoucherModal";
import { ViewVoucherModal } from "@/components/Voucher/ViewVoucherModal";
import { PublishEventModal } from "@/components/Event/PublishEventModal";

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
      <CreateCouponModal />
      <DeleteCouponModal />
      <CreateVoucherModal />
      <DeleteVoucherModal />
      <ViewVoucherModal />
      <PublishEventModal />
    </>
  );
}

export { useLoginModal, useRegisterModal, useChangeEmailModal, useDeleteParticipantModal, useTopicModal, useCreateQuestionModal, useCreateProductModal, useAddExistingProductsModal, useViewVoucherModal, usePublishEventModal } from "@/stores/modalStore";
