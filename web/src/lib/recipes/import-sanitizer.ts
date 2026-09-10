import type { TextImportDraft } from "./text-import.ts";

const emojiPattern = /(?:\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|\uFE0F|\u200D|\u20E3)/gu;

export function cleanImportedText(value: string) {
  return value
    .replace(emojiPattern, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function capitalizeFirstLetter(value: string) {
  return value.replace(/\p{L}/u, (letter) => letter.toLocaleUpperCase("pt-PT"));
}

export function sanitizeImportedRecipe(draft: TextImportDraft): TextImportDraft {
  return {
    ...draft,
    title: cleanImportedText(draft.title),
    description: cleanImportedText(draft.description),
    tags: draft.tags.map(cleanImportedText).filter(Boolean),
    ingredients: draft.ingredients.map((ingredient) => ({
      ...ingredient,
      name: capitalizeFirstLetter(cleanImportedText(ingredient.name)),
      group: capitalizeFirstLetter(cleanImportedText(ingredient.group)),
    })),
    steps: draft.steps.map((step) => ({
      instruction: capitalizeFirstLetter(cleanImportedText(step.instruction)),
      section: capitalizeFirstLetter(cleanImportedText(step.section)),
    })),
  };
}
