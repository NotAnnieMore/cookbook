import type { Metadata, Viewport } from "next";

import PwaRegistration from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://cookbook.ivocamacho.com"),
  title: "Cookbook — A nossa coleção de receitas",
  description: "Aplicação privada de receitas para cozinhar, guardar e descobrir em conjunto.",
  applicationName: "Cookbook",
  openGraph: {
    type: "website",
    locale: "pt_PT",
    url: "/",
    siteName: "Cookbook",
    title: "Cookbook — Pequenas receitas, grandes histórias",
    description: "O livro privado de receitas de Ivo e Ana, feito para guardar, descobrir e cozinhar em conjunto.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "Cookbook e o Chef Pitéu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cookbook — Pequenas receitas, grandes histórias",
    description: "O livro privado de receitas de Ivo e Ana, feito para guardar, descobrir e cozinhar em conjunto.",
    images: ["/opengraph-image.png"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Cookbook",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icons/cookbook-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#285240",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
