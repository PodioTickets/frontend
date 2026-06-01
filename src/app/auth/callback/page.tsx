"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import toast from "react-hot-toast";
import { isProfileComplete } from "@/utils/checkProfileComplete";
import { useRegisterModal } from "@/stores/modalStore";
import { readReturnPath, clearReturnPath } from "@/utils/authRedirect";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refetchUser, user } = useAuth();
  const { openRegisterModal } = useRegisterModal();
  const [isProcessing, setIsProcessing] = useState(true);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    // Evita processar múltiplas vezes
    if (hasProcessedRef.current) return;

    const processCallback = async () => {
      try {
        const code = searchParams.get("code");
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const error = searchParams.get("error");

        // Destino pós-login (param de URL > localStorage > sessionStorage), já
        // saneado contra open-redirect. Único ponto de leitura — usado em todas
        // as saídas de sucesso/perfil-incompleto.
        const savedReturnTo = readReturnPath(searchParams.get("redirect_to"));

        // Se houver erro na URL, exibe mensagem e redireciona
        if (error) {
          hasProcessedRef.current = true;
          toast.error("Erro ao fazer login com Google. Tente novamente.");
          setTimeout(() => {
            router.push("/");
          }, 1000);
          return;
        }

        // Se recebeu um código OAuth, valida e obtém tokens
        if (code) {
          try {
            hasProcessedRef.current = true;
            // Monta a URL completa do callback (ex: http://localhost:3000/auth/callback)
            const redirectUri =
              window.location.origin + window.location.pathname;

            const response = await userService.validateGoogleCode(
              code,
              redirectUri
            );

            // 2FA requerido: redireciona para home com parâmetro mfaToken no sessionStorage
            if (response.mfaRequired && response.mfaToken) {
              sessionStorage.setItem("googleMfaToken", response.mfaToken);
              router.replace("/?googleMfa=1");
              return;
            }

            if (!response.success || !response.data) {
              const errorMessage =
                response.error ||
                "Erro ao fazer login com Google. Tente novamente.";
              toast.error(errorMessage);
              setTimeout(() => {
                router.push("/");
              }, 1000);
              return;
            }

            // Salva os tokens no ApiClient (que usa cookies)
            const apiClient = (userService as any).apiClient;
            if (
              apiClient &&
              apiClient.setAccessToken &&
              apiClient.setRefreshToken
            ) {
              apiClient.setAccessToken(response.data.access_token);
              apiClient.setRefreshToken(response.data.refresh_token);
            }
            window.history.replaceState(null, "", window.location.pathname);

            const updatedUser = await refetchUser();
            if (!isProfileComplete(updatedUser)) {
              toast.success(
                "Login realizado com sucesso! Complete seu cadastro para continuar."
              );
              openRegisterModal({ completeProfile: true });
              clearReturnPath();
              router.replace(savedReturnTo || "/");
              return;
            }

            toast.success("Login realizado com sucesso!");

            // Volta para o destino salvo antes do login (resiliente ao OAuth)
            // ou para a home.
            const redirectPath = savedReturnTo || "/";
            clearReturnPath();

            setTimeout(() => {
              router.replace(redirectPath);
            }, 500);
            return;
          } catch (validateError) {
            console.error("Erro ao validar código do Google:", validateError);
            hasProcessedRef.current = true;
            toast.error("Erro ao processar autenticação. Tente novamente.");
            setTimeout(() => {
              router.push("/");
            }, 1000);
            return;
          }
        }

        // Se recebeu tokens diretamente (fluxo alternativo)
        if (accessToken && refreshToken) {
          hasProcessedRef.current = true;
          // Salva os tokens no ApiClient (que usa cookies)
          const apiClient = (userService as any).apiClient;
          if (
            apiClient &&
            apiClient.setAccessToken &&
            apiClient.setRefreshToken
          ) {
            apiClient.setAccessToken(accessToken);
            apiClient.setRefreshToken(refreshToken);
          }

          // Busca o perfil do usuário e atualiza o contexto
          try {
            const updatedUser = await refetchUser();

            // Verifica se o perfil está completo
            if (!isProfileComplete(updatedUser)) {
              toast.success(
                "Login realizado com sucesso! Complete seu cadastro para continuar."
              );
              openRegisterModal({ completeProfile: true });
              clearReturnPath();
              router.replace(savedReturnTo || "/");
              return;
            }

            toast.success("Login realizado com sucesso!");

            // Volta para o destino salvo antes do login (resiliente ao OAuth)
            // ou para a home.
            const redirectPath = savedReturnTo || "/";
            clearReturnPath();

            setTimeout(() => {
              router.replace(redirectPath);
            }, 500);
          } catch (profileError) {
            console.error("Erro ao buscar perfil:", profileError);
            toast.error("Erro ao carregar perfil do usuário.");
            setTimeout(() => {
              router.push("/");
            }, 1000);
          }
          return;
        }

        // Se não recebeu nem código nem tokens, só mostra erro se ainda não processou
        if (!hasProcessedRef.current) {
          hasProcessedRef.current = true;
          toast.error("Tokens não recebidos. Tente novamente.");
          setTimeout(() => {
            router.push("/");
          }, 1000);
        }
      } catch (error) {
        console.error("Erro ao processar callback:", error);
        if (!hasProcessedRef.current) {
          hasProcessedRef.current = true;
          toast.error("Erro ao processar autenticação. Tente novamente.");
          setTimeout(() => {
            router.push("/");
          }, 1000);
        }
      } finally {
        setIsProcessing(false);
      }
    };

    processCallback();
  }, [searchParams, router, refetchUser]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-2">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-11"></div>
        <p className="text-gray-11 font-family-dm-sans">
          {isProcessing ? "Processando autenticação..." : "Redirecionando..."}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-2">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-11"></div>
            <p className="text-gray-11 font-family-dm-sans">Carregando...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
