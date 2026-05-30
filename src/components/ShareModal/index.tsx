"use client";

import { X, MessageCircle } from "lucide-react";
import { FacebookIcon } from "@/components/Icons/FacebookIcon";
import { TwitterIcon } from "@/components/Icons/TwitterIcon";
import toast from "react-hot-toast";
import { Input } from "../Input";
import { CopyIcon } from "../Icons/CopyIcon";
import { TelegramIcon } from "../Icons/TelegramIcon";
import { InstagramIcon } from "../Icons/InstagramIcon";
import { WhatsappIcon } from "../Icons/WhatsappIcon";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventName: string;
  eventUrl: string;
}

export function ShareModal({
  isOpen,
  onClose,
  eventName,
  eventUrl,
}: ShareModalProps) {
  if (!isOpen) return null;

  const fullUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${eventUrl}`
      : eventUrl;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast.success("Link copiado para a área de transferência!");
    } catch (error) {
      toast.error("Erro ao copiar link");
    }
  };

  const shareOptions = [
    {
      id: "instagram",
      label: "Instagram",
      icon: InstagramIcon,
      outline: true,
      // Instagram NÃO tem endpoint web de compartilhamento de link (ao
      // contrário de FB/Twitter/Telegram). No mobile o Web Share API abre a
      // folha nativa do SO — que lista o Instagram. No desktop (sem Web Share)
      // copiamos o link e abrimos o Instagram pra o usuário colar.
      onClick: async () => {
        if (typeof navigator !== "undefined" && navigator.share) {
          try {
            await navigator.share({ title: eventName, text: eventName, url: fullUrl });
          } catch {
            /* usuário cancelou a folha de compartilhamento — sem ação */
          }
          return;
        }
        try {
          await navigator.clipboard.writeText(fullUrl);
          toast.success("Link copiado! Cole no seu story ou perfil do Instagram.");
        } catch {
          toast.error("Erro ao copiar link");
        }
        window.open("https://www.instagram.com/", "_blank");
      },
    },
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: WhatsappIcon,
      outline: true,
      onClick: () => {
        const url = `https://wa.me/?text=${encodeURIComponent(
          `${eventName}\n\n${fullUrl}`
        )}`;
        window.open(url, "_blank");
      },
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: FacebookIcon,
      outline: true,
      onClick: () => {
        const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
          fullUrl
        )}`;
        window.open(url, "_blank");
      },
    },
    {
      id: "twitter",
      label: "Twitter",
      icon: TwitterIcon,
      outline: true,
      onClick: () => {
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
          eventName
        )}&url=${encodeURIComponent(fullUrl)}`;
        window.open(url, "_blank");
      },
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: TelegramIcon,
      outline: true,
      onClick: () => {
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(
            fullUrl
          )}&text=${encodeURIComponent(eventName)}`,
          "_blank"
        );
      },
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-1 rounded-xl border border-gray-6 py-3 w-full max-w-sm shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 border-b border-gray-6 pb-4 px-4">
          <h2 className="text-xl font-bold text-gray-12">Compartilhar</h2>
          <button
            onClick={onClose}
            className="text-gray-12 hover:text-gray-11 transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 md:gap-6 mb-6 px-4">
          {shareOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.id}
                onClick={option.onClick}
                className="flex flex-col gap-2 size-12 cursor-pointer rounded-full border border-gray-6 hover:border-primary-10 hover:bg-gray-2 transition-colors justify-center items-center"
              >
                <Icon className="size-5" outline={option.outline} />
              </button>
            );
          })}
        </div>

        <div className="flex-1 relative flex items-center gap-2 px-4 mb-4">
          <Input className="text-gray-11 pr-10" value={fullUrl} readOnly />
          <CopyIcon
            className="size-6 absolute right-6 top-1/2 -translate-y-1/2 bg-gray-2 p-1 cursor-pointer"
            onClick={handleCopyLink}
          />
        </div>
      </div>
    </div>
  );
}
