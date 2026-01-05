export { translations } from "./translations";
export { mockEvents, type Event } from "./events";
export { mockKits, type Kit, type Race } from "./kits";

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
      label: "Corrida de rua",
      icon: "/icons-3d/Icon3D-corrida-de-rua.webp",
    },
    { id: "natacao", label: "Natação", icon: "/icons-3d/Icon3D-natacao.webp" },
    {
      id: "caminhada",
      label: "Caminhada",
      icon: "/icons-3d/Icon3D-caminhada.webp",
    },
    { id: "criancas", label: "Crianças", icon: "/icons-3d/Icon3D-kids.webp" },
    { id: "praia", label: "Praia", icon: "/icons-3d/Icon3D-praia.webp" },
    { id: "ate-4k", label: "Até 4k", icon: "/icons-3d/Icon3D-4k.webp" },
    { id: "42k", label: "42k", icon: "/icons-3d/Icon3D-42K.webp" },
  ],
  [
    {
      id: "ciclismo",
      label: "Ciclismo",
      icon: "/icons-3d/Icon3D-ciclismo.webp",
    },
    { id: "uphill", label: "Uphill", icon: "/icons-3d/Icon3D-Uphill.webp" },
    {
      id: "corridas-virtuais",
      label: "Corridas virtuais",
      icon: "/icons-3d/Icon3D-corrida-virtual.webp",
    },
    {
      id: "grupos-esportivos",
      label: "Grupos esportivos",
      icon: "/icons-3d/Icon3D-Grupo-de-pessoa.webp",
    },
    {
      id: "circuito",
      label: "Circuito",
      icon: "/icons-3d/Icon3D-circuito.webp",
    },
    {
      id: "de-5k-a-10k",
      label: "De 5k a 10k",
      icon: "/icons-3d/Icon3D-10k.webp",
    },
    {
      id: "ciclismo-montanha",
      label: "Ciclismo na montanha",
      icon: "/icons-3d/Icon3D-Ciclismo-montanha.webp",
    },
  ],
  // Coluna 3
  [
    {
      id: "corrida-aventura",
      label: "Corrida de aventura",
      icon: "/icons-3d/Icon3D-Corrida aventura.webp",
    },
    {
      id: "corrida-noturna",
      label: "Corrida noturna",
      icon: "/icons-3d/Icon3D-Corrida-noturna.webp",
    },
    {
      id: "beach-tennis",
      label: "Beach tennis",
      icon: "/icons-3d/Icon3D-Beach-tennis.webp",
    },
    {
      id: "canoagem-vaa",
      label: "Canoagem va'a",
      icon: "/icons-3d/Icon3D-canoa.webp",
    },
    {
      id: "de-11k-a-20k",
      label: "De 11k a 20k",
      icon: "/icons-3d/Icon3D-11k-a-20k.webp",
    },
    {
      id: "triathlon",
      label: "Triathlon",
      icon: "/icons-3d/Icon-3D-Triathlon.webp",
    },
    {
      id: "corrida-trilha",
      label: "Corrida em trilha",
      icon: "/icons-3d/Icon3D-Corrida-em-trilha.webp",
    },
  ],
  // Coluna 4
  [
    {
      id: "so-mulheres",
      label: "Só mulheres",
      icon: "/icons-3d/Icon3D-mulheres.webp",
    },
    {
      id: "futevolei",
      label: "Futevôlei",
      icon: "/icons-3d/Icon3D-futevolei.webp",
    },
    {
      id: "capacitacao",
      label: "Capacitação",
      icon: "/icons-3d/Icon3D-corrida-de-revezamento.webp",
    },
    { id: "21k", label: "21k", icon: "/icons-3d/Icon3D-21k.webp" },
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