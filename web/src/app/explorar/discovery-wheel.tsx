"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { CookbookMascotIllustration } from "@/components/cookbook-mascot";
import DiscoveryCardSkeleton from "@/components/discovery-card-skeleton";
import { useAdaptiveRecipeColour } from "@/components/use-adaptive-recipe-colour";
import type { RecipeDifficulty, RecipeTag } from "@/lib/recipes/types";

export type DiscoveryRecipe = {
  id: string;
  title: string;
  description: string | null;
  activeTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  difficulty: RecipeDifficulty;
  isFavourite: boolean;
  coverUrl: string | null;
  tags: RecipeTag[];
};

type ThemeId = "all" | "favourites" | "quick" | "easy" | `tag:${string}`;

const difficultyLabels = { easy: "Fácil", medium: "Médio", hard: "Exigente" } as const;

function recipeMinutes(recipe: DiscoveryRecipe) {
  return recipe.totalTimeMinutes ?? recipe.activeTimeMinutes;
}

function formatMinutes(recipe: DiscoveryRecipe) {
  const minutes = recipeMinutes(recipe);
  if (!minutes) return "Tempo por definir";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function recipesForTheme(recipes: DiscoveryRecipe[], theme: ThemeId) {
  if (theme === "favourites") return recipes.filter((recipe) => recipe.isFavourite);
  if (theme === "quick") return recipes.filter((recipe) => {
    const minutes = recipeMinutes(recipe);
    return minutes !== null && minutes > 0 && minutes <= 30;
  });
  if (theme === "easy") return recipes.filter((recipe) => recipe.difficulty === "easy");
  if (theme.startsWith("tag:")) {
    const slug = theme.slice(4);
    return recipes.filter((recipe) => recipe.tags.some((tag) => tag.slug === slug));
  }
  return recipes;
}

function pickAnother(pool: DiscoveryRecipe[], currentId: string | null) {
  if (!pool.length) return null;
  if (pool.length === 1) return pool[0];
  const alternatives = pool.filter((recipe) => recipe.id !== currentId);
  return alternatives[Math.floor(Math.random() * alternatives.length)] ?? pool[0];
}

export default function DiscoveryWheel({ recipes }: { recipes: DiscoveryRecipe[] }) {
  const [theme, setTheme] = useState<ThemeId>("all");
  const [selectedId, setSelectedId] = useState<string | null>(recipes[0]?.id ?? null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tagMenuOpen, setTagMenuOpen] = useState(false);
  const timerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const tagOptions = useMemo(() => {
    const tags = new Map<string, { tag: RecipeTag; count: number }>();
    recipes.forEach((recipe) => recipe.tags.forEach((tag) => {
      const current = tags.get(tag.slug);
      tags.set(tag.slug, { tag, count: (current?.count ?? 0) + 1 });
    }));
    return [...tags.values()].sort((first, second) => second.count - first.count || first.tag.name.localeCompare(second.tag.name, "pt-PT"));
  }, [recipes]);

  const pool = useMemo(() => recipesForTheme(recipes, theme), [recipes, theme]);
  const selected = pool.find((recipe) => recipe.id === selectedId) ?? pool[0] ?? null;
  const palette = useAdaptiveRecipeColour(selected?.coverUrl, selected?.id);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  function draw(nextPool = pool) {
    if (!nextPool.length || isDrawing) return;
    setIsDrawing(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setSelectedId(pickAnother(nextPool, selected?.id)?.id ?? null);
      setIsDrawing(false);
      timerRef.current = null;
    }, 220);
  }

  function chooseTheme(nextTheme: ThemeId) {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    const nextPool = recipesForTheme(recipes, nextTheme);
    setTheme(nextTheme);
    setSelectedId(pickAnother(nextPool, selected?.id)?.id ?? null);
    setIsDrawing(false);
    setTagMenuOpen(false);
  }

  function finishSwipe(x: number, y: number) {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const deltaX = x - start.x;
    const deltaY = y - start.y;
    if (Math.abs(deltaX) >= 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) draw();
  }

  const baseThemes: Array<{ id: ThemeId; label: string; count: number }> = [
    { id: "all", label: "Tudo", count: recipes.length },
    { id: "favourites", label: "Favoritas", count: recipes.filter((recipe) => recipe.isFavourite).length },
    { id: "quick", label: "Até 30 min", count: recipesForTheme(recipes, "quick").length },
    { id: "easy", label: "Fáceis", count: recipesForTheme(recipes, "easy").length },
  ];

  return (
    <>
      <section className="mt-8" aria-labelledby="discovery-themes-title">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Escolher o ambiente</p>
            <h2 id="discovery-themes-title" className="mt-1 font-serif text-2xl font-black sm:text-3xl">Que tipo de receita apetece?</h2>
          </div>
          <span className="hidden text-sm font-bold text-[#746D64] sm:block">{pool.length} {pool.length === 1 ? "receita" : "receitas"}</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap" aria-label="Temas principais de descoberta">
          {baseThemes.map((option) => (
            <button key={option.id} type="button" onClick={() => chooseTheme(option.id)} aria-pressed={theme === option.id} className={`flex min-h-14 items-center justify-between gap-2 rounded-[1.2rem] border-2 px-4 text-left text-sm font-extrabold transition sm:min-h-11 sm:rounded-full ${theme === option.id ? "border-[#285240] bg-[#285240] text-white shadow-[0_4px_0_#173B2C]" : "border-[#D9D0C4] bg-[#FFFCF6] text-[#554F48] hover:border-[#285240]"}`}>
              <span>{option.label}</span><span className="grid size-7 shrink-0 place-items-center rounded-full bg-black/8 text-xs">{option.count}</span>
            </button>
          ))}
        </div>

        {tagOptions.length ? (
          <>
            <div className="mt-4 rounded-[1.4rem] border-2 border-[#D9D0C4] bg-[#FFFCF6] p-2 sm:hidden">
              <button type="button" onClick={() => setTagMenuOpen((open) => !open)} aria-expanded={tagMenuOpen} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-[1rem] px-3 text-left font-extrabold text-[#285240]">
                <span>{theme.startsWith("tag:") ? `#${tagOptions.find(({ tag }) => `tag:${tag.slug}` === theme)?.tag.name ?? "Etiqueta"}` : "Escolher uma etiqueta"}</span>
                <span aria-hidden className={`grid size-8 place-items-center rounded-full bg-[#E5EBDD] transition-transform ${tagMenuOpen ? "rotate-180" : ""}`}>⌄</span>
              </button>
              {tagMenuOpen ? <div className="grid max-h-72 grid-cols-2 gap-2 overflow-y-auto border-t border-[#E5DED4] p-3">
                {tagOptions.map(({ tag, count }) => {
                  const id = `tag:${tag.slug}` as ThemeId;
                  return (
                    <button key={id} type="button" onClick={() => chooseTheme(id)} aria-pressed={theme === id} className={`min-h-12 rounded-xl px-3 text-left text-sm font-extrabold transition ${theme === id ? "bg-[#285240] text-white" : "bg-[#F3EEE6] text-[#554F48]"}`}>
                      <span className="block truncate">#{tag.name}</span><span className="mt-0.5 block text-xs opacity-60">{count} {count === 1 ? "receita" : "receitas"}</span>
                    </button>
                  );
                })}
              </div> : null}
            </div>

            <div className="mt-4 hidden flex-wrap gap-2 sm:flex" aria-label="Descobrir por etiqueta">
          {tagOptions.map(({ tag, count }) => {
            const id = `tag:${tag.slug}` as ThemeId;
            return (
              <button key={id} type="button" onClick={() => chooseTheme(id)} aria-pressed={theme === id} className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-sm font-extrabold transition ${theme === id ? "border-[#285240] bg-[#285240] text-white shadow-[0_4px_0_#173B2C]" : "border-[#D9D0C4] bg-[#FFFCF6] text-[#554F48] hover:border-[#285240]"}`}>
                #{tag.name} <span className="ml-1 opacity-65">{count}</span>
              </button>
            );
          })}
            </div>
          </>
        ) : null}
        <p className="mt-3 text-sm font-bold text-[#746D64] sm:hidden">{pool.length} {pool.length === 1 ? "receita neste tema" : "receitas neste tema"}</p>
      </section>

      {selected && !palette.isReady ? <DiscoveryCardSkeleton /> : selected ? (
        <section
          key={selected.id}
          className={`cookbook-discovery-card mt-7 overflow-hidden rounded-[2rem_2rem_4.5rem_2rem] shadow-[0_12px_0_#DED5C9] transition-opacity duration-200 ${isDrawing ? "opacity-75" : "opacity-100"}`}
          onTouchStart={(event) => {
            const touch = event.changedTouches[0];
            touchStartRef.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            const touch = event.changedTouches[0];
            finishSwipe(touch.clientX, touch.clientY);
          }}
        >
          <div className="grid lg:min-h-[25rem] lg:grid-cols-[.95fr_1.05fr]">
            <div className="flex min-h-[21rem] flex-col p-7 text-white sm:p-9 lg:p-11" style={{ backgroundColor: palette.colour }}>
              <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#F3C565]">A receita que saiu</p>
              <h2 className="mt-3 line-clamp-3 font-serif text-4xl font-black leading-[.98] tracking-[-.045em] sm:text-5xl">{selected.title}</h2>
              {selected.description ? <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-6 text-white/78">{selected.description}</p> : <p className="mt-4 text-sm leading-6 text-white/68">Uma receita da vossa coleção, pronta para regressar à mesa.</p>}
              <div className="mt-auto pt-6">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm font-extrabold">
                  <span>{formatMinutes(selected)}</span>
                  {selected.difficulty ? <><span className="h-4 w-px bg-white/35" /><span>{difficultyLabels[selected.difficulty]}</span></> : null}
                  {selected.tags.slice(0, 2).map((tag) => <span key={tag.id} className="rounded-full border border-white/28 px-2.5 py-1 text-xs">#{tag.name}</span>)}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <Link href={`/receitas/${selected.id}`} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#FFFCF6] px-4 text-sm font-extrabold text-[#285240] shadow-[0_4px_0_rgba(0,0,0,.16)]">Ver receita <span aria-hidden className="ml-2">→</span></Link>
                  <button type="button" onClick={() => draw()} disabled={isDrawing} className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#F3C565] px-4 text-sm font-extrabold text-[#27231F] shadow-[0_4px_0_#D7A942] disabled:cursor-wait disabled:opacity-70">{isDrawing ? "A sortear…" : "Sortear outra"}</button>
                </div>
                <p className="mt-4 text-center text-[11px] font-bold text-white/60 lg:text-left">Também podes deslizar o cartão para o lado.</p>
              </div>
            </div>
            <div className="relative h-64 overflow-hidden bg-[#E5EBDD] sm:h-80 lg:h-auto">
              {selected.coverUrl ? (
                <div role="img" aria-label={`Fotografia de ${selected.title}`} className="absolute -inset-px bg-cover bg-center" style={{ backgroundImage: `url("${selected.coverUrl.replaceAll('"', '\\"')}")` }} />
              ) : (
                <div className="grid h-full place-items-center"><CookbookMascotIllustration variant="choosing" className="size-44 sm:size-52" /></div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="mt-7 grid min-h-80 place-items-center rounded-[2rem_2rem_4rem_2rem] border-2 border-dashed border-[#CFC6B8] bg-[#FFFCF6]/75 px-6 py-10 text-center shadow-[0_9px_0_#E6DED2]">
          <div>
            <CookbookMascotIllustration variant="choosing" className="mx-auto size-32" />
            <h2 className="mt-2 font-serif text-3xl font-black">Este tema ainda está vazio.</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#746D64]">Experimenta outro tema ou adiciona esta etiqueta a mais receitas.</p>
            <button type="button" onClick={() => chooseTheme("all")} className="mt-5 min-h-12 rounded-full bg-[#285240] px-6 text-sm font-extrabold text-white">Ver todas</button>
          </div>
        </section>
      )}
    </>
  );
}
