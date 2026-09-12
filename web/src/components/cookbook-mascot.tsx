import Image from "next/image";

export type CookbookMascotVariant = "full" | "reading" | "exploring" | "choosing" | "cooking" | "presenting";

const mascotSources: Record<CookbookMascotVariant, string> = {
  full: "/brand/cookbook-mascot-full.png",
  reading: "/brand/cookbook-mascot-reading.png",
  exploring: "/brand/cookbook-mascot-exploring.png",
  choosing: "/brand/cookbook-mascot-choosing.webp",
  cooking: "/brand/cookbook-mascot-cooking.webp",
  presenting: "/brand/cookbook-mascot-presenting.webp",
};

export function CookbookMascotMark({ className = "size-11", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M18 8h29a8 8 0 0 1 8 8v33a8 8 0 0 1-8 8H18z" fill="#D94F38" />
      <path d="M17 10h31a5 5 0 0 1 5 5v34a5 5 0 0 1-5 5H17z" fill="#FFFCF6" />
      <path d="M11 8h34a7 7 0 0 1 7 7v33a7 7 0 0 1-7 7H17a6 6 0 0 1-6-6z" fill="#F36F56" />
      <path d="M45 13h4v34a4 4 0 0 1-4 4" fill="none" stroke="#F8EBDD" strokeWidth="3" strokeLinecap="round" />
      <path d="M35 5h10v22l-5-4-5 4z" fill="#F3C565" />
      <ellipse cx="24" cy="33" rx="2.4" ry="4" fill="#285240" />
      <ellipse cx="37" cy="33" rx="2.4" ry="4" fill="#285240" />
    </svg>
  );
}

export function CookbookMascotFavouriteReaction({ className = "w-28" }: { className?: string }) {
  return (
    <div className={`cookbook-favourite-reaction pointer-events-none rounded-[1.4rem_1.4rem_2rem_1.4rem] bg-[#FFF8E7] p-2 shadow-[0_6px_0_#E8D7B1,0_12px_28px_rgba(53,43,30,.16)] ${className}`} role="status" aria-live="polite">
      <svg viewBox="0 0 112 100" className="h-auto w-full" aria-hidden>
        <path d="M39 78c-8 4-12 9-14 16M69 78c8 4 12 9 14 16" fill="none" stroke="#285240" strokeWidth="5" strokeLinecap="round" />
        <path d="M32 23h43a10 10 0 0 1 10 10v43a10 10 0 0 1-10 10H32z" fill="#D94F38" />
        <path d="M31 26h46a7 7 0 0 1 7 7v41a7 7 0 0 1-7 7H31z" fill="#FFFCF6" />
        <path d="M23 23h49a10 10 0 0 1 10 10v42a10 10 0 0 1-10 10H33a10 10 0 0 1-10-10z" fill="#F36F56" />
        <path d="M70 31h7v40a6 6 0 0 1-6 6" fill="none" stroke="#F8EBDD" strokeWidth="4" strokeLinecap="round" />
        <path d="M57 15h15v32l-7.5-6-7.5 6z" fill="#F3C565" />
        <path d="M36 54c3 4 7 4 10 0M55 54c3 4 7 4 10 0" fill="none" stroke="#285240" strokeWidth="4" strokeLinecap="round" />
        <path d="M23 49C13 45 11 36 16 31M82 49c8-4 10-10 8-15" fill="none" stroke="#285240" strokeWidth="5" strokeLinecap="round" />
        <path d="M99 20c-5-7-16-2-11 7l11 12 11-12c5-9-6-14-11-7Z" fill="#E25B43" />
      </svg>
      <p className="-mt-1 text-center text-[10px] font-extrabold uppercase tracking-[.12em] text-[#285240]">Guardada!</p>
    </div>
  );
}

export function CookbookMascotIllustration({ variant = "full", className = "size-36", animated = false, priority = false }: { variant?: CookbookMascotVariant; className?: string; animated?: boolean; priority?: boolean }) {
  return (
    <Image
      src={mascotSources[variant]}
      width={800}
      height={800}
      sizes="160px"
      alt=""
      priority={priority}
      className={`${animated ? "cookbook-mascot-loading" : ""} object-contain ${className}`}
    />
  );
}

export function CookbookMascotLoader({ label = "A preparar a mesa…", className = "size-36", variant = "full" }: { label?: string; className?: string; variant?: CookbookMascotVariant }) {
  return (
    <div className="grid place-items-center">
      <CookbookMascotIllustration variant={variant} className={className} animated priority />
      <span className="sr-only">{label}</span>
    </div>
  );
}
