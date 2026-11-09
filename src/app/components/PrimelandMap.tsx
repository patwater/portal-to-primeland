import { useMemo } from "react";
import { hashSeed, roughEllipse, roughLine, roughPath, type RPath } from "../lib/rough";
import { numberedPlaces, shortName } from "../lib/world";

// Hand-laid positions on an 800 x 520 sheet of square-grid paper, keyed by place id from locations.md.
const POS: Record<string, [number, number]> = {
  "the-tower-of-two": [330, 235], "protocol-plaza": [225, 305], "lamplight-road": [450, 315],
  "the-mines-of-many-primes": [300, 440], "the-data-cave": [450, 495],
  "seventh-falls": [560, 95], "qubit-quay": [670, 170], "the-platypus-flats": [725, 265],
  "the-alphabet-bazaar": [105, 215], "homebrew-hollow": [85, 345], "xerox-park": [150, 100],
  "the-sifting-sands": [545, 470], "remainder-row": [95, 430], "the-zero-knowledge-grotto": [160, 505],
  "big-o-corral": [290, 90], "the-electronic-frontier": [430, 45], terminus: [715, 440],
};

function Strokes({ paths }: { paths: RPath[] }) {
  return <>{paths.map((p, i) => <path key={i} d={p.d} stroke={p.stroke} strokeWidth={p.strokeWidth} fill={p.fill} strokeLinecap="round" />)}</>;
}

export function PrimelandMap({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const deco = useMemo(
    () => ({
      lake: roughEllipse(600, 360, 190, 90, 11, { strokeWidth: 1.5 }),
      ripple: roughPath("M 520 365 Q 550 352 580 365 T 640 365 T 690 362", 12, { strokeWidth: 1 }),
      path: roughPath("M 60 28 Q 120 60 175 38 T 270 20", 13, { strokeWidth: 1.2 }),
      rail: roughLine(640, 395, 705, 425, 14, 1),
    }),
    [],
  );
  return (
    <svg className="map" viewBox="0 0 800 560" role="group" aria-label="Map of Primeland. Choose two to four places.">
      <Strokes paths={deco.lake} />
      <Strokes paths={deco.ripple} />
      <Strokes paths={deco.rail} />
      <text className="drawing__label" x={545} y={355} fontSize={26}>Data Lake</text>
      <text className="drawing__label map__start" x={22} y={34} fontSize={20}>start: Hill, Bubble-Wrap Landing, Scissor Gate</text>
      {numberedPlaces.map((p) => {
        const pos = POS[p.id];
        if (!pos) return null;
        const on = selected.includes(p.id);
        const seed = hashSeed(p.id);
        return (
          <g
            key={p.id}
            className={`map__node ${on ? "is-on" : ""}`}
            role="checkbox"
            aria-checked={on}
            aria-label={p.name}
            tabIndex={0}
            onClick={() => onToggle(p.id)}
            onKeyDown={(e) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); onToggle(p.id); } }}
          >
            <circle cx={pos[0]} cy={pos[1]} r={34} fill="transparent" />
            {on && <circle className="highlighter" cx={pos[0]} cy={pos[1]} r={25} />}
            <Strokes paths={roughEllipse(pos[0], pos[1], 46, 40, seed, { strokeWidth: on ? 2.6 : 1.6 })} />
            <text className="map__num" x={pos[0]} y={pos[1] + 7} textAnchor="middle" fontSize={22}>{p.number}</text>
            <text className="map__label" x={pos[0]} y={pos[1] + 44} textAnchor="middle" fontSize={19}>{shortName(p.name)}</text>
          </g>
        );
      })}
    </svg>
  );
}
