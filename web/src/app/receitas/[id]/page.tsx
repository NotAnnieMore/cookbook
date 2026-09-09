import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import FavouriteButton from "./favourite-button";

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

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [recipeResult, favouriteResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,description,servings,servings_label,active_time_minutes,total_time_minutes,difficulty,created_by,recipe_ingredients(id,ingredient_name,optional,quantity_normalized,unit_normalized,display_text_normalized,sort_order),recipe_steps(id,instruction,timer_seconds,sort_order),recipe_images(storage_path,image_kind)")
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
        <section className="overflow-hidden rounded-[2rem_2rem_5rem_2rem] bg-[#285240] text-white shadow-[0_14px_0_#E3DCD0]">
          <div className="grid lg:grid-cols-[1.05fr_.95fr]">
            <div className="flex min-h-[25rem] flex-col justify-center p-7 sm:p-11 lg:p-14">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Receita de {author?.display_name ?? "Cookbook"}</p>
              <h1 className="mt-4 max-w-3xl font-serif text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">{recipe.title}</h1>
              {recipe.description ? <p className="mt-6 max-w-2xl leading-7 text-white/72">{recipe.description}</p> : null}
              <dl className="mt-9 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/20 pt-6">
                <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Tempo ativo</dt><dd className="mt-1 font-serif text-lg font-bold">{formatMinutes(recipe.active_time_minutes)}</dd></div>
                <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Tempo total</dt><dd className="mt-1 font-serif text-lg font-bold">{formatMinutes(recipe.total_time_minutes)}</dd></div>
                {recipe.servings ? <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Rende</dt><dd className="mt-1 font-serif text-lg font-bold">{displayQuantity(recipe.servings)} {recipe.servings_label ?? "pessoas"}</dd></div> : null}
                {recipe.difficulty ? <div><dt className="text-[11px] font-extrabold uppercase tracking-wider text-white/55">Dificuldade</dt><dd className="mt-1 font-serif text-lg font-bold">{difficultyLabels[recipe.difficulty as keyof typeof difficultyLabels]}</dd></div> : null}
              </dl>
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

        <div className="mt-14 grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
          <section aria-labelledby="ingredients-title">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">À mão</p>
            <h2 id="ingredients-title" className="mt-1 font-serif text-4xl font-black tracking-[-.04em]">Ingredientes</h2>
            <ul className="mt-7 divide-y divide-[#D9D1C5] border-y-2 border-[#D9D1C5]">
              {ingredients.map((ingredient) => {
                const quantity = displayQuantity(ingredient.quantity_normalized);
                return (
                  <li key={ingredient.id} className="flex min-h-14 items-center gap-3 py-3">
                    <span className="size-2.5 shrink-0 rounded-[45%_55%_58%_42%] bg-[#F36F56]" />
                    <span className="flex-1 font-semibold">{ingredient.ingredient_name}{ingredient.optional ? <span className="ml-2 text-xs font-normal text-[#766F67]">opcional</span> : null}</span>
                    <strong className="text-right text-sm text-[#285240]">{quantity} {ingredient.unit_normalized ?? ""}</strong>
                  </li>
                );
              })}
            </ul>
          </section>

          <section aria-labelledby="steps-title">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Vamos cozinhar</p>
            <h2 id="steps-title" className="mt-1 font-serif text-4xl font-black tracking-[-.04em]">Preparação</h2>
            <ol className="mt-7 space-y-5">
              {steps.map((step, index) => (
                <li key={step.id} className="grid grid-cols-[3rem_1fr] gap-4 rounded-[1.5rem_1.5rem_3rem_1.5rem] bg-[#FFFCF6] p-5 sm:p-6">
                  <span className="grid size-11 place-items-center rounded-[55%_45%_58%_42%/48%_57%_43%_52%] bg-[#F3C565] font-serif text-xl font-black">{index + 1}</span>
                  <p className="pt-2 leading-7">{step.instruction}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>
    </main>
  );
}
