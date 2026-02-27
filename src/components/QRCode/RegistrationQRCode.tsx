"use client";

import { QRCodeCanvas } from "qrcode.react";

interface RegistrationQRCodeProps {
  qrCodeData: string | {
    registrationId?: string;
    eventId?: string;
    userId?: string;
    raw?: string;
  };
  size?: number;
  className?: string;
}

export function RegistrationQRCode({
  qrCodeData,
  size = 120,
  className = ""
}: RegistrationQRCodeProps) {
  // Extrair a string JSON do qrCodeData
  let qrCodeString = "";

  if (typeof qrCodeData === "string") {
    qrCodeString = qrCodeData;
  } else if (qrCodeData?.raw) {
    qrCodeString = qrCodeData.raw;
  } else if (qrCodeData?.registrationId) {
    // Se não tiver raw, construir a string JSON a partir dos dados
    qrCodeString = JSON.stringify({
      registrationId: qrCodeData.registrationId,
      eventId: qrCodeData.eventId,
      userId: qrCodeData.userId,
    });
  }

  if (!qrCodeString) {
    return (
      <div
        className={`bg-gray-2 border-2 border-gray-6 rounded-xl flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-11 text-center px-2">
          QR Code não disponível
        </span>
      </div>
    );
  }

  // Calcular tamanhos para melhor apresentação
  const padding = Math.max(8, size * 0.08);
  const qrSize = size - (padding * 2);
  const logoSize = Math.max(16, size * 0.18); // Logo ocupa ~18% do tamanho total

  return (
    <div
      className={`relative flex items-center justify-center bg-white rounded-xl shadow-md border-2 border-gray-6 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* QR Code com logo integrado */}
      <div className="rounded-lg overflow-hidden" style={{ width: qrSize, height: qrSize }}>
        <QRCodeCanvas
          value={qrCodeString}
          size={qrSize}
          level="L" // Nível H para melhor correção de erro (permite logo no centro)
          includeMargin={true}
          marginSize={1}
          fgColor="#1a1a1a" // Preto suave para melhor contraste
          bgColor="#FFFFFF"
          className="rounded-lg"
          imageSettings={{
            src: "/images/logo.png",
            height: logoSize,
            width: logoSize,
            excavate: true, // Remove pixels do QR Code onde o logo está
          }}
        />
      </div>
    </div>
  );
}
