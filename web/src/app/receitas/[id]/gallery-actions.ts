"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_GALLERY_IMAGES = 12;
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);
const idSchema = z.string().uuid();

export type GalleryActionResult = {
  ok: boolean;
  message: string;
};

function validImageSignature(file: File, bytes: Uint8Array) {
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  return (
    (file.type === "image/jpeg" && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) ||
    (file.type === "image/png" && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) ||
    (file.type === "image/webp" && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") ||
    (file.type === "image/avif" && ascii(4, 4) === "ftyp" && ["avif", "avis"].includes(ascii(8, 4)))
  );
}

export async function uploadGalleryImage(
  recipeId: string,
  formData: FormData,
): Promise<GalleryActionResult> {
  if (!idSchema.safeParse(recipeId).success) {
    return { ok: false, message: "A receita indicada não é válida." };
  }

  const file = formData.get("gallery_image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: "Escolhe uma fotografia para adicionar." };
  }
  if (!imageTypes.has(file.type)) {
    return { ok: false, message: "A fotografia deve ser JPG, PNG, WebP ou AVIF." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: "A fotografia não pode ultrapassar 10 MB." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "A sessão terminou. Inicia sessão novamente." };

  const [recipeResult, galleryResult] = await Promise.all([
    supabase
      .from("recipes")
      .select("id,household_id,title")
      .eq("id", recipeId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("recipe_images")
      .select("sort_order")
      .eq("recipe_id", recipeId)
      .eq("image_kind", "gallery")
      .order("sort_order", { ascending: false }),
  ]);

  if (recipeResult.error || !recipeResult.data) {
    return { ok: false, message: "Esta receita já não está disponível." };
  }
  if (galleryResult.error) {
    return { ok: false, message: "Não foi possível preparar a galeria." };
  }
  if ((galleryResult.data?.length ?? 0) >= MAX_GALLERY_IMAGES) {
    return { ok: false, message: "A galeria já tem o máximo de 12 fotografias." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validImageSignature(file, bytes)) {
    return { ok: false, message: "O conteúdo do ficheiro não corresponde a uma imagem válida." };
  }

  let optimized: Awaited<ReturnType<ReturnType<typeof sharp>["toBuffer"]>>;
  try {
    optimized = await sharp(bytes, { failOn: "error", limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    return { ok: false, message: "Não foi possível processar esta fotografia." };
  }

  const storagePath = `${recipeResult.data.household_id}/${recipeId}/gallery-${crypto.randomUUID()}.webp`;
  const { error: storageError } = await supabase.storage
    .from("recipe-images")
    .upload(storagePath, optimized.data, {
      contentType: "image/webp",
      cacheControl: "3600",
      upsert: false,
    });

  if (storageError) {
    console.error("Falha no upload para a galeria", { code: storageError.name });
    return { ok: false, message: "Não foi possível enviar a fotografia." };
  }

  const nextOrder = (galleryResult.data?.[0]?.sort_order ?? -1) + 1;
  const { error: imageError } = await supabase.from("recipe_images").insert({
    recipe_id: recipeId,
    uploaded_by: user.id,
    storage_path: storagePath,
    image_kind: "gallery",
    alt_text: `Fotografia de ${recipeResult.data.title}`,
    width: optimized.info.width,
    height: optimized.info.height,
    size_bytes: optimized.data.length,
    sort_order: nextOrder,
  });

  if (imageError) {
    console.error("Falha ao registar fotografia da galeria", { code: imageError.code });
    await supabase.storage.from("recipe-images").remove([storagePath]);
    return { ok: false, message: "A fotografia foi enviada, mas não ficou associada à receita." };
  }

  revalidatePath(`/receitas/${recipeId}`);
  return { ok: true, message: "Fotografia adicionada à galeria." };
}

export async function removeGalleryImage(
  recipeId: string,
  imageId: string,
): Promise<GalleryActionResult> {
  if (!idSchema.safeParse(recipeId).success || !idSchema.safeParse(imageId).success) {
    return { ok: false, message: "A fotografia indicada não é válida." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "A sessão terminou. Inicia sessão novamente." };

  const { data: image, error: findError } = await supabase
    .from("recipe_images")
    .select("id,storage_path")
    .eq("id", imageId)
    .eq("recipe_id", recipeId)
    .eq("image_kind", "gallery")
    .maybeSingle();
  if (findError || !image) {
    return { ok: false, message: "Esta fotografia já não está disponível." };
  }

  const { data: removed, error: removeError } = await supabase
    .from("recipe_images")
    .delete()
    .eq("id", image.id)
    .eq("recipe_id", recipeId)
    .select("id")
    .maybeSingle();
  if (removeError || !removed) {
    return { ok: false, message: "Não foi possível remover a fotografia." };
  }

  const { error: storageError } = await supabase.storage
    .from("recipe-images")
    .remove([image.storage_path]);
  if (storageError) {
    console.error("Ficheiro órfão após remoção da galeria", { code: storageError.name });
  }

  revalidatePath(`/receitas/${recipeId}`);
  return { ok: true, message: "Fotografia removida da galeria." };
}
