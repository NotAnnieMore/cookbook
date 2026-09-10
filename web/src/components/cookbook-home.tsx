"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { RecipeSummary } from "@/lib/recipes/types";
import { createClient } from "@/lib/supabase/client";

import AppDecorations from "./app-decorations";
import { CookbookMascotIllustration, CookbookMascotLoader, CookbookMascotMark } from "./cookbook-mascot";
import { useAdaptiveRecipeColour } from "./use-adaptive-recipe-colour";

type IconName =
  | "home"
  | "book"
  | "more"
  | "plus"
  | "search"
  | "heart"
  | "clock"
  | "shuffle"
  | "trash"
  | "logout"
  | "arrow";

const difficultyLabels = {
  easy: "Fácil",
  medium: "Médio",
  hard: "Exigente",
} as const;

const cardColours = ["#F2A58B", "#F3C565", "#A9C7B2", "#AFC9DA"];
type QuickFilter = "favourites" | "quick" | "easy";
type HomeSection = "topo" | "receitas" | "descobrir";

function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    home: <><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></>,
    book: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h6"/></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    heart: <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    shuffle: <><path d="M3 7h3c4 0 5 10 9 10h6"/><path d="m18 14 3 3-3 3"/><path d="M3 17h3c1.4 0 2.4-1.2 3.3-2.8M14.4 7.8C15.6 7.2 17 7 18 7h3"/><path d="m18 4 3 3-3 3"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></>,
    logout: <><path d="M10 5H5v14h5M14 8l4 4-4 4M9 12h9"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return <CookbookMascotMark className="size-11 drop-shadow-[0_4px_0_#D7CFC3]" />;
}

