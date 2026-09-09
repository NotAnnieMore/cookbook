"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { createRecipe, type CreateRecipeState } from "./actions";

type Ingredient = {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  optional: boolean;
};

type Step = {
  id: number;
  instruction: string;
};

const initialState: CreateRecipeState = {};
const units = ["g", "kg", "ml", "l", "c. chá", "c. sopa", "unid.", "lata", "q.b."];

function ArrowLeft() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function Plus() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function Trash() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
    </svg>
  );
}

function SectionHeading({ number, title, note }: { number: string; title: string; note: string }) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-[58%_42%_48%_52%/44%_55%_45%_56%] bg-[#F3C565] font-serif text-lg font-black text-[#27231F]">{number}</span>
      <div>
        <h2 className="font-serif text-2xl font-black tracking-[-.025em] text-[#27231F]">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-[#766F67]">{note}</p>
      </div>
    </div>
  );
}

const inputClass = "min-h-12 w-full rounded-2xl border border-[#D8D0C4] bg-[#FFFCF6] px-4 text-base font-semibold text-[#27231F] outline-none transition placeholder:font-normal placeholder:text-[#999187] focus:border-[#285240] focus:ring-3 focus:ring-[#285240]/12";

export default function RecipeForm({ displayName }: { displayName: string }) {
  const [state, formAction, pending] = useActionState(createRecipe, initialState);
  const [nextId, setNextId] = useState(4);
  const [ingredients, setIngredients] = useState<Ingredient[]>([
    { id: 1, name: "", quantity: "", unit: "", optional: false },
  ]);
  const [steps, setSteps] = useState<Step[]>([
    { id: 2, instruction: "" },
  ]);

  function addIngredient() {
    setIngredients((current) => [
      ...current,
      { id: nextId, name: "", quantity: "", unit: "", optional: false },
    ]);
    setNextId((current) => current + 1);
  }

  function addStep() {
    setSteps((current) => [...current, { id: nextId, instruction: "" }]);
    setNextId((current) => current + 1);
  }

  const serializedIngredients = ingredients.map(({ name, quantity, unit, optional }) => ({
    name,
    quantity,
    unit,
    optional,
  }));
  const serializedSteps = steps.map(({ instruction }) => ({ instruction }));

  return (
    <form action={formAction} className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
      <input type="hidden" name="ingredients_json" value={JSON.stringify(serializedIngredients)} />
      <input type="hidden" name="steps_json" value={JSON.stringify(serializedSteps)} />

      <div className="grid gap-7 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] p-6 shadow-[0_10px_0_#E6DED2] sm:p-8">
          <SectionHeading number="1" title="A receita" note="Começa pelo essencial. Podes voltar para completar os detalhes mais tarde." />
          <div className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold">Nome da receita</span>
              <input className={inputClass} name="title" required minLength={2} maxLength={200} placeholder="Ex.: Bolo de iogurte da Ana" autoFocus />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-extrabold">Pequena descrição <span className="font-normal text-[#8A8278]">(opcional)</span></span>
              <textarea className={`${inputClass} min-h-32 resize-y py-3`} name="description" maxLength={1200} placeholder="O que torna esta receita especial?" />
            </label>
          </div>
        </section>

        <section className="rounded-[4.5rem_2rem_2rem_2rem] bg-[#E5EBDD] p-6 sm:p-8">
          <SectionHeading number="2" title="Tempos e doses" note="Usamos minutos e medidas europeias por defeito." />
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 sm:col-span-1">
              <span className="mb-2 block text-sm font-extrabold">Doses</span>
              <div className="relative">
                <input className={`${inputClass} pr-20`} name="servings" inputMode="decimal" placeholder="4" />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#766F67]">pessoas</span>
              </div>
            </label>
            <label className="col-span-2 sm:col-span-1">
              <span className="mb-2 block text-sm font-extrabold">Dificuldade</span>
              <select className={inputClass} name="difficulty" defaultValue="easy">
                <option value="">Por definir</option>
                <option value="easy">Fácil</option>
                <option value="medium">Média</option>
                <option value="hard">Exigente</option>
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm font-extrabold">Tempo ativo</span>
              <div className="relative">
                <input className={`${inputClass} pr-12`} name="active_time" type="number" min="0" step="1" placeholder="20" />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#766F67]">min</span>
              </div>
            </label>
            <label>
              <span className="mb-2 block text-sm font-extrabold">Tempo total</span>
              <div className="relative">
                <input className={`${inputClass} pr-12`} name="total_time" type="number" min="0" step="1" placeholder="45" />
                <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#766F67]">min</span>
              </div>
            </label>
          </div>
        </section>
      </div>

      <section className="mt-7 rounded-[2rem] border-2 border-[#DDD5C9] bg-[#F8F4EC] p-5 sm:p-8">
        <SectionHeading number="3" title="Ingredientes" note="Escolhe g, kg, ml ou l conforme fizer mais sentido. Também podes usar lata ou q.b." />
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={ingredient.id} className="grid gap-3 rounded-3xl bg-[#FFFCF6] p-4 sm:grid-cols-[6.5rem_7rem_1fr_auto] sm:items-end">
              <label>
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#766F67]">Quantidade</span>
                <input className={inputClass} inputMode="decimal" value={ingredient.quantity} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, quantity: event.target.value } : item))} placeholder="250" aria-label={`Quantidade do ingrediente ${index + 1}`} />
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#766F67]">Unidade</span>
                <select className={inputClass} value={ingredient.unit} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, unit: event.target.value } : item))} aria-label={`Unidade do ingrediente ${index + 1}`}>
                  <option value="">Sem unidade</option>
                  {units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
              <label>
                <span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#766F67]">Ingrediente</span>
                <input className={inputClass} value={ingredient.name} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, name: event.target.value } : item))} placeholder="Farinha sem fermento" aria-label={`Nome do ingrediente ${index + 1}`} required />
              </label>
              <div className="flex min-h-12 items-center justify-between gap-2 sm:justify-end">
                <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs font-bold text-[#635D56]">
                  <input type="checkbox" className="size-4 accent-[#285240]" checked={ingredient.optional} onChange={(event) => setIngredients((current) => current.map((item) => item.id === ingredient.id ? { ...item, optional: event.target.checked } : item))} />
                  Opcional
                </label>
                <button type="button" onClick={() => setIngredients((current) => current.filter((item) => item.id !== ingredient.id))} disabled={ingredients.length === 1} className="grid size-11 place-items-center rounded-full text-[#A44B3A] transition hover:bg-[#FBE5DF] disabled:cursor-not-allowed disabled:opacity-25" aria-label={`Remover ingrediente ${index + 1}`}><Trash /></button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={addIngredient} className="mt-4 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]"><Plus />Adicionar ingrediente</button>
      </section>

      <section className="mt-7 rounded-[2rem_4.5rem_2rem_2rem] bg-[#AFC9DA] p-5 sm:p-8">
        <SectionHeading number="4" title="Preparação" note="Um passo claro de cada vez. A ordem em que aparecem será a ordem da receita." />
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.id} className="flex items-start gap-3">
              <span className="mt-2 grid size-9 shrink-0 place-items-center rounded-full bg-[#285240] font-serif font-black text-white">{index + 1}</span>
              <label className="sr-only" htmlFor={`step-${step.id}`}>Passo {index + 1}</label>
              <textarea id={`step-${step.id}`} className={`${inputClass} min-h-24 flex-1 resize-y py-3`} value={step.instruction} onChange={(event) => setSteps((current) => current.map((item) => item.id === step.id ? { ...item, instruction: event.target.value } : item))} placeholder={index === 0 ? "Ex.: Aquecer o forno a 180 °C." : "Descreve o passo seguinte…"} required />
              <button type="button" onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))} disabled={steps.length === 1} className="mt-1 grid size-11 shrink-0 place-items-center rounded-full text-[#6B342A] transition hover:bg-white/45 disabled:cursor-not-allowed disabled:opacity-25" aria-label={`Remover passo ${index + 1}`}><Trash /></button>
            </li>
          ))}
        </ol>
        <button type="button" onClick={addStep} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#FFFCF6] px-5 text-sm font-extrabold text-[#285240] shadow-[0_4px_0_#7FA5BC]"><Plus />Adicionar passo</button>
      </section>

      {state.message ? <p role="alert" className="mt-7 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}

      <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center">
        <p className="text-center text-sm text-[#766F67] sm:text-left">Será guardada por <strong className="text-[#27231F]">{displayName}</strong>.</p>
        <button type="submit" disabled={pending} className="min-h-14 rounded-full bg-[#F36F56] px-8 text-base font-extrabold text-white shadow-[0_6px_0_#D94F38] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">
          {pending ? "A guardar…" : "Guardar receita"}
        </button>
      </div>
    </form>
  );
}

export function BackToCollection() {
  return (
    <Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
      <ArrowLeft />Voltar à coleção
    </Link>
  );
}
