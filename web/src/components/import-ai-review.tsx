export type ImportAiReviewResult =
  | { verdict: "confirmed" | "review"; issues: string[] }
  | { verdict: "unavailable"; issues: [] };

export default function ImportAiReview({ review }: { review?: ImportAiReviewResult }) {
  if (!review) return null;

  if (review.verdict === "unavailable") {
    return (
      <div role="status" className="mt-4 rounded-2xl bg-[#F3EEE6] px-4 py-3 text-sm leading-6 text-[#746D64]">
        A revisão por IA não ficou disponível desta vez. O preview continua editável e nada será guardado sem a tua confirmação.
      </div>
    );
  }

  if (review.verdict === "confirmed") {
    return (
      <div role="status" className="mt-4 rounded-2xl bg-[#DDEBDD] px-4 py-3 text-sm font-bold leading-6 text-[#285240]">
        A revisão por IA não encontrou discrepâncias concretas entre a fonte e o preview. Confirma ainda assim antes de guardar.
      </div>
    );
  }

  return (
    <div role="status" className="mt-4 rounded-2xl bg-[#FFF1D2] px-4 py-3 text-sm leading-6 text-[#76591D]">
      <p className="font-extrabold">A IA encontrou pontos que merecem confirmação:</p>
      <ul className="mt-2 space-y-1">
        {review.issues.map((issue) => <li key={issue}>• {issue}</li>)}
      </ul>
    </div>
  );
}
