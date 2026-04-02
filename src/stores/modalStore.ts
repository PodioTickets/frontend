import { useCallback } from "react";
import { create } from "zustand";

export type ModalType = "deposit" | "withdraw" | "confirm" | "login" | "register" | "changeEmail" | "changePassword" | "deleteParticipant" | "topic" | "createQuestion" | "deleteQuestion" | "createProduct" | "addExistingProducts" | "createCoupon" | "deleteCoupon" | "createVoucher" | "deleteVoucher" | "viewVoucher" | "publishEvent" | "viewRegistration" | "exportData" | "paymentDetails" | "requestTransfer" | "accessAllOrganizations" | null;

interface ModalData {
  amount?: number;
  currency?: string;
  address?: string;
  message?: string;
  [key: string]: any;
}

interface ModalState {
  isOpen: boolean;
  type: ModalType;
  data: ModalData | null;
  isLoading: boolean;
  loadingMessage: string;
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
  setLoading: (loading: boolean, message?: string) => void;
  updateModalData: (data: Partial<ModalData>) => void;
  onModalSave?: (data: any) => void;
  setOnModalSave: (callback?: (data: any) => void) => void;
  onModalDelete?: () => void | Promise<void>;
  setOnModalDelete: (callback?: () => void | Promise<void>) => void;
  callbacks: Record<string, ((data: any) => void | Promise<void>) | undefined>;
  setCallback: (modalType: string, callback?: (data: any) => void | Promise<void>) => void;
  getCallback: (modalType: string) => ((data: any) => void | Promise<void>) | undefined;
}

export const useModalStore = create<ModalState>()((set, get) => ({
  isOpen: false,
  type: null,
  data: null,
  isLoading: false,
  loadingMessage: "",
  callbacks: {},

  openModal: (type, data) => {
    set({
      isOpen: true,
      type,
      data: data || null,
      isLoading: false,
      loadingMessage: "",
    });
  },

  closeModal: () => {
    set({
      isOpen: false,
      type: null,
      data: null,
      isLoading: false,
      loadingMessage: "",
      // Não resetar onModalSave aqui - ele deve ser mantido para permitir callbacks
      // onModalSave: undefined,
    });
  },

  setOnModalSave: (callback) => {
    set({
      onModalSave: callback,
    });
  },

  setOnModalDelete: (callback) => {
    set({
      onModalDelete: callback,
    });
  },

  setCallback: (modalType, callback) => {
    const callbacks = get().callbacks;
    set({
      callbacks: {
        ...callbacks,
        [modalType]: callback,
      },
    });
  },

  getCallback: (modalType) => {
    return get().callbacks[modalType];
  },

  setLoading: (loading, message = "") => {
    set({
      isLoading: loading,
      loadingMessage: message,
    });
  },

  updateModalData: (newData) => {
    const currentData = get().data;
    set({
      data: { ...currentData, ...newData },
    });
  },
}));

export const useLoginModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "login",
    data: data as ModalData | null,
    openLoginModal: (data?: ModalData) => openModal("login", data),
    closeLoginModal: closeModal,
  };
};

export const useRegisterModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "register",
    data: data as ModalData | null,
    openRegisterModal: (data?: ModalData) => openModal("register", data),
    closeRegisterModal: closeModal,
  };
};

export const useChangeEmailModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "changeEmail",
    data: data as ModalData | null,
    openChangeEmailModal: (data?: ModalData) => openModal("changeEmail", data),
    closeChangeEmailModal: closeModal,
  };
};

export const useChangePasswordModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "changePassword",
    data: data as ModalData | null,
    openChangePasswordModal: (data?: ModalData) => openModal("changePassword", data),
    closeChangePasswordModal: closeModal,
  };
};

export const useDeleteParticipantModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "deleteParticipant",
    data: data as ModalData | null,
    openDeleteParticipantModal: (data?: ModalData) => openModal("deleteParticipant", data),
    closeDeleteParticipantModal: closeModal,
  };
};

export const useTopicModal = () => {
  const {
    openModal,
    closeModal,
    isOpen,
    type,
    data,
    onModalSave,
    setOnModalSave,
    onModalDelete,
    setOnModalDelete,
  } = useModalStore();

  return {
    isOpen: isOpen && type === "topic",
    data: data as ModalData | null,
    openTopicModal: (data?: ModalData) => openModal("topic", data),
    closeTopicModal: closeModal,
    onModalSave,
    setOnModalSave,
    onModalDelete,
    setOnModalDelete,
  };
};

export const useCreateQuestionModal = () => {
  const { openModal, closeModal, isOpen, type, data, onModalSave, setOnModalSave } = useModalStore();

  return {
    isOpen: isOpen && type === "createQuestion",
    data: data as ModalData | null,
    openCreateQuestionModal: (data?: ModalData) => openModal("createQuestion", data),
    closeCreateQuestionModal: closeModal,
    onModalSave,
    setOnModalSave,
  };
};

export const useDeleteQuestionModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "deleteQuestion",
    data: data as ModalData | null,
    openDeleteQuestionModal: (data?: ModalData) => openModal("deleteQuestion", data),
    closeDeleteQuestionModal: closeModal,
  };
};

