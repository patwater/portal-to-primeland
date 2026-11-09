import { useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { hashSeed, roughEllipse, roughLine, roughPath, roughRect, type RPath } from "../lib/rough";

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, set] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => set({ w: Math.round(el.offsetWidth), h: Math.round(el.offsetHeight) });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

function Strokes({ paths }: { paths: RPath[] }) {
  return (
    <>
      {paths.map((p, i) => (
        <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </>
  );
}

export function RoughBox({
  children,
  seed = "box",
  className = "",
  fill = false,
  as: Tag = "div",
}: {
  children: ReactNode;
  seed?: string;
  className?: string;
  fill?: boolean;
  as?: "div" | "section" | "li";
}) {
  const [ref, { w, h }] = useSize<HTMLDivElement>();
  const paths = useMemo(
    () => (w > 8 && h > 8 ? roughRect(3, 3, w - 6, h - 6, hashSeed(seed), { roughness: 1.4, strokeWidth: 1.6 }) : []),
    [w, h, seed],
  );
  return (
    <Tag className={`rough-box ${fill ? "rough-box--fill" : ""} ${className}`} ref={ref as never}>
      <svg className="rough-box__svg" width={w} height={h} aria-hidden="true">
        <Strokes paths={paths} />
      </svg>
      <div className="rough-box__inner">{children}</div>
    </Tag>
  );
}

export function RoughButton({
  children,
  seed = "btn",
  big = false,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { seed?: string; big?: boolean }) {
  const [ref, { w, h }] = useSize<HTMLButtonElement>();
  const paths = useMemo(
    () =>
      w > 8 && h > 8
        ? [
            ...roughRect(3, 3, w - 6, h - 6, hashSeed(seed), { roughness: 1.6, strokeWidth: big ? 2.6 : 2 }),
            ...roughRect(5, 5, w - 10, h - 10, hashSeed(seed) + 9, { roughness: 1.8, strokeWidth: 1 }),
          ]
        : [],
    [w, h, seed, big],
  );
  return (
    <button ref={ref} className={`rough-btn ${big ? "rough-btn--big" : ""} ${className}`} {...rest}>
      <svg className="rough-box__svg" width={w} height={h} aria-hidden="true">
        <Strokes paths={paths} />
      </svg>
      <span className="rough-btn__label">{children}</span>
    </button>
  );
}

export function RoughCheck({
  checked,
  onChange,
  label,
  seed = "chk",
  radio = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  seed?: string;
  radio?: boolean;
}) {
  const s = hashSeed(seed);
  const box = useMemo(
    () => (radio ? roughEllipse(14, 14, 22, 22, s, { strokeWidth: 1.6 }) : roughRect(3, 3, 22, 22, s, { strokeWidth: 1.6 })),
    [s, radio],
  );
  const tick = useMemo(
    () => [...roughPath("M 6 15 L 12 22 L 26 3", s + 1, { strokeWidth: 2.6 }), ...roughLine(8, 17, 24, 6, s + 2, 2)],
    [s],
  );
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      className={`rough-check ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
    >
      <svg width="30" height="28" viewBox="0 0 30 28" aria-hidden="true">
        <Strokes paths={box} />
        {checked && <Strokes paths={tick} />}
      </svg>
      <span>{label}</span>
    </button>
  );
}

export function Squiggle({ seed = "sq", width = 240 }: { seed?: string; width?: number }) {
  const paths = useMemo(() => roughPath(`M 2 6 Q ${width * 0.25} 0 ${width * 0.5} 6 T ${width - 2} 6`, hashSeed(seed), { strokeWidth: 1.4 }), [seed, width]);
  return (
    <svg className="squiggle" width={width} height="12" viewBox={`0 0 ${width} 12`} aria-hidden="true">
      <Strokes paths={paths} />
    </svg>
  );
}
