import { redirect } from "next/navigation";
import { Suspense } from "react";

import CookbookHome from "@/components/cookbook-home";
import HomeLoadingSkeleton from "@/components/home-loading-skeleton";
import type { RecipeDifficulty, RecipeSummary } from "@/lib/recipes/types";
import { createClient } from "@/lib/supabase/server";

const INITIAL_VISIBLE_RECIPE_COUNT = 12;

function nameFromEmail(email: string | undefined) {
  const localPart = email?.split("@")[0]?.trim();

  if (!localPart) return "Utilizador";

  return localPart.charAt(0).toLocaleUpperCase("pt-PT") + localPart.slice(1);
}

async function HomeContent() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profileResult, recipesResult, favouritesResult, authorsResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("recipes")
        .select(
          "id,title,description,active_time_minutes,total_time_minutes,difficulty,created_by,updated_at,recipe_images(storage_path,image_kind),recipe_ingredients(ingredient_name),recipe_tags(tags(id,name,slug,color))",
        )
        .is("deleted_at", null)
        .order("updated_at", { ascending: false }),
      supabase
        .from("recipe_favorites")
        .select("recipe_id")
        .eq("user_id", user.id),
      supabase.from("profiles").select("id,display_name"),
    ]);

  if (recipesResult.error) {
    console.error("Não foi possível carregar as receitas", {
      code: recipesResult.error.code,
    });
  }

  const authors = new Map(
    (authorsResult.data ?? []).map((author) => [author.id, author.display_name]),
  );
  const favourites = new Set(
    (favouritesResult.data ?? []).map((favourite) => favourite.recipe_id),
  );

  const coverPaths = (recipesResult.data ?? []).map((recipe) => {
    const images = Array.isArray(recipe.recipe_images)
      ? recipe.recipe_images
      : [];
    return images.find((image) => image.image_kind === "cover")?.storage_path;
  });
  const validCoverPaths = coverPaths.slice(0, INITIAL_VISIBLE_RECIPE_COUNT).filter(
    (path): path is string => Boolean(path),
  );
  const signedCoverUrls = new Map<string, string>();

  if (validCoverPaths.length > 0) {
    const { data: signedImages } = await supabase.storage
      .from("recipe-images")
      .createSignedUrls(validCoverPaths, 60 * 60);

    signedImages?.forEach((image, index) => {
      if (image.signedUrl) {
        signedCoverUrls.set(validCoverPaths[index], image.signedUrl);
      }
    });
  }

  const recipes: RecipeSummary[] = (recipesResult.data ?? []).map(
    (recipe, index) => ({
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      activeTimeMinutes: recipe.active_time_minutes,
      totalTimeMinutes: recipe.total_time_minutes,
      difficulty: recipe.difficulty as RecipeDifficulty,
      createdByName: authors.get(recipe.created_by) ?? "Cookbook",
      isFavourite: favourites.has(recipe.id),
      coverPath: coverPaths[index] ?? null,
      coverUrl: coverPaths[index]
        ? signedCoverUrls.get(coverPaths[index] as string) ?? null
        : null,
      updatedAt: recipe.updated_at,
      ingredientNames: (recipe.recipe_ingredients ?? []).map(
        (ingredient) => ingredient.ingredient_name,
      ),
      tags: (recipe.recipe_tags ?? []).flatMap((recipeTag) => {
        const tag = Array.isArray(recipeTag.tags)
          ? recipeTag.tags[0]
          : recipeTag.tags;
        return tag ? [tag] : [];
      }),
    }),
  );

  const displayName =
    profileResult.data?.display_name || nameFromEmail(user.email);

  return (
    <CookbookHome
      key={`${recipes.map((recipe) => recipe.updatedAt).join("|")}:${[...favourites].sort().join("|")}`}
      displayName={displayName}
      userId={user.id}
      initialRecipes={recipes}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeLoadingSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}
