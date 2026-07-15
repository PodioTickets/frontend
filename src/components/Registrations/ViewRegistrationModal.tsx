"use client";

import {
  useViewRegistrationModal,
  usePaymentDetailsModal,
  useModalStore,
} from "@/stores/modalStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useMemo, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { RegistrationQRCode } from "../QRCode/RegistrationQRCode";
import { getAvatarUrl } from "@/utils/avatar";
import { organizerService } from "@/services";
import { Loading } from "../Loading";
import { DistanceIcon } from "../Icons/DistanceIcon";
import { ArrowButton } from "../ArrowButton";
import {
  isPersonBr,
  documentLabel,
  formatDocumentDisplay,
  formatPersonPhone,
} from "@/utils/documentDisplay";
import { ImageWithInitialFallback } from "../ImageWithInitialFallback";
import { Button } from "../Button";
import { formatAnswer } from "@/utils/questionAnswer";
import { isSemInteresseVariation } from "@/utils/semInteresseVariation";
import { formatShortId } from "@/utils/shortId";

/** Badge exibido quando o organizador trocou a variação do produto do
 *  participante (snapshot `variationEdited: true`). */
function VariationEditedBadge() {
  return (
    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-yellow-3 px-2 py-0.5 text-xs font-medium text-yellow-12">
      Variação alterada
    </span>
  );
}