export const useCreateProductModal = () => {
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);
  const isOpen = useModalStore((s) => s.isOpen && s.type === "createProduct");
  const data = useModalStore((s) =>
    s.type === "createProduct" ? s.data : null
  ) as ModalData | null;
  const setCallback = useModalStore((s) => s.setCallback);
  const onModalSave = useModalStore((s) => s.callbacks["createProduct"]);
  const onModalProductDelete = useModalStore(
    (s) => s.callbacks["createProductDelete"],
  );

  const setOnModalSave = useCallback(
    (callback?: (data: any) => void | Promise<void>) =>
      setCallback("createProduct", callback),
    [setCallback]
  );

  const setOnModalProductDelete = useCallback(
    (callback?: (data: any) => void | Promise<void>) =>
      setCallback("createProductDelete", callback),
    [setCallback]
  );

  const openCreateProductModal = useCallback(
    (modalData?: ModalData) => openModal("createProduct", modalData),
    [openModal]
  );

  return {
    isOpen,
    data,
    openCreateProductModal,
    closeCreateProductModal: closeModal,
    onModalSave,
    setOnModalSave,
    onModalProductDelete,
    setOnModalProductDelete,
  };
};

export const useAddExistingProductsModal = () => {
  const openModal = useModalStore((s) => s.openModal);
  const closeModal = useModalStore((s) => s.closeModal);
  const isOpen = useModalStore((s) => s.isOpen && s.type === "addExistingProducts");
  const data = useModalStore((s) =>
    s.type === "addExistingProducts" ? s.data : null
  ) as ModalData | null;
  const setCallback = useModalStore((s) => s.setCallback);
  const onModalSave = useModalStore((s) => s.callbacks["addExistingProducts"]);

  const setOnModalSave = useCallback(
    (callback?: (data: any) => void | Promise<void>) =>
      setCallback("addExistingProducts", callback),
    [setCallback]
  );

  const openAddExistingProductsModal = useCallback(
    (modalData?: ModalData) => openModal("addExistingProducts", modalData),
    [openModal]
  );

  return {
    isOpen,
    data,
    openAddExistingProductsModal,
    closeAddExistingProductsModal: closeModal,
    onModalSave,
    setOnModalSave,
  };
};

export const useCreateCouponModal = () => {
  const { openModal, closeModal, isOpen, type, data, onModalSave, setOnModalSave } = useModalStore();

  return {
    isOpen: isOpen && type === "createCoupon",
    data: data as ModalData | null,
    openCreateCouponModal: (data?: ModalData) => openModal("createCoupon", data),
    closeCreateCouponModal: closeModal,
    onModalSave,
    setOnModalSave,
  };
};

export const useDeleteCouponModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "deleteCoupon",
    data: data as ModalData | null,
    openDeleteCouponModal: (data?: ModalData) => openModal("deleteCoupon", data),
    closeDeleteCouponModal: closeModal,
  };
};

export const useCreateVoucherModal = () => {
  const { openModal, closeModal, isOpen, type, data, onModalSave, setOnModalSave } = useModalStore();

  return {
    isOpen: isOpen && type === "createVoucher",
    data: data as ModalData | null,
    openCreateVoucherModal: (data?: ModalData) => openModal("createVoucher", data),
    closeCreateVoucherModal: closeModal,
    onModalSave,
    setOnModalSave,
  };
};

export const useDeleteVoucherModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "deleteVoucher",
    data: data as ModalData | null,
    openDeleteVoucherModal: (data?: ModalData) => openModal("deleteVoucher", data),
    closeDeleteVoucherModal: closeModal,
  };
};

export const useViewVoucherModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "viewVoucher",
    data: data as ModalData | null,
    openViewVoucherModal: (data?: ModalData) => openModal("viewVoucher", data),
    closeViewVoucherModal: closeModal,
  };
};

export const usePublishEventModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "publishEvent",
    data: data as ModalData | null,
    openPublishEventModal: (data?: ModalData) => openModal("publishEvent", data),
    closePublishEventModal: closeModal,
  };
};

export const useViewRegistrationModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "viewRegistration",
    data: data as ModalData | null,
    openViewRegistrationModal: (data?: ModalData) => openModal("viewRegistration", data),
    closeViewRegistrationModal: closeModal,
  };
};

export const usePaymentDetailsModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "paymentDetails",
    data: data as ModalData | null,
    openPaymentDetailsModal: (data?: ModalData) => openModal("paymentDetails", data),
    closePaymentDetailsModal: closeModal,
  };
};

export const useExportDataModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "exportData",
    data: data as ModalData | null,
    openExportDataModal: (data?: ModalData) => openModal("exportData", data),
    closeExportDataModal: closeModal,
  };
};

export const useRequestTransferModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "requestTransfer",
    data: data as ModalData | null,
    openRequestTransferModal: (data?: ModalData) => openModal("requestTransfer", data),
    closeRequestTransferModal: closeModal,
  };
};

export const useAccessAllOrganizationsModal = () => {
  const { openModal, closeModal, isOpen, type, data } = useModalStore();

  return {
    isOpen: isOpen && type === "accessAllOrganizations",
    data: data as ModalData | null,
    openAccessAllOrganizationsModal: (data?: ModalData) => openModal("accessAllOrganizations", data),
    closeAccessAllOrganizationsModal: closeModal,
  };
};
