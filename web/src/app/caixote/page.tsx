import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import RestoreButton from "./restore-button";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-PT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function TrashPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recipesResult, profilesResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,description,deleted_at,deleted_by,version")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase.from("profiles").select("id,display_name"),
  ]);
  const profiles = new Map(
    (profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  const recipes = recipesResult.data ?? [];

  return (
    <main className="min-h-screen overflow-hidden bg-[#F8F4EC] pb-20 text-[#27231F]">
      <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-[46%_54%_61%_39%/57%_41%_59%_43%] bg-[#F2A58B]/45" />
      <header className="relative mx-auto max-w-5xl px-5 pb-10 pt-6 sm:px-8 sm:pt-9">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          Voltar à coleção
        </Link>
        <p className="mt-9 text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Nada se perde por engano</p>
        <h1 className="mt-2 font-serif text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">Caixote</h1>
        <p className="mt-5 max-w-2xl leading-7 text-[#716A62]">As receitas removidas ficam aqui até decidirem o que fazer. Nesta fase não existe eliminação automática nem definitiva.</p>
      </header>

      <section className="relative mx-auto max-w-5xl px-5 sm:px-8" aria-label="Receitas no caixote">
        {recipes.length ? (
          <div className="space-y-4">
            {recipes.map((recipe, index) => (
              <article key={recipe.id} className={`flex flex-col gap-5 bg-[#FFFCF6] p-6 sm:flex-row sm:items-center sm:justify-between ${index % 2 ? "rounded-[2rem_4rem_2rem_2rem]" : "rounded-[4rem_2rem_2rem_2rem]"}`}>
                <div>
                  <p className="text-xs font-bold text-[#8A8278]">Removida em {formatDate(recipe.deleted_at as string)}{recipe.deleted_by ? ` por ${profiles.get(recipe.deleted_by) ?? "um membro"}` : ""}</p>
                  <h2 className="mt-1 font-serif text-2xl font-black tracking-[-.025em]">{recipe.title}</h2>
                  {recipe.description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#716A62]">{recipe.description}</p> : null}
                </div>
                <RestoreButton recipeId={recipe.id} version={recipe.version} />
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[2rem_2rem_5rem_2rem] border-2 border-dashed border-[#CEC5B8] py-16 text-center">
            <svg aria-hidden viewBox="0 0 120 120" className="mx-auto size-24 text-[#AFC9DA]" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"><path d="M28 35h64l-5 65H33l-5-65Z" /><path d="M20 35h80M44 35V22h32v13" /><path d="M47 55v25M73 55v25" /></svg>
            <h2 className="mt-4 font-serif text-2xl font-black">O caixote está vazio.</h2>
            <p className="mt-2 text-sm text-[#716A62]">Todas as receitas continuam na coleção.</p>
          </div>
        )}
      </section>
    </main>
  );
}
