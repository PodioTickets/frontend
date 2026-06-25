"use client";

import Image from "next/image";
import { useState } from "react";
import { getAvatarUrl } from "@/utils/avatar";
import { cn } from "@/utils/cn";

type UserAvatarShape = "sm" | "lg" | "full";

/**
 * Avatar de USUÁRIO (foto de perfil) com fallback para iniciais.
 *
 * Sempre prioriza a imagem (`avatarUrl`); só cai nas iniciais quando não há
 * imagem ou ela falha ao carregar (estado de erro por instância — por isso é um
 * componente, seguro em listas). Centraliza o padrão usado nas listas de
 * equipe/membros para não replicar o bloco `avatarUrl ? <Image> : iniciais`.
 *
 * `shape`: `"sm"` = 32px arredondado-médio (linhas de log/auditoria); `"lg"` =
 * 40px arredondado (cards mobile); `"full"` = 36px círculo (tabelas desktop).
 * `initials` mantém o estilo de iniciais já existente em cada tela.
 */
export function UserAvatar({
  avatarUrl,
  name,
  initials,
  shape,
  className,
}: {
  avatarUrl?: string | null;
  name: string;
  initials: string;
  shape: UserAvatarShape;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const hasAvatar = Boolean(avatarUrl) && !imgError;
  const rounded =
    shape === "lg" ? "rounded-lg" : shape === "sm" ? "rounded-md" : "rounded-full";
  const sizeCls = shape === "lg" ? "size-10" : shape === "sm" ? "size-8" : "size-9";
  const sizePx = shape === "lg" ? 40 : shape === "sm" ? 32 : 36;

  return (
    <div
      className={cn("relative shrink-0 overflow-hidden", sizeCls, rounded, className)}
    >
      {hasAvatar ? (
        <Image
          src={getAvatarUrl(avatarUrl ?? "") as string}
          alt={name || "Usuário"}
          width={sizePx}
          height={sizePx}
          className={cn("object-cover size-full", rounded)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center bg-gray-5 size-full text-xs font-semibold text-gray-12 font-family-dm-sans",
            rounded,
          )}
        >
          {initials}
        </div>
      )}
    </div>
  );
}
