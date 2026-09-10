"use server";

import { z } from "zod";

import { extractRecipeFromHtml } from "@/lib/recipes/url-import";
import { fetchPublicRecipePage, parsePublicHttpUrl, SafeUrlError } from "@/lib/safe-url-fetch";
import { createClient } from "@/lib/supabase/server";

const urlSchema = z.string().trim().min(8).max(2_048);

export type UrlImportState = {
  message?: string;
  draft?: ReturnType<typeof extractRecipeFromHtml>["draft"];
  warnings?: string[];
  importJobId?: string;
  sourceUrl?: string;
  sourceTitle?: string | null;
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
      status: "fetching",
    })
    .select("id")
    .single();
  if (jobError || !job) return { message: "Não foi possível registar esta importação." };

  let page: Awaited<ReturnType<typeof fetchPublicRecipePage>>;
  try {
    page = await fetchPublicRecipePage(normalizedUrl.toString());
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

  await supabase.from("import_jobs").update({ status: "parsing", source_url: page.finalUrl }).eq("id", job.id);
  const result = extractRecipeFromHtml(page.html);
  if (!result.draft || result.error) {
    const message = "Não encontrei ingredientes e preparação suficientes nessa página.";
    await supabase.from("import_jobs").update({
      status: "failed",
      error_code: "URL_STRUCTURE_NOT_FOUND",
      error_message: result.error ?? message,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);
    return { message: `${message} Experimenta “Importar texto” para teres controlo total.` };
  }

  const warnings = [...result.warnings];
  if (!result.usedStructuredData) {
    warnings.unshift("Este website não forneceu uma receita estruturada; confirma com atenção o texto extraído da página.");
  }
  const { error: previewError } = await supabase.from("import_jobs").update({
    status: "preview",
    source_url: page.finalUrl,
    result_draft: result.draft,
    error_code: null,
    error_message: null,
  }).eq("id", job.id);
  if (previewError) return { message: "O preview foi criado, mas não foi possível guardá-lo." };

  return {
    draft: result.draft,
    warnings,
    importJobId: job.id,
    sourceUrl: page.finalUrl,
    sourceTitle: result.sourceTitle,
  };
}
