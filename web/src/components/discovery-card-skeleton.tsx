import { CookbookMascotIllustration } from "./cookbook-mascot";

export default function DiscoveryCardSkeleton() {
  return (
    <div className="mt-7 overflow-hidden rounded-[2rem_2rem_4.5rem_2rem] bg-[#E5EBDD] shadow-[0_12px_0_#DED5C9]" role="status" aria-label="A preparar uma sugestão">
      <div className="grid animate-pulse lg:min-h-[25rem] lg:grid-cols-[.95fr_1.05fr]">
        <div className="flex min-h-[21rem] flex-col p-7 sm:p-9 lg:p-11">
          <div className="h-3 w-36 rounded-full bg-[#BDCCB8]" />
          <div className="mt-6 h-10 w-4/5 rounded-full bg-[#C8D5C3]" />
          <div className="mt-3 h-10 w-3/5 rounded-full bg-[#C8D5C3]" />
          <div className="mt-6 h-4 w-full rounded-full bg-[#D2DDD0]" />
          <div className="mt-2 h-4 w-3/4 rounded-full bg-[#D2DDD0]" />
          <div className="mt-auto grid grid-cols-2 gap-3 pt-8">
            <div className="h-12 rounded-full bg-[#C8D5C3]" />
            <div className="h-12 rounded-full bg-[#D8CFB0]" />
          </div>
        </div>
        <div className="grid h-64 place-items-center bg-[#EEE7DD] sm:h-80 lg:h-auto">
          <CookbookMascotIllustration variant="choosing" animated priority className="size-36 sm:size-44" />
        </div>
      </div>
      <span className="sr-only">A carregar fotografia, cores e detalhes da receita.</span>
    </div>
  );
}
