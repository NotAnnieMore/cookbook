"use server";

import { z } from "zod";

import { canonicalInstagramPostUrl, extractRecipeFromInstagramHtml, prepareInstagramCaption } from "@/lib/recipes/instagram-import";
import { extractRecipeFromImagesWithGemini, extractRecipeFromUrlWithGemini, extractRecipeWithGemini, reviewRecipeImportWithGemini, translateRecipeDraftWithGemini, type GeminiImportOutcome } from "@/lib/recipes/gemini-import";
import type { ImportAiReviewResult } from "@/components/import-ai-review";
import type { ImportCaptureFeedback } from "@/components/import-capture-feedback";
import { prepareImportImages } from "@/lib/recipes/import-media";
import { canonicalTikTokVideoUrl, extractRecipeFromTikTokOEmbed, isTikTokShortUrl, prepareTikTokCaption } from "@/lib/recipes/tiktok-import";
import { cleanImportedText, sanitizeImportedRecipe } from "@/lib/recipes/import-sanitizer";
import { recipeDraftLanguageText, shouldTranslateToPortuguese } from "@/lib/recipes/import-language";
import { parseRecipeText } from "@/lib/recipes/text-import";
import { extractReadableRecipeText, extractRecipeFromHtml, type UrlImportResult } from "@/lib/recipes/url-import";
import { fetchPublicRecipePage, parsePublicHttpUrl, resolvePublicHttpUrl, SafeUrlError } from "@/lib/safe-url-fetch";
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
  sourceTextOverride?: string | null;
  reviewSourceText?: string;
  aiReview?: ImportAiReviewResult;
  captureFeedback?: ImportCaptureFeedback;
};

