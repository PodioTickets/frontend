"use client";

import dynamic from "next/dynamic";

// Cada modal vira um chunk separado: o JS só baixa quando o usuário abre
// (ou quando o React monta o componente pela primeira vez). ssr:false
// evita hydration mismatch e garante o code-split. loading:null para não
// piscar nada antes do modal animar.
// Os modais são auto-controlados via stores zustand, então não recebem props —
// dyn é tipado como ComponentType<{}> propositalmente.
const dyn = (loader: () => Promise<{ default: React.ComponentType<any> }>) =>
  dynamic(loader, { ssr: false, loading: () => null });

const LoginModal = dyn(() =>
  import("@/components/Auth/LoginModal").then((m) => ({ default: m.LoginModal })),
);
const RegisterModal = dyn(() =>
  import("@/components/Auth/RegisterModal").then((m) => ({ default: m.RegisterModal })),
);
const ChangeEmailModal = dyn(() =>
  import("@/components/Auth/ChangeEmailModal").then((m) => ({ default: m.ChangeEmailModal })),
);
const ChangePasswordModal = dyn(() =>
  import("@/components/Auth/ChangePasswordModal").then((m) => ({ default: m.ChangePasswordModal })),
);
const DeleteParticipantModal = dyn(() =>
  import("@/components/Checkout/DeleteParticipantModal").then((m) => ({
    default: m.DeleteParticipantModal,
  })),
);
const TopicModal = dyn(() =>
  import("@/components/TopicModal").then((m) => ({ default: m.TopicModal })),
);
const CreateQuestionModal = dyn(() =>
  import("@/components/Questionnaire/CreateQuestionModal").then((m) => ({
    default: m.CreateQuestionModal,
  })),
);
const DeleteQuestionModal = dyn(() =>
  import("@/components/Questionnaire/DeleteQuestionModal").then((m) => ({
    default: m.DeleteQuestionModal,
  })),
);
const CreateProductModal = dyn(() =>
  import("@/components/Product/CreateProductModal").then((m) => ({
    default: m.CreateProductModal,
  })),
);
const AddExistingProductsModal = dyn(() =>
  import("@/components/Product/AddExistingProductsModal").then((m) => ({
    default: m.AddExistingProductsModal,
  })),
);
const CreateCouponModal = dyn(() =>
  import("@/components/Coupon/CreateCouponModal").then((m) => ({
    default: m.CreateCouponModal,
  })),
);
const DeleteCouponModal = dyn(() =>
  import("@/components/Coupon/DeleteCouponModal").then((m) => ({
    default: m.DeleteCouponModal,
  })),
);
const CreateVoucherModal = dyn(() =>
  import("@/components/Voucher/CreateVoucherModal").then((m) => ({
    default: m.CreateVoucherModal,
  })),
);
const DeleteVoucherModal = dyn(() =>
  import("@/components/Voucher/DeleteVoucherModal").then((m) => ({
    default: m.DeleteVoucherModal,
  })),
);
const ViewVoucherModal = dyn(() =>
  import("@/components/Voucher/ViewVoucherModal").then((m) => ({
    default: m.ViewVoucherModal,
  })),
);
const PublishEventModal = dyn(() =>
  import("@/components/Event/PublishEventModal").then((m) => ({
    default: m.PublishEventModal,
  })),
);
const ViewRegistrationModal = dyn(() =>
  import("@/components/Registrations/ViewRegistrationModal").then((m) => ({
    default: m.ViewRegistrationModal,
  })),
);
const ExportDataModal = dyn(() =>
  import("@/components/Registrations/ExportDataModal").then((m) => ({
    default: m.ExportDataModal,
  })),
);
const PaymentDetailsModal = dyn(() =>
  import("@/components/Registrations/PaymentDetailsModal").then((m) => ({
    default: m.PaymentDetailsModal,
  })),
);
const RequestTransferModal = dyn(() =>
  import("@/components/Financial/RequestTransferModal").then((m) => ({
    default: m.RequestTransferModal,
  })),
);
const AccessAllOrganizationsModal = dyn(() =>
  import("@/components/Organizer/AccessAllOrganizationsModal").then((m) => ({
    default: m.AccessAllOrganizationsModal,
  })),
);

export function ModalsProvider() {
  return (
    <>
      <LoginModal />
      <RegisterModal />
      <ChangeEmailModal />
      <ChangePasswordModal />
      <DeleteParticipantModal />
      <TopicModal />
      <CreateQuestionModal />
      <DeleteQuestionModal />
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

// Re-exporta os hooks dos stores zustand (não carregam os modais).
export {
  useLoginModal,
  useRegisterModal,
  useChangeEmailModal,
  useChangePasswordModal,
  useDeleteParticipantModal,
  useTopicModal,
  useCreateQuestionModal,
  useDeleteQuestionModal,
  useCreateProductModal,
  useAddExistingProductsModal,
  useViewVoucherModal,
  usePublishEventModal,
  useViewRegistrationModal,
  useExportDataModal,
  usePaymentDetailsModal,
  useRequestTransferModal,
} from "@/stores/modalStore";
