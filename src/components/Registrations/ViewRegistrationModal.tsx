"use client";

import { useViewRegistrationModal } from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useState, useMemo } from "react";
import { mockRegistrations } from "@/constants";
import { LocationIcon } from "../Icons/LocationIcon";

// Mock data para o modal
const mockParticipantData = {
  name: "Calebe Cunha",
  email: "calebecunha@email.com",
  cpf: "456.789.123-00",
  birthDate: "15/08/1992",
  phone: "(11) 9 8765-4321",
  gender: "Masculino",
  emergencyPhone: "(11) 9 1234-5678",
};

const mockQuestions = [
  { id: "1", question: "Pergunta 1", answer: "Resposta" },
  { id: "2", question: "Pergunta 2", answer: "Resposta" },
  { id: "3", question: "Pergunta 3", answer: "Resposta" },
  { id: "4", question: "Pergunta 4", answer: "Resposta" },
  { id: "5", question: "Pergunta 5", answer: "Resposta" },
  { id: "6", question: "Pergunta 6", answer: "Resposta" },
  { id: "7", question: "Pergunta 7", answer: "Resposta" },
  { id: "8", question: "Pergunta 8", answer: "Resposta" },
  { id: "9", question: "Pergunta 9", answer: "Resposta" },
  { id: "10", question: "Pergunta 10", answer: "Resposta" },
  { id: "11", question: "Pergunta 11", answer: "Resposta" },
  { id: "12", question: "Pergunta 12", answer: "Resposta" },
  { id: "13", question: "Pergunta 13", answer: "Resposta" },
];

