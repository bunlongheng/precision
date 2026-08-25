"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Ambient from "./Ambient";

const FEATURES = [
  "Black & white + one-tap filters",
  "Color-splash brush",
  "Text, collage & image layers",
  "Resume projects, share to iMessage",
];

export default function SignIn({
  google = false,
  passcode = false,
}: {
  google?: boolean;
  passcode?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const submitPasscode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(false);
    const res = await signIn("credentials", { code, redirect: false });
    if (res?.error) {
      setError(true);
      setBusy(false);
    } else {
      router.refresh();
    }
  };

  return (
    <main className="relative grid min-h-[100dvh] place-items-center p-6">
      <Ambient />
      <div className="rise relative z-10 w-full max-w-md rounded-3xl border border-[var(--hairline)] bg-[var(--panel)] p-8 text-center sm:p-10" style={{ boxShadow: "var(--shadow)" }}>
        <span
          className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl"
          style={{ background: "var(--accent)", color: "var(--accent-ink)", boxShadow: "0 0 32px var(--accent-glow)" }}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="2" />
            <circle cx="12" cy="12" r="2.4" fill="currentColor" />
            <path d="M12 1.5v3M12 19.5v3M1.5 12h3M19.5 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <h1 className="display text-[30px] font-extrabold tracking-tight text-[var(--ink)]">Precision</h1>
        <p className="mono mt-1.5 text-[11px] uppercase tracking-[0.24em] text-[var(--ink-faint)]">
          fast, lightweight photo editor
        </p>

        <ul className="my-8 space-y-2 text-left">
          {FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2.5 text-[13.5px] text-[var(--ink-dim)]">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
              {f}
            </li>
          ))}
        </ul>

        {passcode && (
          <form onSubmit={submitPasscode} className="space-y-3">
            <input
              type="password"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(false);
              }}
              placeholder="Enter passcode"
              autoFocus
              aria-label="Passcode"
              className="w-full rounded-xl border bg-[var(--bg)] px-4 py-3 text-center text-[16px] text-[var(--ink)] outline-none transition-colors"
              style={{ borderColor: error ? "var(--danger)" : "var(--hairline-strong)" }}
            />
            {error && <p className="text-[12px] text-[var(--danger)]">Wrong passcode - try again.</p>}
            <button
              type="submit"
              disabled={busy || !code}
              className="w-full rounded-xl px-4 py-3 text-[15px] font-semibold transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
              style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
            >
              {busy ? "Unlocking..." : "Unlock"}
            </button>
          </form>
        )}

        {google && passcode && (
          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-[var(--hairline)]" />
            <span className="text-[11px] text-[var(--ink-faint)]">or</span>
            <span className="h-px flex-1 bg-[var(--hairline)]" />
          </div>
        )}

        {google && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              signIn("google");
            }}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-[15px] font-semibold text-[#1f1f1f] transition-transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
            </svg>
            Sign in with Google
          </button>
        )}

        <p className="mt-5 text-[11px] text-[var(--ink-faint)]">Private workspace - owner access only.</p>
      </div>
    </main>
  );
}
