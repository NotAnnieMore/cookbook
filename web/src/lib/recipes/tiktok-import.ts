import { parseRecipeText, type TextImportResult } from "./text-import.ts";

type TikTokOEmbed = {
  title?: unknown;
  author_name?: unknown;
  provider_name?: unknown;
};

export function canonicalTikTokVideoUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return null;
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  if (hostname !== "tiktok.com") return null;
  const match = url.pathname.match(/^\/@([^/]+)\/video\/(\d+)/i);
  if (!match) return null;
  return `https://www.tiktok.com/@${encodeURIComponent(decodeURIComponent(match[1]))}/video/${match[2]}`;
}

export function prepareTikTokCaption(caption: string) {
  return caption
    .replace(/\r\n?/g, "\n")
    .replace(/\s*\*{0,2}(ingredients?|ingredientes?)\s*:\s*\*{0,2}\s*/gi, "\nIngredients\n")
    .replace(/\s*\*{0,2}(instructions?|directions?|prepara(?:ç|c)[aã]o)\s*:\s*\*{0,2}\s*/gi, "\nInstructions\n")
    .replace(/[ \t]+\*[ \t]+(?=\S)/g, "\n- ")
    .replace(/[ \t]+(?=\d+[.)][ \t]+)/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function extractRecipeFromTikTokOEmbed(body: string): TextImportResult & { authorName: string | null; caption: string | null } {
  let payload: TikTokOEmbed;
  try {
    payload = JSON.parse(body) as TikTokOEmbed;
  } catch {
    return { draft: null, warnings: [], error: "A resposta pública do TikTok não era válida.", authorName: null, caption: null };
  }
  if (payload.provider_name !== "TikTok" || typeof payload.title !== "string") {
    return { draft: null, warnings: [], error: "O TikTok não disponibilizou a descrição deste vídeo.", authorName: null, caption: null };
  }

  const result = parseRecipeText(prepareTikTokCaption(payload.title));
  return {
    ...result,
    authorName: typeof payload.author_name === "string" ? payload.author_name.slice(0, 120) : null,
    caption: payload.title,
  };
}
