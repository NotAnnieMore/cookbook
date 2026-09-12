import AppDecorations from "@/components/app-decorations";
import { CookbookMascotIllustration } from "@/components/cookbook-mascot";
import DiscoveryCardSkeleton from "@/components/discovery-card-skeleton";
import StickyPageHeader from "@/components/sticky-page-header";

export default function ExploreLoading() {
  return (
    <main className="pointer-events-none relative isolate min-h-screen overflow-x-clip bg-[#F8F4EC] pb-20 text-[#27231F]" aria-busy="true">
      <AppDecorations tone="warm" />
      <StickyPageHeader label="Voltar ao início" maxWidth="max-w-6xl" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
        <section className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-[2rem_2rem_4rem_2rem] bg-[#FFFCF6]/92 px-6 py-6 shadow-[0_10px_0_#E3DACF] sm:gap-5 sm:px-9 sm:py-8">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.2em] text-[#E25B43]">Descoberta</p>
            <h1 className="mt-2 font-serif text-3xl font-black tracking-[-.045em] sm:text-5xl">A preparar uma escolha…</h1>
          </div>
          <CookbookMascotIllustration variant="choosing" animated priority className="size-24 sm:size-36" />
        </section>
        <section className="mt-8 animate-pulse">
          <div className="h-7 w-64 rounded-full bg-[#DED6CA]" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:flex">
            {[0, 1, 2, 3].map((item) => <div key={item} className="h-14 rounded-[1.2rem] bg-[#E5EBDD] sm:h-11 sm:w-32 sm:rounded-full" />)}
          </div>
          <div className="mt-4 h-16 rounded-[1.4rem] bg-[#EEE7DD] sm:hidden" />
        </section>
        <DiscoveryCardSkeleton />
      </div>
    </main>
  );
}
