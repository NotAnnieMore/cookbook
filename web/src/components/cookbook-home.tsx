"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import type { RecipeSummary } from "@/lib/recipes/types";
import { createClient } from "@/lib/supabase/client";

import { useAdaptiveRecipeColour } from "./use-adaptive-recipe-colour";

type IconName =
  | "home"
  | "book"
  | "compass"
  | "more"
  | "plus"
  | "search"
  | "heart"
  | "clock"
  | "shuffle"
  | "link"
  | "text"
  | "chef"
  | "arrow";

const difficultyLabels = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Exigente",
} as const;

const cardColours = ["#F2A58B", "#F3C565", "#A9C7B2", "#AFC9DA"];
type QuickFilter = "favourites" | "quick" | "easy";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h6"/></>,
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shuffle: <><path d="M3 7h3c4 0 5 10 9 10h6"/><path d="m18 14 3 3-3 3"/><path d="M3 17h3c1.4 0 2.4-1.2 3.3-2.8M14.4 7.8C15.6 7.2 17 7 18 7h3"/><path d="m18 4 3 3-3 3"/></>,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1"/></>,
    text: <><path d="M4 6h16M10 6v12M7 18h6"/></>,
    chef: <><path d="M6 11a4 4 0 0 1 1-7.8A5 5 0 0 1 16.8 4 4 0 0 1 18 11"/><path d="M6 11v9h12v-9M9 16h6"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="relative grid size-11 place-items-center rounded-[45%_55%_62%_38%/42%_44%_56%_58%] bg-[#F36F56] text-white shadow-[0_5px_0_#D94F38]">
      <Icon name="chef" size={23} />
    </span>
  );
}

