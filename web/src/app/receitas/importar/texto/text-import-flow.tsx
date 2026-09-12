"use client";

import Link from "next/link";
import { useActionState } from "react";

import RecipeForm from "@/app/receitas/nova/recipe-form";
import { CookbookMascotIllustration } from "@/components/cookbook-mascot";
import ImportAiReview from "@/components/import-ai-review";
import ImportCaptureFeedback from "@/components/import-capture-feedback";

import {
  analyseRecipeText,
  type TextImportState,
} from "./actions";

const initialState: TextImportState = {};

export default function TextImportFlow({ displayName }: { displayName: string }) {
  const [state, action, pending] = useActionState(analyseRecipeText, initialState);

  if (state.draft && state.importJobId) {
    return (
      <>
        <section className="mx-auto mb-7 max-w-5xl px-5 sm:px-8">
          <div className="rounded-[2rem_2rem_3.5rem_2rem] bg-[#E5EBDD] p-5 shadow-[0_8px_0_#D5DDCD] sm:p-7">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#4F6B5D]">Preview obrigatório</p>
                <h2 className="mt-1 font-serif text-2xl font-black">Confirma antes de guardar</h2>
                <p className="mt-2 text-sm leading-6 text-[#657066]">Encontrámos {state.draft.ingredients.length} ingredientes e {state.draft.steps.length} passos. Podes corrigir tudo abaixo.</p>
              </div>
              <Link href="/receitas/importar/texto" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border-2 border-[#285240] px-4 text-sm font-extrabold text-[#285240]">Colar outro texto</Link>
            </div>
            <ImportCaptureFeedback feedback={state.captureFeedback} />
            {state.warnings?.length ? <div className="mt-5 rounded-2xl bg-[#FFF8E7] p-4"><p className="text-sm font-extrabold text-[#76591D]">Pontos a confirmar</p><ul className="mt-2 space-y-1 text-xs leading-5 text-[#74633E]">{state.warnings.slice(0, 8).map((warning) => <li key={warning}>• {warning}</li>)}</ul></div> : null}
            {state.message ? <p role="alert" className="mt-4 rounded-2xl bg-[#FBE5DF] px-4 py-3 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}
            <ImportAiReview review={state.aiReview} />
            <form action={action} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <input type="hidden" name="source_text" value={state.sourceText ?? ""} />
              <input type="hidden" name="force_ai_review" value="1" />
              <span className="text-xs leading-5 text-[#657066] sm:mr-auto">Opcional: compara a extração original com o texto que colaste.</span>
              <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240] transition hover:bg-white/55 disabled:cursor-wait disabled:opacity-55">
                {pending ? "A rever…" : state.aiReview ? "Rever novamente com IA" : "Rever com IA"}
              </button>
            </form>
          </div>
        </section>
        <RecipeForm
          displayName={displayName}
          initialValues={state.draft}
          importJobId={state.importJobId}
        />
      </>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-5 pb-24 sm:px-8">
      <form action={action} className="rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] p-6 shadow-[0_10px_0_#E6DED2] sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><label htmlFor="source-text" className="font-serif text-2xl font-black">Texto da receita</label><p className="mt-2 max-w-2xl text-sm leading-6 text-[#746D64]">Podes colar uma receita de uma mensagem, publicação, livro digital ou site. Reconhecemos normalmente a lista de ingredientes e o texto de preparação mesmo sem títulos.</p></div>
          <CookbookMascotIllustration variant="reading" animated={pending} priority className="size-20 shrink-0 sm:size-28" />
        </div>
        <textarea id="source-text" name="source_text" required minLength={20} maxLength={30000} className="mt-5 min-h-80 w-full resize-y rounded-[1.5rem_1.5rem_3rem_1.5rem] border-2 border-[#D8D0C4] bg-[#F8F4EC] p-5 text-base leading-7 outline-none placeholder:text-[#999187] focus:border-[#285240] focus:ring-4 focus:ring-[#285240]/10" placeholder={`Cheesecake da Ana\n\nIngredientes\nBase:\n- 400 g de bolacha\n- 110 g de manteiga\n\nPreparação\n1. Triturar a bolacha...`} />
        <details className="mt-4 rounded-2xl bg-[#F8F4EC] px-4 py-3 text-sm text-[#6F6860]">
          <summary className="cursor-pointer font-extrabold text-[#285240]">Como obter um resultado melhor</summary>
          <p className="mt-3 leading-6">Os títulos “Ingredientes” e “Preparação” ajudam, mas já não são obrigatórios quando a divisão é clara. Também separamos um parágrafo de preparação pelos pontos finais. Podes usar grupos como “Base:” e “Recheio:”. Se o texto estiver noutra língua ou demasiado desorganizado, o Gemini ajuda a estruturar e traduzir para PT-PT sem poder inventar números.</p>
        </details>
        {state.message ? <p role="alert" className="mt-5 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}
        {pending ? <p role="status" className="mt-5 text-center text-sm font-extrabold text-[#285240] sm:text-right">O Chef Pitéu está a organizar e, se necessário, a traduzir…</p> : null}
        <div className="mt-6 flex justify-end"><button type="submit" disabled={pending} className="min-h-14 rounded-full bg-[#F36F56] px-7 text-base font-extrabold text-white shadow-[0_6px_0_#D94F38] disabled:cursor-wait disabled:opacity-60">{pending ? "A analisar…" : "Criar preview"}</button></div>
      </form>
    </section>
  );
}
