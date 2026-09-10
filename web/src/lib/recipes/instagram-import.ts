import { hashtagsFromCaption, prepareSocialRecipeCaption } from "./social-caption.ts";
import { parseRecipeText, type TextImportResult } from "./text-import.ts";

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: " ", quot: '"' };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, key: string) => {
    if (!key.startsWith("#")) return named[key.toLocaleLowerCase("en-US")] ?? entity;
    const hexadecimal = key[1]?.toLocaleLowerCase("en-US") === "x";
    const number = Number.parseInt(key.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10);
    return Number.isFinite(number) ? String.fromCodePoint(number) : entity;
  });
}

function attribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = tag.match(new RegExp(`\\b${escaped}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? "";
}

export function canonicalInstagramPostUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  if (hostname !== "instagram.com" && hostname !== "instagr.am") return null;
  const match = url.pathname.match(/^\/(p|reels?|tv)\/([a-z0-9_-]+)/i);
  if (!match) return null;
  const kind = match[1].toLocaleLowerCase("en-US") === "reels" ? "reel" : match[1].toLocaleLowerCase("en-US");
  return `https://www.instagram.com/${kind}/${match[2]}/`;
}

export function prepareInstagramCaption(caption: string) {
  return prepareSocialRecipeCaption(caption);
}

export function extractRecipeFromInstagramHtml(html: string): TextImportResult & { caption: string | null } {
  let caption = "";
  const wanted = new Set(["og:description", "twitter:description", "description"]);
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = (attribute(tag, "property") || attribute(tag, "name")).toLocaleLowerCase("en-US");
    if (!wanted.has(key)) continue;
    caption = decodeHtmlEntities(attribute(tag, "content")).replace(/<[^>]*>/g, " ").trim();
    if (caption) break;
  }

  if (!caption) {
    return { draft: null, warnings: [], error: "O Instagram não disponibilizou uma descrição pública.", caption: null };
  }
  const result = parseRecipeText(prepareInstagramCaption(caption));
  if (result.draft) result.draft.tags = hashtagsFromCaption(caption);
  return { ...result, caption };
}
