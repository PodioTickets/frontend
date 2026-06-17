import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333').replace(/\/$/, '');

export type PaymentStatusType = 'PENDING' | 'PAID' | 'FAILED';

interface PaymentStatusResponse {
  payment?: {
    status: PaymentStatusType;
  };
}

export const usePaymentStatus = (registrationId: string | null) => {
  const [status, setStatus] = useState<PaymentStatusType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!registrationId) return;

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
        throw new Error('Erro ao verificar status do pagamento');
      }

      const data: PaymentStatusResponse = await response.json();
      const paymentStatus = data.payment?.status || 'PENDING';
      setStatus(paymentStatus);
      return paymentStatus;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao verificar status';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [registrationId]);

  return { status, loading, error, checkStatus };
};

export const usePaymentStatusPolling = (
  registrationId: string | null,
  onStatusChange?: (status: PaymentStatusType) => void
) => {
  const { status, checkStatus } = usePaymentStatus(registrationId);

  // Refs estabilizam as funções nas deps do effect, evitando que o interval
  // seja desmontado/remontado a cada render quando checkStatus ou onStatusChange mudam.
  const checkStatusRef = useRef(checkStatus);
  useEffect(() => { checkStatusRef.current = checkStatus; }, [checkStatus]);

  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => { onStatusChangeRef.current = onStatusChange; }, [onStatusChange]);

  useEffect(() => {
    if (!registrationId) return;

    const interval = setInterval(async () => {
      try {
        const currentStatus = await checkStatusRef.current();

        if (currentStatus === 'PAID' || currentStatus === 'FAILED') {
          clearInterval(interval);
          if (onStatusChangeRef.current) {
            onStatusChangeRef.current(currentStatus);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar status:', error);
      }
    }, 5000); // Verificar a cada 5 segundos

    // Parar após 30 minutos (tempo de expiração do PIX)
    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 30 * 60 * 1000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [registrationId]); // deps: apenas registrationId — checkStatus/onStatusChange via ref

  return { status };
};
