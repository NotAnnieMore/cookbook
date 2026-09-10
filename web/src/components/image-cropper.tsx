"use client";

import type { PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { calculateImageCrop } from "@/lib/image-crop";

type LoadedImage = { element: HTMLImageElement; width: number; height: number };

function clamp(value: number) {
  return Math.min(100, Math.max(0, value));
}

function drawCrop(canvas: HTMLCanvasElement, image: LoadedImage, zoom: number, focusX: number, focusY: number) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const crop = calculateImageCrop({
    imageWidth: image.width,
    imageHeight: image.height,
    zoom,
    focusX,
    focusY,
  });
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image.element, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height);
}

export default function ImageCropper({ sourceUrl, fileName, onCancel, onApply }: {
  sourceUrl: string;
  fileName: string;
  onCancel: () => void;
  onApply: (file: File) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragStart = useRef<{ x: number; y: number; focusX: number; focusY: number } | null>(null);
  const [image, setImage] = useState<LoadedImage | null>(null);
  const [zoom, setZoom] = useState(1);
  const [focusX, setFocusX] = useState(50);
  const [focusY, setFocusY] = useState(50);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const element = new Image();
    element.onload = () => setImage({ element, width: element.naturalWidth, height: element.naturalHeight });
    element.onerror = () => setMessage("Não foi possível abrir esta imagem. Experimenta outro ficheiro.");
    element.src = sourceUrl;
  }, [sourceUrl]);

  useEffect(() => {
    if (image && canvasRef.current) drawCrop(canvasRef.current, image, zoom, focusX, focusY);
  }, [focusX, focusY, image, zoom]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onCancel]);

  async function applyCrop() {
    if (!image) return;
    setWorking(true);
    setMessage("");
    const output = document.createElement("canvas");
    output.width = 1800;
    output.height = 1200;
    drawCrop(output, image, zoom, focusX, focusY);
    const blob = await new Promise<Blob | null>((resolve) => output.toBlob(resolve, "image/webp", 0.9));
    if (!blob) {
      setWorking(false);
      setMessage("Não foi possível preparar o recorte. Tenta novamente.");
      return;
    }
    const baseName = fileName.replace(/\.[^.]+$/, "") || "receita";
    onApply(new File([blob], `${baseName}-recortada.webp`, { type: "image/webp" }));
  }

  function moveCrop(event: PointerEvent<HTMLCanvasElement>) {
    if (!dragStart.current) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    setFocusX(clamp(dragStart.current.focusX - ((event.clientX - dragStart.current.x) / bounds.width) * 100));
    setFocusY(clamp(dragStart.current.focusY - ((event.clientY - dragStart.current.y) / bounds.height) * 100));
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#27231F]/60 p-3 backdrop-blur-sm sm:items-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="crop-title" className="safe-bottom w-full max-w-3xl rounded-[2rem_2rem_4rem_2rem] bg-[#FFFCF6] p-5 text-[#27231F] shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#E25B43]">Fotografia da receita</p><h2 id="crop-title" className="mt-1 font-serif text-3xl font-black">Escolhe o enquadramento</h2><p className="mt-2 text-sm leading-6 text-[#766F67]">Arrasta a fotografia e aproxima até o mais importante ficar dentro do quadro.</p></div>
          <button type="button" onClick={onCancel} className="grid size-11 shrink-0 place-items-center rounded-full bg-[#F1ECE4] text-xl" aria-label="Cancelar recorte">×</button>
        </div>

        <div className="mt-5 overflow-hidden rounded-[1.5rem_1.5rem_3rem_1.5rem] bg-[#E6DED2]">
          <canvas
            ref={canvasRef}
            width="900"
            height="600"
            aria-label="Pré-visualização do recorte"
            className={`aspect-3/2 w-full touch-none ${image ? "cursor-grab active:cursor-grabbing" : "animate-pulse"}`}
            onPointerDown={(event) => {
              dragStart.current = { x: event.clientX, y: event.clientY, focusX, focusY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={moveCrop}
            onPointerUp={(event) => { dragStart.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }}
            onPointerCancel={() => { dragStart.current = null; }}
          />
        </div>

        <label className="mt-5 block text-sm font-extrabold">Aproximação <span className="font-normal text-[#766F67]">{zoom.toFixed(1)}×</span><input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 block w-full accent-[#285240]" /></label>
        {message ? <p role="alert" className="mt-4 rounded-2xl bg-[#FBE5DF] px-4 py-3 text-sm font-bold text-[#8B3F27]">{message}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCancel} className="min-h-12 rounded-full px-5 text-sm font-extrabold text-[#655E56]">Cancelar</button>
          <button type="button" onClick={() => void applyCrop()} disabled={!image || working} className="min-h-12 rounded-full bg-[#285240] px-6 text-sm font-extrabold text-white shadow-[0_4px_0_#193A2B] disabled:opacity-50">{working ? "A preparar…" : "Usar este recorte"}</button>
        </div>
      </section>
    </div>
  );
}
