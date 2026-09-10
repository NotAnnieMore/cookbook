"use server";

import { z } from "zod";

import { sanitizeImportedRecipe } from "@/lib/recipes/import-sanitizer";
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
};

export async function analyseRecipeText(
  _previousState: TextImportState,
  formData: FormData,
): Promise<TextImportState> {
  const parsedInput = sourceSchema.safeParse(formData.get("source_text"));
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
    return { message: "Não foi possível iniciar a importação. Tenta novamente." };
  }
  if ((count ?? 0) >= 10) {
    return {
      message:
        "Foram feitas várias tentativas seguidas. Aguarda alguns minutos antes de voltar a analisar.",
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

  const result = parseRecipeText(parsedInput.data);
  if (!result.draft || result.error) {
    await supabase
      .from("import_jobs")
      .update({
        status: "failed",
        error_code: "TEXT_STRUCTURE_NOT_FOUND",
        error_message: result.error,
        completed_at: new Date().toISOString(),
      })
      .eq("id", job.id);
    return { message: result.error ?? "Não foi possível interpretar o texto." };
  }

  const sanitizedDraft = sanitizeImportedRecipe(result.draft);

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
    warnings: result.warnings,
    importJobId: job.id,
  };
}
