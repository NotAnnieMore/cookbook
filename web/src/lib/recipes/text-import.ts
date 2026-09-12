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

type ParseRecipeTextOptions = {
  allowMissingPreparation?: boolean;
};

type ImportSection = "intro" | "ingredients" | "steps";

const fractionCharacter = "¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞";
const singleQuantity = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?[${fractionCharacter}]?|[${fractionCharacter}])`;
const quantityPrefix = new RegExp(
  `^(${singleQuantity})(?:\\s*(?:–|—|-|to|a)\\s*(${singleQuantity}))?\\s*(.*)$`,
  "i",
);
const trailingMetricAmount = new RegExp(
  `^(.+?)\\s+(${singleQuantity})\\s*(kg|g|ml|l)(?:\\s*(?:–|—|-|\\ba\\b|\\bto\\b)\\s*(${singleQuantity})\\s*(kg|g|ml|l))?(\\s*\\([^\\n]*\\))?$`,
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
  { pattern: /^(?:centilitros?|centiliters?|centilitres?|cl)\b/i, unit: "cl" },
  { pattern: /^(?:decilitros?|deciliters?|decilitres?|dl)\b/i, unit: "dl" },
  { pattern: /^(?:litros?|liters?|litres?|l)\b/i, unit: "l" },
  { pattern: /^(?:colheres?\s+(?:de\s+)?sopa|c\.?\s*de?\s*sopa)\b/i, unit: "c. sopa" },
  { pattern: /^(?:colheres?\s+(?:de\s+)?chá|c\.?\s*de?\s*chá)\b/i, unit: "c. chá" },
  { pattern: /^(?:latas?|cans?)\b/i, unit: "lata" },
  { pattern: /^(?:pacotes?|embalagens?|saquetas?|packs?|packets?|packages?|sachets?)\b/i, unit: "pacote" },
  { pattern: /^(?:dentes?|cloves?)\b/i, unit: "unid." },
  { pattern: /^(?:fatias?|slices?|pedaços?|pedacos?|pieces?)\b/i, unit: "unid." },
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
  "o que vais precisar",
  "o que vai precisar",
  "lista de ingredientes",
  "para os ingredientes",
  "you will need",
  "what you will need",
  "ingredienti",
  "ingredientes necesarios",
]);
const stepHeadings = new Set([
  "preparacao",
  "preparo",
  "preparation",
  "modo de preparacao",
  "modo de fazer",
  "confeccao",
  "instrucoes",
  "instructions",
  "directions",
  "method",
  "passos",
  "como fazer",
  "como preparar",
  "passo a passo",
  "procedimento",
  "elaboracao",
  "preparazione",
  "how to make",
  "how to prepare",
]);

function searchable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripListMarker(value: string) {
  return value
    .trim()
    .replace(/^(?:[-*•▪◦‣⁃→✓✔☑])\s*/u, "")
    .replace(/^\d+\)\s*/, "")
    .replace(/^\d+\.\s+/, "")
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
    const trailing = ingredientText.match(trailingMetricAmount);
    if (trailing) {
      const first = parseImportedQuantity(trailing[2]);
      const second = trailing[4] ? parseImportedQuantity(trailing[4]) : null;
      const firstUnit = trailing[3].toLocaleLowerCase("pt-PT");
      const secondUnit = (trailing[5] || firstUnit).toLocaleLowerCase("pt-PT");
      const weight = new Set(["g", "kg"]);
      const volume = new Set(["ml", "l"]);
      const compatible = (weight.has(firstUnit) && weight.has(secondUnit)) || (volume.has(firstUnit) && volume.has(secondUnit));

      if (first && (!trailing[4] || second) && compatible) {
        const factor = (unit: string) => unit === "kg" || unit === "l" ? 1000 : 1;
        const firstBase = first.quantity * factor(firstUnit);
        const secondBase = second ? second.quantity * factor(secondUnit) : null;
        if (secondBase === null || secondBase >= firstBase) {
          const useLargeUnit = Math.max(firstBase, secondBase ?? firstBase) >= 1000;
          const unit = weight.has(firstUnit) ? (useLargeUnit ? "kg" : "g") : (useLargeUnit ? "l" : "ml");
          const divisor = useLargeUnit ? 1000 : 1;
          const name = `${trailing[1]}${trailing[6] ?? ""}`.trim();
          return {
            ingredient: {
              name,
              quantity: formNumber(firstBase / divisor),
              quantityMax: secondBase === null ? "" : formNumber(secondBase / divisor),
              unit,
              optional,
              group,
              packageQuantity: "",
              packageUnit: "g",
              originalQuantity: formNumber(first.quantity),
              originalQuantityMax: second ? formNumber(second.quantity) : undefined,
              originalUnit: trailing[4] ? `${firstUnit}–${secondUnit}` : firstUnit,
              originalText,
              conversionConfidence: "exact",
              conversionSource: "metric-suffix",
              conversionRuleVersion: MEASUREMENT_RULE_VERSION,
            },
            warning: null,
          };
        }
      }
    }

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

function hasListMarker(line: string) {
  return /^\s*(?:(?:[-*•▪◦‣⁃→✓✔☑])\s*|\d+\)\s*|\d+\.\s+)/u.test(line);
}

function looksLikeInstruction(line: string) {
  const value = stripListMarker(line);
  if (/^\s*(?:\d+\)\s*|\d+\.\s+)/.test(line)) return true;
  if (/^(?:misturar|misture|mexer|mexa|adicionar|adicione|acrescentar|acrescente|juntar|junte|bater|bata|levar|leve|colocar|coloque|cozer|coza|cozinhar|cozinhe|assar|asse|aquecer|aqueça|triturar|triture|derreter|derreta|envolver|envolva|incorporar|incorpore|servir|sirva|reservar|reserve|deixar|deixe|cortar|corte|lavar|lave|temperar|tempere|preparar|prepare|espalhar|espalhe|verter|verta|tapar|tape|refrigerar|refrigere|untar|unte|forrar|forre|amassar|amasse|refogar|refogue|alourar|aloure|fritar|frite|grelhar|grelhe|marinar|marine|escorrer|escorra|coar|coe|polvilhar|polvilhe|dispor|disponha|ferver|ferva|mix|stir|add|combine|whisk|beat|place|pour|bake|cook|heat|blend|serve|chill|refrigerate|preheat|fold|simmer|boil|fry|roast|season|marinate|drain)(?=\s|$|[,.:;])/iu.test(value)) return true;
  return value.length >= 32 && /[.!?]$/.test(value);
}

function looksLikeIngredient(line: string) {
  const value = stripListMarker(line);
  if (!value || looksLikeSubheading(line)) return false;
  if (/^\s*(?:\d+\)\s*|\d+\.\s+)/.test(line)) return false;
  if (quantityPrefix.test(value)) return true;
  if (/^(?:q\.?\s*b\.?|quanto baste|a gosto|to taste)\b/i.test(value)) return true;
  return hasListMarker(line) && !looksLikeInstruction(line) && value.split(/\s+/).length <= 12;
}

function inferMissingSections(input: string) {
  const lines = input.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean);
  const ingredientHeadingIndex = lines.findIndex((line) => sectionHeading(line) === "ingredients");
  const stepHeadingIndex = lines.findIndex((line) => sectionHeading(line) === "steps");
  if (ingredientHeadingIndex >= 0 && stepHeadingIndex >= 0) return { lines, inferred: false };

  let ingredientStart = ingredientHeadingIndex;
  if (ingredientStart < 0) {
    ingredientStart = lines.findIndex((line, index) => index > 0 && looksLikeIngredient(line));
    if (ingredientStart < 0 && looksLikeIngredient(lines[0] ?? "")) ingredientStart = 0;
    if (ingredientStart > 0 && looksLikeSubheading(lines[ingredientStart - 1])) ingredientStart -= 1;
  }

  let stepStart = stepHeadingIndex;
  if (stepStart < 0 && ingredientStart >= 0) {
    let ingredientsSeen = 0;
    const searchFrom = ingredientHeadingIndex >= 0 ? ingredientHeadingIndex + 1 : ingredientStart;
    for (let index = searchFrom; index < lines.length; index += 1) {
      if (looksLikeSubheading(lines[index])) continue;
      if (looksLikeIngredient(lines[index])) {
        ingredientsSeen += 1;
        continue;
      }
      if (ingredientsSeen > 0 && looksLikeInstruction(lines[index])) {
        stepStart = index;
        break;
      }
    }
  }

  if (ingredientStart < 0 || stepStart < 0 || stepStart <= ingredientStart) return { lines, inferred: false };

  const inferredLines: string[] = [];
  if (ingredientStart === 0) inferredLines.push("Receita importada");
  lines.forEach((line, index) => {
    if (ingredientHeadingIndex < 0 && index === ingredientStart) inferredLines.push("Ingredientes");
    if (stepHeadingIndex < 0 && index === stepStart) inferredLines.push("Preparação");
    inferredLines.push(line);
  });
  return { lines: inferredLines, inferred: true };
}

function preparationInstructions(line: string) {
  return stripListMarker(line)
    .split(/(?<=[.!?])\s+(?=(?:\d+[.)]\s*)?[\p{L}\d])/u)
    .map((part) => stripListMarker(part))
    .filter(Boolean);
}

export function parseRecipeText(
  input: string,
  options: ParseRecipeTextOptions = {},
): TextImportResult {
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
  const inferredInput = inferMissingSections(input);
  if (inferredInput.inferred) {
    warnings.add("Separámos automaticamente a lista de ingredientes da preparação. Confirma a divisão no preview.");
  }
  const descriptionLines: string[] = [];
  let section: ImportSection = "intro";
  let ingredientGroup = "";
  let stepSection = "";

  for (const rawLine of inferredInput.lines) {
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
      const title = stripListMarker(line).replace(/^[=#*_\s]+|[:=#*_\s]+$/g, "").trim();
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

    for (const instruction of preparationInstructions(line)) {
      draft.steps.push({ instruction, section: stepSection });
    }
  }

  draft.description = descriptionLines.join(" ").slice(0, 1200);
  if (!draft.title) {
    draft.title = "Receita importada";
    warnings.add("Não encontrámos um título na fonte. Escreve o nome da receita no preview antes de guardar.");
  }
  if (!draft.ingredients.length) {
    return {
      draft: null,
      warnings: [],
      error:
        "Não consegui separar ingredientes e preparação. Acrescenta os títulos “Ingredientes” e “Preparação” ao texto e tenta novamente.",
    };
  }

  if (!draft.steps.length) {
    if (!options.allowMissingPreparation) {
      return {
        draft: null,
        warnings: [],
        error:
          "Não consegui separar ingredientes e preparação. Acrescenta os títulos “Ingredientes” e “Preparação” ao texto e tenta novamente.",
      };
    }
    warnings.add("A fonte não disponibilizou a preparação. Os ingredientes foram preenchidos; acrescenta os passos manualmente antes de guardar.");
  }

  return { draft, warnings: [...warnings], error: null };
}
