"use client";

import Link from "next/link";
import { useActionState } from "react";

import RecipeForm from "@/app/receitas/nova/recipe-form";
import { CookbookMascotIllustration } from "@/components/cookbook-mascot";

import { analyseRecipeUrl, type UrlImportState } from "./actions";

const initialState: UrlImportState = {};

export default function UrlImportFlow({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(analyseRecipeUrl, initialState);
  const socialName = state.sourceKind === "instagram" ? "Instagram" : state.sourceKind === "tiktok" ? "TikTok" : "publicação";

  if (state.draft && state.importJobId) {
    let sourceHost = "website";
    try {
      sourceHost = state.sourceUrl ? new URL(state.sourceUrl).hostname.replace(/^www\./, "") : sourceHost;
    } catch {
      sourceHost = "website";
    }

    return (
      <>
        <section className="mx-auto mb-7 max-w-5xl px-5 sm:px-8">
          <div className="rounded-[2rem_2rem_3.5rem_2rem] bg-[#E5EBDD] p-5 shadow-[0_8px_0_#D5DDCD] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#4F6B5D]">Preview obrigatório · {sourceHost}</p>
                <h2 className="mt-1 font-serif text-2xl font-black">Confirma o que veio do website</h2>
                <p className="mt-2 text-sm leading-6 text-[#657066]">Encontrámos {state.draft.ingredients.length} ingredientes e {state.draft.steps.length} passos. Nada será guardado sem a tua confirmação.</p>
              </div>
              <Link href="/receitas/importar/url" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border-2 border-[#285240] px-4 text-sm font-extrabold text-[#285240]">Importar outro link</Link>
            </div>
            {state.warnings?.length ? <div className="mt-5 rounded-2xl bg-[#FFF8E7] p-4"><p className="text-sm font-extrabold text-[#76591D]">Pontos a confirmar</p><ul className="mt-2 space-y-1 text-xs leading-5 text-[#74633E]">{state.warnings.slice(0, 8).map((warning) => <li key={warning}>• {warning}</li>)}</ul></div> : null}
          </div>
        </section>
        <RecipeForm displayName={displayName} initialValues={state.draft} importJobId={state.importJobId} />
      </>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
      <form action={action} className="rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] p-6 shadow-[0_10px_0_#E6DED2] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><label htmlFor="source-url" className="font-serif text-2xl font-black">Link da receita</label><p className="mt-2 max-w-2xl text-sm leading-6 text-[#746D64]">Funciona melhor em páginas públicas de receitas. Também tentamos ler descrições públicas de redes sociais, mas alguns serviços podem bloquear o acesso automático.</p></div>
          <CookbookMascotIllustration variant="exploring" animated={pending} priority className="size-20 shrink-0 sm:size-28" />
        </div>
        <input id="source-url" name="source_url" type="url" inputMode="url" autoCapitalize="none" autoCorrect="off" required maxLength={2048} defaultValue={state.sourceUrl} className="mt-5 min-h-14 w-full rounded-2xl border-2 border-[#D8D0C4] bg-[#F8F4EC] px-5 text-base font-semibold outline-none placeholder:font-normal placeholder:text-[#999187] focus:border-[#285240] focus:ring-4 focus:ring-[#285240]/10" placeholder="https://exemplo.com/receita" />
        <details className="mt-4 rounded-2xl bg-[#F8F4EC] px-4 py-3 text-sm text-[#6F6860]">
          <summary className="cursor-pointer font-extrabold text-[#285240]">O que conseguimos ler</summary>
          <p className="mt-3 leading-6">Procuramos primeiro dados Schema.org próprios para receitas. No TikTok e Instagram, tentamos também organizar a descrição pública da publicação. Se estes métodos não forem suficientes, enviamos ao Gemini apenas o texto público já recolhido e limpo — nunca sessões, cookies ou a chave da app. Sites privados, páginas que exigem login ou bloqueiam automação podem não funcionar.</p>
        </details>
        {state.message ? <p role="alert" className="mt-5 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}
        {state.needsSourceText ? (
          <div className="mt-5 rounded-[1.5rem_1.5rem_3rem_1.5rem] border-2 border-[#E0C475] bg-[#FFF8E7] p-5">
            <label htmlFor="source-text-override" className="font-serif text-xl font-black">Texto completo mostrado no {socialName}</label>
            <p className="mt-2 text-sm leading-6 text-[#74633E]">Copia a descrição/receita que aparece na publicação. Pode estar em inglês e ter ingredientes e passos na mesma linha.</p>
            {state.publicCaption ? <p className="mt-3 rounded-2xl bg-white/65 px-4 py-3 text-xs leading-5 text-[#746D64]"><strong>Legenda que conseguimos ler:</strong> {state.publicCaption}</p> : null}
            <textarea id="source-text-override" name="source_text_override" required minLength={20} maxLength={30000} className="mt-4 min-h-64 w-full resize-y rounded-2xl border border-[#D8C58E] bg-[#FFFCF6] p-4 text-base leading-7 outline-none focus:border-[#285240] focus:ring-4 focus:ring-[#285240]/10" placeholder={`Honey Glazed Bacon Wrapped Garlic Chicken Bites\n\nIngredients:\n* Garlic chicken bites\n* Bacon\n* Honey\n\nInstructions:\n1. Prepare…`} />
          </div>
        ) : null}
        {pending ? <p role="status" className="mt-5 text-center text-sm font-extrabold text-[#285240] sm:text-right">A mascote está a seguir a ligação e a procurar a receita…</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/receitas/importar/texto" className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]">Prefiro colar o texto</Link>
          <button type="submit" disabled={pending} className="min-h-14 rounded-full bg-[#F36F56] px-7 text-base font-extrabold text-white shadow-[0_6px_0_#D94F38] disabled:cursor-wait disabled:opacity-60">{pending ? "A analisar…" : state.needsSourceText ? "Analisar texto e criar preview" : "Criar preview"}</button>
        </div>
      </form>
    </section>
  );
}
