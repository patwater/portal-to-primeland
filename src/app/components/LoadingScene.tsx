import { useEffect, useState } from "react";
import { DrawingRenderer } from "./DrawingRenderer";
import { cube, ground } from "../lib/draw";

const frame = (open: boolean) => ({ viewBox: [800, 560] as [800, 560], elements: [ground(470), ...cube(400, 466, 1.8, open)] });

/** The cube on the hill, flaps opening, with a ticker tape of progress messages. */
export function LoadingScene({ messages, label }: { messages: string[]; label: string }) {
  const [open, setOpen] = useState(true);
  const [i, setI] = useState(0);
  const calm = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (calm) return;
    const flap = setInterval(() => setOpen((o) => !o), 700);
    return () => clearInterval(flap);
  }, [calm]);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, messages.length - 1)), 5000);
    return () => clearInterval(t);
  }, [messages.length]);
  return (
    <section className="loading paper paper--dots" role="status" aria-live="polite" aria-label={label}>
      <div className="loading__art"><DrawingRenderer drawing={frame(open)} seed="loading" alt="A big blue cube on a hill, its flaps opening and closing." /></div>
      <p className="ticker" aria-hidden={false}><span key={i} className="ticker__msg">{messages[i]}</span></p>
    </section>
  );
}
