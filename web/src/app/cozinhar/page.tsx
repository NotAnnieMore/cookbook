import Link from "next/link";
import { redirect } from "next/navigation";

import AppDecorations from "@/components/app-decorations";
import { CookbookMascotIllustration } from "@/components/cookbook-mascot";
import StickyPageHeader from "@/components/sticky-page-header";
import { createClient } from "@/lib/supabase/server";

function formatMinutes(minutes: number | null) {
  if (!minutes) return "Tempo por definir";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export default async function CookModePickerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipes, error } = await supabase
    .from("recipes")
    .select("id,title,description,total_time_minutes,active_time_minutes,recipe_steps(id),recipe_images(storage_path,image_kind)")
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Não foi possível carregar receitas para o modo cozinhar", { code: error.code });
  }

  const coverPaths = (recipes ?? []).map((recipe) => {
    const images = Array.isArray(recipe.recipe_images) ? recipe.recipe_images : [];
    return images.find((image) => image.image_kind === "cover")?.storage_path ?? null;
  });
  const validCoverPaths = coverPaths.filter((path): path is string => Boolean(path));
  const signedUrls = new Map<string, string>();

  if (validCoverPaths.length) {
    const { data } = await supabase.storage.from("recipe-images").createSignedUrls(validCoverPaths, 60 * 60);
    data?.forEach((item, index) => {
      if (item.signedUrl) signedUrls.set(validCoverPaths[index], item.signedUrl);
    });
  }

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] pb-16 text-[#27231F]">
      <AppDecorations tone="mixed" />
      <StickyPageHeader label="Voltar ao início" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid items-center gap-6 rounded-[2rem_2rem_4rem_2rem] bg-[#285240] px-6 py-7 text-white shadow-[0_12px_0_#E2D9CD] sm:grid-cols-[1fr_auto] sm:px-10 sm:py-9">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Mãos à obra</p>
            <h1 className="mt-2 font-serif text-4xl font-black tracking-[-.04em] sm:text-5xl">O que vamos cozinhar?</h1>
            <p className="mt-3 max-w-2xl leading-7 text-white/72">Escolhe uma receita para abrir passos grandes, progresso, temporizadores e os ingredientes sempre à mão.</p>
          </div>
          <CookbookMascotIllustration variant="cooking" className="mx-auto size-32 sm:size-40" priority />
        </section>

        {(recipes ?? []).length ? (
          <section className="mt-10" aria-labelledby="cook-recipes-title">
            <h2 id="cook-recipes-title" className="font-serif text-3xl font-black tracking-[-.035em]">Escolher receita</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {(recipes ?? []).map((recipe, index) => {
                const coverPath = coverPaths[index];
                const coverUrl = coverPath ? signedUrls.get(coverPath) : null;
                const stepCount = Array.isArray(recipe.recipe_steps) ? recipe.recipe_steps.length : 0;
                return (
                  <Link key={recipe.id} href={`/receitas/${recipe.id}/cozinhar`} className="group overflow-hidden rounded-[1.7rem_1.7rem_3.5rem_1.7rem] bg-[#FFFCF6] shadow-[0_8px_0_#E4DCD0] transition hover:-translate-y-1">
                    <div className="relative h-44 overflow-hidden bg-[#E5EBDD]">
                      {coverUrl ? <div role="img" aria-label={`Fotografia de ${recipe.title}`} className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.03]" style={{ backgroundImage: `url("${coverUrl.replaceAll('"', '\\"')}")` }} /> : <div className="grid h-full place-items-center"><CookbookMascotIllustration className="size-28" /></div>}
                    </div>
                    <div className="p-5">
                      <h3 className="font-serif text-2xl font-black leading-tight tracking-[-.025em]">{recipe.title}</h3>
                      {recipe.description ? <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#746D64]">{recipe.description}</p> : null}
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs font-extrabold text-[#285240]">
                        <span>{formatMinutes(recipe.total_time_minutes ?? recipe.active_time_minutes)}</span>
                        <span>{stepCount} {stepCount === 1 ? "passo" : "passos"} →</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="mt-10 rounded-[2rem] border-2 border-dashed border-[#CFC6B8] bg-[#FFFCF6]/70 px-6 py-12 text-center">
            <h2 className="font-serif text-3xl font-black">Ainda não há receitas para cozinhar.</h2>
            <Link href="/receitas/nova" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#285240] px-6 text-sm font-extrabold text-white">Adicionar a primeira receita</Link>
          </section>
        )}
      </div>
    </main>
  );
}
