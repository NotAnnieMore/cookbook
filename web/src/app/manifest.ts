import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Cookbook — A nossa coleção de receitas",
    short_name: "Cookbook",
    description: "Receitas privadas para cozinhar, guardar e descobrir em conjunto.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#F8F4EC",
    theme_color: "#F8F4EC",
    orientation: "any",
    icons: [
      {
        src: "/icons/cookbook-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/cookbook-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Adicionar receita",
        short_name: "Adicionar",
        url: "/receitas/nova",
      },
      {
        name: "Modo cozinhar",
        short_name: "Cozinhar",
        url: "/cozinhar",
      },
    ],
  };
}