export async function analyseRecipeUrl(
  previousState: UrlImportState,
  formData: FormData,
): Promise<UrlImportState> {
  const parsedInput = urlSchema.safeParse(formData.get("source_url"));
  const forceAiReview = formData.get("force_ai_review") === "1";
  if (!parsedInput.success) {
    return { message: "Introduz o endereço completo da página da receita." };
  }

  let normalizedUrl: URL;
  try {
    normalizedUrl = parsePublicHttpUrl(parsedInput.data);
  } catch (error) {
    return { message: error instanceof SafeUrlError ? error.message : "O endereço não é válido." };
  }
  let tikTokUrl = canonicalTikTokVideoUrl(normalizedUrl.toString());
  const shortTikTokUrl = isTikTokShortUrl(normalizedUrl.toString());
  const instagramUrl = canonicalInstagramPostUrl(normalizedUrl.toString());
  let socialUrl = tikTokUrl ?? instagramUrl;
  let sourceKind: NonNullable<UrlImportState["sourceKind"]> = tikTokUrl || shortTikTokUrl ? "tiktok" : instagramUrl ? "instagram" : "website";
  const sourceTextValue = formData.get("source_text_override");
  const sourceText = typeof sourceTextValue === "string" && sourceTextValue.trim()
    ? sourceTextSchema.safeParse(sourceTextValue)
    : null;
  if (sourceText && !sourceText.success) {
    return { message: "O texto deve ter entre 20 e 30 000 caracteres.", sourceUrl: socialUrl ?? normalizedUrl.toString(), needsSourceText: true, sourceKind };
  }
  const preparedImages = await prepareImportImages(formData.getAll("source_images"));
  if (preparedImages.error) {
    return {
      message: preparedImages.error,
      sourceUrl: socialUrl ?? normalizedUrl.toString(),
      needsSourceText: true,
      sourceKind,
      sourceTextOverride: sourceText?.success ? sourceText.data : null,
    };
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
  if (countError) return forceAiReview
    ? { ...previousState, message: "Não foi possível iniciar a revisão. Tenta novamente." }
    : { message: "Não foi possível iniciar a importação. Tenta novamente." };
  if ((count ?? 0) >= 10) {
    const message = "Foram feitas várias tentativas seguidas. Aguarda alguns minutos antes de voltar a analisar.";
    return forceAiReview ? { ...previousState, message } : { message };
  }

  if (forceAiReview && previousState.draft && previousState.importJobId) {
    const reviewSourceText = previousState.reviewSourceText ?? "";
    const { data: reviewJob, error: reviewJobError } = await supabase
      .from("import_jobs")
      .insert({
        household_id: membership.household_id,
        created_by: user.id,
        input_type: "url",
        source_url: normalizedUrl.toString(),
        input_text: reviewSourceText || null,
        status: "ai",
      })
      .select("id")
      .single();
    if (reviewJobError || !reviewJob) return { ...previousState, message: "Não foi possível iniciar a revisão por IA." };

    const reviewOutcome = await reviewRecipeImportWithGemini(reviewSourceText, previousState.draft);
    await supabase.from("import_jobs").update({
      status: reviewOutcome.review ? "preview" : "failed",
      result_draft: previousState.draft,
      error_code: reviewOutcome.errorCode,
      error_message: reviewOutcome.errorCode,
      completed_at: new Date().toISOString(),
    }).eq("id", reviewJob.id);
    return {
      ...previousState,
      message: undefined,
      aiReview: reviewOutcome.review ?? { verdict: "unavailable", issues: [] },
    };
  }

  if (shortTikTokUrl && !tikTokUrl) {
    try {
      const resolvedUrl = await resolvePublicHttpUrl(normalizedUrl.toString());
      tikTokUrl = canonicalTikTokVideoUrl(resolvedUrl);
    } catch (error) {
      console.error("A resolução local do link curto do TikTok falhou; serão tentados os restantes fallbacks", {
        code: error instanceof SafeUrlError ? error.code : "SHORT_URL_RESOLUTION_FAILED",
      });
    }
    if (tikTokUrl) {
      socialUrl = tikTokUrl;
    } else {
      socialUrl = normalizedUrl.toString();
    }
    sourceKind = "tiktok";
  }

  const jobId = crypto.randomUUID();
  const jobPayload = {
    id: jobId,
    household_id: membership.household_id,
    created_by: user.id,
    input_type: "url",
    source_url: normalizedUrl.toString(),
    input_text: sourceText?.success ? sourceText.data : null,
    status: "fetching",
  } as const;
  const firstJobResult = await supabase
    .from("import_jobs")
    .insert(jobPayload)
    .select("id")
    .single();

  let job = firstJobResult.data;
  let jobError = firstJobResult.error;

  if (jobError || !job) {
    console.warn("A primeira tentativa de registar a importação falhou", {
      code: jobError?.code,
    });
    const existingJob = await supabase
      .from("import_jobs")
      .select("id")
      .eq("id", jobId)
      .eq("created_by", user.id)
      .maybeSingle();
    if (existingJob.data) {
      job = existingJob.data;
      jobError = null;
    } else {
      const retryJobResult = await supabase
        .from("import_jobs")
        .insert(jobPayload)
        .select("id")
        .single();
      job = retryJobResult.data;
      jobError = retryJobResult.error;
    }
  }

  if (jobError || !job) {
    console.error("Não foi possível registar a importação após nova tentativa", {
      code: jobError?.code,
    });
    return { message: "Não foi possível registar esta importação. Confirma a ligação e tenta novamente." };
  }

  let sourceUrl = socialUrl ?? normalizedUrl.toString();
  let result: UrlImportResult | null = null;
  let usedTikTokAdapter = false;
  let usedInstagramAdapter = false;
  let usedGeminiFallback = false;
  let usedGeminiUrlContext = false;
  let usedImageCapture = false;
  let translatedWithGemini = false;
  let geminiErrorCode: GeminiImportOutcome["errorCode"] = null;
  let aiSourceText = sourceText?.success ? sourceText.data : "";
  let publicSocialCaption: string | null = null;
  let fetchedPage: Awaited<ReturnType<typeof fetchPublicRecipePage>> | null = null;

  if (preparedImages.images.length) {
    const imageOutcome = await extractRecipeFromImagesWithGemini(
      preparedImages.images,
      sourceText?.success ? sourceText.data : "",
    );
    geminiErrorCode = imageOutcome.errorCode;
    if (imageOutcome.result?.draft && !imageOutcome.result.error) {
      result = imageOutcome.result;
      usedGeminiFallback = true;
      usedImageCapture = true;
      aiSourceText = imageOutcome.sourceEvidence ?? aiSourceText;
    } else if (imageOutcome.errorCode) {
      console.error("A leitura das capturas pelo Gemini não ficou disponível", { code: imageOutcome.errorCode });
    }
  }

  if (!result && sourceText?.success) {
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
    let page: Awaited<ReturnType<typeof fetchPublicRecipePage>> | null = null;
    try {
      page = fetchedPage ?? await fetchPublicRecipePage(socialUrl ?? normalizedUrl.toString());
    } catch (error) {
      const safeError = error instanceof SafeUrlError
        ? error
        : new SafeUrlError("FETCH_FAILED", "Não foi possível ler esse website.");
      result = {
        draft: null,
        warnings: [],
        error: safeError.message,
        sourceTitle: null,
        usedStructuredData: false,
      };
    }
    if (page) {
      fetchedPage = page;
      sourceUrl = socialUrl ?? page.finalUrl;
      result = extractRecipeFromHtml(page.html);
    }
  }
  if (!result) {
    result = {
      draft: null,
      warnings: [],
      error: "Não foi possível ler o conteúdo desta página.",
      sourceTitle: null,
      usedStructuredData: false,
    };
  }

  await supabase.from("import_jobs").update({ status: "parsing", source_url: sourceUrl }).eq("id", job.id);
  if (!aiSourceText) {
    aiSourceText = publicSocialCaption
      ?? (fetchedPage ? extractReadableRecipeText(fetchedPage.html) : "");
  }
  const needsPortugueseTranslation = result.draft
    ? shouldTranslateToPortuguese(recipeDraftLanguageText(result.draft))
    : shouldTranslateToPortuguese(aiSourceText);
  if (!result.draft || result.error) {
    const fallbackTitle = result.sourceTitle ?? "";
    const geminiOutcome = await extractRecipeWithGemini(aiSourceText, fallbackTitle, {
      translateToPortuguese: needsPortugueseTranslation,
    });
    geminiErrorCode = geminiOutcome.errorCode;
    if (geminiOutcome.result?.draft && !geminiOutcome.result.error) {
      result = geminiOutcome.result;
      usedGeminiFallback = true;
      translatedWithGemini = needsPortugueseTranslation;
    } else if (geminiOutcome.errorCode && geminiOutcome.errorCode !== "NO_SOURCE_TEXT") {
      console.error("A extração assistida pelo Gemini não ficou disponível", {
        code: geminiOutcome.errorCode,
      });
    }
    if (!result.draft || result.error) {
      const urlOutcome = await extractRecipeFromUrlWithGemini(sourceUrl, fallbackTitle, {
        translateToPortuguese: true,
      });
      geminiErrorCode = urlOutcome.errorCode ?? geminiErrorCode;
      if (urlOutcome.result?.draft && !urlOutcome.result.error) {
        result = urlOutcome.result;
        usedGeminiFallback = true;
        usedGeminiUrlContext = true;
        translatedWithGemini = needsPortugueseTranslation;
        aiSourceText = urlOutcome.sourceEvidence ?? aiSourceText;
      } else if (urlOutcome.errorCode) {
        console.error("A consulta direta da ligação pelo Gemini não ficou disponível", { code: urlOutcome.errorCode });
      }
    }
  } else if (needsPortugueseTranslation) {
    const translation = await translateRecipeDraftWithGemini(result.draft);
    geminiErrorCode = translation.errorCode;
    if (translation.draft) {
      result = { ...result, draft: translation.draft };
      translatedWithGemini = true;
    } else if (translation.errorCode) {
      console.error("A tradução assistida pelo Gemini não ficou disponível", { code: translation.errorCode });
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
    const aiSuffix = geminiErrorCode && geminiErrorCode !== "NO_SOURCE_TEXT"
      ? " A leitura assistida por IA também não conseguiu organizar o conteúdo disponível."
      : "";
    return {
      message: `${message}${aiSuffix} Cola o texto ou envia capturas onde a receita esteja visível; mantemos esta ligação como origem.`,
      sourceUrl,
      needsSourceText: true,
      publicCaption: publicSocialCaption,
      sourceKind,
      sourceTextOverride: sourceText?.success ? sourceText.data : null,
    };
  }

  const sanitizedDraft = sanitizeImportedRecipe(result.draft);

  const warnings = [...result.warnings];
  if (usedImageCapture) {
    warnings.unshift("O Chef Pitéu leu as capturas com o Gemini e organizou o conteúdo em PT-PT. O Cookbook não guardou as imagens; confirma o preview.");
  } else if (usedGeminiUrlContext) {
    warnings.unshift("O Gemini consultou diretamente a ligação pública porque a leitura normal não chegou. Os números foram validados contra o texto recuperado; confirma o preview.");
  } else if (translatedWithGemini) {
    warnings.unshift("O Gemini organizou e traduziu esta receita para português de Portugal. Os números foram validados contra a fonte; confirma ainda assim o preview.");
  } else if (usedGeminiFallback) {
    warnings.unshift("Esta página precisou de organização assistida por IA. Confirma os ingredientes, quantidades e passos antes de guardar.");
  } else if (needsPortugueseTranslation && geminiErrorCode) {
    warnings.unshift("Detetámos texto noutra língua, mas a tradução assistida não ficou disponível. O conteúdo original foi mantido para não perder a receita.");
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
    sourceTextOverride: sourceText?.success ? sourceText.data : null,
    reviewSourceText: aiSourceText.slice(0, 30_000),
    captureFeedback: {
      source: usedImageCapture
        ? "screenshots"
        : usedGeminiUrlContext
          ? "url-context"
          : sourceText?.success
            ? "pasted-source"
            : sourceKind === "tiktok" && (usedTikTokAdapter || publicSocialCaption)
              ? "tiktok-caption"
              : sourceKind === "instagram" && (usedInstagramAdapter || publicSocialCaption)
                ? "instagram-caption"
                : result.usedStructuredData ? "schema" : "page-text",
      ai: usedGeminiFallback
        ? translatedWithGemini ? "organised-translated" : "organised"
        : translatedWithGemini ? "translated" : "none",
    },
  };
}
