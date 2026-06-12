// build bump
import type { Metadata } from "next";
import { Manrope, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Providers from "@/components/Providers";
import { ToasterWrapper } from "@/components/ToasterWrapper";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";
import { Loading } from "@/components/Loading";
import { ContentWrapper } from "@/components/ContentWrapper";
import { OrganizerAppSurfaceProvider } from "@/contexts/OrganizerAppSurfaceContext";
import { AdminAppSurfaceProvider } from "@/contexts/AdminAppSurfaceContext";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // Base para resolver URLs relativas das tags OG/canonical (ex.: og:image).
  // As páginas com `generateMetadata` já emitem URLs absolutas, mas definir aqui
  // silencia o aviso do Next e cobre metadata relativa em qualquer rota.
  metadataBase: new URL(
    (process.env.NEXT_PUBLIC_ROOT_SITE_URL || "http://localhost:3000").replace(
      /\/$/,
      "",
    ),
  ),
  title: "PódioTicket",
  description:
    "PódioTicket is a platform for creating and managing tickets for your events.",
  keywords: ["pódio tickets", "tickets", "events", "management"],
  authors: [{ name: "PódioTicket Team" }],
  creator: "PódioTicket",
  publisher: "PódioTicket",
  robots: "index, follow",
  openGraph: {
    title: "PódioTicket",
    description:
      "PódioTicket is a platform for creating and managing tickets for your events.",
    type: "website",
    locale: "pt-BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "PódioTicket",
    description:
      "PódioTicket is a platform for creating and managing tickets for your events.",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host")?.split(":")[0]?.toLowerCase() ?? "";
  // Shell (Header/Footer) por HOST do painel. Usa o env SERVER (settável por-deploy
  // sem rebuild); cai pro NEXT_PUBLIC (build-time) se o server não estiver setado.
  // Match EXATO de propósito: o app host serve também páginas públicas, então marcar
  // por heurística esconderia o Header/Footer delas.
  const appHost = (process.env.ORGANIZER_APP_HOST || process.env.NEXT_PUBLIC_ORGANIZER_APP_HOST)
    ?.split("://").pop()?.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const adminHost = (process.env.ADMIN_APP_HOST || process.env.NEXT_PUBLIC_ADMIN_APP_HOST)
    ?.split("://").pop()?.split("/")[0]?.split(":")[0]?.trim().toLowerCase() ?? "";
  const isAppOrganizerSurface = Boolean(appHost && host === appHost);
  const isAdminSurface = Boolean(adminHost && host === adminHost);

  return (
    <html lang="pt-BR" className={`${manrope.variable} ${dmSans.variable}`}>
      <head>
        <link rel="icon" href="/images/logo.png" />
      </head>

      <body suppressHydrationWarning className="scroll-smooth antialiased">
        <AdminAppSurfaceProvider value={isAdminSurface}>
          <OrganizerAppSurfaceProvider value={isAppOrganizerSurface}>
            <ToasterWrapper />
            <Providers>
              <div className="flex flex-col min-h-screen bg-gray-2 overflow-x-clip">
                <Header />

                <Suspense fallback={<Loading />}>
                  <ContentWrapper>{children}</ContentWrapper>
                </Suspense>

                <Footer />
              </div>
            </Providers>
          </OrganizerAppSurfaceProvider>
        </AdminAppSurfaceProvider>
      </body>
    </html>
  );
}
