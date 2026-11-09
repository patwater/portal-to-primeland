import { useMemo, type ReactNode } from "react";
import { hashSeed, roughEllipse, roughRect, type RPath } from "../lib/rough";

/** A hand-drawn rubber stamp that toggles. Borrowed from the Robo-Seals: pressed stamps get the highlighter. */
export function Stamp({ on, onClick, children, seed, round = false }: { on: boolean; onClick: () => void; children: ReactNode; seed: string; round?: boolean }) {
  const paths: RPath[] = useMemo(
    () => (round ? roughEllipse(70, 24, 132, 40, hashSeed(seed), { strokeWidth: 2 }) : roughRect(3, 3, 134, 42, hashSeed(seed), { strokeWidth: 2 })),
    [seed, round],
  );
  return (
    <button type="button" className={`stamp ${on ? "is-on" : ""}`} aria-pressed={on} onClick={onClick}>
      <svg className="stamp__svg" viewBox="0 0 140 48" aria-hidden="true" preserveAspectRatio="none">
        {on && <rect className="highlighter" x="6" y="6" width="128" height="36" rx="8" />}
        {paths.map((p, i) => <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" />)}
      </svg>
      <span className="stamp__label">{children}</span>
    </button>
  );
}
