"use client";

import { QRCodeSVG } from "qrcode.react";

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
        className={`bg-gray-2 border-2 border-gray-6 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-11 text-center px-2">
          QR Code não disponível
        </span>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <QRCodeSVG
        value={qrCodeString}
        size={size}
        level="M"
        includeMargin={false}
        className=""
      />
    </div>
  );
}
