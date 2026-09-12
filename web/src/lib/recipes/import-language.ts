import type { TextImportDraft } from "./text-import.ts";

const portugueseSignals = [
  /\bpreparacao\b/g,
  /\bmodo de fazer\b/g,
  /\bcolheres?\b/g,
  /\bchavena\b/g,
  /\bacucar\b/g,
  /\bmanteiga\b/g,
  /\bnatas\b/g,
  /\bjuntar\b/g,
  /\bmisturar\b/g,
  /\bbater\b/g,
  /\bcozer\b/g,
  /\bassar\b/g,
  /\bdurante\b/g,
  /\bdeixar\b/g,
];

const foreignSignals = [
  /\bingredients?\b/g,
  /\binstructions?\b/g,
  /\bdirections?\b/g,
  /\bpreheat\b/g,
  /\bbake\b/g,
  /\bstir\b/g,
  /\bwhisk\b/g,
  /\bchicken\b/g,
  /\bgarlic\b/g,
  /\bhoney\b/g,
  /\bbacon\b/g,
  /\bcream\b/g,
  /\bmilk\b/g,
  /\beggs?\b/g,
  /\bbutter\b/g,
  /\bflour\b/g,
  /\bsugar\b/g,
  /\b(?:mix|add|cook|serve)\b/g,
  /\bpreparacion\b/g,
  /\bmezclar\b/g,
  /\banadir\b/g,
  /\bmantequilla\b/g,
  /\bhornear\b/g,
  /\bingredients\b/g,
  /\bajouter\b/g,
  /\bmelanger\b/g,
  /\bcuire\b/g,
  /\bbeurre\b/g,
  /\bingredienti\b/g,
  /\bpreparazione\b/g,
  /\baggiungere\b/g,
  /\bmescolare\b/g,
  /\bcuocere\b/g,
  /\bzutaten\b/g,
  /\bzubereitung\b/g,
  /\bhinzufugen\b/g,
  /\bbacken\b/g,
];

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT");
}

function score(value: string, signals: RegExp[]) {
  return signals.reduce((total, signal) => total + (value.match(signal)?.length ?? 0), 0);
}

export function shouldTranslateToPortuguese(value: string) {
  const normalized = searchable(value);
  const foreignScore = score(normalized, foreignSignals);
  const portugueseScore = score(normalized, portugueseSignals);
  return foreignScore >= 2 && foreignScore > portugueseScore;
}

export function recipeDraftLanguageText(draft: TextImportDraft) {
  return [
    draft.title,
    draft.description,
    ...draft.tags,
    ...draft.ingredients.flatMap((ingredient) => [ingredient.group, ingredient.name]),
    ...draft.steps.flatMap((step) => [step.section, step.instruction]),
  ].filter(Boolean).join("\n");
}
