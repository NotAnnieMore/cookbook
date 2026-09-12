"use client";

import { useEffect, useRef, useState } from "react";

import { CookbookMascotFavouriteReaction } from "@/components/cookbook-mascot";
import { createClient } from "@/lib/supabase/client";

export default function FavouriteButton({
  recipeId,
  userId,
  initialFavourite,
}: {
  recipeId: string;
  userId: string;
  initialFavourite: boolean;
}) {
  const [favourite, setFavourite] = useState(initialFavourite);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showReaction, setShowReaction] = useState(false);
  const reactionTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
  }, []);

  async function toggle() {
    const previous = favourite;
    setFavourite(!previous);
    setFeedback(null);

    const supabase = createClient();
    const { error } = previous
      ? await supabase
          .from("recipe_favorites")
          .delete()
          .eq("recipe_id", recipeId)
          .eq("user_id", userId)
      : await supabase
          .from("recipe_favorites")
          .insert({ recipe_id: recipeId, user_id: userId });

    if (error) {
      setFavourite(previous);
      setFeedback("Não foi possível atualizar o favorito.");
      return;
    }

    if (!previous) {
      if (reactionTimerRef.current) window.clearTimeout(reactionTimerRef.current);
      setShowReaction(true);
      reactionTimerRef.current = window.setTimeout(() => setShowReaction(false), 1_650);
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={favourite}
        className={`inline-flex min-h-12 items-center gap-2 rounded-full px-5 text-sm font-extrabold transition ${favourite ? "bg-[#FBE0D8] text-[#D95039]" : "bg-[#FFFCF6] text-[#285240] hover:bg-[#E5EBDD]"}`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill={favourite ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.8 4.7a5.5 5.5 0 0 0-7.8 0L12 5.8l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.4 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
        </svg>
        {favourite ? "Nos meus favoritos" : "Guardar nos favoritos"}
      </button>
      {showReaction ? <CookbookMascotFavouriteReaction className="absolute bottom-[calc(100%+.75rem)] right-0 z-30 w-28" /> : null}
      {feedback ? <p role="alert" className="mt-2 text-xs font-bold text-[#9A402F]">{feedback}</p> : null}
    </div>
  );
}
