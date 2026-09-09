import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cookbook — A nossa coleção de receitas",
  description: "Aplicação privada de receitas para cozinhar, guardar e descobrir em conjunto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" className="h-full antialiased" data-scroll-behavior="smooth">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
