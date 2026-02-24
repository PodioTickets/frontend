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
import { ViewRegistrationModal } from "@/components/Registrations/ViewRegistrationModal";
import { ExportDataModal } from "@/components/Registrations/ExportDataModal";
import { PaymentDetailsModal } from "@/components/Registrations/PaymentDetailsModal";
import { RequestTransferModal } from "@/components/Financial/RequestTransferModal";
import { AccessAllOrganizationsModal } from "@/components/Organizer/AccessAllOrganizationsModal";

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
      <ViewRegistrationModal />
      <ExportDataModal />
      <PaymentDetailsModal />
      <RequestTransferModal />
      <AccessAllOrganizationsModal />
    </>
  );
}

export { useLoginModal, useRegisterModal, useChangeEmailModal, useDeleteParticipantModal, useTopicModal, useCreateQuestionModal, useCreateProductModal, useAddExistingProductsModal, useViewVoucherModal, usePublishEventModal, useViewRegistrationModal, useExportDataModal, usePaymentDetailsModal, useRequestTransferModal } from "@/stores/modalStore";
