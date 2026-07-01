import { useCallback, useEffect, useState } from "react";

/**
 * Staging de troca de imagem (foto de perfil / logo da organização).
 *
 * Problema que resolve: antes o corte da imagem disparava o upload + persistência
 * na hora, então a foto ficava salva mesmo se o usuário NÃO clicasse em "Salvar"
 * (e não revertia ao sair sem salvar). Aqui o arquivo cortado e/ou a intenção de
 * remover ficam só em memória (com preview local via object URL) até o submit da
 * página — que é quem faz a chamada de rede de fato. Sem persistência prematura e
 * sem upload órfão no storage.
 *
 * A página decide COMO persistir (uploadAvatar, uploadImage+updateLogo, etc.) lendo
 * `file`/`removed` no seu handler de salvar e chamando `reset()` no sucesso.
 */
export interface PendingImageUpload {
  /** Arquivo cortado aguardando persistência. `null` = nenhum novo arquivo. */
  file: File | null;
  /** Usuário pediu remoção (aplicada só no salvar). */
  removed: boolean;
  /** Há alteração de imagem pendente (novo arquivo OU remoção). */
  isDirty: boolean;
  /** Resolve o `src` de exibição dado o valor atual persistido (preview > atual). */
  resolveSrc: (currentUrl: string | null | undefined) => string | null;
  /** Stage de um novo arquivo cortado (substitui qualquer pendência anterior). */
  stageFile: (file: File) => void;
  /** Stage de remoção da imagem atual. */
  stageRemove: () => void;
  /** Limpa o staging (chamar após salvar com sucesso). */
  reset: () => void;
}

/**
 * @param resolveStored Converte a URL persistida → URL exibível (ex.: `getAvatarUrl`).
 *   Deve ser uma referência estável (função de módulo) para não invalidar o `resolveSrc`.
 */
export function usePendingImageUpload(
  resolveStored: (url: string) => string | null = (u) => u,
): PendingImageUpload {
  const [file, setFile] = useState<File | null>(null);
  const [removed, setRemoved] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Revoga o object URL anterior ao trocar/desmontar (evita memory leak do blob).
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const stageFile = useCallback((f: File) => {
    setFile(f);
    setRemoved(false);
    setPreviewUrl(URL.createObjectURL(f));
  }, []);

  const stageRemove = useCallback(() => {
    setFile(null);
    setRemoved(true);
    setPreviewUrl(null);
  }, []);

  const reset = useCallback(() => {
    setFile(null);
    setRemoved(false);
    setPreviewUrl(null);
  }, []);

  const resolveSrc = useCallback(
    (currentUrl: string | null | undefined) => {
      if (previewUrl) return previewUrl;
      if (removed) return null;
      const trimmed = currentUrl?.trim();
      return trimmed ? resolveStored(trimmed) : null;
    },
    [previewUrl, removed, resolveStored],
  );

  return {
    file,
    removed,
    isDirty: file !== null || removed,
    resolveSrc,
    stageFile,
    stageRemove,
    reset,
  };
}
