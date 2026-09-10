"use server";

import { z } from "zod";

import { canonicalInstagramPostUrl, extractRecipeFromInstagramHtml, prepareInstagramCaption } from "@/lib/recipes/instagram-import";
import { extractRecipeWithGemini, type GeminiImportOutcome } from "@/lib/recipes/gemini-import";
import { canonicalTikTokVideoUrl, extractRecipeFromTikTokOEmbed, prepareTikTokCaption } from "@/lib/recipes/tiktok-import";
import { cleanImportedText, sanitizeImportedRecipe } from "@/lib/recipes/import-sanitizer";
import { parseRecipeText } from "@/lib/recipes/text-import";
import { extractReadableRecipeText, extractRecipeFromHtml, type UrlImportResult } from "@/lib/recipes/url-import";
import { fetchPublicRecipePage, parsePublicHttpUrl, SafeUrlError } from "@/lib/safe-url-fetch";
import { createClient } from "@/lib/supabase/server";

const urlSchema = z.string().trim().min(8).max(2_048);
const sourceTextSchema = z.string().trim().min(20).max(30_000);

export type UrlImportState = {
  message?: string;
  draft?: ReturnType<typeof extractRecipeFromHtml>["draft"];
  warnings?: string[];
  importJobId?: string;
  sourceUrl?: string;
  sourceTitle?: string | null;
  needsSourceText?: boolean;
  publicCaption?: string | null;
  sourceKind?: "instagram" | "tiktok" | "website";
};

