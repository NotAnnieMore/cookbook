import { Buffer } from "node:buffer";

import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const maximumEmbeddedImageBytes = 75 * 1024 * 1024;
const emptyResult = { data: [] as Record<string, unknown>[], error: null };

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { message: "Inicia sessão para exportar os teus dados." },
      { status: 401 },
    );
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return NextResponse.json(
      { message: "Esta conta não está associada à coleção." },
      { status: 403 },
    );
  }

  const householdId = membership.household_id;
  const [householdResult, membersResult, profilesResult, recipesResult, tagsResult, importsResult] = await Promise.all([
    supabase.from("households").select("*").eq("id", householdId).maybeSingle(),
    supabase.from("household_members").select("*").eq("household_id", householdId),
    supabase.from("profiles").select("*").order("display_name"),
    supabase.from("recipes").select("*").eq("household_id", householdId).order("created_at"),
    supabase.from("tags").select("*").eq("household_id", householdId).order("name"),
    supabase.from("import_jobs").select("*").eq("household_id", householdId).order("created_at"),
  ]);

  const baseError = [
    householdResult.error,
    membersResult.error,
    profilesResult.error,
    recipesResult.error,
    tagsResult.error,
    importsResult.error,
  ].find(Boolean);

  if (baseError) {
    console.error("Falha ao preparar backup Cookbook", { code: baseError.code });
    return NextResponse.json(
      { message: "Não foi possível preparar a cópia dos dados." },
      { status: 500 },
    );
  }

  const recipeIds = (recipesResult.data ?? []).map((recipe) => recipe.id);
  const childResults = recipeIds.length
    ? await Promise.all([
        supabase.from("ingredient_groups").select("*").in("recipe_id", recipeIds).order("sort_order"),
        supabase.from("recipe_ingredients").select("*").in("recipe_id", recipeIds).order("sort_order"),
        supabase.from("recipe_sections").select("*").in("recipe_id", recipeIds).order("sort_order"),
        supabase.from("recipe_steps").select("*").in("recipe_id", recipeIds).order("sort_order"),
        supabase.from("recipe_step_ingredients").select("*").in("step_id", (await supabase.from("recipe_steps").select("id").in("recipe_id", recipeIds)).data?.map((step) => step.id) ?? []),
        supabase.from("recipe_tags").select("*").in("recipe_id", recipeIds),
        supabase.from("recipe_favorites").select("*").in("recipe_id", recipeIds),
        supabase.from("ratings").select("*").in("recipe_id", recipeIds),
        supabase.from("recipe_sources").select("*").in("recipe_id", recipeIds),
        supabase.from("recipe_images").select("*").in("recipe_id", recipeIds).order("sort_order"),
      ])
    : Array.from({ length: 10 }, () => emptyResult);

  const childError = childResults.map((result) => result.error).find(Boolean);
  if (childError) {
    console.error("Falha ao reunir backup Cookbook", { code: childError.code });
    return NextResponse.json(
      { message: "Não foi possível reunir todos os dados da coleção." },
      { status: 500 },
    );
  }

  const [groups, ingredients, sections, steps, stepIngredients, recipeTags, favourites, ratings, sources, images] = childResults.map((result) => result.data ?? []);
  const imageFiles: Array<{ storagePath: string; contentType: string; base64: string }> = [];
  const warnings: string[] = [];
  let embeddedImageBytes = 0;

  for (const image of images) {
    const storagePath = typeof image.storage_path === "string" ? image.storage_path : "";
    if (!storagePath) continue;

    const { data, error } = await supabase.storage.from("recipe-images").download(storagePath);
    if (error || !data) {
      warnings.push(`Não foi possível incluir a fotografia ${storagePath}.`);
      continue;
    }

    const bytes = Buffer.from(await data.arrayBuffer());
    if (embeddedImageBytes + bytes.length > maximumEmbeddedImageBytes) {
      warnings.push("Algumas fotografias não foram incluídas porque a cópia ultrapassaria 75 MB.");
      break;
    }

    embeddedImageBytes += bytes.length;
    imageFiles.push({
      storagePath,
      contentType: data.type || "application/octet-stream",
      base64: bytes.toString("base64"),
    });
  }

  const exportedAt = new Date();
  const backup = {
    format: "cookbook-backup",
    schemaVersion: 1,
    exportedAt: exportedAt.toISOString(),
    exportedBy: user.id,
    complete: warnings.length === 0,
    warnings,
    data: {
      household: householdResult.data,
      householdMembers: membersResult.data ?? [],
      profiles: profilesResult.data ?? [],
      recipes: recipesResult.data ?? [],
      ingredientGroups: groups,
      ingredients,
      recipeSections: sections,
      recipeSteps: steps,
      recipeStepIngredients: stepIngredients,
      tags: tagsResult.data ?? [],
      recipeTags,
      favourites,
      ratings,
      sources,
      importJobs: importsResult.data ?? [],
      images,
      imageFiles,
    },
  };

  const date = exportedAt.toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="cookbook-backup-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
