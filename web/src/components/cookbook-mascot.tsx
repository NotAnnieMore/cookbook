import Image from "next/image";

export type CookbookMascotVariant = "full" | "reading" | "exploring";

const mascotSources: Record<CookbookMascotVariant, string> = {
  full: "/brand/cookbook-mascot-full.png",
  reading: "/brand/cookbook-mascot-reading.png",
  exploring: "/brand/cookbook-mascot-exploring.png",
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
