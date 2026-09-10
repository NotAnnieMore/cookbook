import AppDecorations from "./app-decorations";
import { CookbookMascotLoader, type CookbookMascotVariant } from "./cookbook-mascot";
import StickyPageHeader from "./sticky-page-header";

export default function ImportPageLoading({ variant, title, message }: { variant: CookbookMascotVariant; title: string; message: string }) {
  return (
    <main className="relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] text-[#27231F]" role="status" aria-label={message}>
      <AppDecorations tone="blue" />
      <StickyPageHeader />
      <section className="relative z-10 mx-auto grid max-w-5xl place-items-center px-5 py-16 sm:px-8 sm:py-24">
        <div className="grid w-full max-w-xl place-items-center rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] px-6 py-10 text-center shadow-[0_10px_0_#E6DED2]">
          <CookbookMascotLoader variant={variant} label={message} className="size-40 sm:size-48" />
          <p className="mt-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">{message}</p>
          <h1 className="mt-2 font-serif text-3xl font-black tracking-[-.035em]">{title}</h1>
          <div className="mt-6 h-3 w-48 animate-pulse rounded-full bg-[#DDD4C8]" />
        </div>
      </section>
    </main>
  );
}
