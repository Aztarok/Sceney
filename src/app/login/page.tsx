import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ChevronRight, ListVideo, Keyboard } from "lucide-react";
import { Brand } from "@/components/brand";
import { AuthForm } from "@/components/auth-form";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const configured = Boolean(getSupabaseConfig());
  if (!configured) redirect("/");
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/");
  }
  const { error } = await searchParams;

  return (
    <main className="auth-page">
      <section className="auth-story">
        <Brand />
        <div>
          <h1>
            Your videos.
            <br />
            <span>Your order.</span>
          </h1>
          <p>Upload and play without an account.</p>
          <div className="auth-features">
            <span>
              <ListVideo size={18} /> Play in sequence
            </span>
            <span>
              <Keyboard size={18} /> Jump with a key
            </span>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <Link href="/" className="back-link">
          <ArrowLeft size={16} /> Back to studio
        </Link>
        <AuthForm
          configured={configured}
          confirmationError={error === "confirmation"}
        />
        <Link href="/" className="guest-link">
          Continue without an account <ChevronRight size={15} />
        </Link>
        <p className="auth-footer">Your account is secured with Supabase.</p>
      </section>
    </main>
  );
}
