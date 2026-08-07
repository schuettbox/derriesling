"use client";

import { useActionState, useState } from "react";
import {
  login,
  register,
  type LoginState,
  type RegisterState,
} from "@/actions/auth";

const initLogin: LoginState = {};
const initReg: RegisterState = {};

export default function AuthPanel() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [loginState, loginAction, loginPending] = useActionState(login, initLogin);
  const [regState, regAction, regPending] = useActionState(register, initReg);

  return (
    <div className="pforte">
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "1.5rem" }}>
        <button className="tab" data-on={tab === "login"} onClick={() => setTab("login")}>
          Anmelden
        </button>
        <button className="tab" data-on={tab === "register"} onClick={() => setTab("register")}>
          Konto erstellen
        </button>
      </div>

      {tab === "login" ? (
        <form action={loginAction}>
          <label className="marke" htmlFor="email">E-Mail</label>
          <input id="email" name="email" type="email" placeholder="name@domain.ch" autoComplete="email" />
          <label className="marke" htmlFor="password">Passwort</label>
          <input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
          {loginState.error && <p className="formfehler">{loginState.error}</p>}
          <button className="knopf" style={{ width: "100%" }} disabled={loginPending}>
            {loginPending ? "Prüfe …" : "Eintreten"}
          </button>
        </form>
      ) : (
        <form action={regAction}>
          <label className="marke" htmlFor="r-code">Geheimrat-Code</label>
          <input
            id="r-code"
            name="code"
            data-mono
            placeholder="RAT-XXX-XXX"
            style={{ textTransform: "uppercase" }}
            autoComplete="off"
          />
          <label className="marke" htmlFor="r-name">Name</label>
          <input id="r-name" name="name" placeholder="Vor- und Nachname" autoComplete="name" />
          <label className="marke" htmlFor="r-email">E-Mail</label>
          <input id="r-email" name="email" type="email" placeholder="name@domain.ch" autoComplete="email" />
          <label className="marke" htmlFor="r-pw">Passwort</label>
          <input id="r-pw" name="password" type="password" placeholder="mind. 6 Zeichen" autoComplete="new-password" />
          {regState.error && <p className="formfehler">{regState.error}</p>}
          <button className="knopf" style={{ width: "100%" }} disabled={regPending}>
            {regPending ? "Lege an …" : "Konto erstellen"}
          </button>
          <p style={{ marginTop: "1rem", fontSize: ".82rem", color: "var(--kalk-matt)" }}>
            Der Code steht auf Ihrer DerRiesling-Flasche und wird einmalig für die
            Registrierung gebraucht. Danach genügen E-Mail und Passwort.
          </p>
        </form>
      )}
    </div>
  );
}
