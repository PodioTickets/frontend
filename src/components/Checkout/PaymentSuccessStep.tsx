"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "../Button";

/**
 * Tela de "Pagamento aprovado" (checkout/sucesso).
 *
 * Versão enxuta conforme o design do Figma (node 664:32817): apenas o selo de
 * sucesso, o título, o subtítulo e o botão "Ver meus ingressos". O antigo resumo
 * do pedido (nº do pedido, método, total, participantes, produtos, cupom) foi
 * removido de propósito — o comprovante detalhado vai por e-mail e os ingressos
 * ficam em `/user/tickets`. O header/navbar vem do layout global do app.
 */
export function PaymentSuccessStep() {
  const router = useRouter();

  return (
    <div className="flex w-full flex-1 flex-col items-center px-4 pt-16 pb-24 text-center md:pt-24">
      <div className="flex flex-col items-center gap-4">
        <Image
          src="/images/approved-payment-badge.png"
          alt="Pagamento aprovado"
          width={96}
          height={96}
          priority
          draggable={false}
        />
        <div className="flex max-w-[560px] flex-col items-center gap-4 text-gray-12">
          <h1 className="font-manrope text-2xl font-extrabold leading-[1.1] md:text-[32px]">
            Pagamento aprovado
          </h1>
          <p className="font-family-dm-sans text-base font-medium leading-[1.3] md:text-lg">
            Sua inscrição foi confirmada. Enviamos o comprovante para o seu e-mail.
          </p>
        </div>
      </div>

      <Button
        onClick={() => router.push("/user/tickets")}
        className="mt-10 h-[52px] rounded-lg px-16 text-xl font-bold"
      >
        Ver meus ingressos
      </Button>
    </div>
  );
}
