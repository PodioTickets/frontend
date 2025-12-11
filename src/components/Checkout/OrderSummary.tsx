import { Button } from "../Button";
import Image from "next/image";
import { ParticipantsList } from "./ParticipantsList";

interface OrderItem {
  name: string;
  price: number;
  image?: string;
  size?: string;
}

interface ParticipantData {
  participantIndex: number;
  ticketName: string;
  ticketPrice: number;
  additionalProducts?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface OrderSummaryProps {
  items: OrderItem[];
  serviceFee: number;
  total: number;
  onApplyCoupon: (coupon: string) => void;
  participantsData?: ParticipantData[];
}

export function OrderSummary({
  items,
  serviceFee,
  total,
  onApplyCoupon,
  participantsData = [],
}: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg flex flex-col h-[600px] overflow-hidden">
      {/* Resumo Financeiro */}
      <div className="border-b border-gray-5 pb-4 mb-4 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-12">
            <span>{items.length}x Itens adicionais:</span>
            <span className="font-bold">
              R${" "}
              {items
                .reduce((sum, item) => sum + item.price, 0)
                .toFixed(2)
                .replace(".", ",")}
            </span>
          </div>
          <div className="flex justify-between text-gray-12">
            <span>Taxa de serviço:</span>
            <span className="font-bold">
              R$ {serviceFee.toFixed(2).replace(".", ",")}
            </span>
          </div>
          <div className="flex justify-between text-gray-12">
            <span>Subtotal:</span>
            <span className="font-bold">
              R$ {(subtotal + serviceFee).toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>

        <div className="flex justify-between text-lg font-bold text-gray-12 mt-4 pt-4 border-t border-gray-5">
          <span>Total:</span>
          <span>R$ {total.toFixed(2).replace(".", ",")}</span>
        </div>
      </div>

      {/* Campo Cupom */}
      <div className="mb-2 p-4">
        <div className="flex gap-2 h-12">
          <input
            type="text"
            placeholder="Digite o código"
            className="flex-1 px-3 py-2 text-gray-12 font-medium border border-gray-6 rounded-lg text-sm focus:outline-none focus:border-primary-10"
          />
          <Button size="sm" className="h-full w-1/3">
            Aplicar
          </Button>
        </div>
      </div>

      {/* Lista de Participantes com Scroll */}
      {participantsData.length > 0 && (
        <div className=" w-full bg-gray-3 overflow-hidden border-t border-gray-6">
          <ParticipantsList participantsData={participantsData} />
        </div>
      )}
    </div>
  );
}
