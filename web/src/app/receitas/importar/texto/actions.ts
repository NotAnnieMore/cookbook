"use server";

import { z } from "zod";

import { extractRecipeWithGemini, reviewRecipeImportWithGemini, translateRecipeDraftWithGemini, type GeminiImportOutcome } from "@/lib/recipes/gemini-import";
import type { ImportAiReviewResult } from "@/components/import-ai-review";
import type { ImportCaptureFeedback } from "@/components/import-capture-feedback";
import { sanitizeImportedRecipe } from "@/lib/recipes/import-sanitizer";
import { recipeDraftLanguageText, shouldTranslateToPortuguese } from "@/lib/recipes/import-language";
import {
  parseRecipeText,
  type TextImportDraft,
} from "@/lib/recipes/text-import";
import { createClient } from "@/lib/supabase/server";

const sourceSchema = z.string().trim().min(20).max(30_000);

export type TextImportState = {
  message?: string;
  draft?: TextImportDraft;
  warnings?: string[];
  importJobId?: string;
  sourceText?: string;
  aiReview?: ImportAiReviewResult;
  captureFeedback?: ImportCaptureFeedback;
};

export async function analyseRecipeText(
  previousState: TextImportState,
  formData: FormData,
): Promise<TextImportState> {
  const parsedInput = sourceSchema.safeParse(formData.get("source_text"));
  const forceAiReview = formData.get("force_ai_review") === "1";
  if (!parsedInput.success) {
    return {
      message:
        "Cola pelo menos algumas linhas da receita (máximo de 30 000 caracteres).",
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
  if (countError) {
    return forceAiReview
      ? { ...previousState, message: "Não foi possível iniciar a revisão. Tenta novamente." }
      : { message: "Não foi possível iniciar a importação. Tenta novamente." };
  }
  if ((count ?? 0) >= 10) {
    const message = "Foram feitas várias tentativas seguidas. Aguarda alguns minutos antes de voltar a analisar.";
    return forceAiReview ? { ...previousState, message } : { message };
  }

  if (forceAiReview && previousState.draft && previousState.importJobId) {
    const { data: reviewJob, error: reviewJobError } = await supabase
      .from("import_jobs")
      .insert({
        household_id: membership.household_id,
        created_by: user.id,
        input_type: "text",
        input_text: parsedInput.data,
        status: "ai",
      })
      .select("id")
      .single();
    if (reviewJobError || !reviewJob) return { ...previousState, message: "Não foi possível iniciar a revisão por IA." };

    const reviewOutcome = await reviewRecipeImportWithGemini(parsedInput.data, previousState.draft);
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

  const { data: job, error: jobError } = await supabase
    .from("import_jobs")
    .insert({
      household_id: membership.household_id,
      created_by: user.id,
      input_type: "text",
      input_text: parsedInput.data,
      status: "parsing",
    })
    .select("id")
    .single();
  if (jobError || !job) {
    return { message: "Não foi possível registar esta importação." };
  }

  let result = parseRecipeText(parsedInput.data);
  const needsPortugueseTranslation = result.draft
    ? shouldTranslateToPortuguese(recipeDraftLanguageText(result.draft))
    : shouldTranslateToPortuguese(parsedInput.data);
  let usedGeminiFallback = false;
  let translatedWithGemini = false;
  let geminiErrorCode: GeminiImportOutcome["errorCode"] = null;

  if (!result.draft || result.error) {
    const geminiOutcome = await extractRecipeWithGemini(parsedInput.data, result.draft?.title ?? "", {
      translateToPortuguese: needsPortugueseTranslation,
    });
    geminiErrorCode = geminiOutcome.errorCode;
    if (geminiOutcome.result?.draft && !geminiOutcome.result.error) {
      result = geminiOutcome.result;
      usedGeminiFallback = true;
      translatedWithGemini = needsPortugueseTranslation;
    }
  } else if (needsPortugueseTranslation) {
    const translation = await translateRecipeDraftWithGemini(result.draft);
    geminiErrorCode = translation.errorCode;
    if (translation.draft) {
      result = { ...result, draft: translation.draft };
      translatedWithGemini = true;
    }
  }

  if (!result.draft || result.error) {
    await supabase
      .from("import_jobs")
      .update({
        status: "failed",
        error_code: geminiErrorCode ?? "TEXT_STRUCTURE_NOT_FOUND",
        error_message: result.error ?? geminiErrorCode,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    const aiSuffix = geminiErrorCode && geminiErrorCode !== "NO_SOURCE_TEXT"
      ? " A leitura assistida também não conseguiu criar uma estrutura segura."
      : "";
    return { message: `${result.error ?? "Não foi possível interpretar o texto."}${aiSuffix}` };
  }

  const sanitizedDraft = sanitizeImportedRecipe(result.draft);
  const warnings = [...result.warnings];
  if (translatedWithGemini) {
    warnings.unshift("O Gemini organizou e traduziu esta receita para português de Portugal. Os números foram validados contra o texto original; confirma ainda assim o preview.");
  } else if (usedGeminiFallback) {
    warnings.unshift("O parser normal não foi suficiente e o Gemini organizou o texto. Confirma os ingredientes, quantidades e passos antes de guardar.");
  } else if (needsPortugueseTranslation && geminiErrorCode) {
    warnings.unshift("Detetámos texto noutra língua, mas a tradução assistida não ficou disponível. Mantivemos o conteúdo original para não perder a receita.");
  }

  const { error: previewError } = await supabase
    .from("import_jobs")
    .update({
      status: "preview",
      result_draft: sanitizedDraft,
      error_code: null,
      error_message: null,
    })
    .eq("id", job.id);
  if (previewError) {
    return { message: "O preview foi criado, mas não foi possível guardá-lo." };
  }

  return {
    draft: sanitizedDraft,
    warnings,
    importJobId: job.id,
    sourceText: parsedInput.data,
    captureFeedback: {
      source: "text",
      ai: usedGeminiFallback
        ? translatedWithGemini ? "organised-translated" : "organised"
        : translatedWithGemini ? "translated" : "none",
    },
  };
}
