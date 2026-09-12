import { notFound, redirect } from "next/navigation";

import { canonicalIngredientUnit } from "@/lib/recipes/measurements";
import { createClient } from "@/lib/supabase/server";

import CookMode from "./cook-mode";

export default async function RecipeCookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: recipe, error } = await supabase
    .from("recipes")
    .select("id,title,servings,servings_label,ingredient_groups(id,name,sort_order),recipe_ingredients(id,group_id,ingredient_name,optional,quantity_normalized,quantity_max_normalized,unit_normalized,sort_order),recipe_sections(id,name,sort_order),recipe_steps(id,section_id,instruction,timer_seconds,sort_order)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !recipe) notFound();

  const groupNames = new Map((recipe.ingredient_groups ?? []).map((group) => [group.id, group.name]));
  const sectionNames = new Map((recipe.recipe_sections ?? []).map((section) => [section.id, section.name]));
  const steps = [...(recipe.recipe_steps ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const { data: stepIngredientLinks } = steps.length
    ? await supabase
        .from("recipe_step_ingredients")
        .select("step_id,ingredient_id,sort_order")
        .in("step_id", steps.map((step) => step.id))
    : { data: [] };
  const ingredientIdsByStep = new Map<string, string[]>();
  for (const link of [...(stepIngredientLinks ?? [])].sort((a, b) => a.sort_order - b.sort_order)) {
    const values = ingredientIdsByStep.get(link.step_id) ?? [];
    values.push(link.ingredient_id);
    ingredientIdsByStep.set(link.step_id, values);
  }

  return (
    <CookMode
      recipe={{
        id: recipe.id,
        title: recipe.title,
        servings: recipe.servings,
        servingsLabel: recipe.servings_label ?? "pessoas",
        ingredients: [...(recipe.recipe_ingredients ?? [])]
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((ingredient) => ({
            id: ingredient.id,
            name: ingredient.ingredient_name,
            optional: ingredient.optional,
            quantity: ingredient.quantity_normalized,
            quantityMax: ingredient.quantity_max_normalized,
            unit: canonicalIngredientUnit(ingredient.unit_normalized),
            groupName: ingredient.group_id ? groupNames.get(ingredient.group_id) ?? null : null,
          })),
        steps: steps
          .map((step) => ({
            id: step.id,
            instruction: step.instruction,
            timerSeconds: step.timer_seconds,
            sectionName: step.section_id ? sectionNames.get(step.section_id) ?? null : null,
            ingredientIds: ingredientIdsByStep.get(step.id) ?? [],
          })),
      }}
    />
  );
}
