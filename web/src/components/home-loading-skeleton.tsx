import AppDecorations from "./app-decorations";

function ChefMark() {
  return (
    <span className="grid size-11 place-items-center rounded-[45%_55%_62%_38%/42%_44%_56%_58%] bg-[#F36F56] text-white shadow-[0_5px_0_#D94F38]">
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M6 11a4 4 0 0 1 1-7.8A5 5 0 0 1 16.8 4 4 0 0 1 18 11" />
        <path d="M6 11v9h12v-9M9 16h6" />
      </svg>
    </span>
  );
}

export default function HomeLoadingSkeleton() {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-[#F8F4EC] text-[#27231F]" role="status" aria-label="A carregar o Cookbook">
      <AppDecorations tone="mixed" />
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-24 border-r border-[#DDD5C9] bg-[#FFFCF6] px-3 py-6 md:block lg:w-64 lg:px-6">
        <div className="flex items-center gap-3 px-2"><ChefMark /><span className="hidden font-serif text-[1.7rem] font-black text-[#285240] lg:inline">Cookbook</span></div>
        <div className="mt-10 space-y-4 px-2">
          {["w-3/4", "w-2/3", "w-4/5", "w-1/2"].map((width) => <div key={width} className={`h-10 ${width} animate-pulse rounded-full bg-[#E8E1D7]`} />)}
        </div>
      </aside>

      <main className="relative z-10 pb-28 md:ml-24 md:pb-10 lg:ml-64">
        <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 lg:px-10 lg:py-9">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-3 w-28 animate-pulse rounded-full bg-[#E7B6A9]" />
              <div className="mt-3 h-11 w-52 animate-pulse rounded-full bg-[#D9D0C4] sm:w-72" />
            </div>
            <div className="md:hidden"><ChefMark /></div>
          </div>
          <div className="mt-8 h-14 animate-pulse border-b-2 border-[#CFC6B8] bg-[#F1ECE4]" />
          <div className="mt-4 flex gap-2">
            {["w-16", "w-24", "w-24", "w-20"].map((width, index) => <div key={`${width}-${index}`} className={`h-10 ${width} animate-pulse rounded-full bg-[#E5DED4]`} />)}
          </div>

          <section className="mt-9 overflow-hidden rounded-[2.2rem_2.2rem_4.8rem_2.2rem] bg-[#E8E0D4] shadow-[0_16px_0_#E4DDD1]">
            <div className="grid grid-rows-[22rem_15rem] animate-pulse sm:grid-rows-[24rem_20rem] lg:h-[25rem] lg:grid-cols-[1fr_1.05fr] lg:grid-rows-none">
              <div className="flex min-h-0 flex-col justify-between overflow-hidden p-7 sm:p-9 lg:p-11">
                <div>
                  <div className="flex items-center gap-3"><ChefMark /><span className="text-xs font-extrabold uppercase tracking-[.18em] text-[#746D64]">A preparar a mesa…</span></div>
                  <div className="mt-6 h-10 w-4/5 rounded-full bg-[#CEC3B5]" />
                  <div className="mt-3 h-10 w-3/5 rounded-full bg-[#CEC3B5]" />
                  <div className="mt-6 h-4 w-full max-w-md rounded-full bg-[#D8CFC3]" />
                  <div className="mt-2 h-4 w-4/5 max-w-sm rounded-full bg-[#D8CFC3]" />
                </div>
                <div className="mt-9 grid grid-cols-2 gap-3"><div className="h-11 rounded-full bg-[#D4CABC]" /><div className="h-11 rounded-full bg-[#D4CABC]" /></div>
              </div>
              <div className="h-full bg-[#D7CDC0]" />
            </div>
          </section>

          <div className="mt-14 h-9 w-56 animate-pulse rounded-full bg-[#D9D0C4]" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="overflow-hidden bg-[#FFFCF6]"><div className="h-52 animate-pulse bg-[#E4DCD0]" /><div className="p-4"><div className="h-6 w-3/4 animate-pulse rounded-full bg-[#DDD4C8]" /><div className="mt-4 h-4 w-1/2 animate-pulse rounded-full bg-[#E8E1D7]" /></div></div>)}
          </div>
        </div>
      </main>
      <span className="sr-only">A carregar receitas.</span>
    </div>
  );
}
