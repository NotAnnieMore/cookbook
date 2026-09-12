"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import sharp from "sharp";
import { z } from "zod";

import { comparableQuantityRange, parseQuantityValue } from "@/lib/recipes/measurements";
import { buildStepIngredientRows } from "@/lib/recipes/step-ingredients";
import { createClient } from "@/lib/supabase/server";

const quantitySchema = z
    .string()
    .trim()
    .max(24)
    .refine(
      (value) => !value || parseQuantityValue(value) !== null,
      "Usa uma quantidade como 250, 1,5 ou 1/2.",
    );

const ingredientSchema = z
  .object({
    clientId: z.number().int().nonnegative().max(1_000_000_000),
    name: z.string().trim().min(1).max(200),
    quantity: quantitySchema,
    quantityMax: quantitySchema,
    unit: z.string().trim().max(40),
    optional: z.boolean(),
    group: z.string().trim().max(80),
    packageQuantity: quantitySchema,
    packageUnit: z.string().trim().max(40),
    originalQuantity: quantitySchema.optional(),
    originalQuantityMax: quantitySchema.optional(),
    originalUnit: z.string().trim().max(40).optional(),
    originalText: z.string().trim().max(500).optional(),
    conversionConfidence: z
      .enum(["exact", "reference", "suggested", "ambiguous"])
      .optional(),
    conversionSource: z.string().trim().max(500).optional(),
    conversionRuleVersion: z.string().trim().max(40).optional(),
  })
  .refine(
    ({ quantity, quantityMax }) => {
      if (!quantityMax) return true;
      const quantityValue = parseQuantityValue(quantity);
      const quantityMaxValue = parseQuantityValue(quantityMax);
      return quantityValue !== null && quantityMaxValue !== null && quantityMaxValue >= quantityValue;
    },
    {
      message:
        "A quantidade máxima deve ser igual ou superior à quantidade inicial.",
    },
  );

const stepSchema = z.object({
  instruction: z.string().trim().min(1).max(4000),
  section: z.string().trim().max(80),
  ingredientClientIds: z.array(z.number().int().nonnegative().max(1_000_000_000)).max(100),
  timerSeconds: z.number().int().positive().max(7 * 24 * 60 * 60).nullable(),
});

const recipeSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: z.string().trim().max(1200),
    servings: z.string().trim().max(12),
    activeTime: z.string().trim().max(8),
    totalTime: z.string().trim().max(8),
    difficulty: z.enum(["easy", "medium", "hard", ""]),
    tags: z.array(z.string().trim().min(1).max(40)).max(12),
    ingredients: z.array(ingredientSchema).min(1).max(100),
    steps: z.array(stepSchema).min(1).max(100),
  })
  .refine(
    ({ activeTime, totalTime }) => {
      const active = optionalPositiveInteger(activeTime);
      const total = optionalPositiveInteger(totalTime);
      return active === null || total === null || total >= active;
    },
    { message: "O tempo total não pode ser menor do que o tempo ativo." },
  )
  .superRefine(({ ingredients, steps }, context) => {
    const ingredientIds = ingredients.map((ingredient) => ingredient.clientId);
    if (new Set(ingredientIds).size !== ingredientIds.length) {
      context.addIssue({ code: "custom", message: "Os ingredientes do formulário têm identificadores repetidos." });
      return;
    }
    const available = new Set(ingredientIds);
    for (const step of steps) {
      if (step.ingredientClientIds.some((id) => !available.has(id))) {
        context.addIssue({ code: "custom", message: "Um passo refere um ingrediente que já não existe." });
        return;
      }
    }
  });

export type CreateRecipeState = {
  message?: string;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

function parseArray(value: FormDataEntryValue | null): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function recipeValidationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  if (!issue) return "Confirma os dados da receita antes de guardar.";
  if (issue.message === "O tempo total não pode ser menor do que o tempo ativo.") return issue.message;

  const [field, index] = issue.path;
  if (field === "title") return "Indica um título com pelo menos 2 caracteres.";
  if (field === "ingredients") {
    const label = typeof index === "number" ? `Ingrediente ${index + 1}` : "Ingredientes";
    return `${label}: ${issue.message}`;
  }
  if (field === "steps") {
    const label = typeof index === "number" ? `Passo ${index + 1}` : "Preparação";
    return `${label}: ${issue.message}`;
  }
  if (field === "servings") return "Confirma o número inteiro de doses.";
  if (field === "activeTime" || field === "totalTime") return "Confirma os tempos indicados.";
  return issue.message || "Confirma os dados da receita antes de guardar.";
}

