import { useEffect, useRef, useState } from "react";
import { getConfig } from "../lib/api";

declare global {
  interface Window { turnstile?: { render(el: HTMLElement, o: Record<string, unknown>): string; reset(id?: string): void; remove(id?: string): void } }
}
const SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC; s.async = true; s.onload = () => resolve(); s.onerror = () => reject(new Error("turnstile"));
    document.head.appendChild(s);
  });
}

/** Cloudflare Turnstile widget. Calls onToken with a fresh token, or null when it expires. */
export function Turnstile({ onToken, resetKey = 0 }: { onToken: (t: string | null) => void; resetKey?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<string | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [off, setOff] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const { turnstileSiteKey, turnstileEnabled } = await getConfig();
        if (!turnstileEnabled) { setOff(true); onToken("turnstile-off"); return; } // the server is not checking, so there is nothing to solve
        await loadScript();
        if (dead || !box.current || !window.turnstile) return;
        id.current = window.turnstile.render(box.current, {
          sitekey: turnstileSiteKey, theme: "light",
          callback: (t: string) => onToken(t), "expired-callback": () => onToken(null), "error-callback": () => onToken(null),
        });
      } catch { if (!dead) setFailed(true); }
    })();
    return () => { dead = true; try { if (id.current) window.turnstile?.remove(id.current); } catch { /* ignore */ } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (resetKey && id.current) { onToken(null); try { window.turnstile?.reset(id.current); } catch { /* ignore */ } } }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (off) return null;
  return (
    <div>
      <div ref={box} aria-label="Quick check that you are a grown-up" />
      {failed && <p className="notice" role="alert">The doorman's check didn't load. Please reload the page and try again.</p>}
    </div>
  );
}
