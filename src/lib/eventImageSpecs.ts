/** Proporções e saída do canvas após o recorte (banner topo + card de listagem quadrado). */
export const EVENT_IMAGE_SPECS = {
  /** 2× retina: banner exibido a até ~880 px de largura. */
  banner: {
    aspect: 880 / 400,
    outputWidth: 1760,
    outputHeight: 800,
  },
  /** 2× retina: card exibido a até ~300 px de lado. */
  card: {
    aspect: 1,
    outputWidth: 600,
    outputHeight: 600,
  },
  /** Kit / produto do ingresso (quadrado, mesmo fluxo de corte do card do evento). */
  product: {
    aspect: 1,
    outputWidth: 800,
    outputHeight: 800,
  },
  /** Logo da organização (recorte circular na UI; arquivo quadrado para exibir com `rounded-full`). */
  organizationLogo: {
    aspect: 1,
    outputWidth: 600,
    outputHeight: 600,
  },
} as const;

export type EventImageSpec = (typeof EVENT_IMAGE_SPECS)[keyof typeof EVENT_IMAGE_SPECS];
export type EventImageSpecKey = keyof typeof EVENT_IMAGE_SPECS;