function draftTitle(value: unknown) {
  if (!value || typeof value !== "object" || !("title" in value)) return null;
  const title = (value as { title?: unknown }).title;
  return typeof title === "string" ? title.slice(0, 200) : null;
}

function optionalPositiveInteger(value: string) {
  if (!value) return null;
  const number = Number(value.replace(",", "."));
  return Number.isInteger(number) && number >= 0 ? number : Number.NaN;
}

function optionalPositiveNumber(value: string) {
  if (!value) return null;
  const number = parseQuantityValue(value);
  return number !== null && number > 0 ? number : Number.NaN;
}

function optionalPositiveCount(value: string) {
  if (!value) return null;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : Number.NaN;
}

function ingredientDisplayText(ingredient: z.infer<typeof ingredientSchema>) {
  const quantity = ingredient.quantityMax
    ? `${ingredient.quantity}–${ingredient.quantityMax}`
    : ingredient.quantity;
  const packageText = ingredient.packageQuantity
    ? `(${ingredient.packageQuantity} ${ingredient.packageUnit} por embalagem)`
    : "";
  return [quantity, ingredient.unit, ingredient.name, packageText]
    .filter(Boolean)
    .join(" ");
}

function coverFromForm(formData: FormData) {
  const value = formData.get("cover_image");
  return value instanceof File && value.size > 0 ? value : null;
}

function validateCover(file: File | null) {
  if (!file) return null;
  if (!imageExtensions[file.type]) {
    return "A fotografia deve ser JPG, PNG, WebP ou AVIF.";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "A fotografia não pode ultrapassar 10 MB.";
  }
  return null;
}

function ingredientRows(
  recipeId: string,
  ingredients: z.infer<typeof ingredientSchema>[],
  groupIds = new Map<string, string>(),
) {
  return ingredients.map((ingredient, index) => {
    const quantity = optionalPositiveNumber(ingredient.quantity);
    const quantityMax = optionalPositiveNumber(ingredient.quantityMax);
    const quantityOriginal = optionalPositiveNumber(
      ingredient.originalQuantity ?? ingredient.quantity,
    );
    const quantityMaxOriginal = optionalPositiveNumber(
      ingredient.originalQuantityMax ?? ingredient.quantityMax,
    );
    const storedOriginalRange = comparableQuantityRange(
      Number.isNaN(quantityOriginal) ? null : quantityOriginal,
      Number.isNaN(quantityMaxOriginal) ? null : quantityMaxOriginal,
    );
    const packageQuantity = optionalPositiveNumber(ingredient.packageQuantity);
    const unit = ingredient.unit || null;
    const displayText = ingredientDisplayText(ingredient);

    return {
      recipe_id: recipeId,
      group_id: ingredient.group
        ? groupIds.get(ingredient.group.toLocaleLowerCase("pt-PT")) ?? null
        : null,
      ingredient_name: ingredient.name,
      optional: ingredient.optional,
      scalable: true,
      sort_order: index,
      quantity_original: storedOriginalRange.quantity,
      quantity_max_original: storedOriginalRange.quantityMax,
      unit_original: ingredient.originalUnit || unit,
      display_text_original: ingredient.originalText || displayText,
      quantity_normalized: Number.isNaN(quantity) ? null : quantity,
      quantity_max_normalized: Number.isNaN(quantityMax) ? null : quantityMax,
      unit_normalized: unit,
      display_text_normalized: displayText,
      conversion_confidence: ingredient.conversionConfidence ?? ("exact" as const),
      conversion_source: ingredient.conversionSource || "manual",
      conversion_rule_version: ingredient.conversionRuleVersion || null,
      package_quantity: Number.isNaN(packageQuantity)
        ? null
        : packageQuantity,
      package_unit: ingredient.packageQuantity
        ? ingredient.packageUnit || null
        : null,
    };
  });
}

