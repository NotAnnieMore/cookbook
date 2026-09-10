"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  trashRecipe,
  type CreateRecipeState,
} from "@/app/receitas/nova/actions";

const initialState: CreateRecipeState = {};

export default function RecipeMenu({
  recipeId,
  recipeTitle,
  version,
}: {
  recipeId: string;
  recipeTitle: string;
  version: number;
}) {
  const [confirming, setConfirming] = useState(false);
  const trashAction = trashRecipe.bind(null, recipeId, version);
  const [state, formAction, pending] = useActionState(trashAction, initialState);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/receitas/${recipeId}/editar`} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FFFCF6] px-5 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" /><path d="m14 7 3 3" /></svg>
          Editar
        </Link>
        <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-12 items-center gap-2 rounded-full px-4 text-sm font-extrabold text-[#A44735] transition hover:bg-[#FBE5DF]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
          Enviar para o caixote
        </button>
      </div>

      {confirming ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#27231F]/40 p-3 backdrop-blur-[2px] sm:items-center" role="presentation" onMouseDown={() => setConfirming(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="trash-title" onMouseDown={(event) => event.stopPropagation()} className="safe-bottom w-full max-w-md rounded-[2.3rem_2.3rem_4rem_2.3rem] bg-[#FFFCF6] p-6 shadow-2xl sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Ação reversível</p>
            <h2 id="trash-title" className="mt-2 font-serif text-3xl font-black tracking-[-.035em]">Enviar “{recipeTitle}” para o caixote?</h2>
            <p className="mt-4 leading-7 text-[#716A62]">A receita deixa de aparecer na coleção, mas pode ser restaurada mais tarde.</p>
            {state.message ? <p role="alert" className="mt-4 rounded-2xl bg-[#FBE5DF] px-4 py-3 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}
            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setConfirming(false)} className="min-h-12 rounded-full px-5 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]">Cancelar</button>
              <form action={formAction}>
                <button type="submit" disabled={pending} className="min-h-12 w-full rounded-full bg-[#F36F56] px-6 text-sm font-extrabold text-white shadow-[0_5px_0_#D94F38] disabled:cursor-wait disabled:opacity-60">{pending ? "A mover…" : "Enviar para o caixote"}</button>
              </form>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
