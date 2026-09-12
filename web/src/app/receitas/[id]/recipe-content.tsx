"use client";

import { Fragment, useState } from "react";

type Ingredient = {
  id: string;
  name: string;
  optional: boolean;
  scalable: boolean;
  quantity: number | string | null;
  quantityMax: number | string | null;
  unit: string | null;
  groupName: string | null;
  packageQuantity: number | string | null;
  packageUnit: string | null;
};

type Step = {
  id: string;
  instruction: string;
  sectionName: string | null;
};

function readableQuantity(value: number, unit: string | null) {
  let adjusted = value;
  let adjustedUnit = unit;

  if (unit === "g" && value >= 1000) {
    adjusted = value / 1000;
    adjustedUnit = "kg";
  } else if (unit === "ml" && value >= 1000) {
    adjusted = value / 1000;
    adjustedUnit = "l";
  } else if (unit === "kg" && value < 1) {
    adjusted = value * 1000;
    adjustedUnit = "g";
  } else if (unit === "l" && value < 1) {
    adjusted = value * 1000;
    adjustedUnit = "ml";
  }

  const magnitude = Math.abs(adjusted);
  const maximumFractionDigits = magnitude >= 100 ? 0 : magnitude >= 10 ? 1 : 2;
  return {
    quantity: new Intl.NumberFormat("pt-PT", {
      maximumFractionDigits,
    }).format(adjusted),
    unit: adjustedUnit,
  };
}

function scaledAmount(
  quantity: number | string | null,
  quantityMax: number | string | null,
  unit: string | null,
  factor: number,
  scalable: boolean,
) {
  if (quantity === null) return { text: "", unit: unit ?? "" };
  const start = Number(quantity);
  if (!Number.isFinite(start)) return { text: String(quantity), unit: unit ?? "" };
  const first = readableQuantity(start * (scalable ? factor : 1), unit);

  if (quantityMax === null) return { text: first.quantity, unit: first.unit ?? "" };
  const end = Number(quantityMax);
  if (!Number.isFinite(end)) return { text: first.quantity, unit: first.unit ?? "" };
  const last = readableQuantity(end * (scalable ? factor : 1), unit);
  if (first.unit !== last.unit) {
    return {
      text: `${first.quantity} ${first.unit ?? ""}–${last.quantity}`,
      unit: last.unit ?? "",
    };
  }
  return {
    text: `${first.quantity}–${last.quantity}`,
    unit: first.unit ?? "",
  };
}

