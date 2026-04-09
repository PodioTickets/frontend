/** Proporções e saída do canvas após o recorte (banner topo + card de listagem quadrado). */
export const EVENT_IMAGE_SPECS = {
  banner: {
    aspect: 880 / 400,
    outputWidth: 880,
    outputHeight: 400,
  },
  card: {
    aspect: 1,
    outputWidth: 300,
    outputHeight: 300,
  },
  /** Kit / produto do ingresso (quadrado, mesmo fluxo de corte do card do evento). */
  product: {
    aspect: 1,
    outputWidth: 600,
    outputHeight: 600,
  },
  /** Logo da organização (recorte circular na UI; arquivo quadrado para exibir com `rounded-full`). */
  organizationLogo: {
    aspect: 1,
    outputWidth: 400,
    outputHeight: 400,
  },
} as const;

export type EventImageSpec = (typeof EVENT_IMAGE_SPECS)[keyof typeof EVENT_IMAGE_SPECS];
export type EventImageSpecKey = keyof typeof EVENT_IMAGE_SPECS;
