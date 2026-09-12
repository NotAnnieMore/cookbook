"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import ImageCropper from "@/components/image-cropper";
import { createClient } from "@/lib/supabase/client";

import { removeGalleryImage, uploadGalleryImage } from "./gallery-actions";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

function backgroundImage(url: string) {
  return `url("${url.replaceAll('"', '\\"')}")`;
}

export default function RecipeGallery({ recipeId, images }: { recipeId: string; images: GalleryImage[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const swipeStart = useRef<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [cropSource, setCropSource] = useState<{ url: string; fileName: string } | null>(null);
  const [removing, setRemoving] = useState<GalleryImage | null>(null);
  const [feedback, setFeedback] = useState("");
  const [pending, startTransition] = useTransition();

  const visibleSelected = Math.min(selected, Math.max(0, images.length - 1));
  const current = images[visibleSelected];

  useEffect(() => () => {
    if (cropSource) URL.revokeObjectURL(cropSource.url);
  }, [cropSource]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`recipe-gallery-${recipeId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recipe_images",
          filter: `recipe_id=eq.${recipeId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [recipeId, router]);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setLightboxOpen(false);
      if (event.key === "ArrowLeft") setSelected((value) => (value - 1 + images.length) % images.length);
      if (event.key === "ArrowRight") setSelected((value) => (value + 1) % images.length);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, lightboxOpen]);

  function chooseImage(file: File | undefined) {
    if (!file) return;
    setFeedback("");
    setCropSource({ url: URL.createObjectURL(file), fileName: file.name });
  }

  function closeCropper() {
    setCropSource(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function upload(file: File) {
    setCropSource(null);
    const data = new FormData();
    data.set("gallery_image", file);
    startTransition(async () => {
      const result = await uploadGalleryImage(recipeId, data);
      setFeedback(result.message);
      if (inputRef.current) inputRef.current.value = "";
      if (result.ok) {
        setSelected(images.length);
        router.refresh();
      }
    });
  }

  function removeImage() {
    if (!removing) return;
    const image = removing;
    setRemoving(null);
    startTransition(async () => {
      const result = await removeGalleryImage(recipeId, image.id);
      setFeedback(result.message);
      if (result.ok) router.refresh();
    });
  }

  function move(direction: number) {
    if (images.length < 2) return;
    setSelected((value) => (Math.min(value, images.length - 1) + direction + images.length) % images.length);
  }

  function finishSwipe(clientX: number) {
    if (swipeStart.current === null) return;
    const distance = clientX - swipeStart.current;
    swipeStart.current = null;
    if (Math.abs(distance) >= 45) move(distance < 0 ? 1 : -1);
  }

  return (
    <section className="mt-12 lg:mx-auto lg:w-[60%]" aria-labelledby="gallery-title" aria-busy={pending}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Da vossa cozinha</p>
          <h2 id="gallery-title" className="mt-1 font-serif text-3xl font-black tracking-[-.035em] sm:text-4xl">Galeria da receita</h2>
          <p className="mt-2 text-sm leading-6 text-[#746D64]">Guardem diferentes resultados, ocasiões ou apresentações.</p>
        </div>
        <label className={`inline-flex min-h-12 items-center gap-2 rounded-full border-2 border-[#285240] px-5 text-sm font-extrabold text-[#285240] transition hover:bg-[#E5EBDD] ${pending || images.length >= 12 ? "pointer-events-none opacity-45" : "cursor-pointer"}`}>
          <span aria-hidden className="text-xl leading-none">+</span>
          {pending ? "A guardar…" : "Adicionar fotografia"}
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" disabled={pending || images.length >= 12} onChange={(event) => chooseImage(event.target.files?.[0])} />
        </label>
      </div>

      {current ? (
        <div className="mt-6">
          <button
            type="button"
            className="relative block aspect-3/2 w-full touch-pan-y overflow-hidden rounded-[2rem_2rem_4.5rem_2rem] bg-[#E8E0D4] shadow-[0_10px_0_#E3DCD0]"
            onClick={() => setLightboxOpen(true)}
            onTouchStart={(event) => { swipeStart.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={(event) => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}
            aria-label={`Ampliar ${current.alt}`}
          >
            <span role="img" aria-label={current.alt} className="absolute -inset-px bg-cover bg-center" style={{ backgroundImage: backgroundImage(current.url) }} />
            <span className="absolute bottom-4 right-4 rounded-full bg-[#FFFCF6]/92 px-4 py-2 text-xs font-extrabold text-[#285240] shadow-lg backdrop-blur">Ampliar</span>
          </button>

          <div className="mt-5 flex items-center gap-3">
            {images.length > 1 ? <button type="button" onClick={() => move(-1)} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#285240] text-xl font-black text-white" aria-label="Fotografia anterior">←</button> : null}
            <div className="flex flex-1 gap-3 overflow-x-auto py-1" aria-label="Escolher fotografia">
              {images.map((image, index) => (
                <button key={image.id} type="button" onClick={() => setSelected(index)} aria-current={index === visibleSelected ? "true" : undefined} className={`relative aspect-3/2 w-24 shrink-0 overflow-hidden rounded-[1rem_1rem_1.7rem_1rem] border-[3px] bg-[#E8E0D4] transition ${index === visibleSelected ? "border-[#F36F56]" : "border-transparent opacity-70 hover:opacity-100"}`}>
                  <span role="img" aria-label={image.alt} className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: backgroundImage(image.url) }} />
                </button>
              ))}
            </div>
            {images.length > 1 ? <button type="button" onClick={() => move(1)} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#285240] text-xl font-black text-white" aria-label="Fotografia seguinte">→</button> : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-bold text-[#817970]">
            <span>{visibleSelected + 1} de {images.length} · também podes deslizar</span>
            <button type="button" onClick={() => setRemoving(current)} disabled={pending} className="min-h-10 rounded-full px-3 font-extrabold text-[#A44735] hover:bg-[#FBE5DF]">Remover fotografia</button>
          </div>
        </div>
      ) : (
        <div className="mt-6 rounded-[2rem_2rem_4rem_2rem] border-2 border-dashed border-[#CFC6B8] bg-[#FFFCF6]/70 px-6 py-10 text-center">
          <p className="font-serif text-2xl font-black">Ainda não há outras fotografias.</p>
          <p className="mt-2 text-sm leading-6 text-[#746D64]">A fotografia principal mantém-se no topo; aqui podem guardar as próximas.</p>
        </div>
      )}

      {feedback ? <p role="status" className={`mt-4 rounded-2xl px-4 py-3 text-sm font-bold ${feedback.includes("adicionada") || feedback.includes("removida") ? "bg-[#E5EBDD] text-[#285240]" : "bg-[#FBE5DF] text-[#8B3F27]"}`}>{feedback}</p> : null}

      {cropSource ? <ImageCropper sourceUrl={cropSource.url} fileName={cropSource.fileName} onCancel={closeCropper} onApply={upload} /> : null}

      {lightboxOpen && current ? createPortal(
        <div className="fixed inset-0 z-[200] grid place-items-center bg-[#191714]/94 p-3 backdrop-blur-md" role="dialog" aria-modal="true" aria-label="Fotografia ampliada" onMouseDown={() => setLightboxOpen(false)}>
          <button type="button" onClick={() => setLightboxOpen(false)} className="absolute left-4 top-4 z-10 inline-flex min-h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-extrabold text-[#27231F] shadow-xl" aria-label="Voltar atrás para a receita"><span aria-hidden>←</span>Voltar atrás</button>
          <div className="relative h-[min(78vh,900px)] w-full max-w-6xl touch-pan-y" onMouseDown={(event) => event.stopPropagation()} onTouchStart={(event) => { swipeStart.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={(event) => finishSwipe(event.changedTouches[0]?.clientX ?? 0)}>
            <div role="img" aria-label={current.alt} className="absolute inset-0 bg-contain bg-center bg-no-repeat" style={{ backgroundImage: backgroundImage(current.url) }} />
          </div>
          {images.length > 1 ? <div className="absolute inset-x-4 bottom-5 flex justify-center gap-3" onMouseDown={(event) => event.stopPropagation()}><button type="button" onClick={() => move(-1)} className="min-h-12 rounded-full bg-white px-6 font-extrabold text-[#27231F]">← Anterior</button><button type="button" onClick={() => move(1)} className="min-h-12 rounded-full bg-white px-6 font-extrabold text-[#27231F]">Seguinte →</button></div> : null}
        </div>,
        document.body,
      ) : null}

      {removing ? (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-[#27231F]/45 p-3 backdrop-blur-sm sm:items-center" role="presentation" onMouseDown={() => setRemoving(null)}>
          <section role="dialog" aria-modal="true" aria-labelledby="remove-photo-title" className="safe-bottom w-full max-w-md rounded-[2rem_2rem_4rem_2rem] bg-[#FFFCF6] p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Confirmar remoção</p>
            <h3 id="remove-photo-title" className="mt-2 font-serif text-3xl font-black">Retirar esta fotografia?</h3>
            <p className="mt-3 text-sm leading-6 text-[#746D64]">A fotografia principal não será afetada. Esta ação não pode ser anulada.</p>
            <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setRemoving(null)} className="min-h-12 rounded-full px-5 text-sm font-extrabold text-[#285240]">Cancelar</button><button type="button" onClick={removeImage} className="min-h-12 rounded-full bg-[#F36F56] px-6 text-sm font-extrabold text-white shadow-[0_5px_0_#D94F38]">Remover</button></div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
