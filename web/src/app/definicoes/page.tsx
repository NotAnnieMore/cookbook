import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AppDecorations from "@/components/app-decorations";
import { CookbookMascotMark } from "@/components/cookbook-mascot";
import StickyPageHeader from "@/components/sticky-page-header";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Segurança dos dados · Cookbook",
};

export default async function SettingsPage() {
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

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#F8F4EC] pb-20 text-[#27231F]">
      <AppDecorations tone="mixed" />
      <StickyPageHeader label="Voltar à coleção">
        <CookbookMascotMark className="size-9" title="Chef Pitéu" />
      </StickyPageHeader>

      <div className="relative z-10 mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Definições</p>
        <h1 className="mt-2 max-w-2xl font-serif text-4xl font-black tracking-[-.04em] sm:text-6xl">Segurança dos dados</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#746D64]">A coleção é privada, protegida pela sessão de {profile?.display_name ?? "utilizador"} e pelas regras de acesso da casa.</p>

        <div className="mt-9 grid gap-5 md:grid-cols-2">
          <section className="rounded-[2rem_2rem_4rem_2rem] bg-[#E5EBDD] p-6 shadow-[0_9px_0_#D6D0C5] sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#285240]">Acesso privado</p>
            <h2 className="mt-2 font-serif text-2xl font-black">Só entram membros da casa</h2>
            <p className="mt-3 text-sm leading-6 text-[#5F695F]">As receitas e fotografias usam regras de acesso na Supabase. Não existe registo público e a chave privada da IA nunca é enviada para o navegador.</p>
          </section>

          <section className="rounded-[2rem_4rem_2rem_2rem] bg-[#AFC9DA] p-6 shadow-[0_9px_0_#D6D0C5] sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#24495A]">Neste dispositivo</p>
            <h2 className="mt-2 font-serif text-2xl font-black">Sessão e cache limpas ao sair</h2>
            <p className="mt-3 text-sm leading-6 text-[#405B67]">Ao terminares sessão, o Cookbook remove o progresso local e os dados temporários para não ficarem disponíveis à conta seguinte.</p>
          </section>
        </div>

        <section className="mt-6 rounded-[2rem_2rem_4.5rem_2rem] border-2 border-[#E2B64F] bg-[#FFF8E7] p-6 sm:p-9">
          <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.16em] text-[#9B5B2C]">Cópia de segurança</p>
              <h2 className="mt-2 font-serif text-3xl font-black">Guardar uma cópia privada</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#715C42]">Descarrega receitas, ingredientes, passos, avaliações, origens e fotografias num único ficheiro. O ficheiro contém dados privados: guarda-o num local seguro.</p>
            </div>
            <a href="/api/backup" download className="inline-flex min-h-14 items-center justify-center rounded-full bg-[#285240] px-7 text-center text-sm font-extrabold text-white shadow-[0_5px_0_#17382A] transition hover:-translate-y-0.5">Descarregar cópia</a>
          </div>
          <p className="mt-5 border-t border-[#E8CF91] pt-4 text-xs leading-5 text-[#826B4E]">O Chef Pitéu inclui fotografias até um total de 75 MB e assinala no próprio ficheiro se alguma não couber. A recuperação automática será validada numa etapa própria antes de existir um botão de restauro.</p>
        </section>
      </div>
    </main>
  );
}
