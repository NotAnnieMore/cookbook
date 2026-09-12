import {
  CookbookMascotIllustration,
  type CookbookMascotVariant,
} from "./cookbook-mascot";

type FullScreenMascotLoadingProps = {
  variant?: CookbookMascotVariant;
  eyebrow?: string;
  title: string;
  message: string;
};

export default function FullScreenMascotLoading({
  variant = "full",
  eyebrow = "Só um instante",
  title,
  message,
}: FullScreenMascotLoadingProps) {
  return (
    <main
      className="fixed inset-0 z-[100] isolate grid cursor-wait place-items-center overflow-hidden bg-[#F8F4EC]/72 px-5 text-[#27231F] backdrop-blur-md"
      aria-busy="true"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-10 scale-[1.04] opacity-55 blur-[7px]"
      >
        <div className="absolute inset-x-5 top-6 mx-auto h-16 max-w-5xl rounded-3xl bg-[#FFFCF6]" />
        <div className="absolute inset-x-5 top-28 mx-auto h-[62vh] max-w-4xl rounded-[2rem_2rem_5rem_2rem] bg-[#E5EBDD] shadow-[0_12px_0_#DDD5C9]" />
        <div className="absolute -left-20 top-1/3 size-64 rounded-full bg-[#AFC9DA]/70" />
        <div className="absolute -right-24 bottom-8 size-72 rounded-full bg-[#F3C565]/45" />
      </div>

      <section
        role="status"
        aria-live="polite"
        className="grid w-full max-w-md place-items-center rounded-[2rem_2rem_3.5rem_2rem] border border-white/70 bg-[#FFFCF6]/88 px-7 py-7 text-center shadow-[0_18px_50px_rgba(39,35,31,.16)] sm:px-10"
      >
        <CookbookMascotIllustration
          variant={variant}
          className="size-36 sm:size-44"
          animated
          priority
        />
        <p className="mt-1 text-[.68rem] font-extrabold uppercase tracking-[.2em] text-[#E25B43]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-2xl font-black tracking-[-.025em] sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-xs text-sm leading-6 text-[#746D64]">
          {message}
        </p>
        <div className="mt-4 flex gap-1.5" aria-hidden>
          <span className="cookbook-loading-dot size-2 rounded-full bg-[#F36F56]" />
          <span className="cookbook-loading-dot size-2 rounded-full bg-[#F3C565] [animation-delay:.14s]" />
          <span className="cookbook-loading-dot size-2 rounded-full bg-[#285240] [animation-delay:.28s]" />
        </div>
      </section>
    </main>
  );
}
