import type pt from "../pt-BR/ui";

export default {
  confirm: "Confirmar",
  select: "Selecciona",
  search: "Buscar",
  searchEllipsis: "Buscar...",
  loading: "Cargando...",
  noResults: "Sin resultados",
  noResultsFound: "No se encontraron resultados",
  searchCountry: "Buscar país",
  noCountryFound: "No se encontró ningún país",
  // Dropdown
  soldOut: "Agotado",
  becomeOrganizerTitle: "Hazte organizador",
  becomeOrganizerText: "¿Quieres hacer realidad tu evento? Hazte organizador y publícalo",
  // Campos
  otpDigit: "Dígito {n} de {total}",
  showPassword: "Mostrar contraseña",
  hidePassword: "Ocultar contraseña",
  // Alterações não salvas
  unsavedTitle: "Cambios sin guardar",
  unsavedDescription: "Hiciste cambios en esta página. Si sales ahora, se perderán.",
  unsavedKeepEditing: "Seguir editando",
  unsavedLeave: "Salir sin guardar",
  // Bloqueador de anúncios
  adBlockClose: "Cerrar aviso",
  adBlockTitle: "Bloqueador de anuncios detectado",
  adBlockText:
    "Las extensiones de bloqueo pueden impedir que se carguen imágenes, mapas y el procesamiento de pagos. Para una mejor experiencia, desactiva el bloqueador y recarga la página.",
  adBlockContinue: "Continuar de todos modos",
  adBlockReload: "Ya lo desactivé, recargar",
  // CVV
  cvvCardAlt: "Tarjeta de crédito",
  cvvHelp:
    "Es un número especial de 3 o 4 dígitos que está en el reverso de tu tarjeta de débito o crédito, junto al área de la firma",
  // Calendário
  previousMonth: "Mes anterior",
  nextMonth: "Mes siguiente",
  copied: "¡Copiado al portapapeles!",
  copyError: "Error al copiar",
  cropTitle: "Ajustar y encuadrar imagen",
  cropHint: "Arrastra para posicionar y usa el zoom para encuadrar en el área.",
  cropZoom: "Zoom de la imagen",
  cropCancel: "Cancelar",
  cropApply: "Aplicar",
  cropApplying: "Generando...",
  cropFailed: "No se pudo procesar el recorte de la imagen.",
  cropInvalidFormat: "Formato inválido. Usa JPG, PNG, GIF o WebP.",
  cropFileTooLarge: "Archivo demasiado grande. Máximo {max}MB.",
  // Rodapé de modal
  cancel: "Cancelar",
  saving: "Guardando...",
} satisfies Record<keyof typeof pt, string>;