export default function RecipeContent({
  baseServings,
  servingsLabel,
  ingredients,
  steps,
}: {
  baseServings: number | string | null;
  servingsLabel: string;
  ingredients: Ingredient[];
  steps: Step[];
}) {
  const numericBase = Number(baseServings);
  const canScale = baseServings !== null && Number.isInteger(numericBase) && numericBase > 0;
  const [servings, setServings] = useState(canScale ? numericBase : 1);
  const factor = canScale ? servings / numericBase : 1;

  return (
    <div className="mt-14 grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <section aria-labelledby="ingredients-title">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">À mão</p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-4">
          <h2 id="ingredients-title" className="font-serif text-4xl font-black tracking-[-.04em]">Ingredientes</h2>
          {canScale ? (
            <div className="rounded-[1.4rem_1.4rem_2rem_1.4rem] bg-[#E5EBDD] p-2" aria-label="Ajustar doses">
              <p className="px-2 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-[#617064]">Para quantos?</p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setServings((current) => Math.max(1, current - 1))} className="grid size-10 place-items-center rounded-full bg-[#FFFCF6] text-xl font-black text-[#285240]" aria-label="Diminuir doses">−</button>
                <label className="sr-only" htmlFor="servings-scale">Número de {servingsLabel}</label>
                <input id="servings-scale" type="number" min="1" step="1" inputMode="numeric" value={servings} onChange={(event) => { const next = Number(event.target.value); if (Number.isInteger(next) && next > 0) setServings(next); }} className="h-10 w-14 bg-transparent text-center font-serif text-lg font-black outline-none" />
                <button type="button" onClick={() => setServings((current) => current + 1)} className="grid size-10 place-items-center rounded-full bg-[#285240] text-xl font-black text-white" aria-label="Aumentar doses">+</button>
              </div>
            </div>
          ) : null}
        </div>
        {canScale && servings !== numericBase ? <p role="status" className="mt-4 rounded-2xl bg-[#F3C565]/35 px-4 py-3 text-xs font-bold text-[#66501F]">Quantidades ajustadas de {new Intl.NumberFormat("pt-PT").format(numericBase)} para {new Intl.NumberFormat("pt-PT").format(servings)} {servingsLabel}.</p> : null}
        <ul className="mt-7 border-y-2 border-[#D9D1C5]">
          {ingredients.map((ingredient, index) => {
            const amount = scaledAmount(
              ingredient.quantity,
              ingredient.quantityMax,
              ingredient.unit,
              factor,
              ingredient.scalable,
            );
            const packageAmount =
              ingredient.packageQuantity !== null
                ? readableQuantity(
                    Number(ingredient.packageQuantity),
                    ingredient.packageUnit,
                  )
                : null;
            const previousGroup = index > 0 ? ingredients[index - 1].groupName : null;
            const showGroup = Boolean(ingredient.groupName && ingredient.groupName !== previousGroup);

            return (
              <Fragment key={ingredient.id}>
                {showGroup ? <li className="border-b border-[#D9D1C5] bg-[#E5EBDD]/65 px-4 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#285240]">{ingredient.groupName}</li> : null}
                <li className="flex min-h-14 items-center gap-3 border-b border-[#D9D1C5] py-3 last:border-b-0">
                  <span className="size-2.5 shrink-0 rounded-[45%_55%_58%_42%] bg-[#F36F56]" />
                  <span className="flex-1 font-semibold">{ingredient.name}{ingredient.optional ? <span className="ml-2 text-xs font-normal text-[#766F67]">opcional</span> : null}</span>
                  <strong className="text-right text-sm text-[#285240]">{amount.text} {amount.unit}</strong>
                </li>
                {packageAmount ? <li className="-mt-px border-b border-[#D9D1C5] pb-3 pl-5 text-xs text-[#817970]">Cada embalagem contém {packageAmount.quantity} {packageAmount.unit}.</li> : null}
              </Fragment>
            );
          })}
        </ul>
        {canScale ? <p className="mt-3 text-xs leading-5 text-[#817970]">O ajuste é apenas visual e não altera a receita guardada. Confirma sempre unidades indivisíveis, como ovos ou latas.</p> : null}
      </section>

      <section aria-labelledby="steps-title">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Vamos cozinhar</p>
        <h2 id="steps-title" className="mt-1 font-serif text-4xl font-black tracking-[-.04em]">Preparação</h2>
        <ol className="mt-7 space-y-5">
          {steps.map((step, index) => {
            const previousSection = index > 0 ? steps[index - 1].sectionName : null;
            const showSection = Boolean(step.sectionName && step.sectionName !== previousSection);
            return (
              <Fragment key={step.id}>
                {showSection ? <li className="pt-3 font-serif text-xl font-black text-[#285240]">{step.sectionName}</li> : null}
                <li className="grid grid-cols-[3rem_1fr] gap-4 rounded-[1.5rem_1.5rem_3rem_1.5rem] bg-[#FFFCF6] p-5 sm:p-6">
                  <span className="grid size-11 place-items-center rounded-[55%_45%_58%_42%/48%_57%_43%_52%] bg-[#F3C565] font-serif text-xl font-black">{index + 1}</span>
                  <p className="pt-2 leading-7">{step.instruction}</p>
                </li>
              </Fragment>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
