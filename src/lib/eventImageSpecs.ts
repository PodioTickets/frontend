/** Proporções e saída do canvas após o recorte (banner topo + card de listagem quadrado). */
export const EVENT_IMAGE_SPECS = {
  /** Banner do evento — formato padrão 1660×930 (≈ 16:9). Resolução ampla o
   *  suficiente para o hero da página e o preview do OpenGraph. */
  banner: {
    aspect: 1660 / 930,
    outputWidth: 1660,
    outputHeight: 930,
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
