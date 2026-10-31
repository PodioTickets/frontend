import type pt from "../pt-BR/checkout";

export default {
  // Counter
  counterDecrease: "Disminuir cantidad",
  counterIncrease: "Aumentar cantidad",

  // CheckoutTimer
  timerAriaLabel: "Tiempo restante de la reserva",
  timerCompactLabel: "Tiempo:",
  timerLabel: "Tiempo restante:",

  // PaymentSuccessStep
  successTitle: "Pago aprobado",
  successSubtitle: "¡Tu inscripción está confirmada! Te enviamos el comprobante a tu correo electrónico.",
  successViewTickets: "Ver mis entradas",

  // CheckoutCardErrorModal
  cardErrorTitle: "Pago no aprobado",
  cardErrorDescription: "El emisor de tu tarjeta no autorizó la transacción. Revisa los datos ingresados o prueba otro método de pago",
  cardErrorRetry: "Intentar de nuevo",

  // CheckoutExpiredModal
  expiredTitle: "¡Se acabó el tiempo!",
  expiredDescription: "El tiempo para completar tu inscripción expiró y los artículos fueron liberados. Puedes iniciar una nueva inscripción, sujeta a la disponibilidad de cupos",
  expiredBackToEvent: "Volver al evento",

  // autoCouponBadges
  couponQtyFullMin: "¡Compra {min} o más entradas y obtén {d} de descuento!",
  couponQtyFullExact: "¡Compra {min} entradas y obtén {d} de descuento!",
  couponQtyFullRange: "¡Compra de {min} a {max} entradas y obtén {d} de descuento!",
  couponAgeFullRange: "{d} de descuento para edades de {min} a {max} años.",
  couponAgeFullMax: "{d} de descuento hasta los {max} años.",
  couponAgeFullMin: "{d} de descuento a partir de los {min} años.",
  couponQtyShort: "Cupón por cantidad {d}",
  couponQtyTiny: "Cantidad {d}",
  couponAgeShort: "Cupón por edad {d}",
  couponAgeTiny: "Edad {d}",
  couponQtyGroupShort: "Cupón por cantidad",
  couponQtyGroupTiny: "Cantidad",
  couponAgeGroupShort: "Cupón por edad",
  couponAgeGroupTiny: "Edad",

  // Navegación / pasos
  back: "Volver",
  stepTickets: "Entradas",
  stepInformation: "Información",
  stepProducts: "Productos",
  stepPayment: "Pago",

  // PaymentMethodParts (dirección de facturación)
  billingAddressTitle: "Dirección",
  billingAddressEdit: "Cambiar dirección",
  billingPostalCode: "Código postal {cep} · {country}",
  billingCep: "CEP {cep}",

  // PaymentCardForms
  cardNameLabel: "Nombre impreso en la tarjeta",
  cardNamePlaceholder: "Ej.: Juan Pérez",
  cardNumberLabel: "Número de la tarjeta",
  cardNumberPlaceholder: "Ej.: 5400 7975 6026 4737",
  cardExpiryLabel: "Fecha de vencimiento",
  cardExpiryPlaceholder: "MM/AA",
  cardCvv4Digits: "4 dígitos",
  cardCvv3Digits: "3 dígitos",
  installmentsLabel: "Cuotas",
  installmentsPlaceholder: "¿En cuántas cuotas quieres pagar?",

  // PixModal / PixForm
  pixPaymentConfirmed: "¡Pago confirmado!",
  pixCodeCopied: "¡Código Pix copiado!",
  pixGeneratedTitle: "Pix generado con éxito",
  pixKeepPageOpen: "Mantén esta página abierta. En cuanto el banco confirme el pago, actualizaremos automáticamente el estado de tu pedido",
  pixTimeToPay: "Tiempo para completar el pago",
  pixQrCodeAlt: "Código QR Pix",
  pixCopy: "Copiar código Pix",
  pixCashValue: "Valor al contado:",
  pixClearingTime: "Puede tardar hasta 30 minutos en acreditarse",
  pixGenerateQrCode: "Generar código QR",

  // OrderSummary
  genderMale: "Masculino",
  genderFemale: "Femenino",
  genderOther: "Otro",
  participantsLabel: "Participantes:",
  singleTicket: "Entrada individual",
  singleTicketTitle: "Entrada Individual",
  additionalItems: "Artículos adicionales",
  additionalItem: "Artículo adicional",
  subtotalLabel: "Subtotal:",
  couponAutomatic: "Cupón automático",
  couponNamed: "Cupón {name}",
  couponApplied: "Cupón aplicado",
  voucherApplied: "Voucher aplicado",
  serviceFeeLabel: "Cargo por servicio:",
  seeDetails: "Ver detalles",
  totalLabel: "Total:",
  couponCodePlaceholder: "Código de cupón",
  couponApply: "Aplicar",
  purchaseSummaryTitle: "Resumen de tu compra",
  ticketPriceLabel: "Precio de la entrada:",
  additionalProducts: "Productos adicionales",
  additionalProduct: "Producto adicional",
  participantN: "Participante {n}",
  couponCodeBadge: "Cupón: {code}",
  voucherCourtesy: "100% cortesía",

  // MobileSummaryBar
  onContinue: "al continuar",
  serviceFee: "Cargo por servicio",
  hideDetails: "Ocultar detalles",
  participants: "Participantes",
  participant: "Participante",
  total: "Total",
  subtotal: "Subtotal",
  orderDetails: "Detalles del pedido",
  close: "Cerrar",
  ticketsInOrder: "Entradas del pedido",

  // lib/orderCouponDiscount (etiquetas de línea)
  voucherNamed: "Voucher {code}",

  // EventInfo
  discounts: "Descuentos",
  yourOrder: "Tu pedido:",
  noTicketSelected: "Ninguna entrada seleccionada",
  nextUnaccented: "Siguiente",

  // ModalitiesStep
  selectTicketsHint: "Elige tus entradas y define la cantidad. Puedes ajustarlas después en Información.",
  noTicketsAvailable: "No hay entradas disponibles para este evento.",
  select: "Seleccionar",
  backToEventPage: "Volver a la página del evento",
  selectTicketsTitle: "Selecciona tus entradas",

  // TicketCategoryCard
  ageRangeBetween: "de {min} a {max} años",
  ageRangeFrom: "desde {min} años",
  ageRangeUpTo: "hasta {max} años",
  ageLimitLabel: "Límite de edad: {range}",
  viewFeaturedImage: "Ver imagen destacada",
  viewMoreImages: "Ver {n} imágenes más",
  viewImage: "Ver imagen",
  batchSoldOut: "Lote agotado",
  spotsLeftOne: "¡Solo queda {n} lugar!",
  spotsLeftOther: "¡Solo quedan {n} lugares!",
  previousImage: "Imagen anterior",
  nextImage: "Imagen siguiente",
  startingFrom: "Desde:",

  // Páginas /checkout/ingressos y /checkout/pagamento
  eventNotSpecifiedTitle: "Evento no especificado",
  eventNotSpecifiedDescription: "Selecciona un evento para continuar con el checkout.",
  backToHome: "Volver a la página de inicio",
  eventNotFoundTitle: "Evento no encontrado",
  eventNotFoundDescription: "El evento que buscas no existe o fue eliminado.",
  selectAtLeastOneTicket: "Selecciona al menos una entrada para continuar.",
  voucherApplyFailed: "No se pudo aplicar el voucher.",
  batchSoldOutToast: "Lote agotado. Elige otra entrada.",
  eventSoldOutToast: "Evento agotado. No hay suficientes cupos.",
  tooManyPendingOrders: "Ya tienes reservas en curso. Finaliza una antes de comenzar otra.",
  rateLimitExceeded: "Demasiados intentos. Espera un minuto y vuelve a intentarlo.",
  reserveFailed: "No se pudieron reservar las entradas.",
  reserveFailedRetry: "No se pudieron reservar las entradas. Inténtalo de nuevo.",

  // PaymentStep — errores de cupón/voucher (código del backend → texto)
  couponErrNotFound: "Cupón inválido o no encontrado.",
  couponErrExpired: "Cupón vencido.",
  couponErrMinValue: "El pedido no alcanza el valor mínimo del cupón.",
  voucherErrNotFound: "Voucher inválido o no encontrado.",
  voucherErrExpired: "Voucher vencido.",
  voucherErrAlreadyUsed: "Este voucher ya fue utilizado.",
  discountConflict: "No se pueden usar cupón y voucher al mismo tiempo.",
  couponEnterCode: "Ingresa un código de cupón.",
  couponInvalid: "Cupón inválido.",
  couponApplyError: "Error al aplicar el cupón. Inténtalo de nuevo.",
  autoDiscount: "Descuento automático",
  coupon: "Cupón",

  // PaymentStep — cuotas
  installmentCash: "1x de {value} (al contado)",
  installmentInterestFree: "{n}x de {value} sin intereses",

  // PaymentStep — reserva / dirección de facturación
  reservationExpiredGoBack: "Tu reserva expiró. Vuelve para seleccionar las entradas.",
  reservationExpired: "Tu reserva expiró.",
  billingSelectCountry: "Selecciona el país en la dirección de facturación.",
  billingInvalidPostalCode: "Ingresa un código postal válido en la dirección de facturación.",
  billingInvalidCep: "Ingresa un CEP válido (8 dígitos) en la dirección de facturación.",
  billingSelectState: "Selecciona el estado en la dirección de facturación.",
  billingMissingFieldsForeign: "Completa calle, número y ciudad en la dirección de facturación.",
  billingMissingFields: "Completa calle, número, barrio y ciudad en la dirección de facturación.",
  billingSaveError: "Error al guardar la dirección.",
  confirmBillingBeforePay: "Confirma la dirección de facturación antes de pagar.",
  confirmBillingBeforeFinish: "Confirma la dirección de facturación antes de finalizar.",
  fillParticipantsBeforePay: "Completa los datos de los participantes antes de pagar.",

  // PaymentStep — pago
  paymentNotApprovedRetry: "Pago no aprobado. Inténtalo de nuevo.",
  paymentProcessError: "Error al procesar el pago. Inténtalo de nuevo.",
  paymentApproved: "¡Pago aprobado!",
  tryAgain: "Inténtalo de nuevo.",
  pixGenerateError: "Error al generar el código QR Pix. Inténtalo de nuevo.",
  orderCompleted: "¡Pedido finalizado!",
  cardNameRequired: "Ingresa el nombre impreso en la tarjeta.",
  cardNumberRequired: "Ingresa el número de la tarjeta.",
  cardNumberInvalid: "Número de tarjeta inválido.",
  cardExpiryRequired: "Ingresa la fecha de vencimiento.",
  cardExpiryInvalid: "Tarjeta vencida o fecha inválida.",
  cardCvvRequired: "Ingresa el CVV.",
  cardCvvInvalid: "CVV inválido.",
  cardFixFields: "Corrige los campos de la tarjeta.",
  threeDsUnsupportedBrand: "Marca de tarjeta no compatible con la autenticación de débito.",
  threeDsTokenError: "Error al iniciar la autenticación 3DS. Inténtalo de nuevo.",
  threeDsDisabled: "La autenticación 3DS está desactivada para este comercio.",
  threeDsSdkError: "Error en 3DS: {message}",
  threeDsReturnCode: " (cód. {code})",
  threeDsGenericError: "Error en la autenticación 3DS. Inténtalo de nuevo.",

  // PaymentStep — pantalla
  includedItems: "Artículos incluidos",
  includedItem: "Artículo incluido",
  included: "Incluido",
  sizeLabel: "Talla:",
  showLess: "Mostrar menos",
  showMore: "Mostrar más",
  paymentHintAddress: "Ingresa y confirma la dirección de facturación para elegir el método de pago.",
  paymentHintFree: "Haz clic en Finalizar pedido para confirmar. Las entradas se emitirán de inmediato.",
  paymentHintReview: "Revisa tu pedido y paga con tarjeta o Pix. Las entradas se emitirán cuando se apruebe el pago.",
  finishOrder: "Finalizar pedido",
  card: "Tarjeta",
  credit: "Crédito",
  debit: "Débito",
  finishPurchase: "Finalizar compra",
  generateQrCodeUpper: "Generar código QR",
} satisfies Record<keyof typeof pt, string>;
