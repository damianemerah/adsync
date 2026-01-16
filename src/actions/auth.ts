"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/auth/validations";

export type AuthState =
  | {
      error?: string; // Global error (e.g. "Invalid credentials")
      fieldErrors?: {
        email?: string[];
        password?: string[];
        fullName?: string[];
      };
    }
  | undefined;

export async function login(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  // 1. Convert FormData to Object
  const rawData = Object.fromEntries(formData.entries());

  // 2. Zod Validation
  const validatedFields = loginSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validatedFields.data;
  const supabase = await createClient();
  const redirectTo = (formData.get("redirectTo") as string) || "/dashboard";

  // 3. Supabase Auth
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo);
}

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  // 1. Convert FormData to Object
  const rawData = Object.fromEntries(formData.entries());

  // 2. Zod Validation
  const validatedFields = signupSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { email, password, fullName } = validatedFields.data;
  const supabase = await createClient();

  // 3. Supabase Auth
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // avatar_url: `https://ui-avatars.com/api/?name=${fullName}&background=2563EB&color=fff`,
      },
      emailRedirectTo: "http://localhost:3000/onboarding",
    },
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
}
