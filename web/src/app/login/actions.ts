"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.email().trim().max(254),
  password: z.string().min(1).max(128),
});

export type LoginState = {
  message?: string;
};

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const credentials = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!credentials.success) {
    return { message: "Preenche um email e uma palavra-passe válidos." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials.data);

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { message: "Esta conta ainda não tem o email confirmado." };
    }

    if (error.code === "invalid_credentials") {
      return { message: "Email ou palavra-passe incorretos." };
    }

    if (error.code === "over_request_rate_limit" || error.status === 429) {
      return { message: "Foram feitas demasiadas tentativas. Espera alguns minutos e volta a tentar." };
    }

    if (error.name === "AuthRetryableFetchError") {
      return { message: "Não foi possível contactar a Supabase. Tenta novamente dentro de instantes." };
    }

    console.error("Falha de autenticação Supabase", {
      code: error.code,
      name: error.name,
      status: error.status,
    });

    return { message: "Não foi possível iniciar sessão. Tenta novamente." };
  }

  redirect("/");
}