function stepRows(
  recipeId: string,
  steps: z.infer<typeof stepSchema>[],
  sectionIds = new Map<string, string>(),
) {
  return steps.map((step, index) => ({
    recipe_id: recipeId,
    section_id: step.section
      ? sectionIds.get(step.section.toLocaleLowerCase("pt-PT")) ?? null
      : null,
    instruction: step.instruction,
    timer_seconds: step.timerSeconds,
    sort_order: index,
  }));
}

function uniqueLabels(values: string[]) {
  const labels = new Map<string, { name: string; sort_order: number }>();
  values.forEach((value, index) => {
    if (!value) return;
    const key = value.toLocaleLowerCase("pt-PT");
    if (!labels.has(key)) labels.set(key, { name: value, sort_order: index });
  });
  return [...labels.values()];
}

function tagSlug(value: string) {
  return value
    .trim()
    .replace(/^#+/, "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-PT")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueTags(values: string[]) {
  const tags = new Map<string, string>();
  for (const value of values) {
    const name = value.trim().replace(/^#+/, "").replace(/\s+/g, " ");
    const slug = tagSlug(name);
    if (name && slug && !tags.has(slug)) tags.set(slug, name);
  }
  return [...tags].map(([slug, name]) => ({ slug, name }));
}

async function ensureTagIds(
  supabase: SupabaseClient,
  householdId: string,
  values: string[],
) {
  const tags = uniqueTags(values);
  if (!tags.length) return { ids: [] as string[], error: false };

  const colours = ["#F2A58B", "#F3C565", "#A9C7B2", "#AFC9DA"];
  const { error: upsertError } = await supabase.from("tags").upsert(
    tags.map((tag) => ({
      household_id: householdId,
      name: tag.name,
      slug: tag.slug,
      color:
        colours[
          [...tag.slug].reduce((total, character) => total + character.charCodeAt(0), 0) %
            colours.length
        ],
    })),
    { onConflict: "household_id,slug", ignoreDuplicates: true },
  );
  if (upsertError) {
    console.error("Falha ao preparar etiquetas", { code: upsertError.code });
    return { ids: [] as string[], error: true };
  }

  const { data, error } = await supabase
    .from("tags")
    .select("id,slug")
    .eq("household_id", householdId)
    .in("slug", tags.map((tag) => tag.slug));

  if (error || (data?.length ?? 0) !== tags.length) {
    console.error("Falha ao encontrar etiquetas", { code: error?.code });
    return { ids: [] as string[], error: true };
  }

  const idsBySlug = new Map((data ?? []).map((tag) => [tag.slug, tag.id]));
  return {
    ids: tags.flatMap((tag) => {
      const id = idsBySlug.get(tag.slug);
      return id ? [id] : [];
    }),
    error: false,
  };
}

async function createRecipeStructure(
  supabase: SupabaseClient,
  recipeId: string,
  ingredients: z.infer<typeof ingredientSchema>[],
  steps: z.infer<typeof stepSchema>[],
) {
  const groupRows = uniqueLabels(ingredients.map((ingredient) => ingredient.group));
  const sectionRows = uniqueLabels(steps.map((step) => step.section));
  const [groupsResult, sectionsResult] = await Promise.all([
    groupRows.length
      ? supabase
          .from("ingredient_groups")
          .insert(groupRows.map((group) => ({ ...group, recipe_id: recipeId })))
          .select("id,name")
      : Promise.resolve({ data: [], error: null }),
    sectionRows.length
      ? supabase
          .from("recipe_sections")
          .insert(sectionRows.map((section) => ({ ...section, recipe_id: recipeId })))
          .select("id,name")
      : Promise.resolve({ data: [], error: null }),
  ]);
  const groupIds = new Map(
    (groupsResult.data ?? []).map((group) => [
      String(group.name).toLocaleLowerCase("pt-PT"),
      group.id,
    ]),
  );
  const sectionIds = new Map(
    (sectionsResult.data ?? []).map((section) => [
      String(section.name).toLocaleLowerCase("pt-PT"),
      section.id,
    ]),
  );

  return {
    error: Boolean(groupsResult.error || sectionsResult.error),
    groupIds,
    sectionIds,
    createdGroupIds: [...groupIds.values()],
    createdSectionIds: [...sectionIds.values()],
  };
}

async function uploadCover({
  supabase,
  file,
  householdId,
  recipeId,
  userId,
  title,
}: {
  supabase: SupabaseClient;
  file: File;
  householdId: string;
  recipeId: string;
  userId: string;
  title: string;
}) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const isJpeg =
    file.type === "image/jpeg" &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const isPng =
    file.type === "image/png" &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47;
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  const isWebp =
    file.type === "image/webp" &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP";
  const isAvif =
    file.type === "image/avif" &&
    ascii(4, 4) === "ftyp" &&
    ["avif", "avis"].includes(ascii(8, 4));

  if (!isJpeg && !isPng && !isWebp && !isAvif) {
    console.error("Assinatura de ficheiro de imagem inválida");
    return false;
  }

  let optimized: Awaited<ReturnType<ReturnType<typeof sharp>["toBuffer"]>>;
  try {
    optimized = await sharp(bytes, {
      failOn: "error",
      limitInputPixels: 40_000_000,
    })
      .rotate()
      .resize({
        width: 2000,
        height: 2000,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (optimized.data.length > 1_500_000) {
      optimized = await sharp(bytes, {
        failOn: "error",
        limitInputPixels: 40_000_000,
      })
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 74, effort: 5 })
        .toBuffer({ resolveWithObject: true });
    }
  } catch (error) {
    console.error("Falha ao otimizar fotografia", {
      reason: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }

  const storagePath = `${householdId}/${recipeId}/cover-${crypto.randomUUID()}.webp`;

  const { error: storageError } = await supabase.storage
    .from("recipe-images")
    .upload(storagePath, optimized.data, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    console.error("Falha no upload da fotografia", { code: storageError.name });
    return false;
  }

  const { data: image, error: imageError } = await supabase
    .from("recipe_images")
    .insert({
      recipe_id: recipeId,
      uploaded_by: userId,
      storage_path: storagePath,
      image_kind: "cover",
      alt_text: `Fotografia de ${title}`,
      width: optimized.info.width,
      height: optimized.info.height,
      size_bytes: optimized.data.length,
      sort_order: 0,
    })
    .select("id")
    .single();

  if (imageError || !image) {
    console.error("Falha ao registar fotografia", { code: imageError?.code });
    await supabase.storage.from("recipe-images").remove([storagePath]);
    return false;
  }

  return { id: image.id, storagePath };
}

export async function createRecipe(
  _previousState: CreateRecipeState,
  formData: FormData,
): Promise<CreateRecipeState> {
  const result = recipeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    activeTime: formData.get("active_time"),
    totalTime: formData.get("total_time"),
    difficulty: formData.get("difficulty"),
    tags: parseArray(formData.get("tags_json")),
    ingredients: parseArray(formData.get("ingredients_json")),
    steps: parseArray(formData.get("steps_json")),
  });

  if (!result.success) {
    console.warn("Dados inválidos ao criar receita", result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })));
    return { message: recipeValidationMessage(result.error) };
  }

  const cover = coverFromForm(formData);
  const coverError = validateCover(cover);
  if (coverError) return { message: coverError };

  const servings = optionalPositiveCount(result.data.servings);
  const activeTime = optionalPositiveInteger(result.data.activeTime);
  const totalTime = optionalPositiveInteger(result.data.totalTime);

  if (
    Number.isNaN(servings) ||
    Number.isNaN(activeTime) ||
    Number.isNaN(totalTime)
  ) {
    return { message: "Confirma as doses e os tempos indicados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { message: "A sessão terminou. Inicia sessão novamente." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    console.error("Conta sem casa associada", { code: membershipError?.code });
    return {
      message:
        "Esta conta ainda não está associada à coleção. Confirma o setup da casa na Supabase.",
    };
  }

  const importJobValue = formData.get("import_job_id");
  const importJobProvided =
    typeof importJobValue === "string" && importJobValue.trim().length > 0;
  if (
    importJobProvided &&
    !z.string().uuid().safeParse(importJobValue).success
  ) {
    return { message: "O identificador deste preview é inválido." };
  }
  const importJobId =
    importJobProvided && typeof importJobValue === "string"
      ? importJobValue
      : null;
  const { data: importJob, error: importJobError } = importJobId
    ? await supabase
        .from("import_jobs")
        .select("id,input_type,input_text,source_url,status,result_draft")
        .eq("id", importJobId)
        .eq("household_id", membership.household_id)
        .eq("created_by", user.id)
        .eq("status", "preview")
        .maybeSingle()
    : { data: null, error: null };

  if (importJobId && (importJobError || !importJob)) {
    return {
      message:
        "Este preview de importação já não está disponível. Volta a iniciar a importação.",
    };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recipes")
    .insert({
      household_id: membership.household_id,
      created_by: user.id,
      title: result.data.title,
      description: result.data.description || null,
      servings,
      servings_label: "pessoas",
      active_time_minutes: activeTime,
      total_time_minutes: totalTime,
      difficulty: result.data.difficulty || null,
      origin_kind: importJob?.input_type === "url" ? "url" : importJob ? "text" : "manual",
      origin_label: importJob?.input_type === "url" ? "Website" : importJob ? "Texto colado" : null,
      source_url: importJob?.input_type === "url" ? importJob.source_url : null,
    })
    .select("id")
    .single();

  if (recipeError || !recipe) {
    console.error("Falha ao criar receita", { code: recipeError?.code });
    return { message: "Não foi possível guardar a receita. Tenta novamente." };
  }

  const [structure, tags] = await Promise.all([
    createRecipeStructure(
      supabase,
      recipe.id,
      result.data.ingredients,
      result.data.steps,
    ),
    ensureTagIds(supabase, membership.household_id, result.data.tags),
  ]);
  if (structure.error || tags.error) {
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { message: "Não foi possível preparar a organização da receita." };
  }

  const [ingredientsResult, stepsResult, tagsResult, sourceResult] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .insert(
        ingredientRows(recipe.id, result.data.ingredients, structure.groupIds),
      )
      .select("id,sort_order"),
    supabase
      .from("recipe_steps")
      .insert(stepRows(recipe.id, result.data.steps, structure.sectionIds))
      .select("id,sort_order"),
    tags.ids.length
      ? supabase
          .from("recipe_tags")
          .insert(tags.ids.map((tagId) => ({ recipe_id: recipe.id, tag_id: tagId })))
      : Promise.resolve({ error: null }),
    importJob
      ? supabase.from("recipe_sources").insert({
          recipe_id: recipe.id,
          source_type: importJob.input_type === "url" ? "url" : "text",
          source_url: importJob.input_type === "url" ? importJob.source_url : null,
          source_title_original:
            draftTitle(importJob.result_draft) ?? result.data.title,
          source_text_original: importJob.input_text,
          imported_by: user.id,
        })
      : Promise.resolve({ error: null }),
  ]);

  if (
    ingredientsResult.error ||
    stepsResult.error ||
    tagsResult.error ||
    sourceResult.error
  ) {
    console.error("Falha ao completar receita", {
      ingredientsCode: ingredientsResult.error?.code,
      stepsCode: stepsResult.error?.code,
      tagsCode: tagsResult.error?.code,
      sourceCode: sourceResult.error?.code,
    });
    await supabase.from("recipes").delete().eq("id", recipe.id);
    return { message: "A receita não ficou completa e não foi guardada." };
  }

  const links = buildStepIngredientRows(
    result.data.ingredients,
    result.data.steps,
    ingredientsResult.data ?? [],
    stepsResult.data ?? [],
  );
  if (links.length) {
    const { error: linksError } = await supabase
      .from("recipe_step_ingredients")
      .insert(links);
    if (linksError) {
      console.error("Falha ao associar ingredientes aos passos", { code: linksError.code });
      await supabase.from("recipes").delete().eq("id", recipe.id);
      return { message: "Não foi possível associar os ingredientes aos passos. Confirma se a atualização da Supabase foi aplicada." };
    }
  }

  if (importJob) {
    const { data: confirmedImport, error: confirmImportError } = await supabase
      .from("import_jobs")
      .update({ status: "confirmed", completed_at: new Date().toISOString() })
      .eq("id", importJob.id)
      .eq("status", "preview")
      .select("id")
      .maybeSingle();
    if (confirmImportError || !confirmedImport) {
      await supabase.from("recipes").delete().eq("id", recipe.id);
      return {
        message:
          "Este preview já foi confirmado ou deixou de estar disponível.",
      };
    }
  }

  const uploadedCover = cover
    ? await uploadCover({
      supabase,
      file: cover,
      householdId: membership.household_id,
      recipeId: recipe.id,
      userId: user.id,
      title: result.data.title,
    })
    : null;
  if (cover && !uploadedCover) {
    await supabase.from("recipes").delete().eq("id", recipe.id);
    if (importJob) {
      await supabase
        .from("import_jobs")
        .update({ status: "preview", completed_at: null })
        .eq("id", importJob.id)
        .eq("status", "confirmed");
    }
    return {
      message:
        "Não foi possível guardar a fotografia. A receita não foi criada para evitar ficar incompleta.",
    };
  }

  revalidatePath("/");
  redirect(`/receitas/${recipe.id}`);
}

