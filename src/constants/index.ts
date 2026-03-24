export { translations } from "./translations";
export { mockEvents, type Event } from "./events";
export { mockKits, type Kit, type Race } from "./kits";
export { mockRegistrations } from "./registrations";

export const locationsOptions = [
  {
    id: "sao-paulo",
    label: "São Paulo",
    icon: "/images/location_icon.svg",
  },
  {
    id: "rio-de-janeiro",
    label: "Rio de Janeiro",
    icon: "/images/location_icon.svg",
  },
  {
    id: "belo-horizonte",
    label: "Belo Horizonte",
    icon: "/images/location_icon.svg",
  },
  {
    id: "brasilia",
    label: "Brasília",
    icon: "/images/location_icon.svg",
  },
  {
    id: "curitiba",
    label: "Curitiba",
    icon: "/images/location_icon.svg",
  },
  {
    id: "porto-alegre",
    label: "Porto Alegre",
    icon: "/images/location_icon.svg",
  },
  {
    id: "salvador",
    label: "Salvador",
    icon: "/images/location_icon.svg",
  },
  {
    id: "fortaleza",
    label: "Fortaleza",
    icon: "/images/location_icon.svg",
  },
  {
    id: "manaus",
    label: "Manaus",
    icon: "/images/location_icon.svg",
  },
  {
    id: "recife",
    label: "Recife",
    icon: "/images/location_icon.svg",
  },
  {
    id: "sao-luis",
    label: "São Luís",
    icon: "/images/location_icon.svg",
  },
];

export interface ModalityOption {
  id: string;
  label: string;
  icon?: string;
}

export const modalitiesColumns: ModalityOption[][] = [
  [
    {
      id: "corrida-de-rua",
      label: "Corrida",
      icon: "/icons-3d/Icon3D-corrida-de-rua.webp",
    },
    { id: "natacao", label: "Natação", icon: "/icons-3d/Icon3D-natacao.webp" },
    {
      id: "triathlon",
      label: "Triathlon",
      icon: "/icons-3d/Icon-3D-Triathlon.webp",
    },
    {
      id: "ciclismo",
      label: "Ciclismo",
      icon: "/icons-3d/Icon3D-ciclismo.webp",
    },
    { id: "outros", label: "Outros", icon: "/icons-3d/Icon3D-outros.webp" },
  ],
];

export const checkoutHeaderOptions = [
  {
    id: 1,
    label: "Ingressos",
    path: "ingressos",
  },
  {
    id: 2,
    label: "Informações",
    path: "informacoes",
  },
  {
    id: 3,
    label: "Produtos",
    path: "produtos",
  },
  {
    id: 4,
    label: "Pagamento",
    path: "pagamento",
  },
];

export const statusOptions = [
  {
    id: "inscricoes-abertas",
    label: "Inscrições abertas",
  },
  {
    id: "inscricoes-encerradas",
    label: "Inscrições encerradas",
  },
  {
    id: "evento-encerrado",
    label: "Evento encerrado",
  },
];

export const orderOptions = [
  {
    id: "date-asc",
    label: "Data: mais próximo",
  },
  {
    id: "date-desc",
    label: "Data: mais distante",
  },
  {
    id: "price-asc",
    label: "Preço: menor para maior",
  },
  {
    id: "price-desc",
    label: "Preço: maior para menor",
  },
  {
    id: "name-asc",
    label: "Nome: A-Z",
  },
  {
    id: "name-desc",
    label: "Nome: Z-A",
  },
];