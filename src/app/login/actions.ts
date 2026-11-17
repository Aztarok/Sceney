"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import type { AuthState } from "@/lib/auth-state";

export async function authenticate(
  _previous: AuthState,
  formData: FormData,
): Promise<AuthState> {
  if (!getSupabaseConfig())
    return {
      kind: "error",
      message: "Sign-in is unavailable in this release.",
    };

  const email = formData.get("email");
  const password = formData.get("password");
  const mode = formData.get("mode");
  if (
    typeof email !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 128 ||
    (mode !== "login" && mode !== "signup")
  )
    return { kind: "error", message: "Enter a valid email and password." };

  if (mode === "signup" && password.length < 8) {
    return {
      kind: "error",
      message: "Use at least 8 characters for your password.",
    };
  }

  const supabase = await createClient();
  if (mode === "signup") {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: new URL("/auth/callback", siteUrl).toString(),
      },
    });
    if (error) return { kind: "error", message: error.message };
    if (!data.session)
      return {
        kind: "success",
        message: "Check your email to confirm your account, then sign in.",
      };
  } else {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error)
      return {
        kind: "error",
        message:
          "Sign-in failed. Check your email and password, and confirm your email first.",
      };
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  if (!getSupabaseConfig()) redirect("/");
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Could not sign out. Please try again.");
  revalidatePath("/", "layout");
  redirect("/");
}
