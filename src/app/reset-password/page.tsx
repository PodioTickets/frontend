"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLoginModal } from "@/stores/modalStore";
import toast from "react-hot-toast";

function OpenResetPasswordModal() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { openLoginModal } = useLoginModal();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const token = searchParams.get("token")?.trim() ?? "";
    if (token.length > 0) {
      openLoginModal({ passwordResetToken: token });
    } else {
      toast.error("Link inválido ou incompleto.");
    }
    router.replace("/", { scroll: false });
  }, [searchParams, openLoginModal, router]);

  return null;
}

export default function ResetPasswordEntryPage() {
  return (
    <Suspense fallback={null}>
      <OpenResetPasswordModal />
    </Suspense>
  );
}
