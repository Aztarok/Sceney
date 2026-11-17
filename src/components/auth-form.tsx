"use client";

import { useActionState, useState } from "react";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { authenticate } from "@/app/login/actions";
import type { AuthState } from "@/lib/auth-state";

const initialState: AuthState = { kind: "idle" };

export function AuthForm({
  configured,
  confirmationError,
}: {
  configured: boolean;
  confirmationError: boolean;
}) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  return (
    <div className="auth-form-wrap">
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "active" : ""}
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "signup" ? "active" : ""}
          onClick={() => setMode("signup")}
        >
          Create account
        </button>
      </div>
      <h2>{mode === "login" ? "Welcome back" : "Create an account"}</h2>
      <p className="muted">
        Sign-in is optional. Your videos stay in this browser.
      </p>
      {!configured && (
        <p className="notice">
          Accounts aren't enabled yet. You can use the studio as a guest.
        </p>
      )}
      {confirmationError && (
        <p className="form-error" role="alert">
          This confirmation link has expired or was opened in a different
          browser. Try signing in if your email is already confirmed.
        </p>
      )}
      <CredentialsForm key={mode} mode={mode} configured={configured} />
    </div>
  );
}

function CredentialsForm({
  mode,
  configured,
}: {
  mode: "login" | "signup";
  configured: boolean;
}) {
  const [state, action, pending] = useActionState(authenticate, initialState);
  return (
    <form action={action} className="auth-form">
      <input type="hidden" name="mode" value={mode} />
      <label htmlFor="email">Email address</label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        required
        disabled={!configured || pending}
      />
      <label htmlFor="password">Password</label>
      <input
        id="password"
        name="password"
        type="password"
        placeholder={
          mode === "signup" ? "At least 8 characters" : "Enter your password"
        }
        autoComplete={mode === "signup" ? "new-password" : "current-password"}
        minLength={mode === "signup" ? 8 : 1}
        maxLength={128}
        required
        disabled={!configured || pending}
      />
      {state.kind !== "idle" && (
        <p
          className={state.kind === "error" ? "form-error" : "form-success"}
          role={state.kind === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}
      <button className="button primary" disabled={!configured || pending}>
        {pending ? (
          <LoaderCircle size={17} className="spin" />
        ) : (
          <ArrowRight size={17} />
        )}
        {pending
          ? "Please wait..."
          : mode === "login"
            ? "Sign in"
            : "Create account"}
      </button>
    </form>
  );
}
