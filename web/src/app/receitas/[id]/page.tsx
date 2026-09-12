import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import AppDecorations from "@/components/app-decorations";
import StickyPageHeader from "@/components/sticky-page-header";
import { canonicalIngredientUnit } from "@/lib/recipes/measurements";
import { createClient } from "@/lib/supabase/server";

import FavouriteButton from "./favourite-button";
import RecipeContent from "./recipe-content";
import RecipeGallery from "./recipe-gallery";
import RecipeHero from "./recipe-hero";
import RecipeMenu from "./recipe-menu";
import RecipeRating from "./recipe-rating";

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

  const [recipeResult, favouriteResult, ratingsResult, profilesResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,description,servings,servings_label,active_time_minutes,total_time_minutes,difficulty,created_by,version,source_url,ingredient_groups(id,name,sort_order),recipe_sections(id,name,sort_order),recipe_ingredients(id,group_id,ingredient_name,optional,scalable,quantity_normalized,quantity_max_normalized,unit_normalized,package_quantity,package_unit,sort_order),recipe_steps(id,section_id,instruction,timer_seconds,sort_order),recipe_images(id,storage_path,image_kind,alt_text,sort_order,created_at),recipe_tags(tags(id,name,slug,color))")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("recipe_favorites")
      .select("recipe_id")
      .eq("recipe_id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("ratings").select("user_id,score").eq("recipe_id", id),
    supabase.from("profiles").select("id,display_name").order("display_name"),
  ]);

  if (recipeResult.error || !recipeResult.data) notFound();

  const recipe = recipeResult.data;
  const profileNames = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile.display_name]));
  const scores = new Map((ratingsResult.data ?? []).map((rating) => [rating.user_id, rating.score]));

  const images = Array.isArray(recipe.recipe_images) ? recipe.recipe_images : [];
  const coverPath = images.find((image) => image.image_kind === "cover")?.storage_path;
  const galleryImages = images
    .filter((image) => image.image_kind === "gallery")
    .sort((first, second) => first.sort_order - second.sort_order || first.created_at.localeCompare(second.created_at));
  const { data: signedCover } = coverPath
    ? await supabase.storage.from("recipe-images").createSignedUrl(coverPath, 60 * 60)
    : { data: null };
  const { data: signedGallery } = galleryImages.length
    ? await supabase.storage.from("recipe-images").createSignedUrls(galleryImages.map((image) => image.storage_path), 60 * 60)
    : { data: [] };
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
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] pb-20 text-[#27231F]">
      <AppDecorations tone="mixed" />
      <StickyPageHeader maxWidth="max-w-6xl">
        <div className="flex items-center gap-1">
          <FavouriteButton recipeId={recipe.id} userId={user.id} initialFavourite={Boolean(favouriteResult.data)} />
          <RecipeMenu recipeId={recipe.id} recipeTitle={recipe.title} version={recipe.version} />
        </div>
      </StickyPageHeader>

      <article className="relative z-10 mx-auto max-w-6xl px-5 pt-5 sm:px-8 sm:pt-7">
        {aviso === "fotografia" ? <p role="status" className="mb-5 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">A receita foi atualizada, mas não foi possível guardar a fotografia.</p> : null}
        <RecipeHero
          recipeId={recipe.id}
          title={recipe.title}
          description={recipe.description}
          authorName={profileNames.get(recipe.created_by) ?? "Cookbook"}
          coverUrl={signedCover?.signedUrl ?? null}
          tags={tags}
          activeTime={formatMinutes(recipe.active_time_minutes)}
          totalTime={formatMinutes(recipe.total_time_minutes)}
          servings={recipe.servings ? `${displayQuantity(recipe.servings)} ${recipe.servings_label ?? "pessoas"}` : null}
          difficulty={recipe.difficulty ? difficultyLabels[recipe.difficulty as keyof typeof difficultyLabels] : null}
        />

        <div className={`mt-7 grid gap-3 ${steps.length ? "grid-cols-2" : "grid-cols-1"}`}>
          {steps.length ? <Link href={`/receitas/${recipe.id}/cozinhar`} className="flex min-h-14 items-center justify-center gap-2 rounded-[1.4rem_1.4rem_2.4rem_1.4rem] bg-[#285240] px-3 text-center text-sm font-extrabold text-white shadow-[0_5px_0_#193A2B] transition hover:-translate-y-0.5 sm:px-6 sm:text-base">
            <svg aria-hidden viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 11h14l-1 8H6l-1-8Z"/><path d="M3 11h18M8 7c-2-2 1-3 0-5M13 7c-2-2 1-3 0-5M18 7c-2-2 1-3 0-5"/></svg>
            Iniciar modo cozinhar
          </Link> : null}
          <Link href={`/receitas/${recipe.id}/editar`} className="flex min-h-14 items-center justify-center gap-2 rounded-[1.4rem_1.4rem_2.4rem_1.4rem] border-2 border-[#285240] bg-[#FFFCF6] px-3 text-center text-sm font-extrabold text-[#285240] transition hover:-translate-y-0.5 hover:bg-[#E5EBDD] sm:px-6 sm:text-base">
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></svg>
            Editar receita
          </Link>
        </div>

        {sourceUrl ? <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]"><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 5h5v5M19 5l-8 8"/><path d="M18 13v6H5V6h6"/></svg>Ver fonte original</a> : null}

        <RecipeGallery
          recipeId={recipe.id}
          images={galleryImages.flatMap((image, index) => {
            const url = signedGallery?.[index]?.signedUrl;
            return url ? [{ id: image.id, url, alt: image.alt_text || `Fotografia de ${recipe.title}` }] : [];
          })}
        />

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
            unit: canonicalIngredientUnit(ingredient.unit_normalized),
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

        <RecipeRating
          recipeId={recipe.id}
          currentUserId={user.id}
          initialRatings={(profilesResult.data ?? []).map((profile) => ({
            userId: profile.id,
            name: profile.display_name,
            score: scores.get(profile.id) ?? null,
          }))}
        />
      </article>
    </main>
  );
}
