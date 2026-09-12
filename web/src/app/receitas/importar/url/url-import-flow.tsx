"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import RecipeForm from "@/app/receitas/nova/recipe-form";
import { CookbookMascotIllustration } from "@/components/cookbook-mascot";
import ImportAiReview from "@/components/import-ai-review";
import ImportCaptureFeedback from "@/components/import-capture-feedback";

import { analyseRecipeUrl, type UrlImportState } from "./actions";

const initialState: UrlImportState = {};

export default function UrlImportFlow({ displayName }: { displayName: string }) {
  const [attemptKey, setAttemptKey] = useState(0);

  return (
    <UrlImportAttempt
      key={attemptKey}
      displayName={displayName}
      onStartOver={() => setAttemptKey((current) => current + 1)}
    />
  );
}

function UrlImportAttempt({ displayName, onStartOver }: { displayName: string; onStartOver: () => void }) {
  const [state, action, pending] = useActionState(analyseRecipeUrl, initialState);
  const [sourceImageCount, setSourceImageCount] = useState(0);
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
              <button type="button" onClick={onStartOver} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border-2 border-[#285240] px-4 text-sm font-extrabold text-[#285240]">Importar outro link</button>
            </div>
            <ImportCaptureFeedback feedback={state.captureFeedback} />
            {state.warnings?.length ? <div className="mt-5 rounded-2xl bg-[#FFF8E7] p-4"><p className="text-sm font-extrabold text-[#76591D]">Pontos a confirmar</p><ul className="mt-2 space-y-1 text-xs leading-5 text-[#74633E]">{state.warnings.slice(0, 8).map((warning) => <li key={warning}>• {warning}</li>)}</ul></div> : null}
            {state.message ? <p role="alert" className="mt-4 rounded-2xl bg-[#FBE5DF] px-4 py-3 text-sm font-bold text-[#8B3F27]">{state.message}</p> : null}
            <ImportAiReview review={state.aiReview} />
            <form action={action} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <input type="hidden" name="source_url" value={state.sourceUrl ?? ""} />
              {state.sourceTextOverride ? <input type="hidden" name="source_text_override" value={state.sourceTextOverride} /> : null}
              <input type="hidden" name="force_ai_review" value="1" />
              <span className="text-xs leading-5 text-[#657066] sm:mr-auto">Opcional: compara o preview com o conteúdo público que conseguimos ler.</span>
              <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240] transition hover:bg-white/55 disabled:cursor-wait disabled:opacity-55">
                {pending ? "A rever…" : state.aiReview ? "Rever novamente com IA" : "Rever com IA"}
              </button>
            </form>
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
          <p className="mt-3 leading-6">Procuramos primeiro dados Schema.org e descrições públicas. Se isso não chegar, o Gemini pode organizar o texto ou consultar diretamente uma página pública, sempre sem sessões, cookies ou a chave da app. Não consegue ver o interior de todos os vídeos; nesses casos podes enviar capturas onde a receita apareça escrita.</p>
        </details>
        {state.message ? (
          <div className="mt-5 rounded-2xl bg-[#FBE5DF] px-5 py-4 text-sm text-[#8B3F27]">
            <p role="alert" className="font-bold">{state.message}</p>
            {!state.needsSourceText ? <button type="button" onClick={onStartOver} className="mt-3 min-h-11 rounded-full border-2 border-[#8B3F27] px-4 font-extrabold transition hover:bg-white/45">Experimentar outro link</button> : null}
          </div>
        ) : null}
        {state.needsSourceText ? (
          <div className="mt-5 rounded-[1.5rem_1.5rem_3rem_1.5rem] border-2 border-[#E0C475] bg-[#FFF8E7] p-5">
            <h2 className="font-serif text-xl font-black">Texto ou capturas mostradas no {socialName}</h2>
            <p className="mt-2 text-sm leading-6 text-[#74633E]">Cola a descrição ou envia até 4 capturas onde os ingredientes e passos estejam visíveis. Podes usar as duas opções; as capturas são enviadas ao Gemini para esta análise.</p>
            {state.publicCaption ? <p className="mt-3 rounded-2xl bg-white/65 px-4 py-3 text-xs leading-5 text-[#746D64]"><strong>Legenda que conseguimos ler:</strong> {state.publicCaption}</p> : null}
            <label htmlFor="source-text-override" className="mt-4 block text-xs font-extrabold uppercase tracking-[.14em] text-[#74633E]">Texto da publicação</label>
            <textarea key={state.sourceTextOverride ?? state.publicCaption ?? "empty-caption"} id="source-text-override" name="source_text_override" required={sourceImageCount === 0} minLength={20} maxLength={30000} defaultValue={state.sourceTextOverride ?? state.publicCaption ?? ""} className="mt-2 min-h-52 w-full resize-y rounded-2xl border border-[#D8C58E] bg-[#FFFCF6] p-4 text-base leading-7 outline-none focus:border-[#285240] focus:ring-4 focus:ring-[#285240]/10" placeholder={`Honey Glazed Bacon Wrapped Garlic Chicken Bites\n\nIngredients:\n* Garlic chicken bites\n* Bacon\n* Honey\n\nInstructions:\n1. Prepare…`} />
            <div className="mt-4 rounded-2xl border border-dashed border-[#CBA94C] bg-white/55 p-4">
              <label htmlFor="source-images" className="block cursor-pointer font-extrabold text-[#285240]">Adicionar capturas do vídeo</label>
              <p className="mt-1 text-xs leading-5 text-[#74633E]">JPEG, PNG ou WebP · máximo 4 imagens, 4 MB por imagem e 8 MB no total. O Cookbook não as guarda. Evita capturas com notificações ou outros dados pessoais.</p>
              <input
                id="source-images"
                name="source_images"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => setSourceImageCount(event.currentTarget.files?.length ?? 0)}
                className="mt-3 block w-full text-sm file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-full file:border-0 file:bg-[#E5EBDD] file:px-4 file:font-extrabold file:text-[#285240]"
              />
              {sourceImageCount ? <p className="mt-2 text-xs font-bold text-[#285240]">{sourceImageCount} {sourceImageCount === 1 ? "captura escolhida" : "capturas escolhidas"}</p> : null}
            </div>
            <button type="button" onClick={onStartOver} className="mt-3 min-h-11 rounded-full px-4 text-sm font-extrabold text-[#285240] transition hover:bg-white/60">Usar outra ligação</button>
          </div>
        ) : null}
        {pending ? <p role="status" className="mt-5 text-center text-sm font-extrabold text-[#285240] sm:text-right">O Chef Pitéu está a seguir a ligação e a procurar a receita…</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/receitas/importar/texto" className="inline-flex min-h-12 items-center justify-center rounded-full px-5 text-sm font-extrabold text-[#285240] hover:bg-[#E5EBDD]">Prefiro colar o texto</Link>
          <button type="submit" disabled={pending} className="min-h-14 rounded-full bg-[#F36F56] px-7 text-base font-extrabold text-white shadow-[0_6px_0_#D94F38] disabled:cursor-wait disabled:opacity-60">{pending ? "A analisar…" : state.needsSourceText ? "Analisar conteúdo e criar preview" : "Criar preview"}</button>
        </div>
      </form>
    </section>
  );
}
