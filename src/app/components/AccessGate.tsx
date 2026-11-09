import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { RoughButton } from "./Rough";

type State = "checking" | "open" | "locked";

/** Asks for the studio password before showing the book-making area. The server enforces the same rule on the calls that cost money. */
export function AccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("checking");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/access")
      .then((r) => r.json() as Promise<{ required: boolean; granted: boolean }>)
      .then((j) => live && setState(!j.required || j.granted ? "open" : "locked"))
      .catch(() => live && setState("open")); // if the check can't be reached, the server still refuses unauthorised calls
    return () => { live = false; };
  }, []);

  const enter = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/access", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }) });
      const j = (await r.json().catch(() => null)) as { error?: string } | null;
      if (r.ok) setState("open"); else setErr(j?.error ?? "That's not the password.");
    } catch { setErr("The door is out of reach for a moment. Shall we try again?"); }
    setBusy(false);
  };

  if (state === "open") return <>{children}</>;
  if (state === "checking") return <section className="paper paper--dots page-pad"><p className="margin-note" role="status">Checking the door…</p></section>;
  return (
    <section className="paper paper--dots page-pad">
      <form className="prose" onSubmit={enter}>
        <h1 className="display display--sm">The studio door</h1>
        <p>Book-making is behind a password for now. Anyone with the link can still read a finished book.</p>
        <label className="field"><span className="field__label">Studio password</span>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus aria-invalid={!!err} />
        </label>
        <RoughButton seed="door" type="submit" disabled={busy || !pw}>Come in</RoughButton>
        {err && <p className="notice" role="alert">{err}</p>}
      </form>
    </section>
  );
}
