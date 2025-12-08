import { create } from "zustand";
import { devtools } from "zustand/middleware";

export type ModalType = "deposit" | "withdraw" | "confirm" | "login" | "register" | null;

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
}

export const useModalStore = create<ModalState>()(
  devtools(
    (set, get) => ({
      isOpen: false,
      type: null,
      data: null,
      isLoading: false,
      loadingMessage: "",

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
        });
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
    }),
    {
      name: "modal-store",
    }
  )
);

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
