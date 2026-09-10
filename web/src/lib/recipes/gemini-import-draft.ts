import { z } from "zod";

import { parseRecipeText, type TextImportResult } from "./text-import.ts";
import type { UrlImportResult } from "./url-import.ts";

export const geminiRecipeSchema = z.object({
  title: z.string().max(200),
  description: z.string().max(1_200),
  servings: z.string().max(40),
  activeTime: z.string().max(40),
  totalTime: z.string().max(40),
  difficulty: z.enum(["", "easy", "medium", "hard"]),
  tags: z.array(z.string().max(40)).max(12),
  ingredientGroups: z.array(z.object({
    name: z.string().max(80),
    items: z.array(z.string().min(1).max(500)).max(80),
  })).max(20),
  preparationSections: z.array(z.object({
    name: z.string().max(80),
    steps: z.array(z.string().min(1).max(2_000)).max(80),
  })).max(20),
});

type GeminiRecipe = z.infer<typeof geminiRecipeSchema>;

function canonicalRecipeText(recipe: GeminiRecipe, fallbackTitle: string) {
  const title = recipe.title.trim() || fallbackTitle.trim() || "Receita importada";
  const lines = [
    title,
    recipe.description.trim(),
    recipe.servings.trim() ? `Doses: ${recipe.servings.trim()}` : "",
    recipe.activeTime.trim() ? `Tempo ativo: ${recipe.activeTime.trim()}` : "",
    recipe.totalTime.trim() ? `Tempo total: ${recipe.totalTime.trim()}` : "",
    "Ingredientes",
  ];

  for (const group of recipe.ingredientGroups) {
    if (group.name.trim()) lines.push(`${group.name.trim()}:`);
    lines.push(...group.items.map((item) => `- ${item.trim()}`).filter((item) => item !== "- "));
  }

  lines.push("Preparação");
  let stepNumber = 1;
  for (const section of recipe.preparationSections) {
    if (section.name.trim()) lines.push(`${section.name.trim()}:`);
    for (const step of section.steps) {
      const instruction = step.trim();
      if (instruction) lines.push(`${stepNumber++}. ${instruction}`);
    }
  }
  return lines.filter(Boolean).join("\n");
}

export function geminiRecipeToImportResult(value: unknown, fallbackTitle = ""): UrlImportResult | null {
  const parsedRecipe = geminiRecipeSchema.safeParse(value);
  if (!parsedRecipe.success) return null;

  const parsed: TextImportResult = parseRecipeText(canonicalRecipeText(parsedRecipe.data, fallbackTitle));
  if (!parsed.draft || parsed.error) return null;
  parsed.draft.difficulty = parsedRecipe.data.difficulty;
  parsed.draft.tags = parsedRecipe.data.tags;

  return {
    ...parsed,
    sourceTitle: parsedRecipe.data.title.trim() || fallbackTitle.trim() || null,
    usedStructuredData: false,
  };
}
