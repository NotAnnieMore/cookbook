import { notFound, redirect } from "next/navigation";

import RecipeForm, { type RecipeFormValues } from "@/app/receitas/nova/recipe-form";
import { updateRecipe } from "@/app/receitas/nova/actions";
import AppDecorations from "@/components/app-decorations";
import StickyPageHeader from "@/components/sticky-page-header";
import { createClient } from "@/lib/supabase/server";

function displayNumber(value: number | string | null) {
  if (value === null) return "";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 4 }).format(number)
    : String(value);
}

function nameFromEmail(email: string | undefined) {
  const localPart = email?.split("@")[0]?.trim();
  if (!localPart) return "Utilizador";
  return localPart.charAt(0).toLocaleUpperCase("pt-PT") + localPart.slice(1);
}

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recipeResult, profileResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,title,description,servings,active_time_minutes,total_time_minutes,difficulty,version,ingredient_groups(id,name),recipe_sections(id,name),recipe_ingredients(group_id,ingredient_name,optional,quantity_original,quantity_max_original,unit_original,display_text_original,quantity_normalized,quantity_max_normalized,unit_normalized,package_quantity,package_unit,conversion_confidence,conversion_source,conversion_rule_version,sort_order),recipe_steps(section_id,instruction,sort_order),recipe_images(storage_path,image_kind),recipe_tags(tags(name))")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  if (recipeResult.error || !recipeResult.data) notFound();
  const recipe = recipeResult.data;
  const ingredients = [...(recipe.recipe_ingredients ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const steps = [...(recipe.recipe_steps ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order,
  );
  const images = Array.isArray(recipe.recipe_images) ? recipe.recipe_images : [];
  const ingredientGroups = new Map(
    (recipe.ingredient_groups ?? []).map((group) => [group.id, group.name]),
  );
  const stepSections = new Map(
    (recipe.recipe_sections ?? []).map((section) => [section.id, section.name]),
  );
  const coverPath = images.find((image) => image.image_kind === "cover")?.storage_path;
  const { data: signedCover } = coverPath
    ? await supabase.storage.from("recipe-images").createSignedUrl(coverPath, 60 * 60)
    : { data: null };

  const initialValues: RecipeFormValues = {
    title: recipe.title,
    description: recipe.description ?? "",
    servings: displayNumber(recipe.servings),
    activeTime:
      recipe.active_time_minutes === null
        ? ""
        : String(recipe.active_time_minutes),
    totalTime:
      recipe.total_time_minutes === null ? "" : String(recipe.total_time_minutes),
    difficulty: (recipe.difficulty ?? "") as RecipeFormValues["difficulty"],
    tags: (recipe.recipe_tags ?? []).flatMap((recipeTag) => {
      const tag = Array.isArray(recipeTag.tags)
        ? recipeTag.tags[0]
        : recipeTag.tags;
      return tag?.name ? [tag.name] : [];
    }),
    coverUrl: signedCover?.signedUrl ?? null,
    ingredients: ingredients.map((ingredient) => ({
      name: ingredient.ingredient_name,
      quantity: displayNumber(ingredient.quantity_normalized),
      quantityMax: displayNumber(ingredient.quantity_max_normalized),
      unit: ingredient.unit_normalized ?? "",
      optional: ingredient.optional,
      group: ingredient.group_id
        ? ingredientGroups.get(ingredient.group_id) ?? ""
        : "",
      packageQuantity: displayNumber(ingredient.package_quantity),
      packageUnit: ingredient.package_unit ?? "g",
      originalQuantity: displayNumber(ingredient.quantity_original),
      originalQuantityMax: displayNumber(ingredient.quantity_max_original),
      originalUnit: ingredient.unit_original ?? "",
      originalText: ingredient.display_text_original ?? "",
      conversionConfidence: ingredient.conversion_confidence ?? undefined,
      conversionSource: ingredient.conversion_source ?? undefined,
      conversionRuleVersion: ingredient.conversion_rule_version ?? undefined,
    })),
    steps: steps.map((step) => ({
      instruction: step.instruction,
      section: step.section_id
        ? stepSections.get(step.section_id) ?? ""
        : "",
    })),
  };
  const displayName =
    profileResult.data?.display_name || nameFromEmail(user.email);
  const updateAction = updateRecipe.bind(null, recipe.id, recipe.version);

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#F8F4EC] text-[#27231F]">
      <AppDecorations tone="blue" />
      <StickyPageHeader href={`/receitas/${recipe.id}`} label="Voltar à receita" />
      <header className="relative z-10 mx-auto max-w-5xl px-5 pb-9 pt-8 sm:px-8 sm:pt-10">
        <div className="max-w-3xl">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Afinar a receita</p>
          <h1 className="mt-2 font-serif text-5xl font-black leading-[.98] tracking-[-.05em] sm:text-6xl">Editar sem perder a história</h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#716A62]">Se Ivo ou Ana tiverem alterado esta receita entretanto, a versão mais recente não será substituída sem aviso.</p>
        </div>
      </header>
      <div className="relative z-10">
        <RecipeForm
          displayName={displayName}
          action={updateAction}
          mode="edit"
          initialValues={initialValues}
          recipeId={recipe.id}
          expectedVersion={recipe.version}
        />
      </div>
    </main>
  );
}
