import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import FavouriteButton from "./favourite-button";
import RecipeContent from "./recipe-content";
import RecipeHero from "./recipe-hero";
import RecipeMenu from "./recipe-menu";

const difficultyLabels = {
  easy: "Fácil",
  medium: "Média",
  hard: "Exigente",
} as const;

function formatMinutes(minutes: number | null) {
  if (minutes === null) return "Por definir";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function displayQuantity(value: number | string | null) {
  if (value === null) return "";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 3 }).format(number)
    : String(value);
}

function externalSourceUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export default async function RecipePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ aviso?: string }> }) {
  const { id } = await params;
  const { aviso } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [recipeResult, favouriteResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,description,servings,servings_label,active_time_minutes,total_time_minutes,difficulty,created_by,version,source_url,ingredient_groups(id,name,sort_order),recipe_sections(id,name,sort_order),recipe_ingredients(id,group_id,ingredient_name,optional,scalable,quantity_normalized,quantity_max_normalized,unit_normalized,package_quantity,package_unit,sort_order),recipe_steps(id,section_id,instruction,timer_seconds,sort_order),recipe_images(storage_path,image_kind),recipe_tags(tags(id,name,slug,color))")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("recipe_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (recipeResult.error || !recipeResult.data) notFound();

  const recipe = recipeResult.data;
  const { data: author } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", recipe.created_by)
    .maybeSingle();

  const images = Array.isArray(recipe.recipe_images) ? recipe.recipe_images : [];
  const coverPath = images.find((image) => image.image_kind === "cover")?.storage_path;
  const { data: signedCover } = coverPath
    ? await supabase.storage.from("recipe-images").createSignedUrl(coverPath, 60 * 60)
    : { data: null };
  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const steps = [...(recipe.recipe_steps ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const ingredientGroups = new Map(
    (recipe.ingredient_groups ?? []).map((group) => [group.id, group.name]),
  );
  const stepSections = new Map(
    (recipe.recipe_sections ?? []).map((section) => [section.id, section.name]),
  );
  const tags = (recipe.recipe_tags ?? []).flatMap((recipeTag) => {
    const tag = Array.isArray(recipeTag.tags)
      ? recipeTag.tags[0]
      : recipeTag.tags;
    return tag ? [tag] : [];
  });
  const sourceUrl = externalSourceUrl(recipe.source_url);

  return (
    <main className="min-h-screen bg-[#F8F4EC] pb-20 text-[#27231F]">
      <header className="sticky top-0 z-40 mx-auto flex max-w-6xl items-center justify-between border-b border-[#DDD5C9]/75 bg-[#F8F4EC]/92 px-5 py-3 backdrop-blur-md sm:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          Voltar à coleção
        </Link>
        <FavouriteButton recipeId={recipe.id} userId={user.id} initialFavourite={Boolean(favouriteResult.data)} />
      </header>

      <article className="mx-auto max-w-6xl px-5 sm:px-8">
        {aviso === "fotografia" ? <p role="status" className="mb-5 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">A receita foi atualizada, mas não foi possível guardar a fotografia.</p> : null}
        <RecipeHero
          recipeId={recipe.id}
          title={recipe.title}
          description={recipe.description}
          authorName={author?.display_name ?? "Cookbook"}
          coverUrl={signedCover?.signedUrl ?? null}
          tags={tags}
          activeTime={formatMinutes(recipe.active_time_minutes)}
          totalTime={formatMinutes(recipe.total_time_minutes)}
          servings={recipe.servings ? `${displayQuantity(recipe.servings)} ${recipe.servings_label ?? "pessoas"}` : null}
          difficulty={recipe.difficulty ? difficultyLabels[recipe.difficulty as keyof typeof difficultyLabels] : null}
        />

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]"><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v6H5V6h6"/></svg>Ver fonte original</a> : <span />}
          <RecipeMenu recipeId={recipe.id} recipeTitle={recipe.title} version={recipe.version} />
        </div>

        <RecipeContent
          baseServings={recipe.servings}
          servingsLabel={recipe.servings_label ?? "pessoas"}
          ingredients={ingredients.map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.ingredient_name,
            optional: ingredient.optional,
            scalable: ingredient.scalable,
            quantity: ingredient.quantity_normalized,
            quantityMax: ingredient.quantity_max_normalized,
            unit: ingredient.unit_normalized,
            packageQuantity: ingredient.package_quantity,
            packageUnit: ingredient.package_unit,
            groupName: ingredient.group_id
              ? ingredientGroups.get(ingredient.group_id) ?? null
              : null,
          }))}
          steps={steps.map((step) => ({
            id: step.id,
            instruction: step.instruction,
            sectionName: step.section_id
              ? stepSections.get(step.section_id) ?? null
              : null,
          }))}
        />
      </article>
    </main>
  );
}
