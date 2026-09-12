"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};
const inputClass = "mt-2 min-h-13 w-full rounded-[1.15rem_1.15rem_1.8rem_1.15rem] border-2 border-[#D8D0C4] bg-[#F8F4EC] px-4 text-base font-semibold text-[#27231F] outline-none transition placeholder:font-normal placeholder:text-[#999187] focus:border-[#285240] focus:bg-[#FFFCF6] focus:ring-4 focus:ring-[#285240]/10";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-7 space-y-5">
      <div>
        <label htmlFor="email" className="text-xs font-extrabold uppercase tracking-[.13em] text-[#4F4942]">
          Email da conta
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder="nome@cookbook.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-xs font-extrabold uppercase tracking-[.13em] text-[#4F4942]">
          Palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputClass}
          placeholder="A tua palavra-passe"
        />
      </div>

      {state.message ? (
        <p role="alert" className="rounded-[1.15rem_1.15rem_2rem_1.15rem] border-l-4 border-[#F36F56] bg-[#FBE5DF] px-4 py-3 text-sm font-bold leading-5 text-[#8B3F27]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="group flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-[#285240] px-6 text-sm font-extrabold text-white shadow-[0_6px_0_#193A2B] transition hover:-translate-y-0.5 hover:bg-[#315F4B] hover:shadow-[0_8px_0_#193A2B] active:translate-y-1 active:shadow-[0_2px_0_#193A2B] disabled:cursor-wait disabled:translate-y-0 disabled:opacity-65"
      >
        <span>{pending ? "O Chef Pitéu está a abrir…" : "Abrir o nosso livro"}</span>
        <span aria-hidden className="text-lg transition-transform group-hover:translate-x-1">→</span>
      </button>
    </form>
  );
}
