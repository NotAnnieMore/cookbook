"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";

import ImageCropper from "@/components/image-cropper";
import { combineDurationParts, splitDurationMinutes } from "@/lib/recipes/duration";
import { createClient as createBrowserClient } from "@/lib/supabase/client";

import { createRecipe, type CreateRecipeState } from "./actions";

export type RecipeFormIngredient = {
  id: number;
  name: string;
  quantity: string;
  quantityMax: string;
  unit: string;
  optional: boolean;
  packageQuantity: string;
  packageUnit: string;
  detailsOpen: boolean;
  originalQuantity?: string;
  originalQuantityMax?: string;
  originalUnit?: string;
  originalText?: string;
  conversionConfidence?: "exact" | "reference" | "suggested" | "ambiguous";
  conversionSource?: string;
  conversionRuleVersion?: string;
};

export type RecipeFormStep = { id: number; instruction: string };

export type RecipeFormValues = {
  title: string;
  description: string;
  servings: string;
  activeTime: string;
  totalTime: string;
  difficulty: "easy" | "medium" | "hard" | "";
  tags: string[];
  ingredients: (Omit<RecipeFormIngredient, "id" | "detailsOpen"> & { group: string })[];
  steps: (Omit<RecipeFormStep, "id"> & { section: string })[];
  coverUrl?: string | null;
};

type IngredientPart = { id: number; title: string; ingredients: RecipeFormIngredient[] };
type PreparationPhase = { id: number; title: string; steps: RecipeFormStep[] };
type RecipeFormAction = (previousState: CreateRecipeState, formData: FormData) => Promise<CreateRecipeState>;

const initialState: CreateRecipeState = {};
const units = ["g", "kg", "ml", "l", "c. chá", "c. sopa", "unid.", "lata", "dente", "folha", "ramo", "pitada", "q.b."];
const inputClass = "min-h-12 w-full rounded-2xl border border-[#D8D0C4] bg-[#FFFCF6] px-4 text-base font-semibold text-[#27231F] outline-none transition placeholder:font-normal placeholder:text-[#999187] focus:border-[#285240] focus:ring-3 focus:ring-[#285240]/12";

