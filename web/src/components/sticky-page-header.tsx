import Link from "next/link";
import type { ReactNode } from "react";

export default function StickyPageHeader({
  href = "/",
  label = "Voltar à coleção",
  children,
  maxWidth = "max-w-5xl",
}: {
  href?: string;
  label?: string;
  children?: ReactNode;
  maxWidth?: "max-w-5xl" | "max-w-6xl";
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#DDD5C9]/75 bg-[#F8F4EC]/92 backdrop-blur-md">
      <div className={`mx-auto flex min-h-16 ${maxWidth} items-center justify-between gap-3 px-5 sm:px-8`}>
        <Link href={href} className="inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full px-3 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD]">
          <svg aria-hidden viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
          <span className="truncate">{label}</span>
        </Link>
        {children ? <div className="shrink-0">{children}</div> : null}
      </div>
    </header>
  );
}
