import { useState, useCallback } from 'react';
import type {
  CheckoutRequest,
  CheckoutResponse,
  ErrorResponse,
} from '@/interfaces/checkout';

interface UseCheckoutReturn {
  processCheckout: (data: CheckoutRequest) => Promise<CheckoutResponse>;
  loading: boolean;
  error: string | null;
}

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');

export const useCheckout = (): UseCheckoutReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processCheckout = useCallback(async (data: CheckoutRequest) => {
    setLoading(true);
    setError(null);

    try {
      // Auth por cookie httpOnly: `credentials: 'include'` envia o cookie; o
      // backend lê do cookie (sem Bearer manual). 401 é tratado abaixo.
      const response = await fetch(`${API_BASE_URL}/api/v1/checkout/process`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        const errorMessage = Array.isArray(errorData.message)
          ? errorData.message.join(', ')
          : errorData.message || 'Erro ao processar checkout';
        throw new Error(errorMessage);
      }

      const result: CheckoutResponse = await response.json();
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao processar checkout. Tente novamente.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { processCheckout, loading, error };
};
