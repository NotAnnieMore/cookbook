const tones = {
  mixed: ["bg-[#AFC9DA]/40", "bg-[#F3C565]/28", "border-[#F2A58B]/32"],
  blue: ["bg-[#AFC9DA]/48", "bg-[#F3C565]/24", "border-[#F2A58B]/30"],
  warm: ["bg-[#F2A58B]/35", "bg-[#AFC9DA]/30", "border-[#F3C565]/34"],
} as const;

export default function AppDecorations({ tone = "mixed" }: { tone?: keyof typeof tones }) {
  const [primary, secondary, outline] = tones[tone];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      <span className={`absolute -right-24 -top-28 size-72 rounded-[46%_54%_61%_39%/57%_41%_59%_43%] ${primary}`} />
      <span className={`absolute -left-24 top-[34rem] size-52 rounded-[58%_42%_48%_52%/44%_59%_41%_56%] ${secondary}`} />
      <span className={`absolute -right-20 top-[66rem] size-56 rounded-[42%_58%_63%_37%/61%_43%_57%_39%] border-[18px] ${outline}`} />
    </div>
  );
}
