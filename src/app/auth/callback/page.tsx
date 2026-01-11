"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { userService } from "@/services";
import toast from "react-hot-toast";
import { isProfileComplete } from "@/utils/checkProfileComplete";
import { useRegisterModal } from "@/stores/modalStore";

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
              return;
            }

            toast.success("Login realizado com sucesso!");

            // Redireciona para a URL salva antes do login ou para home
            const redirectPath =
              typeof window !== "undefined"
                ? sessionStorage.getItem("redirectAfterLogin") || "/"
                : "/";

            // Remove a URL salva após usar
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("redirectAfterLogin");
            }

            setTimeout(() => {
              router.push(redirectPath);
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
              // Se não estiver completo, abre o modal de registro para completar cadastro
              toast.success(
                "Login realizado com sucesso! Complete seu cadastro para continuar."
              );
              // Abre o modal sem redirecionar - o modal pode aparecer em qualquer página
              openRegisterModal({ completeProfile: true });
              // Não redireciona, mantém o usuário na página atual
              return;
            }

            toast.success("Login realizado com sucesso!");

            // Redireciona para a URL salva antes do login ou para home
            const redirectPath =
              typeof window !== "undefined"
                ? sessionStorage.getItem("redirectAfterLogin") || "/"
                : "/";

            // Remove a URL salva após usar
            if (typeof window !== "undefined") {
              sessionStorage.removeItem("redirectAfterLogin");
            }

            setTimeout(() => {
              router.push(redirectPath);
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
        <p className="text-gray-11 font-dm-sans">
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
            <p className="text-gray-11 font-dm-sans">Carregando...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
