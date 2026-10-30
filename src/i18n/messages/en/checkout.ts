import type pt from "../pt-BR/checkout";

export default {
  // Counter
  counterDecrease: "Decrease quantity",
  counterIncrease: "Increase quantity",

  // CheckoutTimer
  timerAriaLabel: "Reservation time remaining",
  timerCompactLabel: "Time:",
  timerLabel: "Time left:",

  // PaymentSuccessStep
  successTitle: "Payment approved",
  successSubtitle: "Your registration is confirmed! We've sent the receipt to your email.",
  successViewTickets: "View my tickets",

  // CheckoutCardErrorModal
  cardErrorTitle: "Payment not approved",
  cardErrorDescription: "Your card issuer didn't authorize this transaction. Check the details you entered or try another payment method",
  cardErrorRetry: "Try again",

  // CheckoutExpiredModal
  expiredTitle: "Time's up!",
  expiredDescription: "Your time to complete the registration has expired and the items were released. You can start a new registration, subject to availability",
  expiredBackToEvent: "Back to event",

  // autoCouponBadges
  couponQtyFullMin: "Buy {min} or more tickets and get {d} off!",
  couponQtyFullExact: "Buy {min} tickets and get {d} off!",
  couponQtyFullRange: "Buy {min} to {max} tickets and get {d} off!",
  couponAgeFullRange: "{d} off for ages {min} to {max}.",
  couponAgeFullMax: "{d} off for ages up to {max}.",
  couponAgeFullMin: "{d} off for ages {min} and up.",
  couponQtyShort: "Quantity coupon {d}",
  couponQtyTiny: "Quantity {d}",
  couponAgeShort: "Age coupon {d}",
  couponAgeTiny: "Age {d}",

  // Navigation / steps
  back: "Back",
  stepTickets: "Tickets",
  stepInformation: "Information",
  stepProducts: "Products",
  stepPayment: "Payment",

  // PaymentMethodParts (billing address)
  billingAddressTitle: "Address",
  billingAddressEdit: "Change address",
  billingPostalCode: "Postal code {cep} · {country}",
  billingCep: "CEP {cep}",

  // PaymentCardForms
  cardNameLabel: "Name on card",
  cardNamePlaceholder: "e.g. John Smith",
  cardNumberLabel: "Card number",
  cardNumberPlaceholder: "e.g. 5400 7975 6026 4737",
  cardExpiryLabel: "Expiration date",
  cardExpiryPlaceholder: "MM/YY",
  cardCvv4Digits: "4 digits",
  cardCvv3Digits: "3 digits",
  installmentsLabel: "Installments",
  installmentsPlaceholder: "How many installments?",

  // PixModal / PixForm
  pixPaymentConfirmed: "Payment confirmed!",
  pixCodeCopied: "Pix code copied!",
  pixGeneratedTitle: "Pix generated successfully",
  pixKeepPageOpen: "Keep this page open. As soon as the bank confirms the payment, we'll update your order status automatically",
  pixTimeToPay: "Time left to complete the payment",
  pixQrCodeAlt: "Pix QR code",
  pixCopy: "Copy Pix code",
  pixCashValue: "Upfront amount:",
  pixClearingTime: "May take up to 30 minutes to clear",
  pixGenerateQrCode: "Generate QR code",

  // OrderSummary
  genderMale: "Male",
  genderFemale: "Female",
  genderOther: "Other",
  participantsLabel: "Participants:",
  singleTicket: "Single ticket",
  singleTicketTitle: "Single Ticket",
  additionalItems: "Add-on items",
  additionalItem: "Add-on item",
  subtotalLabel: "Subtotal:",
  couponAutomatic: "Automatic coupon",
  couponNamed: "Coupon {name}",
  couponApplied: "Coupon applied",
  voucherApplied: "Voucher applied",
  serviceFeeLabel: "Service fee:",
  seeDetails: "See details",
  totalLabel: "Total:",
  couponCodePlaceholder: "Coupon code",
  couponApply: "Apply",
  purchaseSummaryTitle: "Your purchase summary",
  ticketPriceLabel: "Ticket price:",
  additionalProducts: "Add-on products",
  additionalProduct: "Add-on product",
  participantN: "Participant {n}",
  couponCodeBadge: "Coupon: {code}",
  voucherCourtesy: "100% complimentary",

  // MobileSummaryBar
  onContinue: "when you continue",
  serviceFee: "Service fee",
  hideDetails: "Hide details",
  participants: "Participants",
  participant: "Participant",
  total: "Total",
  subtotal: "Subtotal",
  orderDetails: "Order details",
  close: "Close",
  ticketsInOrder: "Tickets in your order",

  // lib/orderCouponDiscount (line labels)
  voucherNamed: "Voucher {code}",

  // EventInfo
  discounts: "Discounts",
  yourOrder: "Your order:",
  noTicketSelected: "No tickets selected",
  nextUnaccented: "Next",

  // ModalitiesStep
  selectTicketsHint: "Choose your tickets and set the quantity. You can adjust them later in Information.",
  noTicketsAvailable: "No tickets available for this event.",
  select: "Select",
  backToEventPage: "Back to event page",
  selectTicketsTitle: "Select your tickets",

  // TicketCategoryCard
  ageRangeBetween: "{min} to {max} years",
  ageRangeFrom: "{min} years and up",
  ageRangeUpTo: "up to {max} years",
  ageLimitLabel: "Age limit: {range}",
  viewFeaturedImage: "View featured image",
  viewMoreImages: "View {n} more images",
  viewImage: "View image",
  batchSoldOut: "Batch sold out",
  spotsLeftOne: "Only {n} spot left!",
  spotsLeftOther: "Only {n} spots left!",
  previousImage: "Previous image",
  nextImage: "Next image",
  startingFrom: "From:",

  // /checkout/ingressos and /checkout/pagamento pages
  eventNotSpecifiedTitle: "No event specified",
  eventNotSpecifiedDescription: "Please select an event to continue to checkout.",
  backToHome: "Back to home page",
  eventNotFoundTitle: "Event not found",
  eventNotFoundDescription: "The event you're looking for doesn't exist or has been removed.",
  selectAtLeastOneTicket: "Select at least one ticket to continue.",
  voucherApplyFailed: "We couldn't apply the voucher.",
  batchSoldOutToast: "Batch sold out. Choose another ticket.",
  eventSoldOutToast: "Event sold out. Not enough spots available.",
  tooManyPendingOrders: "You already have reservations in progress. Complete one before starting another.",
  rateLimitExceeded: "Too many attempts. Wait a minute and try again.",
  reserveFailed: "We couldn't reserve the tickets.",
  reserveFailedRetry: "We couldn't reserve the tickets. Please try again.",

  // PaymentStep — coupon/voucher errors (backend code → text)
  couponErrNotFound: "Invalid or unknown coupon.",
  couponErrExpired: "Coupon expired.",
  couponErrMinValue: "Order is below the coupon's minimum amount.",
  voucherErrNotFound: "Invalid or unknown voucher.",
  voucherErrExpired: "Voucher expired.",
  voucherErrAlreadyUsed: "This voucher has already been used.",
  discountConflict: "Coupons and vouchers can't be used together.",
  couponEnterCode: "Enter a coupon code.",
  couponInvalid: "Invalid coupon.",
  couponApplyError: "Error applying coupon. Please try again.",
  autoDiscount: "Automatic discount",
  coupon: "Coupon",

  // PaymentStep — installments
  installmentCash: "1x {value} (paid in full)",
  installmentInterestFree: "{n}x {value} interest-free",

  // PaymentStep — reservation / billing address
  reservationExpiredGoBack: "Your reservation expired. Go back and select your tickets.",
  reservationExpired: "Your reservation expired.",
  billingSelectCountry: "Select the country in the billing address.",
  billingInvalidPostalCode: "Enter a valid postal code in the billing address.",
  billingInvalidCep: "Enter a valid CEP (8 digits) in the billing address.",
  billingSelectState: "Select the state in the billing address.",
  billingMissingFieldsForeign: "Fill in street, number and city in the billing address.",
  billingMissingFields: "Fill in street, number, neighborhood and city in the billing address.",
  billingSaveError: "Error saving address.",
  confirmBillingBeforePay: "Confirm the billing address before paying.",
  confirmBillingBeforeFinish: "Confirm the billing address before completing your order.",
  fillParticipantsBeforePay: "Fill in the participants' details before paying.",

  // PaymentStep — payment
  paymentNotApprovedRetry: "Payment not approved. Please try again.",
  paymentProcessError: "Error processing payment. Please try again.",
  paymentApproved: "Payment approved!",
  tryAgain: "Please try again.",
  pixGenerateError: "Error generating the Pix QR code. Please try again.",
  orderCompleted: "Order completed!",
  cardNameRequired: "Enter the name on the card.",
  cardNumberRequired: "Enter the card number.",
  cardNumberInvalid: "Invalid card number.",
  cardExpiryRequired: "Enter the expiration date.",
  cardExpiryInvalid: "Card expired or invalid date.",
  cardCvvRequired: "Enter the CVV.",
  cardCvvInvalid: "Invalid CVV.",
  cardFixFields: "Please fix the card fields.",
  threeDsUnsupportedBrand: "Card brand not supported for debit authentication.",
  threeDsTokenError: "Error starting 3DS authentication. Please try again.",
  threeDsDisabled: "3DS authentication is disabled for this merchant.",
  threeDsSdkError: "3DS error: {message}",
  threeDsReturnCode: " (code {code})",
  threeDsGenericError: "3DS authentication error. Please try again.",

  // PaymentStep — screen
  includedItems: "Included items",
  includedItem: "Included item",
  included: "Included",
  sizeLabel: "Size:",
  showLess: "Show less",
  showMore: "Show more",
  paymentHintAddress: "Enter and confirm your billing address to choose a payment method.",
  paymentHintFree: "Click Complete order to confirm. Your tickets will be issued right away.",
  paymentHintReview: "Review your order and pay by card or Pix. Your tickets will be issued once the payment is approved.",
  finishOrder: "Complete order",
  card: "Card",
  credit: "Credit",
  debit: "Debit",
  finishPurchase: "Complete purchase",
  generateQrCodeUpper: "Generate QR code",
} satisfies Record<keyof typeof pt, string>;
