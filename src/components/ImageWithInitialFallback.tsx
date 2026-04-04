"use client";

import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { itemInitialLetter } from "@/utils/itemInitial";
import { cn } from "@/utils/cn";

type BaseProps = {
  src: string | null | undefined;
  alt: string;
  name: string;
  fallbackId?: string;
  className?: string;
  letterClassName?: string;
  imgClassName?: string;
  priority?: boolean;
  /** Evita validação de domínio do next/image (útil para ícones de API / http). */
  nativeImg?: boolean;
};

export type ImageWithInitialFallbackProps =
  | (BaseProps & { fill: true; sizes: string })
  | (BaseProps & { fill?: false; width: number; height: number; sizes?: string });

export function ImageWithInitialFallback(props: ImageWithInitialFallbackProps) {
  const {
    src,
    alt,
    name,
    fallbackId,
    className,
    letterClassName,
    imgClassName,
    priority,
    nativeImg,
  } = props;

  const fill = "fill" in props && props.fill === true;
  const [failed, setFailed] = useState(false);
  const trimmed = src?.trim() ?? "";

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  const showImage = Boolean(trimmed) && !failed;
  const initial = itemInitialLetter(name, fallbackId);
  const onError = useCallback(() => setFailed(true), []);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-gray-3 border border-primary-8 flex items-center justify-center",
        className
      )}
    >
      {showImage ? (
        nativeImg ? (
          fill ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trimmed}
              alt={alt}
              className={cn(
                "absolute inset-0 size-full object-cover",
                imgClassName,
              )}
              onError={onError}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={trimmed}
              alt={alt}
              width={props.width}
              height={props.height}
              className={cn(
                "object-cover size-full max-h-full max-w-full",
                imgClassName,
              )}
              onError={onError}
            />
          )
        ) : fill ? (
          <Image
            src={trimmed}
            alt={alt}
            fill
            sizes={props.sizes}
            priority={priority}
            className={cn("object-cover", imgClassName)}
            onError={onError}
          />
        ) : (
          <Image
            src={trimmed}
            alt={alt}
            width={props.width}
            height={props.height}
            sizes={props.sizes}
            priority={priority}
            className={cn("object-cover size-full max-h-full max-w-full", imgClassName)}
            onError={onError}
          />
        )
      ) : (
        <span
          className={cn(
            "font-semibold text-gray-11 select-none font-family-dm-sans",
            letterClassName
          )}
        >
          {initial}
        </span>
      )}
    </div>
  );
}
