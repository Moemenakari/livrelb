"use client";

import { useActionState } from "react";
import { Loader2, LogIn } from "lucide-react";
import { login, type LoginState } from "@/lib/admin/session-actions";
import { buttonClass, Field, inputClass } from "./ui";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Phone number" htmlFor="login-phone">
        <input
          id="login-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="username"
          defaultValue={state.phone}
          placeholder="03 123 456"
          required
          maxLength={25}
          className={inputClass}
          dir="ltr"
        />
      </Field>
      <Field label="Password" htmlFor="login-password">
        <input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
          className={inputClass}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="keep" className="size-5 accent-[var(--cedar)]" />
        Keep me signed in on this phone (30 days)
      </label>
      {state.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <LogIn className="size-4" aria-hidden />}
        Log in
      </button>
    </form>
  );
}
