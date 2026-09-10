"use client";

import { useActionState } from "react";

import {
  restoreRecipe,
  type CreateRecipeState,
} from "@/app/receitas/nova/actions";

const initialState: CreateRecipeState = {};

export default function RestoreButton({ recipeId, version }: { recipeId: string; version: number }) {
  const restoreAction = restoreRecipe.bind(null, recipeId, version);
  const [state, formAction, pending] = useActionState(restoreAction, initialState);

  return (
    <form action={formAction}>
      <button type="submit" disabled={pending} className="min-h-11 rounded-full bg-[#285240] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#193A2B] disabled:cursor-wait disabled:opacity-60">{pending ? "A restaurar…" : "Restaurar"}</button>
      {state.message ? <p role="alert" className="mt-2 max-w-xs text-xs font-bold text-[#9A402F]">{state.message}</p> : null}
    </form>
  );
}