const mockProducts = [
  {
    id: "1",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "2",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "3",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "4",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "5",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "6",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "7",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
  {
    id: "8",
    name: "ITEM EXTRA - Camiseta Regata - Compra Opcional",
    price: "R$ 29,90",
    size: "Tamanho: XL",
    image: "/banners/card_placeholder.png",
  },
];

export function ViewRegistrationModal() {
  const { isOpen, closeViewRegistrationModal, data } = useViewRegistrationModal();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [productsPage, setProductsPage] = useState(1);

  // Usar dados mock ou dados passados
  const registration = useMemo(() => {
    if (data?.registration) {
      return data.registration;
    }
    // Se não houver dados, usar o primeiro mock
    return mockRegistrations[0];
  }, [data]);

  const allRegistrations = useMemo(() => {
    // Se houver uma lista de registrations, usar ela, senão usar mocks
    if (data?.registrations && Array.isArray(data.registrations)) {
      return data.registrations;
    }
    return mockRegistrations;
  }, [data]);

  const currentRegistration = allRegistrations[currentIndex] || registration;

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < allRegistrations.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      return `${date.getDate().toString().padStart(2, "0")} ${months[date.getMonth()]}, ${date.getFullYear()}`;
    } catch {
      return "";
    }
  };

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
    };
    return labels[gender.toLowerCase()] || gender;
  };

  const ticketName = currentRegistration?.modalities?.[0]?.modality?.name || "Kit inscrição - 3K Caminhada";
  const categoryName = "Nome da categoria";
  const participantName = currentRegistration?.user
    ? `${currentRegistration.user.firstName} ${currentRegistration.user.lastName}`
    : mockParticipantData.name;
  const participantEmail = currentRegistration?.user?.email || mockParticipantData.email;
  const participantCPF = currentRegistration?.user?.documentNumber || mockParticipantData.cpf;
  const participantBirthDate = mockParticipantData.birthDate;
  const participantGender = getGenderLabel(mockParticipantData.gender);
  const participantPhone = mockParticipantData.phone;
  const emergencyPhone = mockParticipantData.emergencyPhone;

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="view-registration-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-99999 flex items-center justify-center bg-black/50"
            onClick={closeViewRegistrationModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-lg shadow-2xl w-full max-w-[1095px] mx-4 relative overflow-hidden"
            >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-6">
              <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12">
                Informações do participante
              </h2>
              <button
                onClick={closeViewRegistrationModal}
                className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
              >
                <X className="size-5 text-gray-11" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 max-h-[582px] overflow-y-auto">
              <div className="flex gap-5">
                {/* Left Section */}
                <div className="flex-1 flex flex-col gap-5">
                  {/* Participant Info Card */}
                  <div className="flex flex-col gap-5">
                    <div className="flex gap-5">
                      <div className="flex-1 flex flex-col gap-5">
                        <div>
                          <div className="mb-2">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11 mb-1">
                              {categoryName}
                            </p>
                            <p className="font-manrope font-bold text-[20px] leading-[1.3] text-gray-12">
                              {ticketName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <LocationIcon className="size-5" />
                            <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11">
                              0.3 Km
                            </p>
                          </div>
                        </div>
                        {/* Profile Card */}
                        <div className="border border-gray-6 rounded-xl p-3">
                          <div className="flex gap-2 items-center">
                            <div className="size-10 rounded-full bg-gray-5 flex items-center justify-center shrink-0 overflow-hidden">
                              <span className="text-sm font-bold text-gray-12">
                                {participantName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex flex-col gap-3">
                              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">
                                {participantName}
                              </p>
                              <div className="flex gap-2 items-center">
                                <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11">
                                  {participantBirthDate}
                                </p>
                                <div className="size-1 bg-gray-11 rounded-full" />
                                <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11">
                                  {participantGender}
                                </p>
                                <div className="size-1 bg-gray-11 rounded-full" />
                                <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11">
                                  {participantCPF}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* QR Code */}
                      <div className="size-[116px] rounded-lg bg-gray-3 flex items-center justify-center shrink-0">
                        <div className="text-xs text-gray-11 text-center">
                          QR Code
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Divider */}
                <div className="w-px bg-gray-6" />

                {/* Right Section */}
                <div className="flex-1 flex flex-col gap-5">
                  {/* Organizer Questions */}
                  <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between">
                      <p className="font-family-dm-sans font-bold text-[20px] leading-[1.3] text-gray-12">
                        Perguntas do Organizador
                      </p>
                      <button
                        onClick={() => setIsQuestionsModalOpen(true)}
                        className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer"
                      >
                        Ver mais
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      {mockQuestions.slice(0, 6).map((q) => (
                        <div key={q.id} className="flex flex-col gap-2">
                          <label className="font-family-dm-sans font-normal leading-[1.3] text-gray-12">
                            {q.question}
                          </label>
                          <label className="font-family-dm-sans font-medium leading-[1.3] text-gray-12">
                            {q.answer}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Products */}
                  <div className="flex flex-col gap-5 border-t border-gray-6 pt-3">
                    <div className="flex items-center justify-between">
                      <p className="font-family-dm-sans font-bold text-[20px] leading-[1.3] text-gray-12">
                        Produtos
                      </p>
                      <button
                        onClick={() => setIsProductsModalOpen(true)}
                        className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer"
                      >
                        Ver mais
                      </button>
                    </div>
                    <div className="flex flex-col gap-4">
                      {mockProducts.slice(0, 2).map((product) => (
                        <div
                          key={product.id}
                          className="border border-gray-6 rounded-xl p-4"
                        >
                          <div className="flex gap-4">
                            <div className="size-[100px] rounded-lg bg-gray-3 flex items-center justify-center shrink-0 overflow-hidden">
                              <Image
                                src={product.image}
                                alt={product.name}
                                width={100}
                                height={100}
                                className="object-cover"
                              />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <p className="font-family-dm-sans font-semibold leading-[1.3] text-gray-12 line-clamp-2">
                                {product.name}
                              </p>
                              <div className="flex items-center justify-between mt-auto">
                                <p className="font-family-dm-sans font-semibold text-xs leading-[1.3] text-gray-12">
                                  {product.price}
                                </p>
                                <p className="font-family-dm-sans font-semibold text-xs leading-[1.3] text-gray-12">
                                  {product.size}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
        )}
      </AnimatePresence>

      {/* Questions Modal */}
      <AnimatePresence>
        {isQuestionsModalOpen && (
          <motion.div
            key="questions-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
            onClick={() => setIsQuestionsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-lg shadow-2xl w-full max-w-[539px] mx-4 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-6">
                <h2 className="font-family-dm-sans font-bold text-[20px] leading-[1.3] text-gray-12">
                  Perguntas do organizador
                </h2>
                <button
                  onClick={() => setIsQuestionsModalOpen(false)}
                  className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-11" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 max-h-[515px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-5">
                  {mockQuestions.map((q) => (
                    <div key={q.id} className="flex flex-col gap-2">
                      <label className="font-family-dm-sans font-normal leading-[1.3] text-gray-12">
                        {q.question}
                      </label>
                      <p className="font-family-dm-sans font-medium leading-[1.3] text-gray-12">
                        {q.answer}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Modal */}
      <AnimatePresence>
        {isProductsModalOpen && (
          <motion.div
            key="products-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/50"
            onClick={() => setIsProductsModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="bg-gray-1 rounded-lg shadow-2xl w-full max-w-[815px] mx-4 relative overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-6">
                <h2 className="font-family-dm-sans font-bold text-[20px] leading-[1.3] text-gray-12">
                  Produtos
                </h2>
                <button
                  onClick={() => setIsProductsModalOpen(false)}
                  className="size-9 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                >
                  <X className="size-5 text-gray-11" />
                </button>
              </div>

              {/* Content */}
              <div className="p-5 max-h-[540px] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  {mockProducts.map((product) => (
                    <div
                      key={product.id}
                      className="border border-gray-6 rounded-xl overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex gap-4">
                          <div className="size-[100px] rounded-lg bg-gray-3 flex items-center justify-center shrink-0 overflow-hidden">
                            <Image
                              src={product.image}
                              alt={product.name}
                              width={100}
                              height={100}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 line-clamp-2 mb-2">
                              {product.name}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-12">
                                {product.price}
                              </p>
                              <p className="font-family-dm-sans font-normal text-xs leading-[1.3] text-gray-12">
                                {product.size}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-6">
                <button
                  onClick={() => setProductsPage((prev) => Math.max(1, prev - 1))}
                  disabled={productsPage === 1}
                  className="size-8 flex items-center justify-center bg-transparent rounded-lg hover:bg-gray-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="size-4 text-gray-11" />
                </button>
                {Array.from({ length: 8 }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setProductsPage(page)}
                    className={`size-8 flex items-center justify-center border rounded-lg transition-colors ${productsPage === page
                      ? "bg-primary-11 border-primary-11 text-[#FBFEFB]"
                      : "bg-gray-4 border-transparent hover:bg-gray-3 text-gray-12"
                      }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setProductsPage((prev) => Math.min(8, prev + 1))}
                  disabled={productsPage === 8}
                  className="size-8 flex items-center justify-center bg-transparent rounded-lg hover:bg-gray-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="size-4 text-gray-11" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
