import { parseRecipeText, type TextImportResult } from "./text-import.ts";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

export type UrlImportResult = TextImportResult & {
  sourceTitle: string | null;
  usedStructuredData: boolean;
};

function decodeEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, key: string) => {
    if (key.startsWith("#")) {
      const hexadecimal = key[1]?.toLocaleLowerCase("en-US") === "x";
      const number = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
      return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
    }
    return named[key.toLocaleLowerCase("en-US")] ?? entity;
  });
}

function cleanText(value: unknown, maxLength = 2_000) {
  if (typeof value !== "string") return "";
  return decodeEntities(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function typesOf(node: JsonObject) {
  const type = node["@type"];
  return (Array.isArray(type) ? type : [type])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLocaleLowerCase("en-US"));
}

function findRecipeNode(value: JsonValue): JsonObject | null {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const found = findRecipeNode(entry);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;
  if (typesOf(value).includes("recipe")) return value;
  for (const child of Object.values(value)) {
    const found = findRecipeNode(child);
    if (found) return found;
  }
  return null;
}

function structuredRecipe(html: string) {
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json(?:;[^"']*)?["'][^>]*>([\s\S]*?)<\/script\s*>/gi);
  for (const match of scripts) {
    const candidate = decodeEntities(match[1]).trim();
    try {
      const parsed = JSON.parse(candidate) as JsonValue;
      const recipe = findRecipeNode(parsed);
      if (recipe) return recipe;
    } catch {
      continue;
    }
  }
  return null;
}

function isoDurationMinutes(value: JsonValue | undefined) {
  if (typeof value !== "string") return null;
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!match) return null;
  return (Number(match[1] ?? 0) * 24 * 60) + (Number(match[2] ?? 0) * 60) + Number(match[3] ?? 0) + Math.round(Number(match[4] ?? 0) / 60);
}

function instructionLines(value: JsonValue | undefined, section = ""): string[] {
  if (typeof value === "string") {
    const text = cleanText(value, 4_000);
    return text ? [text] : [];
  }
  if (Array.isArray(value)) return value.flatMap((entry) => instructionLines(entry, section));
  if (!value || typeof value !== "object") return [];

  const types = typesOf(value);
  if (types.includes("howtosection")) {
    const sectionName = cleanText(value.name, 80);
    const children = instructionLines(value.itemListElement ?? value.steps, sectionName);
    return sectionName && children.length ? [`${sectionName}:`, ...children] : children;
  }
  const text = cleanText(value.text ?? value.name, 4_000);
  return text ? [text] : instructionLines(value.itemListElement ?? value.steps, section);
}

function keywordTags(value: JsonValue | undefined) {
  const values = Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : typeof value === "string"
      ? value.split(/[,;|]/)
      : [];
  return [...new Set(values.map((entry) => cleanText(entry, 40)).filter(Boolean))].slice(0, 12);
}

function yieldValue(value: JsonValue | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const text = typeof candidate === "number" ? String(candidate) : cleanText(candidate, 80);
  return text.match(/\d+(?:[.,]\d+)?/)?.[0] ?? "";
}

function parseStructuredRecipe(recipe: JsonObject): UrlImportResult | null {
  const title = cleanText(recipe.name ?? recipe.headline, 200);
  const ingredientsValue = recipe.recipeIngredient ?? recipe.ingredients;
  const ingredients = Array.isArray(ingredientsValue)
    ? ingredientsValue.map((entry) => cleanText(entry, 500)).filter(Boolean)
    : [];
  const instructions = instructionLines(recipe.recipeInstructions ?? recipe.instructions);
  if (!title || !ingredients.length || !instructions.length) return null;

  const description = cleanText(recipe.description, 1_200);
  const activeTime = isoDurationMinutes(recipe.prepTime);
  const totalTime = isoDurationMinutes(recipe.totalTime);
  const servings = yieldValue(recipe.recipeYield);
  const canonical = [
    title,
    description,
    servings ? `Doses: ${servings}` : "",
    activeTime !== null ? `Tempo ativo: ${activeTime}` : "",
    totalTime !== null ? `Tempo total: ${totalTime}` : "",
    "Ingredientes",
    ...ingredients.map((ingredient) => `- ${ingredient}`),
    "Preparação",
    ...instructions.map((instruction, index) => instruction.endsWith(":") ? instruction : `${index + 1}. ${instruction}`),
  ].filter(Boolean).join("\n");
  const parsed = parseRecipeText(canonical);
  if (!parsed.draft) return null;
  parsed.draft.tags = keywordTags(recipe.keywords);
  return {
    ...parsed,
    sourceTitle: title,
    usedStructuredData: true,
  };
}

function metaContent(html: string, names: string[]) {
  function attribute(tag: string, name: string) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
    return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
  }

  const wanted = new Set(names.map((name) => name.toLocaleLowerCase("en-US")));
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attribute(tag, "property") || attribute(tag, "name")).toLocaleLowerCase("en-US");
    if (!wanted.has(key)) continue;
    const value = attribute(tag, "content");
    if (value) return cleanText(value, 1_200);
  }
  return "";
}

function visiblePageText(html: string) {
  return decodeEntities(
    html
      .replace(/<head\b[^>]*>[\s\S]*?<\/head\s*>/gi, " ")
      .replace(/<(script|style|svg|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(?:p|li|h[1-6]|div|section|article|ol|ul)\s*>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 1_500)
    .join("\n")
    .slice(0, 30_000);
}

function htmlFallback(html: string): UrlImportResult {
  const title = metaContent(html, ["og:title", "twitter:title"]) || cleanText(html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1], 200);
  const description = metaContent(html, ["og:description", "twitter:description", "description"]);
  const parsed = parseRecipeText([title, description, visiblePageText(html)].filter(Boolean).join("\n"));
  return {
    ...parsed,
    sourceTitle: title || null,
    usedStructuredData: false,
  };
}

export function extractRecipeFromHtml(html: string): UrlImportResult {
  const recipe = structuredRecipe(html);
  if (recipe) {
    const structured = parseStructuredRecipe(recipe);
    if (structured) return structured;
  }
  return htmlFallback(html);
}
