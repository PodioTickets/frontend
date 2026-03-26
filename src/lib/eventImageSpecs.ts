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
} as const;

export type EventImageSpec = (typeof EVENT_IMAGE_SPECS)[keyof typeof EVENT_IMAGE_SPECS];
export type EventImageSpecKey = keyof typeof EVENT_IMAGE_SPECS;
