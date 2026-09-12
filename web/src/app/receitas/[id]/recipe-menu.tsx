"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const trashAction = trashRecipe.bind(null, recipeId, version);
  const [state, formAction, pending] = useActionState(trashAction, initialState);

  useEffect(() => {
    if (!open) return;
    function closeMenu(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeMenu);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeMenu);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <div ref={menuRef} className="relative">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="menu" className="grid size-11 place-items-center rounded-full text-[#285240] transition hover:bg-[#E5EBDD]" aria-label="Mais opções da receita">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        </button>
        {open ? (
          <div role="menu" className="absolute right-0 top-13 z-20 w-64 rounded-[1.4rem_1.4rem_2.4rem_1.4rem] border border-[#DDD5C9] bg-[#FFFCF6] p-2 shadow-[0_16px_45px_rgba(39,35,31,.2)]">
            <button type="button" role="menuitem" onClick={() => { setOpen(false); setConfirming(true); }} className="flex min-h-12 w-full items-center gap-3 rounded-2xl px-4 text-left text-sm font-extrabold text-[#A44735] transition hover:bg-[#FBE5DF]">
              <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13" /></svg>
              Enviar para o caixote
            </button>
          </div>
        ) : null}
      </div>

      {confirming ? createPortal(
        <div className="fixed inset-0 z-[200] flex items-end justify-center bg-[#27231F]/40 p-3 backdrop-blur-[2px] sm:items-center" role="presentation" onMouseDown={() => setConfirming(false)}>
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
        </div>,
        document.body,
      ) : null}
    </>
  );
}
