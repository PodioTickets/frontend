import { Button } from "../Button";
import Image from "next/image";

interface OrderItem {
  name: string;
  price: number;
  image?: string;
  size?: string;
}

interface OrderSummaryProps {
  items: OrderItem[];
  serviceFee: number;
  total: number;
  onApplyCoupon: (coupon: string) => void;
}

export function OrderSummary({
  items,
  serviceFee,
  total,
  onApplyCoupon,
}: OrderSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);

  return (
    <div className="bg-white rounded-xl shadow-lg h-fit">
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

      {/* Detalhes do Pedido */}
      <div className="space-y-2 bg-gray-3 p-4 border-t border-gray-6 mt-2">
        <h3 className="font-medium text-gray-12">Participante 1</h3>

        <div className="flex justify-between items-start mb-2">
          <div>
            <h4 className="text-lg font-bold text-gray-12">
              Kit inscrição - 3K Caminhada
            </h4>
          </div>
          <span className="font-bold text-gray-12">R$ 210,00</span>
        </div>

        {/* Itens Extras */}
        <div className="space-y-3">
          {/* Camiseta */}
          <div className="flex flex-col gap-2 border border-gray-6 rounded-lg p-4 h-full">
            <div className="flex items-center gap-2 h-[100px]">
              <Image
                src={"/images/camisa.png"}
                alt="Camisa do kit inscrição - 3K Caminhada"
                width={100000}
                height={100000}
                className="w-[100px] h-[100px] object-cover rounded-lg"
                draggable={false}
              />
              <div className="flex flex-col justify-between h-full gap-2">
                <p className="text-gray-12 font-semibold truncate">
                  Kit inscrição - 3K Caminhada
                </p>
                <p className="text-gray-12 font-semibold">R$ 29,90</p>
              </div>
            </div>
            <div className="flex flex-col justify-between h-full border-t border-gray-6 pt-2">
              <p className="text-gray-12">Escolha o tamanho</p>
              <p className="text-gray-12 text-lg">M</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