function NavItem({ icon, label, href, active = false, onClick }: { icon: IconName; label: string; href: string; active?: boolean; onClick?: () => void }) {
  return (
    <a href={href} onClick={onClick} aria-current={active ? "page" : undefined} className={`group flex min-h-12 items-center gap-3 px-3 text-sm font-bold transition ${active ? "text-[#285240]" : "text-[#736C64] hover:text-[#27231F]"}`}>
      <span className={`grid size-10 place-items-center transition ${active ? "rounded-[48%_52%_38%_62%/58%_42%_58%_42%] bg-[#E5EBDD]" : "rounded-full group-hover:bg-[#F2EDE5]"}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="hidden lg:inline">{label}</span>
    </a>
  );
}

function NavButton({ icon, label, onClick, active = false }: { icon: IconName; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={`group flex min-h-12 w-full items-center gap-3 px-3 text-sm font-bold transition ${active ? "text-[#285240]" : "text-[#736C64] hover:text-[#27231F]"}`}>
      <span className={`grid size-10 place-items-center transition ${active ? "rounded-[55%_45%_42%_58%] bg-[#E5EBDD]" : "rounded-full group-hover:bg-[#F2EDE5]"}`}>
        <Icon name={icon} size={20} />
      </span>
      <span className="hidden lg:inline">{label}</span>
    </button>
  );
}

function FeaturedRecipeSkeleton() {
  return (
    <div className="grid grid-rows-[22rem_15rem] animate-pulse bg-[#E8E0D4] sm:grid-rows-[24rem_20rem] lg:h-[25rem] lg:grid-cols-[1fr_1.05fr] lg:grid-rows-none" role="status" aria-label="A preparar o destaque">
      <div className="flex min-h-0 flex-col justify-between overflow-hidden p-7 sm:p-9 lg:p-11">
        <div>
          <div className="flex items-center gap-3">
            <CookbookMascotMark className="size-10" />
            <span className="text-xs font-extrabold uppercase tracking-[.18em] text-[#746D64]">A preparar a mesa…</span>
          </div>
          <div className="mt-6 h-10 w-4/5 rounded-full bg-[#CEC3B5]" />
          <div className="mt-3 h-10 w-3/5 rounded-full bg-[#CEC3B5]" />
          <div className="mt-6 h-4 w-full max-w-md rounded-full bg-[#D8CFC3]" />
          <div className="mt-2 h-4 w-4/5 max-w-sm rounded-full bg-[#D8CFC3]" />
        </div>
        <div className="mt-9 grid grid-cols-2 gap-3">
          <div className="h-11 rounded-full bg-[#D4CABC]" />
          <div className="h-11 rounded-full bg-[#D4CABC]" />
        </div>
      </div>
      <div className="grid h-full place-items-center bg-[#D7CDC0]"><CookbookMascotLoader className="size-32 sm:size-40" /></div>
      <span className="sr-only">A carregar fotografia e cores da receita.</span>
    </div>
  );
}

function RecipeArtwork({ recipe, index, featured = false }: { recipe: RecipeSummary; index: number; featured?: boolean }) {
  const colour = cardColours[index % cardColours.length];

  if (recipe.coverUrl) {
    return (
      <div
        className={`bg-cover bg-center ${featured ? "absolute -inset-px" : "h-52"}`}
        style={{ backgroundImage: `url("${recipe.coverUrl.replaceAll('"', '\\"')}")` }}
        role="img"
        aria-label={`Fotografia de ${recipe.title}`}
      />
    );
  }

  return (
    <div className={`relative overflow-hidden ${featured ? "absolute -inset-px" : "h-52"}`} style={{ backgroundColor: colour }} role="img" aria-label={`Ilustração para ${recipe.title}`}>
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
  const [featuredChanging, setFeaturedChanging] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<HomeSection>("topo");
  const navigationLockRef = useRef<{ section: HomeSection; until: number } | null>(null);
  const featuredTimersRef = useRef<number[]>([]);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
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
  const featuredPalette = useAdaptiveRecipeColour(
    featured?.coverUrl,
    featured?.id,
  );
  const featuredPanelColour = featuredPalette.colour;
  const profileInitial = displayName.trim().charAt(0).toLocaleUpperCase("pt-PT") || "U";

  useEffect(() => {
    if (!profileOpen && !addOpen) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setProfileOpen(false);
      setAddOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [addOpen, profileOpen]);

  useEffect(() => {
    function updateActiveSection() {
      const lock = navigationLockRef.current;
      if (lock && Date.now() < lock.until) {
        setActiveSection(lock.section);
        return;
      }
      navigationLockRef.current = null;
      const marker = window.scrollY + Math.min(window.innerHeight * 0.28, 220);
      const discoverTop = document.getElementById("descobrir")?.offsetTop ?? Number.POSITIVE_INFINITY;
      const recipesTop = document.getElementById("receitas")?.offsetTop ?? Number.POSITIVE_INFINITY;

      if (marker >= recipesTop) setActiveSection("receitas");
      else if (marker >= discoverTop) setActiveSection("descobrir");
      else setActiveSection("topo");
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);
    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, []);

  useEffect(() => () => {
    featuredTimersRef.current.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function navigateToSection(section: HomeSection) {
    navigationLockRef.current = { section, until: Date.now() + 1_000 };
    setActiveSection(section);
  }

  function changeFeatured(direction = 1) {
    if (initialRecipes.length < 2 || featuredChanging) return;
    setFeaturedChanging(true);
    featuredTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    featuredTimersRef.current = [
      window.setTimeout(() => {
        setFeaturedIndex((current) => (current + direction + initialRecipes.length) % initialRecipes.length);
      }, 280),
      window.setTimeout(() => {
        setFeaturedChanging(false);
        featuredTimersRef.current = [];
      }, 850),
    ];
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

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
    <div className="relative isolate min-h-screen overflow-hidden bg-[#F8F4EC] text-[#27231F]">
      <AppDecorations tone="mixed" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 flex-col border-r border-[#DDD5C9] bg-[#FFFCF6] px-3 py-6 md:flex lg:w-64 lg:px-6">
        <a href="#topo" className="mb-9 flex items-center gap-3 px-2 text-[#285240]">
          <BrandMark />
          <span className="hidden font-serif text-[1.7rem] font-black tracking-[-.04em] lg:inline">Cookbook</span>
        </a>
        <nav aria-label="Navegação principal" className="space-y-1">
          <NavItem icon="home" label="Início" active={!profileOpen && activeSection === "topo"} href="#topo" onClick={() => navigateToSection("topo")} />
          <NavItem icon="shuffle" label="Para hoje" active={!profileOpen && activeSection === "descobrir"} href="#descobrir" onClick={() => navigateToSection("descobrir")} />
          <NavItem icon="book" label="Receitas" active={!profileOpen && activeSection === "receitas"} href="#receitas" onClick={() => navigateToSection("receitas")} />
          <NavButton icon="more" label="Mais" active={profileOpen} onClick={() => setProfileOpen(true)} />
        </nav>
        <button type="button" onClick={() => setAddOpen(true)} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#285240] px-4 text-sm font-extrabold text-white shadow-[0_6px_0_#193A2B] transition hover:-translate-y-0.5" aria-label="Adicionar ou importar receita">
          <Icon name="plus" size={20} /><span className="hidden lg:inline">Adicionar receita</span>
        </button>
        <button type="button" onClick={() => setProfileOpen(true)} aria-expanded={profileOpen} className="mt-auto flex min-h-16 w-full items-center gap-3 border-t border-[#E5DED4] px-2 pt-5 text-left transition hover:text-[#285240]">
          <span className="grid size-10 shrink-0 place-items-center rounded-[55%_45%_62%_38%/45%_55%_45%_55%] bg-[#F36F56] font-serif text-lg font-black text-white">{profileInitial}</span>
          <div className="hidden min-w-0 lg:block"><p className="truncate text-sm font-extrabold">{displayName}</p><p className="text-xs text-[#7B746B]">Perfil ativo</p></div>
        </button>
      </aside>

      <main id="topo" className="relative z-10 pb-28 md:ml-24 md:pb-10 lg:ml-64">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
          <header>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">A vossa cozinha</p>
              <h1 className="mt-1 font-serif text-4xl font-black tracking-[-.04em] sm:text-5xl">Olá, {displayName}</h1>
            </div>
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

          {availableTags.length ? (
            <div id="etiquetas" className="mt-3 rounded-[1.4rem_1.4rem_2.4rem_1.4rem] border border-[#DDD5C9] bg-[#FFFCF6] px-4 py-3">
              <button type="button" onClick={() => setTagsOpen((open) => !open)} aria-expanded={tagsOpen} aria-controls="tag-filter-list" className="flex min-h-10 w-full items-center justify-between gap-3 text-left text-sm font-extrabold text-[#285240]">
                <span><span aria-hidden className="mr-2 text-[#E25B43]">#</span>Todas as etiquetas <span className="font-normal text-[#817970]">({availableTags.length})</span>{selectedTags.size ? <span className="ml-2 rounded-full bg-[#E5EBDD] px-2 py-1 text-[10px]">{selectedTags.size} selecionadas</span> : null}</span>
                <svg aria-hidden viewBox="0 0 24 24" className={`size-5 shrink-0 transition ${tagsOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d="m6 9 6 6 6-6" /></svg>
              </button>
              {tagsOpen ? <div id="tag-filter-list" className="flex flex-wrap gap-2 border-t border-[#E7E0D6] pb-1 pt-4" aria-label="Filtrar por etiquetas">{availableTags.map((tag) => <button key={tag.slug} type="button" onClick={() => toggleTag(tag.slug)} aria-pressed={selectedTags.has(tag.slug)} className={`min-h-9 rounded-full border px-3 text-xs font-extrabold transition ${selectedTags.has(tag.slug) ? "border-[#27231F] text-[#27231F] shadow-[0_3px_0_#B8B0A5]" : "border-transparent text-[#635D56] hover:border-[#BEB5A9]"}`} style={{ backgroundColor: selectedTags.has(tag.slug) ? tag.color ?? "#F3C565" : `${tag.color ?? "#F3C565"}70` }}>#{tag.name} <span className="opacity-65">{tag.count}</span></button>)}</div> : null}
            </div>
          ) : null}

          {feedback ? <p role="status" className="mt-4 bg-[#FBE5DF] px-4 py-3 text-sm font-bold text-[#8B3F27]">{feedback}</p> : null}

          <section
            id="descobrir"
            className="relative mt-9 touch-pan-y overflow-hidden rounded-[2.2rem_2.2rem_4.8rem_2.2rem] text-white shadow-[0_16px_0_#E4DDD1] transition-colors duration-500"
            style={{ backgroundColor: featuredPanelColour }}
            aria-labelledby="destaque-title"
            aria-busy={featured ? !featuredPalette.isReady || featuredChanging : undefined}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              if (touch) swipeStartRef.current = { x: touch.clientX, y: touch.clientY };
            }}
            onTouchEnd={(event) => {
              const start = swipeStartRef.current;
              const touch = event.changedTouches[0];
              swipeStartRef.current = null;
              if (!start || !touch) return;
              const horizontal = touch.clientX - start.x;
              const vertical = touch.clientY - start.y;
              if (Math.abs(horizontal) >= 48 && Math.abs(horizontal) > Math.abs(vertical) * 1.25) changeFeatured(horizontal < 0 ? 1 : -1);
            }}
          >
            <div className="absolute -top-20 right-[34%] size-44 rounded-full border-[24px] border-white/7" />
            <div className={`pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#FFF8E7]/94 text-[#285240] backdrop-blur-sm transition-all duration-300 ${featuredChanging ? "visible opacity-100" : "invisible opacity-0"}`} aria-hidden={!featuredChanging}>
              <div className="text-center"><CookbookMascotLoader label="A escolher outra receita…" className="size-28 sm:size-36" /><p className="mt-1 text-xs font-extrabold uppercase tracking-[.18em]">A escolher outra receita…</p></div>
            </div>
            {featured && !featuredPalette.isReady ? (
              <FeaturedRecipeSkeleton />
            ) : featured ? (
              <div className="grid grid-rows-[22rem_15rem] animate-[cookbook-reveal_.28s_ease-out] sm:grid-rows-[24rem_20rem] lg:h-[25rem] lg:grid-cols-[1fr_1.05fr] lg:grid-rows-none">
                <div className="relative flex min-h-0 flex-col justify-start overflow-hidden bg-cover bg-center p-7 transition-colors duration-500 sm:p-9 lg:p-11" style={featured.coverUrl ? { backgroundColor: featuredPanelColour, backgroundImage: `linear-gradient(${featuredPanelColour}E0, ${featuredPanelColour}E0), url("${featured.coverUrl.replaceAll('"', '\\"')}")` } : { backgroundColor: featuredPanelColour }}>
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Para cozinhar hoje</p>
                    <h2 id="destaque-title" className="mt-4 line-clamp-2 min-h-[4.75rem] max-w-xl font-serif text-4xl font-black leading-[1.05] tracking-[-.04em] sm:min-h-[6.4rem] sm:text-5xl">{featured.title}</h2>
                    <p className="mt-4 line-clamp-2 min-h-12 max-w-lg text-sm leading-6 text-white/72">{featured.description || "Uma receita da vossa coleção, pronta para voltar à mesa."}</p>
                  </div>
                  <div className="mt-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-bold"><Icon name="clock" size={18} />{formatMinutes(featured)}</span>
                      {featured.difficulty ? <span className="border-l border-white/25 pl-3 text-sm font-bold">{difficultyLabels[featured.difficulty]}</span> : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:flex sm:max-w-sm">
                      <Link href={`/receitas/${featured.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-extrabold text-[#285240] sm:flex-1">Ver receita<Icon name="arrow" size={17} /></Link>
                      <button type="button" onClick={() => changeFeatured(1)} disabled={featuredChanging || initialRecipes.length < 2} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#F3C565] px-4 text-sm font-extrabold text-[#27231F] sm:flex-1 disabled:opacity-60" title="Também podes deslizar a fotografia"><Icon name="shuffle" size={18} />Outra</button>
                    </div>
                  </div>
                </div>
                <div className="relative h-full min-h-0 overflow-hidden">
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

          <footer className="mt-14 border-t border-[#DDD5C9] py-7 text-sm text-[#746D64]">
            <p className="font-serif font-bold">Cookbook · feito para a nossa mesa.</p>
          </footer>
        </div>
      </main>

      <nav aria-label="Navegação principal" className="safe-bottom fixed inset-x-3 bottom-3 z-40 grid grid-cols-5 rounded-[2rem] border border-[#DDD5C9] bg-[#FFFCF6]/96 px-2 py-2 shadow-[0_14px_40px_rgba(53,44,35,.16)] backdrop-blur md:hidden">
        <a href="#topo" onClick={() => navigateToSection("topo")} aria-current={!profileOpen && activeSection === "topo" ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold ${!profileOpen && activeSection === "topo" ? "text-[#285240]" : "text-[#746D64]"}`}><span className={`grid size-8 place-items-center ${!profileOpen && activeSection === "topo" ? "rounded-[55%_45%_60%_40%] bg-[#E5EBDD]" : ""}`}><Icon name="home" size={18} /></span><span>Início</span></a>
        <a href="#descobrir" onClick={() => navigateToSection("descobrir")} aria-current={!profileOpen && activeSection === "descobrir" ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${!profileOpen && activeSection === "descobrir" ? "text-[#285240]" : "text-[#746D64]"}`}><span className={`grid size-8 place-items-center ${!profileOpen && activeSection === "descobrir" ? "rounded-[52%_48%_60%_40%] bg-[#E5EBDD]" : ""}`}><Icon name="shuffle" size={18} /></span><span>Hoje</span></a>
        <button type="button" onClick={() => setAddOpen(true)} aria-expanded={addOpen} className="flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold text-[#E25B43]" aria-label="Adicionar receita"><span className="grid size-9 place-items-center rounded-[46%_54%_60%_40%/50%_42%_58%_50%] bg-[#F36F56] text-white shadow-[0_3px_0_#D94F38]"><Icon name="plus" size={21} /></span><span>Adicionar</span></button>
        <a href="#receitas" onClick={() => navigateToSection("receitas")} aria-current={!profileOpen && activeSection === "receitas" ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${!profileOpen && activeSection === "receitas" ? "text-[#285240]" : "text-[#746D64]"}`}><span className={`grid size-8 place-items-center ${!profileOpen && activeSection === "receitas" ? "rounded-[48%_52%_38%_62%] bg-[#E5EBDD]" : ""}`}><Icon name="book" size={19} /></span><span>Receitas</span></a>
        <button type="button" onClick={() => setProfileOpen(true)} aria-expanded={profileOpen} aria-current={profileOpen ? "page" : undefined} className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${profileOpen ? "text-[#285240]" : "text-[#746D64]"}`}><span className={`grid size-8 place-items-center ${profileOpen ? "rounded-[55%_45%_42%_58%] bg-[#E5EBDD]" : ""}`}><Icon name="more" size={19} /></span><span>Mais</span></button>
      </nav>

      {profileOpen ? (
        <div className="fixed inset-0 z-50 bg-[#27231F]/24 backdrop-blur-[2px]" role="presentation" onMouseDown={() => setProfileOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="profile-menu-title" onMouseDown={(event) => event.stopPropagation()} className="safe-bottom absolute inset-x-3 bottom-3 rounded-[2.2rem_2.2rem_3.5rem_2.2rem] bg-[#FFFCF6] p-6 text-[#27231F] shadow-2xl md:bottom-6 md:left-6 md:right-auto md:w-72 md:rounded-[2rem_2rem_3.2rem_2rem]">
            <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-[#D4CCC0] md:hidden" />
            <div className="flex items-center gap-3 border-b border-[#E5DED4] pb-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-[55%_45%_62%_38%/45%_55%_45%_55%] bg-[#F36F56] font-serif text-xl font-black text-white">{profileInitial}</span>
              <div className="min-w-0 flex-1">
                <h2 id="profile-menu-title" className="truncate font-serif text-xl font-black">{displayName}</h2>
                <p className="text-xs font-semibold text-[#7B746B]">Perfil ativo</p>
              </div>
              <button type="button" onClick={() => setProfileOpen(false)} className="grid size-10 place-items-center rounded-full bg-[#F1ECE4] text-xl" aria-label="Fechar menu">×</button>
            </div>
            <div className="mt-3 space-y-1">
              <Link href="/caixote" onClick={() => setProfileOpen(false)} className="flex min-h-14 items-center gap-3 rounded-2xl px-3 font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
                <span className="grid size-10 place-items-center rounded-[55%_45%_42%_58%] bg-[#E5EBDD]"><Icon name="trash" size={20} /></span>
                <span className="flex-1">Abrir caixote</span>
                <Icon name="arrow" size={17} />
              </Link>
              <button type="button" onClick={() => void signOut()} className="flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 text-left font-extrabold text-[#A74735] transition hover:bg-[#FBE0D8]">
                <span className="grid size-10 place-items-center rounded-[48%_52%_60%_40%] bg-[#FBE0D8]"><Icon name="logout" size={20} /></span>
                Terminar sessão
              </button>
            </div>
          </section>
        </div>
      ) : null}

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
                <CookbookMascotMark className="size-12 shrink-0" />
                <span className="min-w-0 flex-1"><strong className="block">Criar manualmente</strong><span className="mt-1 block text-xs leading-5 text-[#746D64]">Título, tempos, ingredientes e passos</span></span><Icon name="arrow" size={18} />
              </Link>
              <Link href="/receitas/importar/texto" className="flex min-h-20 items-center gap-4 border-b border-[#DED6CA] py-3 text-left transition hover:border-[#F36F56]">
                <CookbookMascotIllustration variant="reading" className="size-12 shrink-0" />
                <span className="min-w-0 flex-1"><strong className="block">Importar texto</strong><span className="mt-1 block text-xs leading-5 text-[#746D64]">Colar, rever medidas e confirmar</span></span><Icon name="arrow" size={18} />
              </Link>
              <Link href="/receitas/importar/url" className="flex min-h-20 items-center gap-4 border-b border-[#DED6CA] py-3 text-left transition hover:border-[#F36F56]">
                <CookbookMascotIllustration variant="exploring" className="size-12 shrink-0" />
                <span className="min-w-0 flex-1"><strong className="block">Importar ligação</strong><span className="mt-1 block text-xs leading-5 text-[#746D64]">Website e links públicos, sempre com preview</span></span><Icon name="arrow" size={18} />
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
