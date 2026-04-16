export interface Batch {
  id: string;
  quantity: string;
  price: string;
  /** Quando > 0, o preço não pode mais ser editado (lote já teve vendas). */
  quantitySold?: number;
  startType: "date" | "previous";
  startDate?: string;
  startTime?: string;
  endDate?: string;
  endTime?: string;
}

export interface TicketFormData {
  ticketName: string;
  ticketDescription?: string;
  selectedModality: string;
  distance: string;
  distanceUnit: string;
  gender: string;
  hasAgeRestriction: boolean;
  minAge: string;
  maxAge: string;
  hasKit: boolean;
  selectedGroupId: string;
  batches: Batch[];
  products: ProductData[];
}

export interface ProductData {
  id: string;
  product: Product;
  productId: string;
  ticketId: string;
}

export interface Product {
  id: string;
  name: string;
  image?: string;
  /** API retorna em centavos (number); exibição em reais */
  basePrice?: number | string;
  isIncludedInTicket?: boolean;
}

export interface TicketFormProps {
  eventId: string;
  ticketId?: string;
  initialGroupId?: string;
  initialData?: Partial<TicketFormData>;
  backUrl: string;
  mode: "create" | "edit";
  localStorageKey?: string;
  className?: string;
}
