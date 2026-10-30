"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";

export const dynamic = 'force-dynamic';

export default function NotFound() {
  const pathname = usePathname();
  const t = useT("home");
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)]">
      <h2 className="text-2xl font-bold">{t("notFoundTitle")}</h2>
      <p className="text-gray-11">
        {t("notFoundText", { path: pathname })}
      </p>
      <Link href="/" className="text-link-11">
        {t("notFoundBack")}
      </Link>
    </div>
  );
}
