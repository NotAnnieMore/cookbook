import { parseRecipeText, type TextImportResult } from "./text-import.ts";
import { hashtagsFromCaption, prepareSocialRecipeCaption } from "./social-caption.ts";

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

export function isTikTokShortUrl(input: string) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return false;
  }
  const hostname = url.hostname.toLocaleLowerCase("en-US").replace(/^www\./, "");
  return (hostname === "vm.tiktok.com" || hostname === "vt.tiktok.com")
    && /^\/[a-z0-9_-]+\/?$/i.test(url.pathname);
}

export function prepareTikTokCaption(caption: string) {
  return prepareSocialRecipeCaption(caption);
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
  if (result.draft) result.draft.tags = hashtagsFromCaption(payload.title);
  return {
    ...result,
    authorName: typeof payload.author_name === "string" ? payload.author_name.slice(0, 120) : null,
    caption: payload.title,
  };
}
