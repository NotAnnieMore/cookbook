"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type PersonRating = {
  userId: string;
  name: string;
  score: number | null;
};

function Stars({ score }: { score: number | null }) {
  return (
    <span className="flex gap-1" aria-label={score ? `${score} em 5` : "Sem avaliação"}>
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} aria-hidden className={`text-xl ${score && value <= score ? "text-[#F36F56]" : "text-[#D8D0C4]"}`}>★</span>
      ))}
    </span>
  );
}

function RatingMascot({ score }: { score: number | null }) {
  const mood = score === null ? "neutra" : score <= 2 ? "calma" : score === 3 ? "curiosa" : "feliz";
  return (
    <svg key={mood} viewBox="0 0 84 74" aria-hidden className="size-20 animate-[cookbook-reveal_.2s_ease-out] drop-shadow-[0_5px_0_#E4D8CC]">
      <path d="M14 9h50a9 9 0 0 1 9 9v40a9 9 0 0 1-9 9H14z" fill="#FFFCF6" />
      <path d="M8 8h52a9 9 0 0 1 9 9v39a9 9 0 0 1-9 9H15a7 7 0 0 1-7-7z" fill="#F36F56" />
      <path d="M60 14h5v38a6 6 0 0 1-6 6" fill="none" stroke="#F8EBDD" strokeWidth="3" strokeLinecap="round" />
      <path d="M45 4h13v28l-6.5-5-6.5 5z" fill="#F3C565" />
      {mood === "feliz" ? <><path d="M25 39c2-5 7-5 9 0M45 39c2-5 7-5 9 0" fill="none" stroke="#285240" strokeWidth="4" strokeLinecap="round" /></> : null}
      {mood === "calma" ? <><path d="M24 39c3 3 7 3 10 0M44 39c3 3 7 3 10 0" fill="none" stroke="#285240" strokeWidth="3.5" strokeLinecap="round" /></> : null}
      {mood === "curiosa" ? <><ellipse cx="29" cy="39" rx="2.7" ry="4.5" fill="#285240" /><path d="m49 35-5 4 5 4" fill="none" stroke="#285240" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" /></> : null}
      {mood === "neutra" ? <><ellipse cx="29" cy="39" rx="2.7" ry="4.5" fill="#285240" /><ellipse cx="49" cy="39" rx="2.7" ry="4.5" fill="#285240" /></> : null}
    </svg>
  );
}

export default function RecipeRating({ recipeId, currentUserId, initialRatings }: { recipeId: string; currentUserId: string; initialRatings: PersonRating[] }) {
  const [ratings, setRatings] = useState(initialRatings);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [previewScore, setPreviewScore] = useState<number | null>(null);
  const currentRating = ratings.find((rating) => rating.userId === currentUserId)?.score ?? null;
  const visibleCurrentScore = previewScore ?? currentRating;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`recipe-ratings-${recipeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ratings", filter: `recipe_id=eq.${recipeId}` },
        (payload) => {
          const row = (payload.eventType === "DELETE" ? payload.old : payload.new) as { user_id?: string; score?: number };
          if (!row.user_id) return;
          setRatings((items) => items.map((item) => item.userId === row.user_id
            ? { ...item, score: payload.eventType === "DELETE" ? null : Number(row.score) }
            : item));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [recipeId]);

  async function rate(score: number) {
    if (pending || score < 1 || score > 5) return;
    const previous = ratings;
    setPending(true);
    setFeedback("");
    setRatings((items) => items.map((item) => item.userId === currentUserId ? { ...item, score } : item));

    const { error } = await createClient().from("ratings").upsert(
      { recipe_id: recipeId, user_id: currentUserId, score },
      { onConflict: "recipe_id,user_id" },
    );
    if (error) {
      setRatings(previous);
      setFeedback("Não foi possível guardar a tua avaliação.");
    } else {
      setFeedback("A tua avaliação ficou guardada.");
    }
    setPending(false);
  }

  async function removeRating() {
    if (pending || currentRating === null) return;
    const previous = ratings;
    setPending(true);
    setFeedback("");
    setRatings((items) => items.map((item) => item.userId === currentUserId ? { ...item, score: null } : item));

    const { error } = await createClient()
      .from("ratings")
      .delete()
      .eq("recipe_id", recipeId)
      .eq("user_id", currentUserId);
    if (error) {
      setRatings(previous);
      setFeedback("Não foi possível retirar a tua avaliação.");
    } else {
      setFeedback("A tua avaliação foi retirada.");
    }
    setPending(false);
  }

  return (
    <section className="mt-12 rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] p-6 shadow-[0_10px_0_#E6DED2] sm:p-8" aria-labelledby="rating-title" aria-busy={pending}>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Provada e aprovada?</p>
        <h2 id="rating-title" className="mt-1 font-serif text-3xl font-black tracking-[-.035em] sm:text-4xl">Como ficou esta receita?</h2>
        <p className="mt-2 text-sm leading-6 text-[#746D64]">As notas de Ivo e Ana ficam lado a lado, sem transformar duas opiniões numa média.</p>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {ratings.map((rating) => {
          const isCurrentUser = rating.userId === currentUserId;
          return (
            <article key={rating.userId} className={`rounded-[1.5rem_1.5rem_2.8rem_1.5rem] p-5 ${isCurrentUser ? "bg-[#FFF3EE]" : "bg-[#F4F0E9]"}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className={`grid size-10 place-items-center rounded-[55%_45%_62%_38%] font-serif text-lg font-black text-white ${isCurrentUser ? "bg-[#F36F56]" : "bg-[#285240]"}`}>{rating.name.charAt(0).toLocaleUpperCase("pt-PT")}</span>
                  <div><h3 className="font-extrabold">{rating.name}</h3><p className="text-xs text-[#817970]">{isCurrentUser ? "A tua nota" : "Nota individual"}</p></div>
                </div>
                {!isCurrentUser ? <Stars score={rating.score} /> : null}
              </div>

              {isCurrentUser ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <div>
                    <div className="flex gap-1" role="group" aria-label="Escolher avaliação de 1 a 5" onMouseLeave={() => setPreviewScore(null)}>
                      {[1, 2, 3, 4, 5].map((score) => (
                        <button key={score} type="button" onClick={() => void rate(score)} onMouseEnter={() => setPreviewScore(score)} onFocus={() => setPreviewScore(score)} onBlur={() => setPreviewScore(null)} disabled={pending} aria-pressed={currentRating === score} aria-label={`${score} ${score === 1 ? "estrela" : "estrelas"}`} className={`grid size-10 place-items-center rounded-full text-2xl transition hover:-translate-y-0.5 disabled:cursor-wait sm:size-11 ${visibleCurrentScore && score <= visibleCurrentScore ? "bg-[#F36F56] text-white" : "bg-[#FFFCF6] text-[#C8BFB3] hover:text-[#F36F56]"}`}>★</button>
                      ))}
                    </div>
                    {currentRating !== null ? <button type="button" onClick={() => void removeRating()} disabled={pending} className="mt-3 min-h-9 text-xs font-extrabold text-[#8B5144] underline decoration-[#DAB5AB] underline-offset-4">Retirar a minha nota</button> : <p className="mt-3 text-xs text-[#817970]">Escolhe entre 1 e 5 estrelas.</p>}
                  </div>
                  <div className="justify-self-center sm:justify-self-auto">
                    <RatingMascot score={visibleCurrentScore} />
                  </div>
                </div>
              ) : <p className="mt-5 text-sm font-bold text-[#746D64]">{rating.score === null ? `${rating.name} ainda não avaliou esta receita.` : `${rating.score} em 5 estrelas.`}</p>}
            </article>
          );
        })}
      </div>
      {feedback ? <p role="status" className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold ${feedback.includes("Não foi") ? "bg-[#FBE5DF] text-[#8B3F27]" : "bg-[#E5EBDD] text-[#285240]"}`}>{feedback}</p> : null}
    </section>
  );
}