export async function updateRecipe(
  recipeId: string,
  expectedVersion: number,
  _previousState: CreateRecipeState,
  formData: FormData,
): Promise<CreateRecipeState> {
  const result = recipeSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    servings: formData.get("servings"),
    activeTime: formData.get("active_time"),
    totalTime: formData.get("total_time"),
    difficulty: formData.get("difficulty"),
    tags: parseArray(formData.get("tags_json")),
    ingredients: parseArray(formData.get("ingredients_json")),
    steps: parseArray(formData.get("steps_json")),
  });

  if (!result.success) {
    return { message: recipeValidationMessage(result.error) };
  }

  const servings = optionalPositiveCount(result.data.servings);
  const activeTime = optionalPositiveInteger(result.data.activeTime);
  const totalTime = optionalPositiveInteger(result.data.totalTime);
  const cover = coverFromForm(formData);
  const coverError = validateCover(cover);

  if (coverError) return { message: coverError };
  if (
    Number.isNaN(servings) ||
    Number.isNaN(activeTime) ||
    Number.isNaN(totalTime)
  ) {
    return { message: "Confirma as doses e os tempos indicados." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "A sessão terminou. Inicia sessão novamente." };

  const [
    recipeResult,
    oldIngredientsResult,
    oldStepsResult,
    oldGroupsResult,
    oldSectionsResult,
    oldTagsResult,
    coverResult,
  ] =
    await Promise.all([
      supabase
        .from("recipes")
        .select("id,household_id,version")
        .eq("id", recipeId)
        .is("deleted_at", null)
        .maybeSingle(),
      supabase.from("recipe_ingredients").select("id").eq("recipe_id", recipeId),
      supabase.from("recipe_steps").select("id").eq("recipe_id", recipeId),
      supabase.from("ingredient_groups").select("id").eq("recipe_id", recipeId),
      supabase.from("recipe_sections").select("id").eq("recipe_id", recipeId),
      supabase.from("recipe_tags").select("tag_id").eq("recipe_id", recipeId),
      supabase
        .from("recipe_images")
        .select("id,storage_path")
        .eq("recipe_id", recipeId)
        .eq("image_kind", "cover")
        .order("created_at", { ascending: true }),
    ]);

  if (!recipeResult.data || recipeResult.error) {
    return { message: "Esta receita já não está disponível." };
  }
  if (
    oldIngredientsResult.error ||
    oldStepsResult.error ||
    oldGroupsResult.error ||
    oldSectionsResult.error ||
    oldTagsResult.error ||
    coverResult.error
  ) {
    return {
      message: "Não foi possível preparar a edição. Atualiza a página e tenta novamente.",
    };
  }
  if (recipeResult.data.version !== expectedVersion) {
    return {
      message:
        "A receita foi alterada noutro dispositivo. Volta à receita e abre novamente a edição.",
    };
  }
  const [structure, tags] = await Promise.all([
    createRecipeStructure(
      supabase,
      recipeId,
      result.data.ingredients,
      result.data.steps,
    ),
    ensureTagIds(
      supabase,
      recipeResult.data.household_id,
      result.data.tags,
    ),
  ]);
  if (structure.error || tags.error) {
    await Promise.all([
      structure.createdGroupIds.length
        ? supabase
            .from("ingredient_groups")
            .delete()
            .in("id", structure.createdGroupIds)
        : Promise.resolve(),
      structure.createdSectionIds.length
        ? supabase
            .from("recipe_sections")
            .delete()
            .in("id", structure.createdSectionIds)
        : Promise.resolve(),
    ]);
    return { message: "Não foi possível preparar a organização da receita." };
  }

  const [newIngredientsResult, newStepsResult] = await Promise.all([
    supabase
      .from("recipe_ingredients")
      .insert(ingredientRows(recipeId, result.data.ingredients, structure.groupIds))
      .select("id,sort_order"),
    supabase
      .from("recipe_steps")
      .insert(stepRows(recipeId, result.data.steps, structure.sectionIds))
      .select("id,sort_order"),
  ]);

  const newIngredientIds = (newIngredientsResult.data ?? []).map((row) => row.id);
  const newStepIds = (newStepsResult.data ?? []).map((row) => row.id);
  const removeNewRows = async () => {
    await Promise.all([
      newIngredientIds.length
        ? supabase.from("recipe_ingredients").delete().in("id", newIngredientIds)
        : Promise.resolve(),
      newStepIds.length
        ? supabase.from("recipe_steps").delete().in("id", newStepIds)
        : Promise.resolve(),
      structure.createdGroupIds.length
        ? supabase
            .from("ingredient_groups")
            .delete()
            .in("id", structure.createdGroupIds)
        : Promise.resolve(),
      structure.createdSectionIds.length
        ? supabase
            .from("recipe_sections")
            .delete()
            .in("id", structure.createdSectionIds)
        : Promise.resolve(),
    ]);
  };

  if (newIngredientsResult.error || newStepsResult.error) {
    await removeNewRows();
    return { message: "Não foi possível atualizar ingredientes e passos." };
  }

  const newLinks = buildStepIngredientRows(
    result.data.ingredients,
    result.data.steps,
    newIngredientsResult.data ?? [],
    newStepsResult.data ?? [],
  );
  if (newLinks.length) {
    const { error: linksError } = await supabase
      .from("recipe_step_ingredients")
      .insert(newLinks);
    if (linksError) {
      await removeNewRows();
      return { message: "Não foi possível associar os ingredientes aos passos. Confirma se a atualização da Supabase foi aplicada." };
    }
  }

  const { data: updatedRecipe, error: updateError } = await supabase
    .from("recipes")
    .update({
      title: result.data.title,
      description: result.data.description || null,
      servings,
      servings_label: "pessoas",
      active_time_minutes: activeTime,
      total_time_minutes: totalTime,
      difficulty: result.data.difficulty || null,
    })
    .eq("id", recipeId)
    .eq("version", expectedVersion)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updatedRecipe) {
    await removeNewRows();
    return {
      message:
        "A receita foi alterada noutro dispositivo. As tuas alterações não substituíram a versão mais recente.",
    };
  }

  const oldIngredientIds = (oldIngredientsResult.data ?? []).map((row) => row.id);
  const oldStepIds = (oldStepsResult.data ?? []).map((row) => row.id);
  const oldGroupIds = (oldGroupsResult.data ?? []).map((row) => row.id);
  const oldSectionIds = (oldSectionsResult.data ?? []).map((row) => row.id);
  const [deleteIngredientsResult, deleteStepsResult] = await Promise.all([
    oldIngredientIds.length
      ? supabase.from("recipe_ingredients").delete().in("id", oldIngredientIds)
      : Promise.resolve({ error: null }),
    oldStepIds.length
      ? supabase.from("recipe_steps").delete().in("id", oldStepIds)
      : Promise.resolve({ error: null }),
  ]);

  if (deleteIngredientsResult.error || deleteStepsResult.error) {
    await removeNewRows();
    return {
      message:
        "Os dados principais foram atualizados, mas os detalhes não. Reabre a receita antes de tentares novamente.",
    };
  }

  const oldTagIds = new Set(
    (oldTagsResult.data ?? []).map((row) => row.tag_id),
  );
  const newTagIds = new Set(tags.ids);
  const tagIdsToAdd = tags.ids.filter((tagId) => !oldTagIds.has(tagId));
  const tagIdsToRemove = [...oldTagIds].filter(
    (tagId) => !newTagIds.has(tagId),
  );

  if (tagIdsToAdd.length) {
    const { error: addTagsError } = await supabase.from("recipe_tags").insert(
      tagIdsToAdd.map((tagId) => ({ recipe_id: recipeId, tag_id: tagId })),
    );
    if (addTagsError) {
      return {
        message:
          "A receita foi atualizada, mas não foi possível adicionar as novas etiquetas.",
      };
    }
  }

  if (tagIdsToRemove.length) {
    const { error: removeTagsError } = await supabase
      .from("recipe_tags")
      .delete()
      .eq("recipe_id", recipeId)
      .in("tag_id", tagIdsToRemove);
    if (removeTagsError) {
      return {
        message:
          "A receita foi atualizada, mas algumas etiquetas antigas mantiveram-se.",
      };
    }
  }

  await Promise.all([
    oldGroupIds.length
      ? supabase.from("ingredient_groups").delete().in("id", oldGroupIds)
      : Promise.resolve(),
    oldSectionIds.length
      ? supabase.from("recipe_sections").delete().in("id", oldSectionIds)
      : Promise.resolve(),
  ]);

  let photoFailed = false;
  if (cover) {
    const newCover = await uploadCover({
      supabase,
      file: cover,
      householdId: recipeResult.data.household_id,
      recipeId,
      userId: user.id,
      title: result.data.title,
    });
    photoFailed = !newCover;

    const oldCovers = coverResult.data ?? [];
    if (newCover && oldCovers.length) {
      const oldCoverIds = oldCovers.map((image) => image.id);
      const { data: removedCovers, error: removeRowsError } = await supabase
        .from("recipe_images")
        .delete()
        .in("id", oldCoverIds)
        .select("id");

      if (removeRowsError || (removedCovers?.length ?? 0) !== oldCoverIds.length) {
        photoFailed = true;
        await Promise.all([
          supabase.from("recipe_images").delete().eq("id", newCover.id),
          supabase.storage.from("recipe-images").remove([newCover.storagePath]),
        ]);
      } else {
        const { error: removeFilesError } = await supabase.storage
          .from("recipe-images")
          .remove(oldCovers.map((image) => image.storage_path));
        if (removeFilesError) {
          console.error("A fotografia anterior deixou um ficheiro órfão", { code: removeFilesError.name });
        }
      }
    }
  }

  revalidatePath("/");
  revalidatePath(`/receitas/${recipeId}`);
  redirect(`/receitas/${recipeId}${photoFailed ? "?aviso=fotografia" : ""}`);
}

export async function trashRecipe(
  recipeId: string,
  expectedVersion: number,
  _previousState: CreateRecipeState,
): Promise<CreateRecipeState> {
  void _previousState;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "A sessão terminou. Inicia sessão novamente." };

  const { data, error } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString(), deleted_by: user.id })
    .eq("id", recipeId)
    .eq("version", expectedVersion)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message:
        "A receita mudou entretanto ou já foi removida. Atualiza a página e confirma o estado atual.",
    };
  }

  revalidatePath("/");
  revalidatePath("/caixote");
  redirect("/");
}

export async function restoreRecipe(
  recipeId: string,
  expectedVersion: number,
  _previousState: CreateRecipeState,
): Promise<CreateRecipeState> {
  void _previousState;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { message: "A sessão terminou. Inicia sessão novamente." };

  const { data, error } = await supabase
    .from("recipes")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", recipeId)
    .eq("version", expectedVersion)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return {
      message:
        "Não foi possível restaurar esta receita. Atualiza a página e tenta novamente.",
    };
  }

  revalidatePath("/");
  revalidatePath("/caixote");
  redirect(`/receitas/${recipeId}`);
}
