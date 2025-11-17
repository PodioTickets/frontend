"use client";
import { useState } from "react";
import toast from "react-hot-toast";

interface UseClipboardResult {
  copyToClipboard: (text: string) => Promise<void>;
  isCopied: boolean;
  error: string | null;
}

export function useClipboard(): UseClipboardResult {
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyToClipboard = async (text: string): Promise<void> => {
    try {
      setError(null);

      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          document.execCommand("copy");
        } catch (err) {
          throw new Error("Copy failed");
        } finally {
          document.body.removeChild(textArea);
        }
      }
      setIsCopied(true);
      toast.success("Copied to clipboard!", { icon: "✅", duration: 3000 });
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      const errorMessage = "Failed to copy address";
      setError(errorMessage);
      toast.error(errorMessage, {
        icon: "❌",
        duration: 3000,
      });
      throw err;
    }
  };

  return {
    copyToClipboard,
    isCopied,
    error,
  };
}
