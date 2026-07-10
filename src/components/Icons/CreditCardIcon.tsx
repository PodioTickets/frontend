import * as React from "react";

/**
 * Ícone genérico de cartão (bandeira neutra). Usado no ORGANIZADOR no lugar do
 * ícone da bandeira real do cartão (`PaymentIcon` da lib) — telas de inscrições,
 * financeiro e afins. Cores próprias (gradiente azul), não segue `currentColor`.
 * viewBox 32×20: com o `preserveAspectRatio` padrão, escala sem distorcer mesmo
 * dentro de caixas quadradas (`size-*`).
 */
export function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="32"
      height="20"
      viewBox="0 0 32 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M30.8392 0H1.14056C0.510646 0 0 0.510646 0 1.14056V18.8594C0 19.4894 0.510646 20 1.14056 20H30.8392C31.4691 20 31.9798 19.4894 31.9798 18.8594V1.14056C31.9798 0.510646 31.4691 0 30.8392 0Z"
        fill="url(#paint0_linear_credit_card)"
      />
      <path d="M31.9798 4.29297H0V7.91196H31.9798V4.29297Z" fill="#202020" />
      <path
        d="M28.4666 10H22.9589C22.644 10 22.3887 10.2553 22.3887 10.5702V13.9799C22.3887 14.2948 22.644 14.5501 22.9589 14.5501H28.4666C28.7815 14.5501 29.0368 14.2948 29.0368 13.9799V10.5702C29.0368 10.2553 28.7815 10 28.4666 10Z"
        fill="#FCFCFC"
      />
      <path
        d="M14.0605 10H3.0409C2.72599 10 2.4707 10.2553 2.4707 10.5702V10.796C2.4707 11.1109 2.72599 11.3662 3.0409 11.3662H14.0605C14.3754 11.3662 14.6307 11.1109 14.6307 10.796V10.5702C14.6307 10.2553 14.3754 10 14.0605 10Z"
        fill="#FCFCFC"
      />
      <path
        d="M5.39478 12.7969H3.0409C2.72599 12.7969 2.4707 13.0522 2.4707 13.3671V13.5929C2.4707 13.9078 2.72599 14.1631 3.0409 14.1631H5.39478C5.70969 14.1631 5.96498 13.9078 5.96498 13.5929V13.3671C5.96498 13.0522 5.70969 12.7969 5.39478 12.7969Z"
        fill="#FCFCFC"
      />
      <path
        d="M10.3577 12.7969H8.00379C7.68888 12.7969 7.43359 13.0522 7.43359 13.3671V13.5929C7.43359 13.9078 7.68888 14.1631 8.00379 14.1631H10.3577C10.6726 14.1631 10.9279 13.9078 10.9279 13.5929V13.3671C10.9279 13.0522 10.6726 12.7969 10.3577 12.7969Z"
        fill="#FCFCFC"
      />
      <defs>
        <linearGradient
          id="paint0_linear_credit_card"
          x1="32.5"
          y1="-0.239257"
          x2="0.937501"
          y2="19.7607"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#3DB9CF" />
          <stop offset="1" stopColor="#107D98" />
        </linearGradient>
      </defs>
    </svg>
  );
}