export async function analyseRecipeUrl(
  _previousState: UrlImportState,
  formData: FormData,
): Promise<UrlImportState> {
  const parsedInput = urlSchema.safeParse(formData.get("source_url"));
  if (!parsedInput.success) {
    return { message: "Introduz o endereço completo da página da receita." };
  }

  let normalizedUrl: URL;
  try {
    normalizedUrl = parsePublicHttpUrl(parsedInput.data);
  } catch (error) {
    return { message: error instanceof SafeUrlError ? error.message : "O endereço não é válido." };
  }
  const tikTokUrl = canonicalTikTokVideoUrl(normalizedUrl.toString());
  const instagramUrl = canonicalInstagramPostUrl(normalizedUrl.toString());
  const socialUrl = tikTokUrl ?? instagramUrl;
  const sourceKind = tikTokUrl ? "tiktok" : instagramUrl ? "instagram" : "website";
  const sourceTextValue = formData.get("source_text_override");
  const sourceText = typeof sourceTextValue === "string" && sourceTextValue.trim()
    ? sourceTextSchema.safeParse(sourceTextValue)
    : null;
  if (sourceText && !sourceText.success) {
    return { message: "O texto deve ter entre 20 e 30 000 caracteres.", sourceUrl: socialUrl ?? normalizedUrl.toString(), needsSourceText: true, sourceKind };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "A sessão terminou. Inicia sessão novamente." };

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (membershipError || !membership) {
    return { message: "Esta conta ainda não está associada à coleção." };
  }

  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count, error: countError } = await supabase
    .from("import_jobs")
    .select("id", { count: "exact", head: true })
    .eq("created_by", user.id)
    .gte("created_at", tenMinutesAgo);
  if (countError) return { message: "Não foi possível iniciar a importação. Tenta novamente." };
  if ((count ?? 0) >= 10) {
    return { message: "Foram feitas várias tentativas seguidas. Aguarda alguns minutos antes de voltar a analisar." };
  }

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      household_id: membership.household_id,
      created_by: user.id,
      input_type: "url",
      source_url: normalizedUrl.toString(),
      input_text: sourceText?.success ? sourceText.data : null,
      status: "fetching",
    })
    .select("id")
    .single();
  if (jobError || !job) return { message: "Não foi possível registar esta importação." };

  let sourceUrl = socialUrl ?? normalizedUrl.toString();
  let result: UrlImportResult | null = null;
  let usedTikTokAdapter = false;
  let usedInstagramAdapter = false;
  let usedGeminiFallback = false;
  let publicSocialCaption: string | null = null;
  let fetchedPage: Awaited<ReturnType<typeof fetchPublicRecipePage>> | null = null;

  if (sourceText?.success) {
    const preparedText = tikTokUrl
      ? prepareTikTokCaption(sourceText.data)
      : instagramUrl
        ? prepareInstagramCaption(sourceText.data)
        : sourceText.data;
    const parsedText = parseRecipeText(preparedText);
    result = {
      ...parsedText,
      sourceTitle: parsedText.draft?.title ?? null,
      usedStructuredData: true,
    };
  }

  if (!result && tikTokUrl) {
    const oEmbedUrl = new URL("https://www.tiktok.com/oembed");
    oEmbedUrl.searchParams.set("url", tikTokUrl);
    try {
      const oEmbedPage = await fetchPublicRecipePage(oEmbedUrl.toString());
      const tikTokResult = extractRecipeFromTikTokOEmbed(oEmbedPage.html);
      publicSocialCaption = tikTokResult.caption;
      if (tikTokResult.draft && !tikTokResult.error) {
        sourceUrl = tikTokUrl;
        usedTikTokAdapter = true;
        result = {
          draft: tikTokResult.draft,
          warnings: tikTokResult.warnings,
          error: null,
          sourceTitle: tikTokResult.draft.title,
          usedStructuredData: true,
        };
      }
    } catch {
      // Some videos disable oEmbed. The normal public page remains a valid fallback.
    }
  }

  if (!result && instagramUrl) {
    try {
      fetchedPage = await fetchPublicRecipePage(instagramUrl);
      const instagramResult = extractRecipeFromInstagramHtml(fetchedPage.html);
      publicSocialCaption = instagramResult.caption;
      if (instagramResult.draft && !instagramResult.error) {
        usedInstagramAdapter = true;
        result = {
          draft: instagramResult.draft,
          warnings: instagramResult.warnings,
          error: null,
          sourceTitle: instagramResult.draft.title,
          usedStructuredData: true,
        };
      }
    } catch {
      // Public Instagram pages frequently require login; assisted paste remains available.
      result = {
        draft: null,
        warnings: [],
        error: "O Instagram bloqueou a leitura automática desta publicação.",
        sourceTitle: null,
        usedStructuredData: false,
      };
    }
  }

  if (!result) {
    let page: Awaited<ReturnType<typeof fetchPublicRecipePage>>;
    try {
      page = fetchedPage ?? await fetchPublicRecipePage(socialUrl ?? normalizedUrl.toString());
    } catch (error) {
      const safeError = error instanceof SafeUrlError
        ? error
        : new SafeUrlError("FETCH_FAILED", "Não foi possível ler esse website.");
      await supabase.from("import_jobs").update({
        status: "failed",
        error_code: safeError.code,
        error_message: safeError.message,
        completed_at: new Date().toISOString(),
      }).eq("id", job.id);
      return { message: `${safeError.message} Podes sempre copiar o texto da receita e usar “Importar texto”.` };
    }
    fetchedPage = page;
    sourceUrl = socialUrl ?? page.finalUrl;
    result = extractRecipeFromHtml(page.html);
  }

  await supabase.from("import_jobs").update({ status: "parsing", source_url: sourceUrl }).eq("id", job.id);
  let geminiOutcome: GeminiImportOutcome | null = null;
  if (!result.draft || result.error) {
    const aiSourceText = sourceText?.success
      ? sourceText.data
      : publicSocialCaption
        ?? (fetchedPage ? extractReadableRecipeText(fetchedPage.html) : "");
    const fallbackTitle = result.sourceTitle ?? "";
    geminiOutcome = await extractRecipeWithGemini(aiSourceText, fallbackTitle);
    if (geminiOutcome.result?.draft && !geminiOutcome.result.error) {
      result = geminiOutcome.result;
      usedGeminiFallback = true;
    } else if (geminiOutcome.errorCode && geminiOutcome.errorCode !== "NO_SOURCE_TEXT") {
      console.error("A extração assistida pelo Gemini não ficou disponível", {
        code: geminiOutcome.errorCode,
      });
    }
  }

  if (!result.draft || result.error) {
    const message = tikTokUrl
      ? "O TikTok só disponibilizou uma legenda curta, sem ingredientes e preparação suficientes."
      : instagramUrl
        ? "O Instagram não disponibilizou uma descrição pública com ingredientes e preparação suficientes."
        : "Não encontrei ingredientes e preparação suficientes nessa página.";
    await supabase.from("import_jobs").update({
      status: "failed",
      error_code: "URL_STRUCTURE_NOT_FOUND",
      error_message: result.error ?? message,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    const aiSuffix = geminiOutcome && geminiOutcome.errorCode !== "NO_SOURCE_TEXT"
      ? " A leitura assistida por IA também não conseguiu organizar o conteúdo disponível."
      : "";
    return socialUrl
      ? {
          message: `${message}${aiSuffix} Cola abaixo o texto completo que vês na publicação e mantemos este link como origem.`,
          sourceUrl: socialUrl,
          needsSourceText: true,
          publicCaption: publicSocialCaption,
          sourceKind,
        }
      : { message: `${message}${aiSuffix} Experimenta “Importar texto” para teres controlo total.` };
  }

  const sanitizedDraft = sanitizeImportedRecipe(result.draft);

  const warnings = [...result.warnings];
  if (usedGeminiFallback) {
    warnings.unshift("Esta página precisou de organização assistida por IA. Confirma os ingredientes, quantidades e passos antes de guardar.");
  } else if (sourceText?.success && socialUrl) {
    warnings.unshift(`Receita extraída do texto que colaste; o link do ${instagramUrl ? "Instagram" : "TikTok"} ficou guardado como fonte original.`);
  } else if (usedTikTokAdapter) {
    warnings.unshift("Descrição pública obtida diretamente do TikTok; confirma as quantidades, pois muitos vídeos não as indicam.");
  } else if (usedInstagramAdapter) {
    warnings.unshift("Descrição pública obtida diretamente do Instagram; confirma as quantidades, pois muitas publicações não as indicam.");
  } else if (!result.usedStructuredData) {
    warnings.unshift("Este website não forneceu uma receita estruturada; confirma com atenção o texto extraído da página.");
  }
  const { error: previewError } = await supabase.from("import_jobs").update({
    status: "preview",
    source_url: sourceUrl,
    result_draft: sanitizedDraft,
    error_code: null,
    error_message: null,
  }).eq("id", job.id);
  if (previewError) return { message: "O preview foi criado, mas não foi possível guardá-lo." };

  return {
    draft: sanitizedDraft,
    warnings,
    importJobId: job.id,
    sourceUrl,
    sourceTitle: result.sourceTitle ? cleanImportedText(result.sourceTitle) : null,
    sourceKind,
  };
}
