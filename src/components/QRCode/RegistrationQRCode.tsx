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
  let qrCodeString = "";

  if (typeof qrCodeData === "string") {
    try {
      const parsed = JSON.parse(qrCodeData);
      qrCodeString = parsed.registrationId || qrCodeData;
    } catch {
      qrCodeString = qrCodeData;
    }
  } else if (qrCodeData?.raw) {
    try {
      const parsed = JSON.parse(qrCodeData.raw);
      qrCodeString = parsed.registrationId || qrCodeData.raw;
    } catch {
      qrCodeString = qrCodeData.raw;
    }
  } else if (qrCodeData?.registrationId) {
    qrCodeString = qrCodeData.registrationId;
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
  const padding = Math.max(8, size * 0.08);
  const qrSize = size - (padding * 2);
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
          level="L"
          includeMargin={true}
          marginSize={1}
          fgColor="#1a1a1a" // Preto suave para melhor contraste
          bgColor="#FFFFFF"
          className="rounded-lg"
        />
      </div>
    </div>
  );
}
