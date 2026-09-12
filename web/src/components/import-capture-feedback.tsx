export type ImportCaptureFeedback = {
  source: "text" | "pasted-source" | "schema" | "page-text" | "tiktok-caption" | "instagram-caption" | "url-context" | "screenshots";
  ai: "none" | "organised" | "translated" | "organised-translated";
};

const sourceLabels: Record<ImportCaptureFeedback["source"], { label: string; description: string }> = {
  text: { label: "Texto colado", description: "A receita foi separada a partir do texto que forneceste." },
  "pasted-source": { label: "Texto fornecido", description: "Usámos o texto que colaste e mantivemos a ligação como origem." },
  schema: { label: "Dados da página", description: "O website forneceu uma estrutura própria para receitas." },
  "page-text": { label: "Texto do website", description: "A receita foi reconhecida no conteúdo público da página." },
  "tiktok-caption": { label: "Descrição do TikTok", description: "Usámos a legenda pública disponibilizada pelo TikTok." },
  "instagram-caption": { label: "Descrição do Instagram", description: "Usámos a legenda pública disponibilizada pelo Instagram." },
  "url-context": { label: "Ligação lida pelo Gemini", description: "A leitura normal falhou e o Gemini consultou diretamente a página pública." },
  screenshots: { label: "Capturas lidas pelo Gemini", description: "O texto visível nas capturas foi transcrito sem guardar as imagens no Cookbook." },
};

const aiLabels: Record<Exclude<ImportCaptureFeedback["ai"], "none">, string> = {
  organised: "Gemini organizou",
  translated: "Gemini traduziu para PT-PT",
  "organised-translated": "Gemini organizou e traduziu",
};

export default function ImportCaptureFeedback({ feedback }: { feedback?: ImportCaptureFeedback }) {
  if (!feedback) return null;
  const source = sourceLabels[feedback.source];

  return (
    <div className="mt-4 flex items-start gap-3 rounded-2xl border border-[#C8D7C7] bg-white/55 px-4 py-3 text-[#285240]" role="status">
      <span aria-hidden className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-[48%_52%_60%_40%] bg-[#DDEBDD] text-sm font-black">✓</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-extrabold">{source.label}</p>
          {feedback.ai !== "none" ? <span className="rounded-full bg-[#FFF1D2] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#76591D]">{aiLabels[feedback.ai]}</span> : <span className="rounded-full bg-[#E5EBDD] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.08em]">Leitura local</span>}
        </div>
        <p className="mt-1 text-xs leading-5 text-[#657066]">{source.description}</p>
      </div>
    </div>
  );
}