function cleanTags(values: string[]) {
  const unique = new Map<string, string>();
  for (const value of values) {
    const name = value.trim().replace(/^#+/, "").replace(/\s+/g, " ");
    const key = name.toLocaleLowerCase("pt-PT");
    if (name && !unique.has(key)) unique.set(key, name.slice(0, 40));
  }
  return [...unique.values()].slice(0, 12);
}

function blankIngredient(id: number): RecipeFormIngredient {
  return { id, name: "", quantity: "", quantityMax: "", unit: "", optional: false, packageQuantity: "", packageUnit: "g", detailsOpen: false };
}

function ingredientPartsFrom(values: RecipeFormValues | undefined) {
  if (!values?.ingredients.length) return [{ id: 1, title: "", ingredients: [blankIngredient(2)] }];
  const parts: IngredientPart[] = [];
  values.ingredients.forEach((ingredient, index) => {
    const key = ingredient.group.trim().toLocaleLowerCase("pt-PT");
    let part = parts.find((candidate) => candidate.title.toLocaleLowerCase("pt-PT") === key);
    if (!part) {
      part = { id: 100 + parts.length, title: ingredient.group, ingredients: [] };
      parts.push(part);
    }
    part.ingredients.push({ ...ingredient, id: 1000 + index, detailsOpen: Boolean(ingredient.quantityMax || ingredient.packageQuantity || ingredient.optional) });
  });
  return parts;
}

function preparationPhasesFrom(values: RecipeFormValues | undefined) {
  if (!values?.steps.length) return [{ id: 3, title: "", steps: [{ id: 4, instruction: "" }] }];
  const phases: PreparationPhase[] = [];
  values.steps.forEach((step, index) => {
    const key = step.section.trim().toLocaleLowerCase("pt-PT");
    let phase = phases.find((candidate) => candidate.title.toLocaleLowerCase("pt-PT") === key);
    if (!phase) {
      phase = { id: 500 + phases.length, title: step.section, steps: [] };
      phases.push(phase);
    }
    phase.steps.push({ id: 2000 + index, instruction: step.instruction });
  });
  return phases;
}

function ArrowLeft() {
  return <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
}

function Plus() {
  return <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
}

function Trash() {
  return <svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
}

function SectionHeading({ number, title, note }: { number: string; title: string; note: string }) {
  return <div className="mb-6 flex items-start gap-4"><span className="grid size-10 shrink-0 place-items-center rounded-[58%_42%_48%_52%/44%_55%_45%_56%] bg-[#F3C565] font-serif text-lg font-black text-[#27231F]">{number}</span><div><h2 className="font-serif text-2xl font-black tracking-[-.025em] text-[#27231F]">{title}</h2><p className="mt-1 text-sm leading-6 text-[#766F67]">{note}</p></div></div>;
}

export default function RecipeForm({ displayName, action = createRecipe, mode = "create", initialValues, recipeId, expectedVersion, importJobId }: { displayName: string; action?: RecipeFormAction; mode?: "create" | "edit"; initialValues?: RecipeFormValues; recipeId?: string; expectedVersion?: number; importJobId?: string }) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const idCounter = useRef(10000);
  const nextId = () => idCounter.current++;
  const [ingredientParts, setIngredientParts] = useState<IngredientPart[]>(() => ingredientPartsFrom(initialValues));
  const [preparationPhases, setPreparationPhases] = useState<PreparationPhase[]>(() => preparationPhasesFrom(initialValues));
  const [ingredientRemoval, setIngredientRemoval] = useState<number | null>(null);
  const [tags, setTags] = useState(() => cleanTags(initialValues?.tags ?? []));
  const [tagDraft, setTagDraft] = useState("");
  const [externalChange, setExternalChange] = useState(false);
  const [coverPreview, setCoverPreview] = useState<string | null>(initialValues?.coverUrl ?? null);
  const localPreview = useRef<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [cropSource, setCropSource] = useState<{ url: string; fileName: string } | null>(null);
  const initialTotalTime = splitDurationMinutes(initialValues?.totalTime);
  const [totalHours, setTotalHours] = useState(initialTotalTime.hours);
  const [totalMinutes, setTotalMinutes] = useState(initialTotalTime.minutes);
  const submitting = useRef(false);
  const hasExistingCover = Boolean(initialValues?.coverUrl);

  useEffect(() => () => {
    if (localPreview.current) URL.revokeObjectURL(localPreview.current);
  }, []);

  useEffect(() => () => {
    if (cropSource) URL.revokeObjectURL(cropSource.url);
  }, [cropSource]);

  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  useEffect(() => {
    if (!recipeId || expectedVersion === undefined) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`recipe-edit-${recipeId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "recipes",
          filter: `id=eq.${recipeId}`,
        },
        (payload) => {
          const latestVersion = Number(payload.new.version);
          if (
            !submitting.current &&
            Number.isFinite(latestVersion) &&
            latestVersion > expectedVersion
          ) {
            setExternalChange(true);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [expectedVersion, recipeId]);

  function chooseCover(file: File | undefined) {
    if (!file) return;
    setCropSource({ url: URL.createObjectURL(file), fileName: file.name });
  }

  function closeCropper(clearInput = true) {
    setCropSource(null);
    if (clearInput && coverInputRef.current) coverInputRef.current.value = "";
  }

  function applyCroppedCover(file: File) {
    if (coverInputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      coverInputRef.current.files = transfer.files;
    }
    if (localPreview.current) URL.revokeObjectURL(localPreview.current);
    localPreview.current = URL.createObjectURL(file);
    setCoverPreview(localPreview.current);
    closeCropper(false);
  }

  function updateIngredient(partId: number, ingredientId: number, changes: Partial<RecipeFormIngredient>) {
    setIngredientParts((current) => current.map((part) => part.id === partId ? { ...part, ingredients: part.ingredients.map((ingredient) => ingredient.id === ingredientId ? { ...ingredient, ...changes } : ingredient) } : part));
  }

  function removeIngredient(partId: number, ingredientId: number) {
    setIngredientParts((current) => current.map((part) => part.id === partId ? { ...part, ingredients: part.ingredients.filter((ingredient) => ingredient.id !== ingredientId) } : part).filter((part) => part.ingredients.length > 0));
    setIngredientRemoval(null);
  }

  function updateStep(phaseId: number, stepId: number, instruction: string) {
    setPreparationPhases((current) => current.map((phase) => phase.id === phaseId ? { ...phase, steps: phase.steps.map((step) => step.id === stepId ? { ...step, instruction } : step) } : phase));
  }

  function removeStep(phaseId: number, stepId: number) {
    setPreparationPhases((current) => current.map((phase) => phase.id === phaseId ? { ...phase, steps: phase.steps.filter((step) => step.id !== stepId) } : phase).filter((phase) => phase.steps.length > 0));
  }

  function commitTags(value = tagDraft) {
    setTags((current) => cleanTags([...current, ...value.split(",")]));
    setTagDraft("");
  }

  const ingredientCount = ingredientParts.reduce((total, part) => total + part.ingredients.length, 0);
  const stepCount = preparationPhases.reduce((total, phase) => total + phase.steps.length, 0);
  const serializedIngredients = ingredientParts.flatMap((part) => part.ingredients.map(({ name, quantity, quantityMax, unit, optional, packageQuantity, packageUnit, originalQuantity, originalQuantityMax, originalUnit, originalText, conversionConfidence, conversionSource, conversionRuleVersion }) => ({ name, quantity, quantityMax, unit, optional, group: part.title, packageQuantity, packageUnit, originalQuantity, originalQuantityMax, originalUnit, originalText, conversionConfidence, conversionSource, conversionRuleVersion })));
  const serializedSteps = preparationPhases.flatMap((phase) => phase.steps.map(({ instruction }) => ({ instruction, section: phase.title })));
  const serializedTags = cleanTags([...tags, ...tagDraft.split(",")]);
  const totalTimeValue = combineDurationParts(totalHours, totalMinutes);

  return (
    <form action={formAction} onSubmit={() => { submitting.current = true; }} className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
      <input type="hidden" name="ingredients_json" value={JSON.stringify(serializedIngredients)} />
      <input type="hidden" name="steps_json" value={JSON.stringify(serializedSteps)} />
      <input type="hidden" name="tags_json" value={JSON.stringify(serializedTags)} />
      <input type="hidden" name="total_time" value={totalTimeValue} />
      {importJobId ? <input type="hidden" name="import_job_id" value={importJobId} /> : null}

      {externalChange ? <div role="alert" className="sticky top-3 z-30 mb-6 flex flex-col gap-3 rounded-[1.5rem_1.5rem_2.5rem_1.5rem] border-2 border-[#D86B50] bg-[#FFF4EC] p-4 shadow-[0_7px_0_#E9C9B9] sm:flex-row sm:items-center sm:justify-between"><div><p className="font-serif text-lg font-black text-[#7F3525]">Esta receita mudou noutro dispositivo</p><p className="mt-1 text-sm leading-5 text-[#715D54]">Para não substituir o trabalho da outra pessoa, carrega a versão mais recente antes de continuar.</p></div><button type="button" onClick={() => window.location.reload()} className="min-h-11 shrink-0 rounded-full bg-[#285240] px-5 text-sm font-extrabold text-white">Carregar versão recente</button></div> : null}

      <div className="grid gap-7 lg:grid-cols-[1fr_.8fr]">
        <section className="rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] p-6 shadow-[0_10px_0_#E6DED2] sm:p-8">
          <SectionHeading number="1" title="A receita" note={mode === "edit" ? "Altera apenas o que precisa de mudar; a autoria original mantém-se." : "Começa pelo essencial. Podes voltar para completar os detalhes mais tarde."} />
          <div className="space-y-5">
            <label className="block"><span className="mb-2 block text-sm font-extrabold">Nome da receita</span><input className={inputClass} name="title" required minLength={2} maxLength={200} placeholder="Ex.: Cheesecake da Ana" autoFocus={mode === "create"} defaultValue={initialValues?.title} /></label>
            <label className="block"><span className="mb-2 block text-sm font-extrabold">Pequena descrição <span className="font-normal text-[#8A8278]">(opcional)</span></span><textarea className={`${inputClass} min-h-32 resize-y py-3`} name="description" maxLength={1200} placeholder="O que torna esta receita especial?" defaultValue={initialValues?.description} /></label>
            <div><span className="mb-2 block text-sm font-extrabold">Fotografia principal <span className="font-normal text-[#8A8278]">(opcional)</span></span>{coverPreview ? <div role="img" aria-label="Pré-visualização da fotografia principal" className="mb-3 aspect-3/2 rounded-[2rem_2rem_4rem_2rem] bg-cover bg-center" style={{ backgroundImage: `url("${coverPreview.replaceAll('"', '\\"')}")` }} /> : <div className="mb-3 grid h-36 place-items-center rounded-[2rem_2rem_4rem_2rem] border-2 border-dashed border-[#D8D0C4] bg-[#F8F4EC] text-center text-sm font-bold text-[#766F67]">Uma fotografia torna a coleção mais vossa.</div>}{hasExistingCover ? <p className="text-xs leading-5 text-[#766F67]">Esta receita já tem fotografia. A substituição chegará com a galeria.</p> : <label className="inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]">Escolher fotografia<input ref={coverInputRef} type="file" name="cover_image" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={(event) => chooseCover(event.target.files?.[0])} /></label>}<p className="mt-2 text-xs text-[#8A8278]">JPG, PNG, WebP ou AVIF · máximo 10 MB · podes recortar antes de guardar</p></div>
          </div>
        </section>

        <section className="rounded-[4.5rem_2rem_2rem_2rem] bg-[#E5EBDD] p-6 sm:p-8">
          <SectionHeading number="2" title="Tempos e doses" note="O tempo ativo é o trabalho; o total inclui forno, repouso, frio ou espera." />
          <div className="grid grid-cols-2 gap-4">
            <label className="col-span-2 sm:col-span-1"><span className="mb-2 block text-sm font-extrabold">Doses</span><div className="relative"><input className={`${inputClass} pr-20`} name="servings" inputMode="decimal" placeholder="4" defaultValue={initialValues?.servings} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#766F67]">pessoas</span></div></label>
            <label className="col-span-2 sm:col-span-1"><span className="mb-2 block text-sm font-extrabold">Dificuldade</span><select className={inputClass} name="difficulty" defaultValue={initialValues?.difficulty ?? "easy"}><option value="">Por definir</option><option value="easy">Fácil</option><option value="medium">Média</option><option value="hard">Exigente</option></select></label>
            <label><span className="mb-2 block text-sm font-extrabold">Tempo ativo</span><div className="relative"><input className={`${inputClass} pr-12`} name="active_time" type="number" min="0" step="1" placeholder="20" defaultValue={initialValues?.activeTime} /><span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-[#766F67]">min</span></div><span className="mt-1.5 block text-xs leading-5 text-[#667064]">Tempo passado realmente a preparar.</span></label>
            <fieldset><legend className="mb-2 block text-sm font-extrabold">Tempo total</legend><div className="grid grid-cols-2 gap-2"><label><span className="sr-only">Horas do tempo total</span><div className="relative"><input className={`${inputClass} pr-9`} type="number" min="0" step="1" placeholder="1" value={totalHours} onChange={(event) => setTotalHours(event.target.value)} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[#766F67]">h</span></div></label><label><span className="sr-only">Minutos do tempo total</span><div className="relative"><input className={`${inputClass} pr-12`} type="number" min="0" max="59" step="1" placeholder="30" value={totalMinutes} onChange={(event) => setTotalMinutes(event.target.value)} /><span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[#766F67]">min</span></div></label></div><p className="mt-1.5 text-xs leading-5 text-[#667064]">Até ficar pronto a servir, incluindo esperas.</p></fieldset>
          </div>
          <div className="mt-6 border-t border-[#C8D2C0] pt-5">
            <label htmlFor="recipe-tag" className="block text-sm font-extrabold">Etiquetas <span className="font-normal text-[#6F786D]">(opcional)</span></label>
            <p className="mt-1 text-xs leading-5 text-[#667064]">Ajudam a encontrar receitas como “sobremesa”, “vegetariano” ou “fim de semana”.</p>
            <div className="mt-3 flex gap-2">
              <input id="recipe-tag" className={inputClass} value={tagDraft} onChange={(event) => setTagDraft(event.target.value)} onBlur={() => { if (tagDraft.trim()) commitTags(); }} onKeyDown={(event) => { if ((event.key === "Enter" || event.key === ",") && tagDraft.trim()) { event.preventDefault(); commitTags(); } }} placeholder="Escreve e carrega Enter" maxLength={120} disabled={tags.length >= 12} />
              <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => commitTags()} disabled={!tagDraft.trim() || tags.length >= 12} className="min-h-12 shrink-0 rounded-full bg-[#285240] px-4 text-sm font-extrabold text-white disabled:opacity-35">Adicionar</button>
            </div>
            {tags.length ? <div className="mt-3 flex flex-wrap gap-2" aria-label="Etiquetas adicionadas">{tags.map((tag) => <span key={tag.toLocaleLowerCase("pt-PT")} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-[#FFFCF6] pl-3 text-xs font-extrabold text-[#285240] shadow-[0_2px_0_#C8D2C0]">#{tag}<button type="button" onClick={() => setTags((current) => current.filter((item) => item !== tag))} className="grid size-9 place-items-center rounded-full text-base text-[#7A726A] hover:bg-[#FBE5DF] hover:text-[#A44B3A]" aria-label={`Remover etiqueta ${tag}`}>×</button></span>)}</div> : null}
            <p className="mt-3 text-[11px] font-bold text-[#758074]">{tags.length}/12 etiquetas</p>
          </div>
        </section>
      </div>

      <section className="mt-7 rounded-[2rem] border-2 border-[#DDD5C9] bg-[#F8F4EC] p-5 sm:p-8">
        <SectionHeading number="3" title="Ingredientes" note="Cria uma parte para Base, Recheio ou Topping e adiciona logo os ingredientes dessa parte. Numa receita simples, deixa o título vazio." />
        <div className="space-y-5">
          {ingredientParts.map((part, partIndex) => (
            <div key={part.id} className="overflow-hidden rounded-[2rem_2rem_3.5rem_2rem] border border-[#DDD5C9] bg-[#FFFCF6]">
              <div className="flex items-end gap-3 bg-[#E5EBDD]/70 p-4 sm:p-5">
                <label className="flex-1"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#617064]">Parte {partIndex + 1} <span className="font-normal normal-case tracking-normal">{ingredientParts.length === 1 ? "(opcional)" : ""}</span></span><input className={inputClass} value={part.title} onChange={(event) => setIngredientParts((current) => current.map((item) => item.id === part.id ? { ...item, title: event.target.value } : item))} placeholder="Ex.: Base do cheesecake" maxLength={80} required={ingredientParts.length > 1} /></label>
                <button type="button" onClick={() => setIngredientParts((current) => current.filter((item) => item.id !== part.id))} disabled={ingredientParts.length === 1} className="grid size-11 shrink-0 place-items-center rounded-full text-[#A44B3A] hover:bg-[#FBE5DF] disabled:opacity-25" aria-label={`Remover parte ${partIndex + 1}`}><Trash /></button>
              </div>
              <div className="space-y-3 p-4 sm:p-5">
                {part.ingredients.map((ingredient, ingredientIndex) => (
                  <div key={ingredient.id} className="grid gap-3 border-b border-[#E4DDD2] pb-4 sm:grid-cols-[6.5rem_7rem_1fr] sm:items-end">
                    <div className="flex min-h-10 items-center justify-between gap-3 sm:col-span-3">
                      <span className="text-xs font-extrabold uppercase tracking-wide text-[#8A8278]">Ingrediente {ingredientIndex + 1}</span>
                      {ingredientRemoval === ingredient.id ? <div className="flex items-center gap-2 rounded-full bg-[#FBE5DF] p-1 pl-3"><span className="text-xs font-bold text-[#8B3F27]">Remover esta linha?</span><button type="button" onClick={() => setIngredientRemoval(null)} className="min-h-9 rounded-full px-3 text-xs font-extrabold text-[#6F665E]">Não</button><button type="button" onClick={() => removeIngredient(part.id, ingredient.id)} className="min-h-9 rounded-full bg-[#F36F56] px-3 text-xs font-extrabold text-white">Sim, remover</button></div> : <button type="button" onClick={() => setIngredientRemoval(ingredient.id)} disabled={ingredientCount === 1} className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-xs font-bold text-[#8A8278] hover:bg-[#FBE5DF] hover:text-[#A44B3A] disabled:opacity-25" aria-label={`Preparar remoção do ingrediente ${ingredientIndex + 1}`}><Trash />Remover</button>}
                    </div>
                    <label><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#766F67]">Quantidade</span><input className={inputClass} inputMode="decimal" value={ingredient.quantity} onChange={(event) => updateIngredient(part.id, ingredient.id, { quantity: event.target.value })} placeholder="400" aria-label={`Quantidade do ingrediente ${ingredientIndex + 1} da parte ${partIndex + 1}`} /></label>
                    <label><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#766F67]">Unidade</span><select className={inputClass} value={ingredient.unit} onChange={(event) => updateIngredient(part.id, ingredient.id, { unit: event.target.value })} aria-label={`Unidade do ingrediente ${ingredientIndex + 1}`}><option value="">Sem unidade</option>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label>
                    <label><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#766F67]">Ingrediente</span><input className={inputClass} value={ingredient.name} onChange={(event) => updateIngredient(part.id, ingredient.id, { name: event.target.value })} placeholder="Bolacha digestiva" required /></label>
                    {ingredient.originalText ? <p className="rounded-xl bg-[#FFF4DB] px-3 py-2 text-xs leading-5 text-[#715C2F] sm:col-span-3"><strong>Texto original:</strong> {ingredient.originalText}{ingredient.conversionConfidence && ingredient.conversionConfidence !== "exact" ? <span className="ml-2 font-extrabold text-[#9B5B2C]">· confirmar conversão</span> : null}</p> : null}
                    <div className="flex flex-col items-end sm:col-span-3">
                      <button type="button" onClick={() => updateIngredient(part.id, ingredient.id, { detailsOpen: !ingredient.detailsOpen })} aria-expanded={ingredient.detailsOpen} title={ingredient.detailsOpen ? "Fechar opções avançadas" : "Abrir opções avançadas"} className="grid size-9 place-items-center rounded-full text-[#8A8278] hover:bg-[#EEE8DF] hover:text-[#285240]"><span className="sr-only">{ingredient.detailsOpen ? "Fechar opções avançadas" : "Abrir opções avançadas"}</span><svg aria-hidden viewBox="0 0 24 24" className="size-5" fill="currentColor"><circle cx="5" cy="12" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="19" cy="12" r="1.5" /></svg></button>
                      {ingredient.detailsOpen ? <div className="mt-2 grid w-full gap-3 rounded-2xl bg-[#F8F4EC] p-4 sm:grid-cols-3">
                        <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl bg-[#FFFCF6] px-4 text-xs font-bold text-[#635D56]"><input type="checkbox" className="size-4 accent-[#285240]" checked={ingredient.optional} onChange={(event) => updateIngredient(part.id, ingredient.id, { optional: event.target.checked })} /><span><strong className="block text-[#27231F]">Pode ser omitido</strong>É apenas decoração ou fica ao gosto de quem cozinha.</span></label>
                        <label><span className="mb-1.5 block text-xs font-extrabold text-[#766F67]">Quantidade máxima</span><input className={inputClass} inputMode="decimal" value={ingredient.quantityMax} onChange={(event) => updateIngredient(part.id, ingredient.id, { quantityMax: event.target.value })} placeholder="3, para 2–3" /></label>
                        <div className="grid grid-cols-[1fr_5.5rem] gap-2"><label><span className="mb-1.5 block text-xs font-extrabold text-[#766F67]">Conteúdo embalagem</span><input className={inputClass} inputMode="decimal" value={ingredient.packageQuantity} onChange={(event) => updateIngredient(part.id, ingredient.id, { packageQuantity: event.target.value })} placeholder="397" /></label><label><span className="mb-1.5 block text-xs font-extrabold text-[#766F67]">Unid.</span><select className={inputClass} value={ingredient.packageUnit} onChange={(event) => updateIngredient(part.id, ingredient.id, { packageUnit: event.target.value })}><option>g</option><option>kg</option><option>ml</option><option>l</option></select></label></div>
                      </div> : null}
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setIngredientParts((current) => current.map((item) => item.id === part.id ? { ...item, ingredients: [...item.ingredients, blankIngredient(nextId())] } : item))} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]"><Plus />Adicionar ingrediente a esta parte</button>
              </div>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => { const partId = nextId(); setIngredientParts((current) => [...current, { id: partId, title: "", ingredients: [blankIngredient(nextId())] }]); }} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]"><Plus />Adicionar outra parte da receita</button>
      </section>

      <section className="mt-7 rounded-[2rem_4.5rem_2rem_2rem] bg-[#AFC9DA] p-5 sm:p-8">
        <SectionHeading number="4" title="Preparação" note="Separa a preparação em fases e escreve os passos dessa fase logo por baixo. Numa receita simples, deixa o título vazio." />
        <div className="space-y-5">
          {preparationPhases.map((phase, phaseIndex) => (
            <div key={phase.id} className="rounded-[2rem_2rem_3.5rem_2rem] bg-[#D8E7EF] p-4 sm:p-5">
              <div className="mb-4 flex items-end gap-3"><label className="flex-1"><span className="mb-1.5 block text-xs font-extrabold uppercase tracking-wide text-[#526B79]">Fase {phaseIndex + 1} <span className="font-normal normal-case tracking-normal">{preparationPhases.length === 1 ? "(opcional)" : ""}</span></span><input className={inputClass} value={phase.title} onChange={(event) => setPreparationPhases((current) => current.map((item) => item.id === phase.id ? { ...item, title: event.target.value } : item))} placeholder="Ex.: Preparar a base" maxLength={80} required={preparationPhases.length > 1} /></label><button type="button" onClick={() => setPreparationPhases((current) => current.filter((item) => item.id !== phase.id))} disabled={preparationPhases.length === 1} className="grid size-11 shrink-0 place-items-center rounded-full text-[#6B342A] hover:bg-white/45 disabled:opacity-25" aria-label={`Remover fase ${phaseIndex + 1}`}><Trash /></button></div>
              <ol className="space-y-3">
                {phase.steps.map((step, stepIndex) => {
                  const number = preparationPhases.slice(0, phaseIndex).reduce((total, item) => total + item.steps.length, 0) + stepIndex + 1;
                  return <li key={step.id} className="flex items-start gap-3"><span className="mt-2 grid size-9 shrink-0 place-items-center rounded-full bg-[#285240] font-serif font-black text-white">{number}</span><label className="sr-only" htmlFor={`step-${step.id}`}>Passo {number}</label><textarea id={`step-${step.id}`} className={`${inputClass} min-h-24 flex-1 resize-y py-3`} value={step.instruction} onChange={(event) => updateStep(phase.id, step.id, event.target.value)} placeholder={number === 1 ? "Ex.: Triturar a bolacha e envolver com a manteiga." : "Descreve o passo seguinte…"} required /><button type="button" onClick={() => removeStep(phase.id, step.id)} disabled={stepCount === 1} className="mt-1 grid size-11 shrink-0 place-items-center rounded-full text-[#6B342A] hover:bg-white/45 disabled:opacity-25" aria-label={`Remover passo ${number}`}><Trash /></button></li>;
                })}
              </ol>
              <button type="button" onClick={() => setPreparationPhases((current) => current.map((item) => item.id === phase.id ? { ...item, steps: [...item.steps, { id: nextId(), instruction: "" }] } : item))} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#FFFCF6] px-4 text-sm font-extrabold text-[#285240]"><Plus />Adicionar passo a esta fase</button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => { const phaseId = nextId(); setPreparationPhases((current) => [...current, { id: phaseId, title: "", steps: [{ id: nextId(), instruction: "" }] }]); }} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#285240] px-5 text-sm font-extrabold text-white shadow-[0_4px_0_#193A2B]"><Plus />Adicionar outra fase</button>
      </section>

      {state.message ? <p role="alert" className="mt-7 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}
      <div className="mt-8 flex flex-col-reverse items-stretch justify-between gap-4 sm:flex-row sm:items-center"><p className="text-center text-sm text-[#766F67] sm:text-left">{mode === "edit" ? "Alterações guardadas por" : "Será guardada por"} <strong className="text-[#27231F]">{displayName}</strong>.</p><button type="submit" disabled={pending || externalChange} className="min-h-14 rounded-full bg-[#F36F56] px-8 text-base font-extrabold text-white shadow-[0_6px_0_#D94F38] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60">{pending ? "A guardar…" : externalChange ? "Atualiza antes de guardar" : mode === "edit" ? "Guardar alterações" : "Guardar receita"}</button></div>
      {cropSource ? <ImageCropper sourceUrl={cropSource.url} fileName={cropSource.fileName} onCancel={() => closeCropper()} onApply={applyCroppedCover} /> : null}
    </form>
  );
}

export function BackToCollection({ href = "/", label = "Voltar à coleção" }: { href?: string; label?: string }) {
  return <Link href={href} className="inline-flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]"><ArrowLeft />{label}</Link>;
}
