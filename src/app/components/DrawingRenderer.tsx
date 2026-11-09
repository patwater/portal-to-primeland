import { useMemo } from "react";
import { hashSeed, renderDrawing, textSize } from "../lib/rough";
import type { Drawing } from "../lib/types";

export function DrawingRenderer({ drawing, seed, alt }: { drawing: Drawing; seed: string; alt: string }) {
  const items = useMemo(() => renderDrawing(drawing, hashSeed(seed)), [drawing, seed]);
  return (
    <svg className="drawing" viewBox="0 0 800 560" role="img" aria-label={alt}>
      {items.map((it, i) => {
        switch (it.kind) {
          case "highlight":
            return <rect key={i} className="highlighter" x={it.x} y={it.y} width={it.w} height={it.h} rx={6} />;
          case "sprite":
            return (
              <image
                key={i}
                href={`/sketches/${it.el.spriteId}.png`}
                x={it.el.x}
                y={it.el.y}
                width={200 * it.el.scale}
                transform={`rotate(${it.el.rotate ?? 0} ${it.el.x} ${it.el.y})${it.el.flip ? ` scale(-1 1) translate(${-2 * it.el.x} 0)` : ""}`}
              />
            );
          case "strokes":
            return (
              <g key={i}>
                {it.paths.map((p, j) => (
                  <path key={j} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" strokeLinejoin="round" />
                ))}
              </g>
            );
          case "text": {
            const el = it.el;
            const px = el.type === "label" ? textSize(el.size) : 30;
            return (
              <g key={i}>
                <text className="drawing__label" x={el.x} y={el.y} fontSize={px}>
                  {el.text}
                </text>
                {it.paths.map((p, j) => (
                  <path key={j} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />
                ))}
              </g>
            );
          }
        }
      })}
    </svg>
  );
}
