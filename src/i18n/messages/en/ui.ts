import type pt from "../pt-BR/ui";

export default {
  confirm: "Confirm",
  select: "Select",
  search: "Search",
  searchEllipsis: "Search...",
  loading: "Loading...",
  noResults: "No results",
  noResultsFound: "No results found",
  searchCountry: "Search country",
  noCountryFound: "No country found",
  // Dropdown
  soldOut: "Sold out",
  becomeOrganizerTitle: "Become an organizer",
  becomeOrganizerText: "Ready to make your event happen? Become an organizer and publish it",
  // Campos
  otpDigit: "Digit {n} of {total}",
  showPassword: "Show password",
  hidePassword: "Hide password",
  // Alterações não salvas
  unsavedTitle: "Unsaved changes",
  unsavedDescription: "You've made changes on this page. If you leave now, they'll be lost.",
  unsavedKeepEditing: "Keep editing",
  unsavedLeave: "Leave without saving",
  // Bloqueador de anúncios
  adBlockClose: "Close notice",
  adBlockTitle: "Ad blocker detected",
  adBlockText:
    "Blocking extensions can prevent images, maps and payment processing from loading. For the best experience, disable your ad blocker and reload the page.",
  adBlockContinue: "Continue anyway",
  adBlockReload: "I've disabled it, reload",
  // CVV
  cvvCardAlt: "Credit card",
  cvvHelp:
    "This is a special 3- or 4-digit number on the back of your debit or credit card, next to the signature area",
  // Calendário
  previousMonth: "Previous month",
  nextMonth: "Next month",
  copied: "Copied to clipboard!",
  copyError: "Could not copy",
  cropTitle: "Adjust and fit image",
  cropHint: "Drag to position and use the zoom to fit the area.",
  cropZoom: "Image zoom",
  cropCancel: "Cancel",
  cropApply: "Apply",
  cropApplying: "Generating...",
  cropFailed: "Could not process the image crop.",
  cropInvalidFormat: "Invalid format. Use JPG, PNG, GIF or WebP.",
  cropFileTooLarge: "File too large. Maximum {max}MB.",
  // Rodapé de modal
  cancel: "Cancel",
  saving: "Saving...",
} satisfies Record<keyof typeof pt, string>;
