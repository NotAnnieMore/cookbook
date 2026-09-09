"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.string().trim().max(24),
  unit: z.string().trim().max(40),
  optional: z.boolean(),
});

const stepSchema = z.object({
  instruction: z.string().trim().min(1).max(4000),
});

const recipeSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(1200),
    servings: z.string().trim().max(12),
    activeTime: z.string().trim().max(8),
    totalTime: z.string().trim().max(8),
    difficulty: z.enum(["easy", "medium", "hard", ""]),
    ingredients: z.array(ingredientSchema).min(1).max(100),
    steps: z.array(stepSchema).min(1).max(100),
  })
  .refine(
    ({ activeTime, totalTime }) => {
      const active = optionalPositiveInteger(activeTime);
      const total = optionalPositiveInteger(totalTime);
      return active === null || total === null || total >= active;
    },
    { message: "O tempo total não pode ser menor do que o tempo ativo." },
  );

export type CreateRecipeState = {
  message?: string;
};

function parseArray(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function optionalPositiveInteger(value: string) {
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}

function optionalPositiveNumber(value: string) {
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : Number.NaN;
}

function ingredientDisplayText(ingredient: z.infer<typeof ingredientSchema>) {
  return [ingredient.quantity, ingredient.unit, ingredient.name]
    .filter(Boolean)
    .join(" ");
}

export async function createRecipe(
  _previousState: CreateRecipeState,
  formData: FormData,
): Promise<CreateRecipeState> {
  const result = recipeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    activeTime: formData.get("active_time"),
    totalTime: formData.get("total_time"),
    difficulty: formData.get("difficulty"),
    ingredients: parseArray(formData.get("ingredients_json")),
    steps: parseArray(formData.get("steps_json")),
  });

  if (!result.success) {
    return {
      message:
        result.error.issues[0]?.message ===
        "O tempo total não pode ser menor do que o tempo ativo."
          ? result.error.issues[0].message
          : "Confirma o título, os ingredientes e os passos antes de guardar.",
    };
  }

  const servings = optionalPositiveNumber(result.data.servings);
  const activeTime = optionalPositiveInteger(result.data.activeTime);
  const totalTime = optionalPositiveInteger(result.data.totalTime);

  if (
    Number.isNaN(servings) ||
    Number.isNaN(activeTime) ||
    Number.isNaN(totalTime)
  ) {
    return { message: "Confirma as doses e os tempos indicados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "A sessão terminou. Inicia sessão novamente." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error("Conta sem casa associada", { code: membershipError?.code });
    return {
      message:
        "Esta conta ainda não está associada à coleção. Confirma o setup da casa na Supabase.",
    };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      household_id: membership.household_id,
      created_by: user.id,
      title: result.data.title,
      description: result.data.description || null,
      servings,
      servings_label: "pessoas",
      active_time_minutes: activeTime,
      total_time_minutes: totalTime,
      difficulty: result.data.difficulty || null,
      origin_kind: "manual",
    })
    .select("id")
    .single();

  if (recipeError || !recipe) {
    console.error("Falha ao criar receita", { code: recipeError?.code });
    return { message: "Não foi possível guardar a receita. Tenta novamente." };
  }

  const ingredients = result.data.ingredients.map((ingredient, index) => {
    const quantity = optionalPositiveNumber(ingredient.quantity);
    const unit = ingredient.unit || null;
    const displayText = ingredientDisplayText(ingredient);

    return {
      recipe_id: recipe.id,
      ingredient_name: ingredient.name,
      optional: ingredient.optional,
      scalable: true,
      sort_order: index,
      quantity_original: Number.isNaN(quantity) ? null : quantity,
      unit_original: unit,
      display_text_original: displayText,
      quantity_normalized: Number.isNaN(quantity) ? null : quantity,
      unit_normalized: unit,
      display_text_normalized: displayText,
      conversion_confidence: "exact" as const,
      conversion_source: "manual",
    };
  });

  const steps = result.data.steps.map((step, index) => ({
    recipe_id: recipe.id,
    instruction: step.instruction,
    sort_order: index,
  }));

  const [ingredientsResult, stepsResult] = await Promise.all([
    supabase.from("recipe_ingredients").insert(ingredients),
    supabase.from("recipe_steps").insert(steps),
  ]);

  if (ingredientsResult.error || stepsResult.error) {
    console.error("Falha ao completar receita", {
      ingredientsCode: ingredientsResult.error?.code,
      stepsCode: stepsResult.error?.code,
    });
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { message: "A receita não ficou completa e não foi guardada." };
  }

  revalidatePath("/");
  redirect("/");
}
