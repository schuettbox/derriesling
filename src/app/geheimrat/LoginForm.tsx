"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/actions/auth";

const initial: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initial);

  return (
    <form action={formAction}>
      <label className="marke" htmlFor="email">
        E-Mail
      </label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="name@domain.ch"
        autoComplete="email"
      />
      <label className="marke" htmlFor="password">
        Passwort
      </label>
      <input
        id="password"
        name="password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
      />
      {state.error && <p className="formfehler">{state.error}</p>}
      <button className="knopf" style={{ width: "100%" }} disabled={pending}>
        {pending ? "Prüfe …" : "Eintreten"}
      </button>
    </form>
  );
}
