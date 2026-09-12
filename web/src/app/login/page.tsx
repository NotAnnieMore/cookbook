import type { Metadata } from "next";

import AppDecorations from "@/components/app-decorations";
import {
  CookbookMascotIllustration,
  CookbookMascotMark,
} from "@/components/cookbook-mascot";

import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar · Cookbook",
  description: "Abrir a coleção privada de receitas de Ivo e Ana.",
};

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-dvh items-center overflow-hidden bg-[#F8F4EC] px-4 py-5 text-[#27231F] sm:px-7 sm:py-8 lg:px-10">
      <AppDecorations tone="mixed" />

      <div className="relative z-10 mx-auto w-full min-w-0 max-w-[calc(100vw-2rem)] sm:max-w-6xl">
        <header className="mb-4 flex items-center justify-between gap-4 px-2 sm:mb-6">
          <div className="flex items-center gap-3 text-[#285240]">
            <CookbookMascotMark className="size-11 drop-shadow-[0_4px_0_#D7CFC3] sm:size-12" title="Chef Pitéu" />
            <span className="font-serif text-2xl font-black tracking-[-.035em] sm:text-3xl">Cookbook</span>
          </div>
          <span className="hidden rounded-full border border-[#CFC6B8] bg-[#FFFCF6]/80 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[.17em] text-[#285240] shadow-sm sm:block">
            A coleção de Ivo &amp; Ana
          </span>
        </header>

        <section className="w-full min-w-0 max-w-full overflow-hidden rounded-[2rem_2rem_4.5rem_2rem] bg-[#FFFCF6] shadow-[0_12px_0_#E3DCD0,0_28px_70px_rgba(64,49,34,.10)] lg:grid lg:grid-cols-[1.06fr_.94fr]">
          <div className="relative isolate min-h-[18rem] min-w-0 overflow-hidden bg-[#285240] px-6 pb-5 pt-6 text-white sm:min-h-[22rem] sm:px-10 sm:pt-10 lg:min-h-[40rem] lg:px-12 lg:pb-10 lg:pt-12">
            <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
              <span className="absolute -right-16 -top-20 size-60 rounded-[48%_52%_59%_41%/55%_42%_58%_45%] bg-[#AFC9DA]/22 sm:size-72" />
              <span className="absolute -bottom-32 -left-24 size-80 rounded-[57%_43%_49%_51%/43%_57%_43%_57%] bg-[#F3C565]/24" />
              <span className="absolute bottom-10 right-6 size-28 rotate-12 rounded-[45%_55%_63%_37%/58%_46%_54%_42%] border-[14px] border-[#F36F56]/30 sm:right-12 sm:size-36" />
            </div>

            <div className="relative max-w-xl">
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#F3C565] sm:text-xs">
                Bem-vindos à nossa mesa
              </p>
              <h1 className="mt-3 max-w-lg font-serif text-[2.2rem] font-black leading-[.96] tracking-[-.055em] sm:text-6xl lg:text-7xl">
                Receitas para guardar. Histórias para repetir.
              </h1>
              <p className="mt-4 max-w-[15rem] text-sm leading-6 text-white/75 sm:mt-6 sm:max-w-md sm:text-base sm:leading-7">
                O vosso pequeno livro de receitas, sempre aberto quando chega a hora de cozinhar.
              </p>
            </div>

            <div className="absolute inset-x-3 bottom-0 flex items-end justify-between sm:inset-x-8 lg:inset-x-10 lg:bottom-7 lg:min-h-64">
              <div className="mb-3 hidden max-w-48 -rotate-2 rounded-[1.25rem_1.25rem_2.25rem_1.25rem] bg-[#FFFCF6] px-5 py-4 text-[#285240] shadow-[0_6px_0_rgba(13,47,35,.35)] sm:block">
                <p className="font-serif text-xl font-bold italic leading-6">“Cozinhar é cuidar.”</p>
                <p className="mt-2 text-[9px] font-extrabold uppercase tracking-[.16em] text-[#E25B43]">Chef Pitéu</p>
              </div>
              <CookbookMascotIllustration
                variant="full"
                className="ml-auto size-32 translate-x-4 translate-y-3 drop-shadow-[0_12px_14px_rgba(15,40,30,.22)] sm:size-48 sm:translate-x-0 lg:size-72 lg:translate-y-2"
                priority
              />
            </div>
          </div>

          <div className="relative flex min-w-0 items-center px-6 py-8 sm:px-10 sm:py-11 lg:px-12 lg:py-12">
            <div aria-hidden className="absolute right-8 top-7 flex gap-1.5">
              <span className="size-2 rounded-full bg-[#F36F56]" />
              <span className="size-2 rounded-full bg-[#F3C565]" />
              <span className="size-2 rounded-full bg-[#AFC9DA]" />
            </div>

            <div className="w-full">
              <p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#E25B43] sm:text-xs">
                Só falta abrir o livro
              </p>
              <h2 className="mt-2 font-serif text-4xl font-black leading-none tracking-[-.045em] sm:text-5xl">
                Entrar no Cookbook
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-[#746D64]">
                Usa os dados da tua conta para voltares à coleção partilhada.
              </p>

              <LoginForm />

              <div className="mt-7 flex items-start gap-3 rounded-[1.25rem_1.25rem_2rem_1.25rem] bg-[#F3EEE5] px-4 py-3.5 text-[#746D64]">
                <span aria-hidden className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-[#E5EBDD] text-sm text-[#285240]">⌂</span>
                <p className="text-xs leading-5">
                  Este livro é privado. Só as contas criadas para Ivo e Ana podem entrar.
                </p>
              </div>
            </div>
          </div>
        </section>

        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[.14em] text-[#8A8279] sm:text-xs">
          Pequenas receitas, grandes histórias.
        </p>
      </div>
    </main>
  );
}