function NavItem({ icon, label, href, active = false }: { icon: IconName; label: string; href: string; active?: boolean }) {
  return (
    <a href={href} aria-current={active ? "page" : undefined} className={`group flex min-h-12 items-center gap-3 px-3 text-sm font-bold transition ${active ? "text-[#285240]" : "text-[#736C64] hover:text-[#27231F]"}`}>
      <span className={`grid size-10 place-items-center transition ${active ? "rounded-[48%_52%_38%_62%/58%_42%_58%_42%] bg-[#E5EBDD]" : "rounded-full group-hover:bg-[#F2EDE5]"}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="hidden lg:inline">{label}</span>
    </a>
  );
}

function RecipeArtwork({ recipe, index, featured = false }: { recipe: RecipeSummary; index: number; featured?: boolean }) {
  const colour = cardColours[index % cardColours.length];

  if (recipe.coverUrl) {
    return (
      <div
        className={`bg-cover bg-center ${featured ? "min-h-72 lg:min-h-96" : "h-52"}`}
        style={{ backgroundImage: `url("${recipe.coverUrl.replaceAll('"', '\\"')}")` }}
        role="img"
        aria-label={`Fotografia de ${recipe.title}`}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${featured ? "min-h-72 lg:min-h-96" : "h-52"}`} style={{ backgroundColor: colour }} role="img" aria-label={`Ilustração para ${recipe.title}`}>
      <div className="absolute -top-12 -right-10 size-44 rounded-full border-[22px] border-white/28" />
      <div className="absolute -bottom-14 -left-8 size-40 rounded-[44%_56%_63%_37%/55%_44%_56%_45%] bg-white/22" />
      <svg className="absolute inset-0 m-auto h-32 w-32 text-[#2E332C]/76" viewBox="0 0 160 160" fill="none" aria-hidden>
        <ellipse cx="80" cy="92" rx="54" ry="31" fill="#FFF9ED" stroke="currentColor" strokeWidth="4" />
        <path d="M39 88c7 18 24 29 41 29s34-11 41-29" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        <path d="M58 67c-7-12 8-15 1-27M80 63c-7-13 8-17 1-30M102 67c-7-12 8-15 1-27" stroke="#FFF9ED" strokeWidth="6" strokeLinecap="round" />
        <path d="M55 84c12-11 40-14 53 0" stroke="#F36F56" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function formatMinutes(recipe: RecipeSummary) {
  const minutes = recipe.totalTimeMinutes ?? recipe.activeTimeMinutes;
  if (!minutes) return "Tempo por definir";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export default function CookbookHome({ displayName, userId, initialRecipes }: { displayName: string; userId: string; initialRecipes: RecipeSummary[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(
    () => new Set(),
  );
  const [selectedTags, setSelectedTags] = useState<Set<string>>(
    () => new Set(),
  );
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [addOpen, setAddOpen] = useState(false);
  const [favouriteIds, setFavouriteIds] = useState(() => new Set(initialRecipes.filter((recipe) => recipe.isFavourite).map((recipe) => recipe.id)));
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`cookbook-home-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "recipes" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_favorites" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "recipe_tags" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "tags" }, () => router.refresh())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);

  const availableTags = useMemo(() => {
    const tags = new Map<string, { name: string; slug: string; color: string | null; count: number }>();
    for (const recipe of initialRecipes) {
      for (const tag of recipe.tags) {
        const current = tags.get(tag.slug);
        tags.set(tag.slug, {
          name: tag.name,
          slug: tag.slug,
          color: tag.color,
          count: (current?.count ?? 0) + 1,
        });
      }
    }
    return [...tags.values()].sort((a, b) =>
      a.name.localeCompare(b.name, "pt-PT"),
    );
  }, [initialRecipes]);

  const filteredRecipes = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-PT");
    return initialRecipes.filter((recipe) => {
      const searchable = `${recipe.title} ${recipe.description ?? ""} ${recipe.createdByName} ${recipe.ingredientNames.join(" ")} ${recipe.tags.map((tag) => tag.name).join(" ")}`.toLocaleLowerCase("pt-PT");
      const matchesSearch = !normalized || searchable.includes(normalized);
      const matchesQuickFilters =
        (!quickFilters.has("favourites") || favouriteIds.has(recipe.id)) &&
        (!quickFilters.has("quick") ||
          (recipe.totalTimeMinutes ??
            recipe.activeTimeMinutes ??
            Number.POSITIVE_INFINITY) <= 30) &&
        (!quickFilters.has("easy") || recipe.difficulty === "easy");
      const matchesTags = [...selectedTags].every((slug) =>
        recipe.tags.some((tag) => tag.slug === slug),
      );
      return matchesSearch && matchesQuickFilters && matchesTags;
    });
  }, [favouriteIds, initialRecipes, query, quickFilters, selectedTags]);

  const featured = initialRecipes.length > 0 ? initialRecipes[featuredIndex % initialRecipes.length] : null;
  const featuredPanelColour = useAdaptiveRecipeColour(
    featured?.coverUrl,
    featured?.id,
  );
  const profileInitial = displayName.trim().charAt(0).toLocaleUpperCase("pt-PT") || "U";

  async function toggleFavourite(recipeId: string) {
    const wasFavourite = favouriteIds.has(recipeId);
    const next = new Set(favouriteIds);
    if (wasFavourite) next.delete(recipeId);
    else next.add(recipeId);
    setFavouriteIds(next);
    setFeedback(null);

    const supabase = createClient();
    const { error } = wasFavourite
      ? await supabase.from("recipe_favorites").delete().eq("recipe_id", recipeId).eq("user_id", userId)
      : await supabase.from("recipe_favorites").insert({ recipe_id: recipeId, user_id: userId });

    if (error) {
      setFavouriteIds(favouriteIds);
      setFeedback("Não foi possível atualizar o favorito.");
      return;
    }

    router.refresh();
  }

  function toggleQuickFilter(filter: QuickFilter) {
    setQuickFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  }

  function toggleTag(slug: string) {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  const hasActiveFilters = quickFilters.size > 0 || selectedTags.size > 0;

  return (
    <div className="min-h-screen bg-[#F8F4EC] text-[#27231F]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col border-r border-[#DDD5C9] bg-[#FFFCF6] px-3 py-6 md:flex lg:w-64 lg:px-6">
        <a href="#topo" className="mb-9 flex items-center gap-3 px-2 text-[#285240]">
          <BrandMark />
          <span className="hidden font-serif text-[1.7rem] font-black tracking-[-.04em] lg:inline">Cookbook</span>
        </a>
        <nav aria-label="Navegação principal" className="space-y-1">
          <NavItem icon="home" label="Início" active href="#topo" />
          <NavItem icon="book" label="Receitas" href="#receitas" />
          <NavItem icon="compass" label="Descobrir" href="#descobrir" />
          <NavItem icon="more" label="Caixote" href="/caixote" />
        </nav>
        <Link href="/receitas/nova" className="mt-7 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#285240] px-4 text-sm font-extrabold text-white shadow-[0_6px_0_#193A2B] transition hover:-translate-y-0.5">
          <Icon name="plus" size={20} /><span className="hidden lg:inline">Nova receita</span>
        </Link>
        <div className="mt-auto flex items-center gap-3 border-t border-[#E5DED4] px-2 pt-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-[55%_45%_62%_38%/45%_55%_45%_55%] bg-[#F36F56] font-serif text-lg font-black text-white">{profileInitial}</span>
          <div className="hidden min-w-0 lg:block"><p className="truncate text-sm font-extrabold">{displayName}</p><p className="text-xs text-[#7B746B]">Perfil ativo</p></div>
        </div>
      </aside>

      <main id="topo" className="pb-28 md:ml-24 md:pb-10 lg:ml-64">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">A vossa cozinha</p>
              <h1 className="mt-1 font-serif text-4xl font-black tracking-[-.04em] sm:text-5xl">Olá, {displayName}</h1>
            </div>
            <button type="button" onClick={() => setAddOpen(true)} className="grid size-12 place-items-center rounded-[47%_53%_61%_39%/44%_42%_58%_56%] bg-[#F36F56] text-white shadow-[0_5px_0_#D94F38] md:hidden" aria-label="Adicionar receita"><Icon name="plus" size={24} /></button>
          </header>

          <label className="mt-7 flex min-h-14 items-center gap-3 border-b-2 border-[#CFC6B8] bg-transparent px-1 focus-within:border-[#285240]">
            <span className="text-[#746D64]"><Icon name="search" /></span>
            <span className="sr-only">Pesquisar receitas</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pesquisar por receita ou ingrediente…" className="w-full bg-transparent py-3 text-base font-semibold outline-none placeholder:font-normal placeholder:text-[#948D83]" />
          </label>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Filtros rápidos">
            <button type="button" onClick={() => { setQuickFilters(new Set()); setSelectedTags(new Set()); }} aria-pressed={!hasActiveFilters} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-extrabold transition ${!hasActiveFilters ? "bg-[#285240] text-white shadow-[0_3px_0_#193A2B]" : "border border-[#D8D0C4] bg-[#FFFCF6] text-[#716A62] hover:border-[#285240]"}`}>Todas</button>
            {([{ id: "favourites", label: "Favoritas" }, { id: "quick", label: "Até 30 min" }, { id: "easy", label: "Fáceis" }] as const).map((option) => <button key={option.id} type="button" onClick={() => toggleQuickFilter(option.id)} aria-pressed={quickFilters.has(option.id)} className={`min-h-10 shrink-0 rounded-full px-4 text-xs font-extrabold transition ${quickFilters.has(option.id) ? "bg-[#285240] text-white shadow-[0_3px_0_#193A2B]" : "border border-[#D8D0C4] bg-[#FFFCF6] text-[#716A62] hover:border-[#285240]"}`}>{option.label}</button>)}
          </div>

          {availableTags.length ? <div className="mt-2 flex gap-2 overflow-x-auto pb-2" aria-label="Filtrar por etiquetas">{availableTags.map((tag) => <button key={tag.slug} type="button" onClick={() => toggleTag(tag.slug)} aria-pressed={selectedTags.has(tag.slug)} className={`min-h-9 shrink-0 rounded-full border px-3 text-xs font-extrabold transition ${selectedTags.has(tag.slug) ? "border-[#27231F] text-[#27231F] shadow-[0_3px_0_#B8B0A5]" : "border-transparent text-[#635D56] hover:border-[#BEB5A9]"}`} style={{ backgroundColor: selectedTags.has(tag.slug) ? tag.color ?? "#F3C565" : `${tag.color ?? "#F3C565"}70` }}>#{tag.name} <span className="opacity-65">{tag.count}</span></button>)}</div> : null}

          {feedback ? <p role="status" className="mt-4 bg-[#FBE5DF] px-4 py-3 text-sm font-bold text-[#8B3F27]">{feedback}</p> : null}

          <section id="descobrir" className="relative mt-9 overflow-hidden rounded-[2.2rem_2.2rem_4.8rem_2.2rem] text-white shadow-[0_16px_0_#E4DDD1] transition-colors duration-500" style={{ backgroundColor: featuredPanelColour }} aria-labelledby="destaque-title">
            <div className="absolute -top-20 right-[34%] size-44 rounded-full border-[24px] border-white/7" />
            {featured ? (
              <div className="grid lg:grid-cols-[1fr_1.05fr]">
                <div className="relative flex flex-col justify-between bg-cover bg-center p-7 transition-colors duration-500 sm:p-9 lg:p-11" style={featured.coverUrl ? { backgroundColor: featuredPanelColour, backgroundImage: `linear-gradient(${featuredPanelColour}E0, ${featuredPanelColour}E0), url("${featured.coverUrl.replaceAll('"', '\\"')}")` } : { backgroundColor: featuredPanelColour }}>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Para cozinhar hoje</p>
                    <h2 id="destaque-title" className="mt-4 max-w-xl font-serif text-4xl font-black leading-[1.05] tracking-[-.04em] sm:text-5xl">{featured.title}</h2>
                    <p className="mt-4 max-w-lg text-sm leading-6 text-white/72">{featured.description || "Uma receita da vossa coleção, pronta para voltar à mesa."}</p>
                  </div>
                  <div className="mt-9 flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 text-sm font-bold"><Icon name="clock" size={18} />{formatMinutes(featured)}</span>
                    {featured.difficulty ? <span className="border-l border-white/25 pl-3 text-sm font-bold">{difficultyLabels[featured.difficulty]}</span> : null}
                    <Link href={`/receitas/${featured.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-[#285240]">Ver receita<Icon name="arrow" size={17} /></Link>
                    <button type="button" onClick={() => setFeaturedIndex((current) => (current + 1) % initialRecipes.length)} className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F3C565] px-4 text-sm font-extrabold text-[#27231F]"><Icon name="shuffle" size={18} />Outra</button>
                  </div>
                </div>
                <div className="relative min-h-72 overflow-hidden lg:rounded-l-[7rem]">
                  <RecipeArtwork recipe={featured} index={featuredIndex} featured />
                </div>
              </div>
            ) : (
              <div className="grid min-h-[25rem] items-center gap-3 p-8 sm:p-11 lg:grid-cols-[1fr_.85fr]">
                <div className="relative z-10 max-w-xl">
                  <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Primeira página</p>
                  <h2 id="destaque-title" className="mt-4 font-serif text-4xl font-black leading-[1.05] tracking-[-.04em] sm:text-5xl">A vossa coleção começa com uma receita.</h2>
                  <p className="mt-5 max-w-lg leading-7 text-white/72">Pode ser a que fazem todas as semanas ou aquela que nunca querem perder.</p>
                  <Link href="/receitas/nova" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F3C565] px-6 text-sm font-extrabold text-[#27231F] shadow-[0_5px_0_#C99C3E]"><Icon name="plus" size={19} />Criar a primeira receita</Link>
                </div>
                <div className="relative mx-auto hidden size-72 lg:block" aria-hidden>
                  <div className="absolute inset-5 rounded-[43%_57%_60%_40%/50%_41%_59%_50%] bg-[#F36F56]" />
                  <svg className="absolute inset-0 m-auto size-52 text-white" viewBox="0 0 220 220" fill="none">
                    <path d="M52 100h116c-3 54-31 76-58 76s-55-22-58-76Z" fill="#FFF9ED" stroke="currentColor" strokeWidth="5" />
                    <path d="M42 100h136" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
                    <path d="M81 79c-14-24 15-31 2-55M112 75c-14-27 16-34 3-61M142 79c-13-23 14-30 2-53" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            )}
          </section>

          <section id="receitas" className="mt-13 scroll-mt-6" aria-labelledby="receitas-title">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Guardadas com carinho</p>
                <h2 id="receitas-title" className="mt-1 font-serif text-3xl font-black tracking-[-.035em] sm:text-4xl">Todas as receitas</h2>
              </div>
              <span className="font-serif text-lg font-bold text-[#7B746B]">{filteredRecipes.length}<span className="text-sm font-normal">/{initialRecipes.length}</span></span>
            </div>

            {filteredRecipes.length > 0 ? (
              <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRecipes.map((recipe, index) => (
                  <article key={recipe.id} className="group overflow-hidden border-b-2 border-[#DDD5C9] bg-[#FFFCF6] transition hover:-translate-y-1 hover:border-[#F36F56]">
                    <Link href={`/receitas/${recipe.id}`} className={`${index % 3 === 1 ? "rounded-t-[5rem]" : index % 3 === 2 ? "rounded-tr-[4rem]" : "rounded-tl-[4rem]"} block overflow-hidden`}>
                      <RecipeArtwork recipe={recipe} index={index} />
                    </Link>
                    <div className="px-1 py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-[#7B746B]">Por {recipe.createdByName}</p>
                          <h3 className="mt-1 font-serif text-2xl font-black leading-tight tracking-[-.025em]"><Link href={`/receitas/${recipe.id}`} className="hover:text-[#285240]">{recipe.title}</Link></h3>
                          {recipe.tags.length ? <div className="mt-2 flex flex-wrap gap-1.5">{recipe.tags.slice(0, 3).map((tag) => <span key={tag.id} className="rounded-full px-2.5 py-1 text-[10px] font-extrabold text-[#453F39]" style={{ backgroundColor: `${tag.color ?? "#F3C565"}80` }}>#{tag.name}</span>)}</div> : null}
                        </div>
                        <button type="button" onClick={() => void toggleFavourite(recipe.id)} aria-pressed={favouriteIds.has(recipe.id)} aria-label={favouriteIds.has(recipe.id) ? `Remover ${recipe.title} dos favoritos` : `Adicionar ${recipe.title} aos favoritos`} className={`grid size-11 shrink-0 place-items-center rounded-[52%_48%_38%_62%/55%_42%_58%_45%] transition ${favouriteIds.has(recipe.id) ? "bg-[#FBE0D8] text-[#E25B43]" : "bg-[#F0ECE5] text-[#777067] hover:text-[#E25B43]"}`}><Icon name="heart" size={19} /></button>
                      </div>
                      <div className="mt-4 flex items-center gap-3 text-sm font-bold text-[#736C64]">
                        <span className="inline-flex items-center gap-1.5"><Icon name="clock" size={16} />{formatMinutes(recipe)}</span>
                        {recipe.difficulty ? <span>· {difficultyLabels[recipe.difficulty]}</span> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : initialRecipes.length > 0 ? (
              <div className="border-y-2 border-dashed border-[#CFC6B8] py-14 text-center"><p className="font-serif text-2xl font-black">Não encontrámos essa receita.</p><p className="mt-2 text-sm text-[#746D64]">Experimenta outra palavra ou ingrediente.</p></div>
            ) : (
              <div className="border-y-2 border-dashed border-[#CFC6B8] py-12 text-center"><p className="font-serif text-2xl font-black">Ainda não há receitas por aqui.</p><p className="mt-2 text-sm text-[#746D64]">O primeiro prato está à distância de alguns campos.</p></div>
            )}
          </section>

          <footer id="mais" className="mt-14 flex flex-col gap-3 border-t border-[#DDD5C9] py-7 text-sm text-[#746D64] sm:flex-row sm:items-center sm:justify-between">
            <p className="font-serif font-bold">Cookbook · feito para a nossa mesa.</p>
            <div className="flex flex-wrap items-center gap-2"><Link href="/caixote" className="min-h-11 rounded-full px-4 py-3 font-extrabold text-[#285240] hover:bg-[#E5EBDD]">Abrir caixote</Link><button type="button" onClick={async () => { await createClient().auth.signOut(); router.push("/login"); router.refresh(); }} className="min-h-11 self-start rounded-full px-4 font-extrabold text-[#285240] hover:bg-[#E5EBDD] sm:self-auto">Terminar sessão</button></div>
          </footer>
        </div>
      </main>

      <nav aria-label="Navegação principal" className="safe-bottom fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[2rem] border border-[#DDD5C9] bg-[#FFFCF6]/96 px-2 py-2 shadow-[0_14px_40px_rgba(53,44,35,.16)] backdrop-blur md:hidden">
        <a href="#topo" className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold text-[#285240]"><span className="grid size-8 place-items-center rounded-[55%_45%_60%_40%] bg-[#E5EBDD]"><Icon name="home" size={18} /></span><span>Início</span></a>
        <a href="#receitas" className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-[#746D64]"><Icon name="book" size={19} /><span>Receitas</span></a>
        <button type="button" onClick={() => setAddOpen(true)} className="mx-auto grid size-14 -translate-y-5 place-items-center rounded-[46%_54%_60%_40%/50%_42%_58%_50%] bg-[#F36F56] text-white shadow-[0_6px_0_#D94F38]" aria-label="Adicionar receita"><Icon name="plus" size={26} /></button>
        <a href="#descobrir" className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-[#746D64]"><Icon name="compass" size={19} /><span>Descobrir</span></a>
        <Link href="/caixote" className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-[#746D64]"><Icon name="more" size={19} /><span>Mais</span></Link>
      </nav>

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#27231F]/38 p-3 backdrop-blur-[2px] sm:items-center" role="presentation" onMouseDown={() => setAddOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-title" onMouseDown={(event) => event.stopPropagation()} className="safe-bottom w-full max-w-md rounded-[2.3rem_2.3rem_3.8rem_2.3rem] bg-[#FFFCF6] p-6 shadow-2xl sm:p-8">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#D4CCC0] sm:hidden" />
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Adicionar</p><h2 id="add-title" className="mt-1 font-serif text-3xl font-black tracking-[-.03em]">Como começa esta receita?</h2></div>
              <button type="button" onClick={() => setAddOpen(false)} className="grid size-11 place-items-center rounded-full bg-[#F1ECE4] text-xl" aria-label="Fechar">×</button>
            </div>
            <div className="mt-7 space-y-3">
              <Link href="/receitas/nova" className="flex min-h-20 items-center gap-4 border-b border-[#DED6CA] py-3 text-left transition hover:border-[#F36F56]">
                <span className="grid size-12 shrink-0 place-items-center rounded-[47%_53%_60%_40%] bg-[#E5EBDD] text-[#285240]"><Icon name="chef" size={22} /></span>
                <span className="min-w-0 flex-1"><strong className="block">Criar manualmente</strong><span className="mt-1 block text-xs leading-5 text-[#746D64]">Título, tempos, ingredientes e passos</span></span><Icon name="arrow" size={18} />
              </Link>
              <Link href="/receitas/importar/texto" className="flex min-h-20 items-center gap-4 border-b border-[#DED6CA] py-3 text-left transition hover:border-[#F36F56]">
                <span className="grid size-12 shrink-0 place-items-center rounded-[55%_45%_42%_58%] bg-[#AFC9DA]/60 text-[#285240]"><Icon name="text" size={21} /></span>
                <span className="min-w-0 flex-1"><strong className="block">Importar texto</strong><span className="mt-1 block text-xs leading-5 text-[#746D64]">Colar, rever medidas e confirmar</span></span><Icon name="arrow" size={18} />
              </Link>
              {[{ icon: "link" as const, title: "Importar ligação", description: "Website, TikTok ou Instagram" }].map((option) => (
                <div key={option.title} className="flex min-h-20 items-center gap-4 border-b border-[#E6DED3] py-3 text-left opacity-55">
                  <span className="grid size-12 shrink-0 place-items-center rounded-[55%_45%_42%_58%] bg-[#FBE0D8] text-[#E25B43]"><Icon name={option.icon} size={21} /></span>
                  <span className="min-w-0 flex-1"><strong className="block">{option.title}</strong><span className="mt-1 block text-xs leading-5 text-[#746D64]">{option.description}</span></span><span className="text-[10px] font-extrabold uppercase tracking-wider">Em breve</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
