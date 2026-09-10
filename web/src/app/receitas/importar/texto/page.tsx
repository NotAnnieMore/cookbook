import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AppDecorations from "@/components/app-decorations";
import StickyPageHeader from "@/components/sticky-page-header";
import { createClient } from "@/lib/supabase/server";

import TextImportFlow from "./text-import-flow";

export const metadata: Metadata = {
  title: "Importar texto · Cookbook",
  description: "Transformar texto numa receita editável antes de guardar.",
};

function nameFromEmail(email: string | undefined) {
  const localPart = email?.split("@")[0]?.trim();
  if (!localPart) return "Utilizador";
  return localPart.charAt(0).toLocaleUpperCase("pt-PT") + localPart.slice(1);
}

export default async function ImportTextPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.display_name || nameFromEmail(user.email);

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] text-[#27231F]">
      <AppDecorations tone="blue" />
      <StickyPageHeader />
      <header className="relative z-10 mx-auto max-w-5xl px-5 pb-9 pt-8 sm:px-8 sm:pt-10">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Trazer uma receita</p>
          <h1 className="mt-2 font-serif text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">Importar texto</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#716A62]">Primeiro organizamos o texto com regras previsíveis. Depois revês ingredientes, medidas e passos antes de decidir guardar.</p>
        </div>
      </header>
      <div className="relative z-10"><TextImportFlow displayName={displayName} /></div>
    </main>
  );
}
