import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import FavouriteButton from "./favourite-button";
import RecipeContent from "./recipe-content";
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
      .select("id,title,description,servings,servings_label,active_time_minutes,total_time_minutes,difficulty,created_by,version,ingredient_groups(id,name,sort_order),recipe_sections(id,name,sort_order),recipe_ingredients(id,group_id,ingredient_name,optional,scalable,quantity_normalized,quantity_max_normalized,unit_normalized,package_quantity,package_unit,sort_order),recipe_steps(id,section_id,instruction,timer_seconds,sort_order),recipe_images(storage_path,image_kind),recipe_tags(tags(id,name,slug,color))")
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

  return (
    <main className="min-h-screen bg-[#F8F4EC] pb-20 text-[#27231F]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          Voltar à coleção
        </Link>
        <FavouriteButton recipeId={recipe.id} userId={user.id} initialFavourite={Boolean(favouriteResult.data)} />
      </header>

      <article className="mx-auto max-w-6xl px-5 sm:px-8">
        {aviso === "fotografia" ? <p role="status" className="mb-5 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">A receita foi atualizada, mas não foi possível guardar a fotografia.</p> : null}
        <section className="overflow-hidden rounded-[2rem_2rem_5rem_2rem] bg-[#285240] text-white shadow-[0_14px_0_#E3DCD0]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="relative isolate flex min-h-[25rem] flex-col justify-center overflow-hidden p-7 sm:p-11 lg:p-14">
              {signedCover?.signedUrl ? <><div aria-hidden className="absolute -inset-12 -z-20 scale-125 bg-cover bg-center opacity-45 blur-3xl saturate-125" style={{ backgroundImage: `url("${signedCover.signedUrl.replaceAll('"', '\\"')}")` }} /><div aria-hidden className="absolute inset-0 -z-10 bg-[#173B30]/78" /></> : null}
              <div className="relative z-10">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Receita de {author?.display_name ?? "Cookbook"}</p>
              <h1 className="mt-4 max-w-3xl font-serif text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">{recipe.title}</h1>
              {recipe.description ? <p className="mt-6 max-w-2xl leading-7 text-white/72">{recipe.description}</p> : null}
              {tags.length ? <div className="mt-5 flex flex-wrap gap-2" aria-label="Etiquetas da receita">{tags.map((tag) => <span key={tag.id} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-extrabold">#{tag.name}</span>)}</div> : null}
              <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/20 pt-6">
                <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Tempo ativo</dt><dd className="mt-1 font-serif text-lg font-bold">{formatMinutes(recipe.active_time_minutes)}</dd></div>
                <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Tempo total</dt><dd className="mt-1 font-serif text-lg font-bold">{formatMinutes(recipe.total_time_minutes)}</dd></div>
                {recipe.servings ? <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Rende</dt><dd className="mt-1 font-serif text-lg font-bold">{displayQuantity(recipe.servings)} {recipe.servings_label ?? "pessoas"}</dd></div> : null}
                {recipe.difficulty ? <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Dificuldade</dt><dd className="mt-1 font-serif text-lg font-bold">{difficultyLabels[recipe.difficulty as keyof typeof difficultyLabels]}</dd></div> : null}
              </dl>
              </div>
            </div>
            <div className="relative min-h-80 overflow-hidden rounded-t-[6rem] bg-[#F2A58B] lg:min-h-full lg:rounded-l-[8rem] lg:rounded-t-none">
              {signedCover?.signedUrl ? (
                <div role="img" aria-label={`Fotografia de ${recipe.title}`} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url("${signedCover.signedUrl.replaceAll('"', '\\"')}")` }} />
              ) : (
                <svg aria-hidden className="absolute inset-0 m-auto size-52 text-[#285240]" viewBox="0 0 220 220" fill="none">
                  <ellipse cx="110" cy="132" rx="72" ry="38" fill="#FFF9ED" stroke="currentColor" strokeWidth="5" />
                  <path d="M54 125c9 30 33 47 56 47s47-17 56-47" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                  <path d="M79 93c-12-21 13-27 2-48M111 88c-12-24 14-31 3-54M142 93c-11-20 12-27 2-47" stroke="#FFF9ED" strokeWidth="8" strokeLinecap="round" />
                </svg>
              )}
            </div>
          </div>
        </section>

        <div className="mt-8 flex justify-end">
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
