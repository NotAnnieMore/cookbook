import Link from "next/link";
import { redirect } from "next/navigation";

import AppDecorations from "@/components/app-decorations";
import { CookbookMascotIllustration } from "@/components/cookbook-mascot";
import StickyPageHeader from "@/components/sticky-page-header";
import type { RecipeDifficulty, RecipeTag } from "@/lib/recipes/types";
import { createClient } from "@/lib/supabase/server";

import DiscoveryWheel, { type DiscoveryRecipe } from "./discovery-wheel";

export default async function ExplorePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recipesResult, favouritesResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,description,active_time_minutes,total_time_minutes,difficulty,updated_at,recipe_images(storage_path,image_kind),recipe_tags(tags(id,name,slug,color))")
      .is("deleted_at", null)
      .order("updated_at", { ascending: false }),
    supabase.from("recipe_favorites").select("recipe_id").eq("user_id", user.id),
  ]);

  if (recipesResult.error) console.error("Não foi possível carregar a descoberta", { code: recipesResult.error.code });
  const favourites = new Set((favouritesResult.data ?? []).map((item) => item.recipe_id));
  const coverPaths = (recipesResult.data ?? []).map((recipe) => {
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

  const recipes: DiscoveryRecipe[] = (recipesResult.data ?? []).map((recipe, index) => ({
    id: recipe.id,
    title: recipe.title,
    description: recipe.description,
    activeTimeMinutes: recipe.active_time_minutes,
    totalTimeMinutes: recipe.total_time_minutes,
    difficulty: recipe.difficulty as RecipeDifficulty,
    isFavourite: favourites.has(recipe.id),
    coverUrl: coverPaths[index] ? signedUrls.get(coverPaths[index] as string) ?? null : null,
    tags: (recipe.recipe_tags ?? []).flatMap((recipeTag) => {
      const tag = Array.isArray(recipeTag.tags) ? recipeTag.tags[0] : recipeTag.tags;
      return tag ? [tag as RecipeTag] : [];
    }),
  }));

  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] pb-20 text-[#27231F]">
      <AppDecorations tone="warm" />
      <StickyPageHeader label="Voltar ao início" maxWidth="max-w-6xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[2rem_2rem_4rem_2rem] bg-[#FFFCF6]/92 px-6 py-6 shadow-[0_10px_0_#E3DACF] sm:gap-5 sm:px-9 sm:py-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#E25B43]">Descoberta</p>
            <h1 className="mt-2 font-serif text-3xl font-black tracking-[-.045em] sm:text-5xl">Deixa o Cookbook escolher.</h1>
            <p className="mt-3 hidden max-w-2xl text-sm leading-6 text-[#746D64] min-[430px]:block sm:text-base sm:leading-7">Escolhe um tema e sorteamos apenas entre as receitas que já fazem parte da vossa coleção.</p>
          </div>
          <CookbookMascotIllustration variant="choosing" className="size-24 sm:size-36" priority />
        </section>

        {recipes.length ? <DiscoveryWheel recipes={recipes} /> : (
          <section className="mt-8 rounded-[2rem] border-2 border-dashed border-[#CFC6B8] bg-[#FFFCF6]/75 px-6 py-12 text-center">
            <h2 className="font-serif text-3xl font-black">Ainda não há receitas para descobrir.</h2>
            <Link href="/receitas/nova" className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#285240] px-6 text-sm font-extrabold text-white">Adicionar a primeira receita</Link>
          </section>
        )}
      </div>
    </main>
  );
}
