"use client";

import dynamic from "next/dynamic";

const Toaster = dynamic(
  () => import("react-hot-toast").then((mod) => mod.Toaster),
  {
    ssr: false,
  }
);

export function ToasterWrapper() {
  return <Toaster position="bottom-right" />;
}
