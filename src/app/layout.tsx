import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "react-hot-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PodioTicket",
  description:
    "PodioTicket is a platform for creating and managing tickets for your events.",
  keywords: ["podio tickets", "tickets", "events", "management"],
  authors: [{ name: "PodioTicket Team" }],
  creator: "PodioTicket",
  publisher: "PodioTicket",
  robots: "index, follow",
  openGraph: {
    title: "PodioTicket",
    description:
      "PodioTicket is a platform for creating and managing tickets for your events.",
    type: "website",
    locale: "pt-BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PodioTicket",
    description:
      "PodioTicket is a platform for creating and managing tickets for your events.",
  },
  icons: {
    icon: [
      { url: "/images/logo.png", sizes: "64x64", type: "image/png" },
      { url: "/images/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/images/logo.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/images/logo.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" href="/images/logo.png" />
      </head>

      <body suppressHydrationWarning className="scroll-smooth antialiased">
        <Toaster position="bottom-right" />
        <Providers>
          <div className="flex flex-col min-h-screen bg-gray-2">
            <Header />

            <Suspense fallback={<Loading />}>
              <div className="mt-[64px] md:mt-[68px] mb-12">{children}</div>
            </Suspense>

            <Footer />
          </div>
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
