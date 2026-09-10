import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { BackToCollection } from "@/app/receitas/nova/recipe-form";
import { createClient } from "@/lib/supabase/server";

import UrlImportFlow from "./url-import-flow";

export const metadata: Metadata = {
  title: "Importar link · Cookbook",
  description: "Transformar uma página pública numa receita editável.",
};

function nameFromEmail(email: string | undefined) {
  const localPart = email?.split("@")[0]?.trim();
  if (!localPart) return "Utilizador";
  return localPart.charAt(0).toLocaleUpperCase("pt-PT") + localPart.slice(1);
}

export default async function ImportUrlPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const displayName = profile?.display_name || nameFromEmail(user.email);

  return (
    <main className="min-h-screen overflow-hidden bg-[#F8F4EC] text-[#27231F]">
      <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-[46%_54%_61%_39%/57%_41%_59%_43%] bg-[#F3C565]/45" />
      <header className="relative mx-auto max-w-5xl px-5 pb-9 pt-6 sm:px-8 sm:pt-9">
        <BackToCollection />
        <div className="mt-8 max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Trazer uma receita</p>
          <h1 className="mt-2 font-serif text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">Importar link</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#716A62]">Lemos a página com limites de segurança, organizamos a receita e mostramos sempre um preview editável antes de guardar.</p>
        </div>
      </header>
      <UrlImportFlow displayName={displayName} />
    </main>
  );
}
