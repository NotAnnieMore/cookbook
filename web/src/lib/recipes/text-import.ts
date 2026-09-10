import {
  MEASUREMENT_RULE_VERSION,
  normalizeImportedIngredientMeasurement,
  parseImportedQuantity,
} from "./measurements.ts";

export type ImportedIngredientDraft = {
  name: string;
  quantity: string;
  quantityMax: string;
  unit: string;
  optional: boolean;
  group: string;
  packageQuantity: string;
  packageUnit: string;
  originalQuantity?: string;
  originalQuantityMax?: string;
  originalUnit?: string;
  originalText?: string;
  conversionConfidence?: "exact" | "reference" | "suggested" | "ambiguous";
  conversionSource?: string;
  conversionRuleVersion?: string;
};

export type TextImportDraft = {
  title: string;
  description: string;
  servings: string;
  activeTime: string;
  totalTime: string;
  difficulty: "easy" | "medium" | "hard" | "";
  tags: string[];
  ingredients: ImportedIngredientDraft[];
  steps: { instruction: string; section: string }[];
};

export type TextImportResult = {
  draft: TextImportDraft | null;
  warnings: string[];
  error: string | null;
};

type ImportSection = "intro" | "ingredients" | "steps";

const fractionCharacter = "¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";
const singleQuantity = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?[${fractionCharacter}]?|[${fractionCharacter}])`;
const quantityPrefix = new RegExp(
  `^(${singleQuantity})(?:\\s*(?:–|—|-|to|a)\\s*(${singleQuantity}))?\\s*(.*)$`,
  "i",
);

const unitMatchers: Array<{ pattern: RegExp; unit: string }> = [
  { pattern: /^(?:fluid ounces?|fl\.?\s*oz\.?)\b/i, unit: "fl oz" },
  { pattern: /^(?:tablespoons?|tbsp\.?)\b/i, unit: "tbsp" },
  { pattern: /^(?:teaspoons?|tsp\.?)\b/i, unit: "tsp" },
  { pattern: /^(?:cups?|chávenas?|xícaras?)\b/i, unit: "cup" },
  { pattern: /^(?:ounces?|oz\.?)\b/i, unit: "oz" },
  { pattern: /^(?:pounds?|lbs?\.?)\b/i, unit: "lb" },
  { pattern: /^(?:quilogramas?|kilograms?|kgs?)\b/i, unit: "kg" },
  { pattern: /^(?:g|gramas?|grams?|grs?\.?)\b/i, unit: "g" },
  { pattern: /^(?:mililitros?|milliliters?|millilitres?|ml)\b/i, unit: "ml" },
  { pattern: /^(?:litros?|liters?|litres?|l)\b/i, unit: "l" },
  { pattern: /^(?:colheres?\s+(?:de\s+)?sopa|c\.?\s*de?\s*sopa)\b/i, unit: "c. sopa" },
  { pattern: /^(?:colheres?\s+(?:de\s+)?chá|c\.?\s*de?\s*chá)\b/i, unit: "c. chá" },
  { pattern: /^(?:latas?|cans?)\b/i, unit: "lata" },
  { pattern: /^(?:dentes?\s+de\s+alho|dentes?|cloves?)\b/i, unit: "dente" },
  { pattern: /^(?:folhas?|leaves?)\b/i, unit: "folha" },
  { pattern: /^(?:ramos?|sprigs?)\b/i, unit: "ramo" },
  { pattern: /^(?:pitadas?|pinches?)\b/i, unit: "pitada" },
  { pattern: /^(?:unidades?|unid\.?|units?|pieces?)\b/i, unit: "unid." },
];

const ingredientHeadings = new Set([
  "ingrediente",
  "ingredientes",
  "ingredients",
  "ingredient list",
  "vais precisar",
]);
const stepHeadings = new Set([
  "preparacao",
  "preparation",
  "modo de preparacao",
  "modo de fazer",
  "confeccao",
  "instrucoes",
  "instructions",
  "directions",
  "method",
  "passos",
]);

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/^[#*_\s]+|[:#*_\s]+$/g, "")
    .replace(/\s+/g, " ");
}

function stripListMarker(value: string) {
  return value
    .trim()
    .replace(/^[-*•▪◦]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .trim();
}

function formNumber(value: number | null) {
  if (value === null) return "";
  return new Intl.NumberFormat("pt-PT", {
    maximumFractionDigits: 4,
    useGrouping: false,
  }).format(value);
}

function durationMinutes(value: string) {
  const normalized = searchable(value);
  const hours = normalized.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hour|hours|hora|horas)\b/);
  const minutes = normalized.match(/(\d+)\s*(?:m|min|mins|minute|minutes|minuto|minutos)\b/);
  if (!hours && !minutes) {
    const plain = normalized.match(/^\d+$/);
    return plain ? Number(plain[0]) : null;
  }
  return Math.round(
    (hours ? Number(hours[1].replace(",", ".")) * 60 : 0) +
      (minutes ? Number(minutes[1]) : 0),
  );
}

function ingredientFromLine(
  line: string,
  group: string,
): { ingredient: ImportedIngredientDraft; warning: string | null } | null {
  const originalText = stripListMarker(line);
  if (!originalText) return null;
  const optional = /\s*\(?(?:opcional|optional)\)?\s*$/i.test(originalText);
  const ingredientText = originalText
    .replace(/\s*\(?(?:opcional|optional)\)?\s*$/i, "")
    .trim();

  const toTaste =
    ingredientText.match(
      /^(?:q\.?\s*b\.?|quanto baste|a gosto|to taste)\s*(?:de\s+)?(.+)$/i,
    ) ??
    ingredientText.match(
      /^(.+?)\s+(?:q\.?\s*b\.?|quanto baste|a gosto|to taste)$/i,
    );
  if (toTaste) {
    return {
      ingredient: {
        name: toTaste[1].trim(),
        quantity: "",
        quantityMax: "",
        unit: "q.b.",
        optional,
        group,
        packageQuantity: "",
        packageUnit: "g",
        originalUnit: "q.b.",
        originalText,
        conversionConfidence: "exact",
        conversionSource: "original",
        conversionRuleVersion: MEASUREMENT_RULE_VERSION,
      },
      warning: null,
    };
  }

  const amount = ingredientText.match(quantityPrefix);
  if (!amount) {
    return {
      ingredient: {
        name: ingredientText,
        quantity: "",
        quantityMax: "",
        unit: "",
        optional,
        group,
        packageQuantity: "",
        packageUnit: "g",
        originalText,
        conversionConfidence: "ambiguous",
        conversionSource: "original",
        conversionRuleVersion: MEASUREMENT_RULE_VERSION,
      },
      warning: `Confirma a quantidade de “${originalText}”.`,
    };
  }

  const quantityText = amount[2] ? `${amount[1]}–${amount[2]}` : amount[1];
  const parsed = parseImportedQuantity(quantityText);
  if (!parsed) return null;

  let remainder = amount[3].trim();
  let unit = "unid.";
  let originalUnit = "";
  for (const matcher of unitMatchers) {
    const match = remainder.match(matcher.pattern);
    if (!match) continue;
    originalUnit = match[0];
    unit = matcher.unit;
    remainder = remainder.slice(match[0].length).trim();
    break;
  }
  const name = remainder.replace(/^(?:de|do|da|dos|das|of)\s+/i, "").trim();
  if (!name) return null;

  const conversion = normalizeImportedIngredientMeasurement({
    ingredientName: name,
    quantity: parsed.quantity,
    quantityMax: parsed.quantityMax,
    unit,
    sourceSystem: "unknown",
  });

  return {
    ingredient: {
      name,
      quantity: formNumber(conversion.normalized.quantity),
      quantityMax: formNumber(conversion.normalized.quantityMax),
      unit: conversion.normalized.unit,
      optional,
      group,
      packageQuantity: "",
      packageUnit: "g",
      originalQuantity: formNumber(parsed.quantity),
      originalQuantityMax: formNumber(parsed.quantityMax),
      originalUnit: originalUnit || unit,
      originalText,
      conversionConfidence: conversion.confidence,
      conversionSource: conversion.source,
      conversionRuleVersion: conversion.ruleVersion,
    },
    warning:
      conversion.confidence === "ambiguous" ||
      conversion.confidence === "suggested"
        ? conversion.note || `Confirma a conversão de “${originalText}”.`
        : null,
  };
}

function sectionHeading(line: string) {
  const normalized = searchable(line);
  if (ingredientHeadings.has(normalized)) return "ingredients" as const;
  if (stepHeadings.has(normalized)) return "steps" as const;
  return null;
}

function localMetadata(line: string, draft: TextImportDraft) {
  const servings = line.match(
    /^(?:porções|porcoes|doses|serve|serves|rende)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
  );
  if (servings) {
    draft.servings = servings[1];
    return true;
  }

  const active = line.match(
    /^(?:tempo\s+ativo|preparação|preparacao|prep(?:aration)?\s+time)\s*[:\-]\s*(.+)$/i,
  );
  if (active) {
    const minutes = durationMinutes(active[1]);
    if (minutes !== null) draft.activeTime = String(minutes);
    return minutes !== null;
  }

  const total = line.match(
    /^(?:tempo\s+total|total\s+time|tempo)\s*[:\-]\s*(.+)$/i,
  );
  if (total) {
    const minutes = durationMinutes(total[1]);
    if (minutes !== null) draft.totalTime = String(minutes);
    return minutes !== null;
  }
  return false;
}

function looksLikeSubheading(line: string) {
  const value = stripListMarker(line);
  return (
    /:$/.test(value) &&
    value.length <= 80 &&
    !quantityPrefix.test(value.replace(/:$/, ""))
  );
}

export function parseRecipeText(input: string): TextImportResult {
  const draft: TextImportDraft = {
    title: "",
    description: "",
    servings: "",
    activeTime: "",
    totalTime: "",
    difficulty: "",
    tags: [],
    ingredients: [],
    steps: [],
  };
  const warnings = new Set<string>();
  const descriptionLines: string[] = [];
  let section: ImportSection = "intro";
  let ingredientGroup = "";
  let stepSection = "";

  for (const rawLine of input.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const heading = sectionHeading(line);
    if (heading) {
      section = heading;
      continue;
    }
    if (localMetadata(line, draft)) continue;

    if (section === "intro") {
      if (!draft.title) draft.title = stripListMarker(line).replace(/^#+\s*/, "");
      else descriptionLines.push(stripListMarker(line));
      continue;
    }

    if (looksLikeSubheading(line)) {
      const title = stripListMarker(line).replace(/:$/, "").trim();
      if (section === "ingredients") ingredientGroup = title;
      else stepSection = title;
      continue;
    }

    if (section === "ingredients") {
      const parsed = ingredientFromLine(line, ingredientGroup);
      if (parsed) {
        draft.ingredients.push(parsed.ingredient);
        if (parsed.warning) warnings.add(parsed.warning);
      }
      continue;
    }

    const instruction = stripListMarker(line);
    if (instruction) draft.steps.push({ instruction, section: stepSection });
  }

  draft.description = descriptionLines.join(" ").slice(0, 1200);
  if (!draft.title) {
    return { draft: null, warnings: [], error: "Não encontrei o nome da receita." };
  }
  if (!draft.ingredients.length || !draft.steps.length) {
    return {
      draft: null,
      warnings: [],
      error:
        "Não consegui separar ingredientes e preparação. Acrescenta os títulos “Ingredientes” e “Preparação” ao texto e tenta novamente.",
    };
  }

  return { draft, warnings: [...warnings], error: null };
}
