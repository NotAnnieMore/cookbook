import { LoginForm } from "./login-form";
import { CookbookMascotMark } from "@/components/cookbook-mascot";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen bg-[#F6F1E8] lg:grid-cols-[minmax(0,1fr)_minmax(430px,.75fr)]">
      <section className="relative hidden overflow-hidden bg-[#365B3C] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-32 -left-24 size-96 rounded-full border-[42px] border-white/8" />
        <div className="absolute right-[-8rem] bottom-[-10rem] size-[34rem] rounded-full bg-[#C65D3B]/35 blur-sm" />

        <div className="relative flex items-center gap-3">
          <CookbookMascotMark className="size-12" />
          <span className="font-serif text-3xl font-bold">Cookbook</span>
        </div>

        <div className="relative max-w-xl pb-10">
          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#DDE5D6]">
            A nossa cozinha
          </p>
          <h1 className="mt-4 font-serif text-6xl font-bold leading-[1.03] tracking-[-.035em]">
            As receitas de que nos queremos lembrar.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/72">
            Uma coleção privada para guardar, cozinhar e descobrir em conjunto.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-[#365B3C] lg:hidden">
            <CookbookMascotMark className="size-11" />
            <span className="font-serif text-2xl font-bold">Cookbook</span>
          </div>

          <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#C65D3B]">
            Bem-vindos
          </p>
          <h2 className="mt-2 font-serif text-4xl font-bold tracking-[-.03em] sm:text-5xl">
            Entrar na cozinha
          </h2>
          <p className="mt-4 text-sm leading-6 text-[#746F67]">
            Acesso reservado às contas de Ivo e Ana.
          </p>

          <LoginForm />

          <p className="mt-7 text-center text-xs leading-5 text-[#8A847B]">
            Não existe registo público. As contas são geridas manualmente.
          </p>
        </div>
      </section>
    </main>
  );
}