export function ViewRegistrationModal() {
  const { isOpen, closeViewRegistrationModal, data } = useViewRegistrationModal();
  const { openPaymentDetailsModal } = usePaymentDetailsModal();
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [loadingRegistration, setLoadingRegistration] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isDownloadingTicket, setIsDownloadingTicket] = useState(false);

  const registrationId = useMemo(() => {
    return data?.registrationId || data?.registration?.id || null;
  }, [data]);

  const eventName = (data?.eventName as string) || "Evento";

  const showBackToPaymentDetails = Boolean(
    data?.returnToPaymentDetails &&
    data?.paymentDetailsModalData?.registrationId
  );

  const handleBackToPaymentDetails = useCallback(() => {
    const snapshot = useModalStore.getState().data;
    const payload = snapshot?.paymentDetailsModalData as
      | {
        registrationId?: string;
        eventId?: string;
        eventName?: string;
      }
      | undefined;
    closeViewRegistrationModal();
    if (payload?.registrationId) {
      openPaymentDetailsModal({
        registrationId: payload.registrationId,
        eventId: payload.eventId ?? (snapshot?.eventId as string | undefined),
        eventName:
          payload.eventName ??
          (snapshot?.eventName as string | undefined) ??
          "Evento",
      });
    }
  }, [closeViewRegistrationModal, openPaymentDetailsModal]);

  /* Baixa o PDF do ingresso. O backend gera o arquivo a partir do snapshot
   * imutável da inscrição (QR Code + dados do participante/produtos) e aplica o
   * mesmo controle de acesso da visualização. Disparado por ID — não depende do
   * payload já carregado, mas o gate visual garante que só aparece com dados. */
  const handleDownloadTicket = useCallback(async () => {
    if (!registrationId || isDownloadingTicket) return;
    setIsDownloadingTicket(true);
    try {
      const { blob, filename } =
        await organizerService.downloadRegistrationTicketPdf(registrationId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Erro ao baixar o ingresso. Tente novamente.");
    } finally {
      setIsDownloadingTicket(false);
    }
  }, [registrationId, isDownloadingTicket]);

  useEffect(() => {
    if (!isOpen || !registrationId) {
      setRegistrationData(null);
      return;
    }

    // Evitar buscar novamente se já temos os dados para este ID
    if (registrationData?.id === registrationId && !loadingRegistration) {
      return;
    }

    const fetchRegistration = async () => {
      try {
        setLoadingRegistration(true);
        const fullData = await organizerService.getRegistrationById(registrationId);
        setRegistrationData(fullData);
      } catch (error) {
        console.error("Erro ao buscar detalhes da registration:", error);
        setRegistrationData(null);
      } finally {
        setLoadingRegistration(false);
      }
    };

    fetchRegistration();
  }, [isOpen, registrationId]);

  // Quando aberto SOBRE um vaul Drawer (fluxo financeiro), o vaul deixa
  // `document.body { pointer-events: none }`. Este modal é portalado no ROOT (fora
  // do drawer) e reabilita pointer-events nos próprios elementos, mas no Android
  // Chrome isso não basta pro SCROLL do conteúdo — o gesto de toque não inicia a
  // rolagem enquanto o body está travado. Forçamos o body de volta a `auto`
  // enquanto o modal está aberto (o modal cobre a tela toda, então nada indevido
  // fica clicável atrás) e restauramos ao fechar.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.pointerEvents;
    document.body.style.pointerEvents = "auto";
    return () => {
      document.body.style.pointerEvents = prev;
    };
  }, [isOpen]);

  const currentRegistration = registrationData;

  const getGenderLabel = (gender?: string) => {
    if (!gender) return "";
    const labels: Record<string, string> = {
      male: "Masculino",
      female: "Feminino",
      other: "Outro",
      MALE: "Masculino",
      FEMALE: "Feminino",
      OTHER: "Outro",
    };
    return labels[gender] || labels[gender.toLowerCase()] || gender;
  };

  // Se não houver registration, não renderizar nada
  if (!currentRegistration && !loadingRegistration) {
    return null;
  }

  // Mostrar loading enquanto busca os dados
  if (loadingRegistration && !currentRegistration) {
    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              onClick={closeViewRegistrationModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-gray-1 rounded-lg shadow-2xl w-full max-w-[1095px] mx-4 relative overflow-hidden pointer-events-auto p-20">
                <div className="flex items-center justify-center">
                  <Loading />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Se não tiver dados ainda, não renderizar
  if (!currentRegistration) {
    return null;
  }

  /* Novo endpoint (`registrations-get-by-id.md`): os dados vêm do
   * `receiptSnapshot` congelado, com o participante em `participant` (string
   * única `name`, `documentNumber`/`documentType`/`country`, `birthDate`).
   * Mantemos fallback pro shape LEGADO (findOneLive — inscrições sem snapshot):
   * `user`/`buyer` (first/last/fullName), `modalities`, `kitItems`,
   * `emergencyContact`. Chaves nulas/vazias são removidas pelo backend, então
   * todo acesso é opcional. */
  const snapshotParticipant = currentRegistration?.participant ?? null;
  const user = currentRegistration?.user || currentRegistration?.buyer || null;

  const ticketName = currentRegistration?.ticket?.name || currentRegistration?.modalities?.[0]?.modality?.name || "—";
  const categoryName = currentRegistration?.ticket?.category?.name || currentRegistration?.modalities?.[0]?.modality?.category?.name || "Ingresso avulso";
  const participantName =
    snapshotParticipant?.name ||
    (user
      ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.fullName
      : "") ||
    "—";
  const participantEmail = snapshotParticipant?.email || user?.email || "—";
  const participantCPFRaw = snapshotParticipant?.documentNumber || user?.documentNumber || null;
  const participantDocumentType = snapshotParticipant?.documentType || user?.documentType || null;

  /* Nacionalidade do participante pra exibir documento/telefone i18n. Quando o
   * backend não envia `country`/`documentType`, a heurística cai pro shape do
   * doc (11 dígitos = CPF) com segurança. */
  const participantCountry = snapshotParticipant?.country ?? user?.country ?? user?.nationality ?? null;
  const participantIsBr = isPersonBr({
    country: participantCountry,
    documentType: participantDocumentType,
    document: participantCPFRaw,
  });

  // Documento exibido CRU (sem máscara/formatação) — só o label muda por país.
  // Telefone recebe a máscara via util i18n (libphonenumber por país).
  const formatPhone = (phone?: string | null) =>
    formatPersonPhone(phone, participantCountry);

  // Máscara parcial de PII para CPF exibido em resumos/cabeçalhos compactos.
  const maskCpf = (cpf: string | null | undefined): string => {
    if (!cpf) return "—";
    const digits = cpf.replace(/\D/g, "");
    if (digits.length < 11) return cpf;
    return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  };

  const participantCPF = participantIsBr ? maskCpf(participantCPFRaw) : (participantCPFRaw || "—");

  /* birthDate: o snapshot manda date-only "YYYY-MM-DD". `new Date(date-only)` é
   * interpretado como UTC meia-noite → em BRT (UTC-3) volta pro dia anterior.
   * Por isso parseamos YMD manualmente; só caímos no `new Date` pra ISO completo
   * (legado `user.dateOfBirth`). */
  const rawBirthDate = snapshotParticipant?.birthDate || user?.dateOfBirth || null;
  const participantBirthDate = (() => {
    if (!rawBirthDate) return "—";
    const ymd = String(rawBirthDate).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (ymd) return `${ymd[3]}/${ymd[2]}/${ymd[1]}`;
    try {
      const date = new Date(rawBirthDate);
      if (isNaN(date.getTime())) return "—";
      const day = date.getDate().toString().padStart(2, "0");
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      return `${day}/${month}/${date.getFullYear()}`;
    } catch {
      return "—";
    }
  })();
  const participantGender = getGenderLabel(snapshotParticipant?.gender || user?.gender);
  const participantPhone = snapshotParticipant?.phone || user?.phone || null;
  const emergencyPhone = currentRegistration.emergencyContact?.name
    ? currentRegistration.emergencyContact.name + " - " + formatPhone((currentRegistration.emergencyContact.phone ?? "").toString())
    : null;

  /* Distância: o snapshot manda `distance` ("14") + `distanceUnit` ("KM")
   * separados → juntamos. Legado pode vir embutido ("5 KM") ou em metros nas
   * `modalities`. */
  const ticketDistance = (() => {
    const ticket = currentRegistration?.ticket;
    const dist = ticket?.distance;
    if (dist != null && String(dist).trim() !== "") {
      const distanceStr = String(dist).trim();
      // Legado já vinha com a unidade embutida (ex.: "5 KM") — não duplica.
      if (/[a-zA-Z]/.test(distanceStr)) return distanceStr;
      const unit = ticket?.distanceUnit || "Km";
      return `${distanceStr} ${unit}`;
    }
    const modalityDist = currentRegistration?.modalities?.[0]?.modality?.distance;
    if (modalityDist != null) {
      return `${(parseFloat(String(modalityDist)) / 1000).toFixed(1)} Km`;
    }
    return "—";
  })();

  // Obter perguntas e produtos reais
  const questions = currentRegistration?.questionAnswers || [];

  // Produtos podem vir de:
  // 1. registration.products (nova estrutura com product e variation)
  // 2. kitItems (produtos adicionais - estrutura antiga)
  // 3. includedProducts (produtos incluídos no ticket)
  const registrationProducts = currentRegistration?.products || [];
  const kitItems = currentRegistration?.kitItems || [];
  const includedProducts = currentRegistration?.ticket?.includedProducts || [];

  // Mapear registration.products para o formato esperado. O snapshot novo traz
  // os campos NO TOPO do item (`name`, `images[]` + `primaryImageIndex`,
  // `selectedVariation`, `unitPrice`); o legado (findOneLive) aninha em
  // `item.product`/`item.variation`. Detectamos pelo shape e tratamos ambos.
  const mappedRegistrationProducts = registrationProducts.map((item: any) => {
    const isSnapshot =
      item?.name !== undefined ||
      item?.images !== undefined ||
      item?.selectedVariation !== undefined;

    if (isSnapshot) {
      const images = Array.isArray(item.images) ? item.images : [];
      const image = images[item.primaryImageIndex ?? 0] ?? images[0];
      const unitPrice = item.unitPrice ?? item.basePrice ?? 0;
      // Incluso no ingresso → mostra só "Incluído". Caso o snapshot não traga o
      // flag, cai no proxy `unitPrice === 0` (incluso é cobrado 0).
      const isIncluded = item.isIncludedInTicket ?? unitPrice === 0;
      // Preço da variação selecionada é o TOTAL absoluto cobrado (ex.: 5555 =
      // R$55,55). Sem preço específico (>0), usa o unitPrice/base.
      const variationPrice = item.selectedVariation?.price;
      const price =
        variationPrice != null && variationPrice > 0 ? variationPrice : unitPrice;
      return {
        id: item.id,
        productName: item.name || "Produto",
        productImage: image || null,
        variationType: item.variationType || null,
        variationName: item.selectedVariation?.name || null,
        price: isIncluded ? 0 : price,
        quantity: item.quantity || 1,
        isIncluded,
        // Backend sinaliza quando o organizador trocou a variação do participante.
        variationEdited: item.variationEdited === true,
      };
    }

    // Legado (findOneLive)
    return {
      id: item.id,
      productName: item.product?.name || "Produto",
      productImage: item.product?.image || null,
      variationType: item.product?.variationType || null,
      variationName: item.variation?.name || item.variationName || null,
      price: item.unitPrice || item.totalPrice || 0,
      quantity: item.quantity || 1,
      isIncluded: item.unitPrice === 0 && item.totalPrice === 0,
      variationEdited: item.variationEdited === true,
    };
  });

  // Mapear includedProducts para o formato esperado
  const mappedIncludedProducts = includedProducts.map((product: any) => {
    // selectedVariation já é o objeto { id, name, price }, não um ID
    const selectedVariation = product.selectedVariation ?? null;

    return {
      id: product.id,
      productName: product.name,
      productImage: product.image || null,
      variationType: product.variationType || null,
      variationName: selectedVariation?.name || null,
      price: product.basePrice || 0,
      isIncluded: true
    };
  });

  // Mapear kitItems para o formato esperado
  const mappedKitItems = kitItems.map((item: any) => {
    return {
      id: item.id,
      productName: item.kitItem?.name || item.name || "Produto",
      productImage: item.kitItem?.image || item.image || null,
      variationType: item.kitItem?.variationType || null,
      variationName: item.selectedSize || item.size || null,
      price: item.kitItem?.price || item.price || 0,
      isIncluded: false
    };
  });

  // Priorizar: registration.products > kitItems > includedProducts
  const rawProducts = mappedRegistrationProducts.length > 0
    ? mappedRegistrationProducts
    : kitItems.length > 0
      ? mappedKitItems
      : mappedIncludedProducts;

  // Variação "Sem interesse" = opt-out do kit: o participante recusou o produto.
  // Não deve aparecer na listagem de produtos da inscrição.
  const products = rawProducts.filter(
    (product: any) =>
      !(product.variationName && isSemInteresseVariation({ name: product.variationName })),
  );

  // Formatar telefone

  /* Botão de download do ingresso (PDF). Definido uma vez e reutilizado nos
   * rodapés mobile e desktop — mesma ação/estado de loading nos dois layouts. */
  const downloadTicketButton = (
    <Button
      type="button"
      variant={"outline"}
      onClick={handleDownloadTicket}
      disabled={isDownloadingTicket}
      className="flex w-full md:w-auto border-gray-6 text-gray-12 items-center justify-center gap-2 px-5 py-2.5 font-family-dm-sans disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
    >
      {isDownloadingTicket ? "Gerando ingresso..." : "Baixar ingresso"}
    </Button>
  );

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              // z acima do drawer (z-50, evita flash na transição) + pointerEvents:auto
              // pra vencer o `pointer-events:none` que o vaul aplica no body.
              className="fixed inset-0 z-[60] flex flex-col md:flex md:items-center md:justify-center bg-black/50"
              style={{ pointerEvents: "auto" }}
              onClick={closeViewRegistrationModal}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="fixed inset-0 z-[61] flex flex-col md:flex md:items-center md:justify-center pointer-events-none p-0 md:pointer-events-auto"
            >
              {/* Mobile: full-screen layout (Figma).
                  Altura presa ao viewport VISÍVEL (100dvh) — não a `inset-0`, que em
                  navegador mobile estica até o layout viewport (atrás da barra de URL),
                  fazendo o conteúdo "caber" e não rolar + rodapé abaixo da dobra.
                  Sem `pt-16`: o modal cobre o topo, então aquele vão só bugava o header. */}
              <div className="md:hidden flex flex-col h-[100dvh] min-h-0 w-full bg-gray-2 overflow-hidden pointer-events-auto">
                <div className="bg-gray-1 border-b border-gray-6 shrink-0">
                  <div className="flex items-center gap-1 h-[52px] px-4">
                    <button
                      type="button"
                      onClick={
                        showBackToPaymentDetails
                          ? handleBackToPaymentDetails
                          : closeViewRegistrationModal
                      }
                      className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors -rotate-180"
                      aria-label={
                        showBackToPaymentDetails
                          ? "Voltar para detalhes de pagamento"
                          : "Voltar"
                      }
                    >
                      <ArrowButton isOpen={false} />
                    </button>
                    <p className="font-manrope font-extrabold text-base leading-[1.1] text-gray-12 truncate flex-1 min-w-0">
                      {eventName}
                    </p>
                    <button
                      type="button"
                      onClick={closeViewRegistrationModal}
                      className="size-8 flex items-center justify-center shrink-0 rounded-lg hover:bg-gray-3 transition-colors"
                      aria-label="Fechar"
                    >
                      <X className="size-5 text-gray-11" />
                    </button>
                  </div>
                </div>

                <div
                  className="flex-1 overflow-y-auto min-h-0 px-4 py-4 overscroll-contain touch-pan-y"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  <h1 className="font-manrope font-bold text-xl text-gray-12 mb-5">
                    Informações da inscrição
                  </h1>

                  {/* Participant ticket block */}
                  <div className="flex flex-col gap-5 pb-6 border-b border-gray-6">
                    <p className="font-family-dm-sans font-medium text-base text-gray-12">
                      Participante 1
                    </p>
                    <div className="flex flex-col gap-4">
                      <p className="font-family-dm-sans font-normal text-base text-gray-11">
                        {categoryName}
                      </p>
                      <p className="font-manrope font-bold text-lg text-gray-12">
                        {ticketName}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <DistanceIcon className="size-6 shrink-0 text-gray-12" />
                      <p className="font-family-dm-sans font-medium text-base text-gray-12">
                        {ticketDistance}
                      </p>
                    </div>
                    <div className="relative shrink-0 size-[130px]">
                      {currentRegistration?.qrCode ? (
                        <RegistrationQRCode
                          qrCodeData={currentRegistration.qrCode}
                          size={130}
                          className="w-full h-full"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-2 border border-gray-6 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-11">QR Code</span>
                        </div>
                      )}
                    </div>
                    <div className="border border-gray-6 rounded-xl p-3">
                      <div className="flex gap-2 items-center">
                        <div className="relative shrink-0 size-10 rounded-full overflow-hidden">
                          {user?.avatarUrl ? (
                            <Image
                              src={getAvatarUrl(user.avatarUrl || "") as string}
                              alt={participantName}
                              width={40}
                              height={40}
                              className="rounded-full object-cover w-full h-full"
                            />
                          ) : (
                            <div className="size-10 rounded-full bg-primary-10/20 flex items-center justify-center">
                              <span className="text-primary-11 font-semibold text-sm">
                                {participantName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-3 min-w-0 flex-1">
                          <p className="font-family-dm-sans font-semibold text-sm text-gray-12 truncate">
                            {participantName}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 text-sm text-gray-11 font-family-dm-sans">
                            <span>{participantBirthDate}</span>
                            <span className="size-1 bg-gray-11 rounded-full shrink-0" />
                            <span>{participantGender}</span>
                            <span className="size-1 bg-gray-11 rounded-full shrink-0" />
                            <span>{participantCPF}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Personal info fields */}
                  <div className="flex flex-col gap-0 pt-8 pb-6">
                    {[
                      { label: "Nome", value: participantName },
                      { label: "Email", value: participantEmail },
                      { label: documentLabel(participantIsBr), value: formatDocumentDisplay(participantCPFRaw, participantIsBr) || "—" },
                      { label: "Data de nascimento", value: participantBirthDate },
                      { label: "Telefone", value: formatPhone(participantPhone) || "—" },
                      { label: "Telefone de emergência", value: emergencyPhone || "—" },
                      { label: "Sexo", value: participantGender || "—" },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex flex-col gap-1 py-4 first:pt-0">
                        <p className="font-family-dm-sans font-normal text-base text-gray-12">
                          {label}
                        </p>
                        <p className="font-family-dm-sans font-medium text-base text-gray-12">
                          {value}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="w-full h-px bg-gray-6" />

                  {/* Perguntas do Organizador */}
                  <div className="py-8">
                    <h2 className="font-manrope font-bold text-lg text-gray-12 mb-4">
                      Perguntas do Organizador
                    </h2>
                    {questions.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {questions.map((q: any, index: number) => (
                          <div key={q.id || index} className="flex flex-col gap-1 py-4">
                            <p className="font-family-dm-sans font-normal text-base text-gray-12">
                              {q.question?.question || q.question || `Pergunta ${index + 1}`}
                            </p>
                            <p className="font-family-dm-sans font-medium text-base text-gray-12">
                              {formatAnswer(q.answer)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="font-family-dm-sans font-normal text-base text-gray-11">
                        Nenhuma pergunta respondida
                      </p>
                    )}
                  </div>

                  <div className="w-full h-px bg-gray-6" />

                  {/* Produtos */}
                  <div className="py-8">
                    <h2 className="font-manrope font-bold text-lg text-gray-12 mb-4">
                      Produtos
                    </h2>
                    {products.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        {products.map((product: any, index: number) => (
                          <div
                            key={product.id || index}
                            className="bg-gray-1 border border-gray-6 rounded-xl p-4"
                          >
                            <div className="flex gap-3">
                              <div className="size-[100px] rounded-lg border border-gray-6 shrink-0 overflow-hidden">
                                <ImageWithInitialFallback
                                  src={product.productImage}
                                  alt={product.productName}
                                  name={product.productName}
                                  sizes="100"
                                  fill
                                  className="object-cover w-full h-full border-0"
                                />
                              </div>
                              <div className="flex-1 flex flex-col justify-between min-w-0">
                                <p className="font-family-dm-sans font-semibold text-base text-gray-12 line-clamp-2">
                                  {product.productName}
                                </p>
                                {product.variationName && (
                                  <p className="font-family-dm-sans font-normal text-sm text-gray-11">
                                    {product.variationType || "Variação"}: {product.variationName}
                                  </p>
                                )}
                                {product.variationEdited && (
                                  <div className="mt-1">
                                    <VariationEditedBadge />
                                  </div>
                                )}
                                <p className="font-manrope font-semibold text-base text-gray-12 mt-1">
                                  {product.isIncluded ? "Incluído" : `R$ ${typeof product.price === "number" ? (product.price / 100).toFixed(2).replace(".", ",") : product.price}`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="font-family-dm-sans font-normal text-base text-gray-11">
                        Nenhum produto adicionado
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer: baixar ingresso (PDF) */}
                <div className="shrink-0 border-t border-gray-6 bg-gray-1 px-4 py-3">
                  {downloadTicketButton}
                </div>
              </div>

              {/* Desktop: centered modal */}
              <div className="hidden md:flex flex-col bg-gray-1 rounded-lg shadow-2xl w-full max-w-[1095px] mx-4 relative overflow-hidden pointer-events-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-6 gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {showBackToPaymentDetails ? (
                      <button
                        type="button"
                        onClick={handleBackToPaymentDetails}
                        className="size-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                        aria-label="Voltar para detalhes de pagamento"
                      >
                        <ChevronLeft className="size-5 text-gray-11" />
                      </button>
                    ) : null}
                    <h2 className="font-family-dm-sans font-semibold text-[20px] leading-[1.3] text-gray-12 truncate min-w-0">
                      Informações da inscrição
                    </h2>
                  </div>
                  <button
                    onClick={closeViewRegistrationModal}
                    className="size-8 shrink-0 flex items-center justify-center rounded-lg hover:bg-gray-3 transition-colors cursor-pointer"
                    aria-label="Fechar"
                  >
                    <X className="size-5 text-gray-11" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex h-[642px]">
                  {/* Left Section */}
                  <div className="flex-1 flex flex-col min-w-[400px] p-5">
                    {/* Participant Header */}
                    <div className="flex flex-col pr-5 border-b border-gray-6">
                      <div className="flex items-center justify-between pb-6">
                        <div className="flex flex-col gap-5 max-w-[70%]">
                          <div className="flex flex-col gap-2">
                            <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-12 truncate">ID: <span className="text-gray-11">{formatShortId(currentRegistration.id)}</span></p>
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                              Participante
                            </p>
                          </div>
                          <div className="flex flex-col">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11 truncate">
                              {categoryName}
                            </p>
                            <p className="font-manrope font-bold text-[20px] leading-[1.1] text-gray-12 truncate">
                              {ticketName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <DistanceIcon className="size-6" />
                            <p className="font-family-dm-sans font-medium text-[18px] leading-[1.3] text-gray-12">
                              {ticketDistance}
                            </p>
                          </div>
                        </div>
                        {/* QR Code */}
                        <div className="flex items-center">
                          <div className="aspect-square w-[116px] h-[116px] relative">
                            {currentRegistration?.qrCode ? (
                              <RegistrationQRCode
                                qrCodeData={currentRegistration.qrCode}
                                size={116}
                                className="w-full h-full"
                              />
                            ) : (
                              <div className="w-full h-full bg-gray-2 border border-gray-6 flex items-center justify-center">
                                <span className="text-xs text-gray-11 text-center">
                                  QR Code
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Profile Card */}
                      <div className="flex items-center pb-5">
                        <div className="border border-gray-6 rounded-xl p-3 w-full">
                          <div className="flex gap-2 items-center">
                            <div className="relative shrink-0 size-10 rounded-full overflow-hidden">
                              {user?.avatarUrl ? (
                                <Image
                                  src={getAvatarUrl(user.avatarUrl || "") as string}
                                  alt={participantName}
                                  width={40}
                                  height={40}
                                  className="rounded-full object-cover"
                                />
                              ) : (
                                <div className="size-10 rounded-full bg-primary-10/20 flex items-center justify-center">
                                  <span className="text-primary-11 font-semibold text-sm">
                                    {participantName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-3">
                              <p className="font-family-dm-sans font-semibold text-sm leading-[1.3] text-gray-12">
                                {participantName.split(" ")[0]}
                              </p>
                              <div className="flex gap-2 items-center">
                                <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                                  {participantBirthDate}
                                </p>
                                <div className="size-1 bg-gray-11 rounded-full" />
                                <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                                  {participantGender}
                                </p>
                                <div className="size-1 bg-gray-11 rounded-full" />
                                <p className="font-family-dm-sans font-normal text-sm leading-[1.3] text-gray-11">
                                  {participantCPF}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Participant Information */}
                    <div className="flex flex-wrap gap-x-3 gap-y-2 pt-5 pr-5">
                      <p className="font-manrope font-bold text-[20px] leading-[1.1] text-gray-12 w-full mb-0">
                        Informações do participante
                      </p>
                      <div className="grid grid-cols-2 w-full">
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            Nome
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                            {participantName}
                          </p>
                        </div>
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            Email
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12 truncate">
                            {participantEmail}
                          </p>
                        </div>
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            {documentLabel(participantIsBr)}
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                            {formatDocumentDisplay(participantCPFRaw, participantIsBr) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            Data de nascimento:
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                            {participantBirthDate}
                          </p>
                        </div>
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            Telefone:
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                            {formatPhone(participantPhone) || "—"}
                          </p>
                        </div>
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            Sexo
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                            {participantGender || "—"}
                          </p>
                        </div>

                      </div>
                      {emergencyPhone && (
                        <div className="flex flex-col py-4">
                          <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                            Telefone de emergência
                          </p>
                          <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                            {emergencyPhone || "—"}
                          </p>
                        </div>
                      )}

                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-px bg-gray-6" />

                  {/* Right Section */}
                  <div className="flex-1 flex flex-col w-[537px] pr-4">
                    {/* Organizer Questions */}
                    <div className="flex flex-wrap gap-x-3 gap-y-2 py-5 pl-5 border-b border-gray-6">
                      <div className="flex items-center justify-between w-full">
                        <p className="font-manrope font-bold text-[20px] leading-[1.1] text-gray-12">
                          Perguntas do Organizador
                        </p>
                        {questions.length > 4 && (
                          <button
                            onClick={() => setIsQuestionsModalOpen(true)}
                            className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer"
                          >
                            Ver mais
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 w-full">
                        {questions.length > 0 ? (
                          questions.slice(0, 4).map((q: any, index: number) => (
                            <div key={q.id || index} className="flex flex-col py-4">
                              <p className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-12">
                                Pergunta: {q.question?.question || q.question || `Pergunta ${index + 1}`}
                              </p>
                              <p className="font-family-dm-sans font-normal text-gray-11 text-sm mb-2">{q.question?.description}</p>
                              <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                                R: {formatAnswer(q.answer)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="col-span-2 py-4">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                              Nenhuma pergunta respondida
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Products */}
                    <div className="flex flex-col gap-5 pt-5 pl-5 flex-1 overflow-y-auto">
                      <div className="flex items-center justify-between w-full">
                        <p className="font-manrope font-bold text-[20px] leading-[1.1] text-gray-12">
                          Produtos
                        </p>
                        {products.length > 2 && (
                          <button
                            onClick={() => setIsProductsModalOpen(true)}
                            className="font-family-dm-sans font-medium text-base leading-[1.3] text-gray-11 underline hover:text-gray-12 transition-colors cursor-pointer pr-4"
                          >
                            Ver mais
                          </button>
                        )}
                      </div>
                      <div className="flex flex-col gap-4 pb-4 pr-4">
                        {products.length > 0 ? (
                          products.slice(0, 2).map((product: any, index: number) => {
                            return (
                              <div
                                key={product.id || index}
                                className="border border-gray-6 rounded-xl overflow-hidden"
                              >
                                <div className="p-4">
                                  <div className="flex gap-3">
                                    <div className="size-[100px] rounded-lg border border-gray-6 shrink-0 overflow-hidden">
                                      <ImageWithInitialFallback
                                        src={product.productImage}
                                        alt={product.productName}
                                        name={product.productName}
                                        sizes="100px"
                                        fill
                                        className="object-cover w-full h-full border-0"
                                      />
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between py-2">
                                      <p className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 line-clamp-2 mb-2">
                                        {product.productName}
                                      </p>

                                      <div className="flex items-end justify-between">
                                        <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                                          {product.isIncluded ? "Incluído" : `R$ ${typeof product.price === "number" ? (product.price / 100).toFixed(2).replace(".", ",") : product.price}`}
                                        </p>
                                        {product.variationName && (
                                          <div className="flex flex-col items-end">
                                            {product.variationEdited && (
                                              <div className="mb-2">
                                                <VariationEditedBadge />
                                              </div>
                                            )}
                                            <div className="flex gap-1 items-center">
                                              <p className="font-family-dm-sans font-normal text-base leading-[1.1] text-gray-12">
                                                {product.variationType || "Variação"}:
                                              </p>
                                              <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                                                {product.variationName}
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="py-4">
                            <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                              Nenhum produto adicionado
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer: baixar ingresso (PDF) */}
                <div className="flex items-center justify-start px-5 py-3 border-t border-gray-6">
                  {downloadTicketButton}
                </div>
              </div>
            </motion.div>
          </>
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
                {questions.length > 0 ? (
                  <div className="grid grid-cols-2 gap-5">
                    {questions.map((q: any, index: number) => (
                      <div key={q.id || index} className="flex flex-col gap-2">
                        <label className="font-family-dm-sans font-normal leading-[1.3] text-gray-12">
                          Pergunta: {q.question?.question || q.question || `Pergunta ${index + 1}`}
                        </label>
                        <p className="font-family-dm-sans font-medium leading-[1.3] text-gray-12">
                          {formatAnswer(q.answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                      Nenhuma pergunta respondida
                    </p>
                  </div>
                )}
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
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
                {products.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {products.map((product: any, index: number) => {
                      return (
                        <div
                          key={product.id || index}
                          className="border border-gray-6 rounded-xl overflow-hidden"
                        >
                          <div className="p-4">
                            <div className="flex gap-3">
                              <div className="size-[100px] rounded-lg border border-gray-6 shrink-0 overflow-hidden">
                                <ImageWithInitialFallback
                                  src={product.productImage}
                                  alt={product.productName}
                                  name={product.productName}
                                  sizes="100px"
                                  fill
                                  className="object-cover w-full h-full border-0"
                                />
                              </div>
                              <div className="flex-1 flex flex-col justify-between py-2 min-w-0">
                                <p className="font-family-dm-sans font-semibold text-base leading-[1.3] text-gray-12 line-clamp-2 mb-2">
                                  {product.productName}
                                </p>
                                {product.variationEdited && (
                                  <div className="mb-2">
                                    <VariationEditedBadge />
                                  </div>
                                )}
                                <div className="flex items-center justify-between">
                                  <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                                    {product.isIncluded ? "Incluído" : `R$ ${typeof product.price === "number" ? (product.price / 100).toFixed(2).replace(".", ",") : product.price}`}
                                  </p>
                                  {product.variationName && (
                                    <div className="flex gap-1 items-center">
                                      <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-12">
                                        {product.variationType || "Variação"}:
                                      </p>
                                      <p className="font-manrope font-semibold text-base leading-[1.1] text-gray-12">
                                        {product.variationName}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="font-family-dm-sans font-normal text-base leading-[1.3] text-gray-11">
                      Nenhum produto adicionado
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {products.length > 0 && (
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-6">
                  <button
                    onClick={() => setProductsPage((prev) => Math.max(1, prev - 1))}
                    disabled={productsPage === 1}
                    className="size-8 flex items-center justify-center bg-transparent rounded-lg hover:bg-gray-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronLeft className="size-4 text-gray-11" />
                  </button>
                  {Array.from({ length: Math.ceil(products.length / 10) || 1 }, (_, i) => i + 1).map((page) => (
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
                    onClick={() => setProductsPage((prev) => Math.min(Math.ceil(products.length / 10) || 1, prev + 1))}
                    disabled={productsPage >= (Math.ceil(products.length / 10) || 1)}
                    className="size-8 flex items-center justify-center bg-transparent rounded-lg hover:bg-gray-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ChevronRight className="size-4 text-gray-11" />
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
