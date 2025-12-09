export interface Race {
  id: string;
  name: string;
  distance: string; // e.g., "3K", "5K", "10K"
  distanceKm: number; // Distance in kilometers
  date: Date;
  time: string; // e.g., "10:00h"
  price: number;
  images: string[];
  available: boolean;
  ageLimit?: {
    min?: number;
    max?: number;
  };
}

export interface Kit {
  id: string;
  name: string;
  description: string;
  images: string[]; // Array of image URLs
  minPrice: number;
  races: Race[];
  eventId: string; // ID of the event this kit belongs to
}

export const mockKits: Kit[] = [
  {
    id: "kit-1",
    name: "Kit inscrição",
    description:
      "Essencial para sua participação. Inclui a inscrição, a camiseta oficial, a sacochila, a necessaire e a medalha pós-prova — tudo leve, prático e com a identidade do evento.",
    images: [
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
    ],
    minPrice: 100,
    eventId: "1",
    races: [
      {
        id: "race-1",
        name: "3K - Caminhada",
        distance: "3K",
        distanceKm: 3,
        date: new Date("2025-12-10"),
        time: "10:00h",
        price: 100,
        available: true,
        images: [
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
        ],
      },
      {
        id: "race-2",
        name: "5K - Corrida",
        distance: "5K",
        distanceKm: 5,
        date: new Date("2025-12-10"),
        time: "10:30h",
        price: 120,
        available: true,
        images: [
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
        ],
      },
      {
        id: "race-3",
        name: "10K - Corrida",
        distance: "10K",
        distanceKm: 10,
        date: new Date("2025-12-10"),
        time: "11:00h",
        price: 150,
        available: true,
        images: [
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
        ],
      },
    ],
  },
  {
    id: "kit-2",
    name: "Kit Premium",
    description:
      "Kit completo com todos os itens do Kit Inscrição mais camiseta técnica, garrafa térmica personalizada e acesso VIP à área de descanso.",
    images: [
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
    ],
    minPrice: 200,
    eventId: "1",
    races: [
      {
        id: "race-4",
        name: "10K - Corrida Premium",
        distance: "10K",
        distanceKm: 10,
        date: new Date("2025-12-10"),
        time: "11:00h",
        price: 200,
        available: true,
        images: [
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
        ],
      },
      {
        id: "race-5",
        name: "21K - Meia Maratona",
        distance: "21K",
        distanceKm: 21,
        date: new Date("2025-12-10"),
        time: "06:00h",
        images: [
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
        ],
        price: 250,
        available: true,
      },
    ],
  },
  {
    id: "kit-3",
    name: "Kit Básico",
    description:
      "Kit essencial com inscrição e camiseta oficial do evento. Perfeito para quem quer participar com o básico.",
    images: [
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
      "/banners/card_placeholder.png",
    ],
    minPrice: 80,
    eventId: "1",
    races: [
      {
        id: "race-6",
        name: "3K - Caminhada Básica",
        distance: "3K",
        distanceKm: 3,
        date: new Date("2025-12-10"),
        time: "10:00h",
        price: 80,
        available: true,
        images: [
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
          "/banners/card_placeholder.png",
        ],
      },
    ],
  },
];
