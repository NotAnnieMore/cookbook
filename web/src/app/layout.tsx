import type { Metadata, Viewport } from "next";

import PwaRegistration from "@/components/pwa-registration";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cookbook — A nossa coleção de receitas",
  description: "Aplicação privada de receitas para cozinhar, guardar e descobrir em conjunto.",
  applicationName: "Cookbook",
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
