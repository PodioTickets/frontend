import { useState, useCallback } from 'react';
import type { PixPayment } from '@/interfaces/checkout';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');

interface PaymentSummaryResponse {
  payment?: {
    status: string;
    method: string;
    transactionId: string;
    metadata?: {
      pix?: {
        qrCode?: string;
        qrCodeBase64?: string;
        expiresAt?: string;
      };
    };
  };
}

export const usePixPayment = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPixData = useCallback(async (registrationId: string): Promise<PixPayment | null> => {
    setLoading(true);
    setError(null);

    try {
      // Auth por cookie httpOnly: cookie enviado via `credentials: 'include'`.
      const response = await fetch(
        `${API_BASE_URL}/api/v1/payments/registration/${registrationId}/summary`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao buscar dados do PIX');
      }

      const data: PaymentSummaryResponse = await response.json();
      
      // Verificar se há dados do PIX no metadata
      if (data.payment?.metadata?.pix) {
        const pixMetadata = data.payment.metadata.pix;
        
        if (pixMetadata.qrCode && pixMetadata.qrCodeBase64) {
          return {
            qrCode: pixMetadata.qrCode,
            qrCodeBase64: pixMetadata.qrCodeBase64,
            expirationDate: pixMetadata.expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          };
        }
      }

      return null;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao buscar dados do PIX';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPixDataWithRetry = useCallback(
    async (
      registrationId: string,
      maxRetries: number = 5,
      retryDelay: number = 2000
    ): Promise<PixPayment | null> => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const pixData = await fetchPixData(registrationId);
        
        if (pixData) {
          return pixData;
        }

        // Aguardar antes de tentar novamente (exceto na última tentativa)
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }

      return null;
    },
    [fetchPixData]
  );

  return { fetchPixData, fetchPixDataWithRetry, loading, error };
};
