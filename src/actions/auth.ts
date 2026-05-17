"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/auth/validations";

export type AuthState = {
  error?: string; // Global error (e.g. "Invalid credentials")
  fieldErrors?: {
    email?: string[];
    password?: string[];
    fullName?: string[];
  };
} | null;

export async function login(
  prevState: AuthState,
  formData: FormData,
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
  formData: FormData,
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        // avatar_url: `https://ui-avatars.com/api/?name=${fullName}&background=2563EB&color=fff`,
      },
      emailRedirectTo: `${appUrl}/api/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  // If email confirmation is disabled, signUp will return a session immediately.
  if (data.session) {
    revalidatePath("/", "layout");
    redirect("/onboarding");
  }

  revalidatePath("/", "layout");
  redirect(`/verify-email?email=${encodeURIComponent(email)}`);
}

export async function resendVerificationEmail(email: string) {
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${appUrl}/api/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
