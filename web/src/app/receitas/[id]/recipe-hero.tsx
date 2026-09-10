"use client";

import { useAdaptiveRecipeColour } from "@/components/use-adaptive-recipe-colour";
import { CookbookMascotLoader, CookbookMascotMark } from "@/components/cookbook-mascot";

type HeroTag = { id: string; name: string };

function HeroSkeleton() {
  return (
    <div className="grid grid-rows-[24rem_13rem] animate-pulse bg-[#E8E0D4] sm:grid-rows-[34rem_22rem] lg:h-[33rem] lg:grid-cols-[1.05fr_.95fr] lg:grid-rows-none" role="status" aria-label="A preparar a receita">
      <div className="flex min-h-0 flex-col justify-center overflow-hidden p-5 sm:p-11 lg:p-14">
        <div className="flex items-center gap-3 text-[#746D64]">
          <CookbookMascotMark className="size-10" />
          <span className="text-xs font-extrabold uppercase tracking-[.18em]">A abrir o livro…</span>
        </div>
        <div className="mt-5 h-9 w-5/6 rounded-full bg-[#CEC3B5] sm:mt-7 sm:h-12" />
        <div className="mt-3 h-9 w-2/3 rounded-full bg-[#CEC3B5] sm:h-12" />
        <div className="mt-5 h-4 w-full max-w-xl rounded-full bg-[#D8CFC3] sm:mt-7" />
        <div className="mt-2 h-4 w-4/5 max-w-lg rounded-full bg-[#D8CFC3]" />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4 sm:gap-4">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-10 rounded-2xl bg-[#D4CABC] sm:h-12" />)}
        </div>
      </div>
      <div className="grid h-full place-items-center bg-[#D7CDC0]"><CookbookMascotLoader className="size-28 sm:size-40" /></div>
      <span className="sr-only">A carregar fotografia e cores da receita.</span>
    </div>
  );
}

export default function RecipeHero({
  recipeId,
  title,
  description,
  authorName,
  coverUrl,
  tags,
  activeTime,
  totalTime,
  servings,
  difficulty,
}: {
  recipeId: string;
  title: string;
  description: string | null;
  authorName: string;
  coverUrl: string | null;
  tags: HeroTag[];
  activeTime: string;
  totalTime: string;
  servings: string | null;
  difficulty: string | null;
}) {
  const palette = useAdaptiveRecipeColour(coverUrl, recipeId);
  const visibleTags = tags.slice(0, 4);

  return (
    <section className="overflow-hidden rounded-[2rem_2rem_5rem_2rem] text-white shadow-[0_14px_0_#E3DCD0] transition-colors duration-500" style={{ backgroundColor: palette.colour }} aria-busy={!palette.isReady}>
      {!palette.isReady ? (
        <HeroSkeleton />
      ) : (
        <div className="grid grid-rows-[24rem_13rem] animate-[cookbook-reveal_.28s_ease-out] sm:grid-rows-[34rem_22rem] lg:h-[33rem] lg:grid-cols-[1.05fr_.95fr] lg:grid-rows-none">
          <div
            className="relative isolate flex h-full min-h-0 flex-col justify-center overflow-hidden bg-cover bg-center p-5 transition-colors duration-500 sm:p-11 lg:p-14"
            style={coverUrl ? { backgroundColor: palette.colour, backgroundImage: `linear-gradient(${palette.colour}E0, ${palette.colour}E0), url("${coverUrl.replaceAll('"', '\\"')}")` } : { backgroundColor: palette.colour }}
          >
            <div className="relative z-10">
              <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#F3C565]">Receita de {authorName}</p>
              <h1 className="mt-3 line-clamp-2 max-w-3xl font-serif text-3xl font-black leading-[1.02] tracking-[-.05em] sm:mt-4 sm:text-5xl lg:text-[3.4rem]">{title}</h1>
              {description ? <p className="mt-3 line-clamp-2 max-w-2xl text-sm leading-6 text-white/72 sm:mt-6 sm:text-base sm:leading-7">{description}</p> : null}
              {tags.length ? <div className="mt-3 flex max-h-8 flex-wrap gap-2 overflow-hidden sm:mt-5 sm:max-h-none" aria-label="Etiquetas da receita">{visibleTags.map((tag) => <span key={tag.id} className="rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-extrabold">#{tag.name}</span>)}{tags.length > visibleTags.length ? <span className="rounded-full border border-white/25 px-3 py-1.5 text-xs font-extrabold">+{tags.length - visibleTags.length}</span> : null}</div> : null}
              <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 border-t border-white/20 pt-3 sm:mt-9 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-4 sm:pt-6">
                <div><dt className="text-[10px] font-extrabold uppercase tracking-wider text-white/55 sm:text-[11px]">Tempo ativo</dt><dd className="mt-0.5 font-serif text-base font-bold sm:mt-1 sm:text-lg">{activeTime}</dd></div>
                <div><dt className="text-[10px] font-extrabold uppercase tracking-wider text-white/55 sm:text-[11px]">Tempo total</dt><dd className="mt-0.5 font-serif text-base font-bold sm:mt-1 sm:text-lg">{totalTime}</dd></div>
                {servings ? <div><dt className="text-[10px] font-extrabold uppercase tracking-wider text-white/55 sm:text-[11px]">Rende</dt><dd className="mt-0.5 font-serif text-base font-bold sm:mt-1 sm:text-lg">{servings}</dd></div> : null}
                {difficulty ? <div><dt className="text-[10px] font-extrabold uppercase tracking-wider text-white/55 sm:text-[11px]">Dificuldade</dt><dd className="mt-0.5 font-serif text-base font-bold sm:mt-1 sm:text-lg">{difficulty}</dd></div> : null}
              </dl>
            </div>
          </div>
          <div className="relative h-full min-h-0 overflow-hidden" style={{ backgroundColor: palette.colour }}>
            {coverUrl ? (
              <div role="img" aria-label={`Fotografia de ${title}`} className="absolute -inset-px bg-cover bg-center" style={{ backgroundImage: `url("${coverUrl.replaceAll('"', '\\"')}")` }} />
            ) : (
              <svg aria-hidden className="absolute inset-0 m-auto size-52" style={{ color: palette.colour }} viewBox="0 0 220 220" fill="none">
                <ellipse cx="110" cy="132" rx="72" ry="38" fill="#FFF9ED" stroke="currentColor" strokeWidth="5" />
                <path d="M54 125c9 30 33 47 56 47s47-17 56-47" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
                <path d="M79 93c-12-21 13-27 2-48M111 88c-12-24 14-31 3-54M142 93c-11-20 12-27 2-47" stroke="#FFF9ED" strokeWidth="8" strokeLinecap="round" />
              </svg>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
