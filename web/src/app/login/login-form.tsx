"use client";

import { useActionState } from "react";

import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div>
        <label htmlFor="email" className="text-sm font-bold text-[#3F3A34]">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          className="mt-2 min-h-13 w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 text-base outline-none transition focus:border-[#365B3C] focus:ring-3 focus:ring-[#DDE5D6]"
          placeholder="O teu email"
        />
      </div>

      <div>
        <label htmlFor="password" className="text-sm font-bold text-[#3F3A34]">
          Palavra-passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 min-h-13 w-full rounded-2xl border border-[#D8D0C5] bg-white px-4 text-base outline-none transition focus:border-[#365B3C] focus:ring-3 focus:ring-[#DDE5D6]"
          placeholder="A tua palavra-passe"
        />
      </div>

      {state.message ? (
        <p role="alert" className="rounded-2xl bg-[#FBE9E3] px-4 py-3 text-sm font-semibold text-[#8B3F27]">
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-13 w-full items-center justify-center rounded-2xl bg-[#365B3C] px-5 text-sm font-extrabold text-white shadow-[0_12px_28px_rgba(54,91,60,.22)] transition hover:bg-[#2C4E32] disabled:cursor-wait disabled:opacity-65"
      >
        {pending ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
