export type Weight = 1 | 2 | 3;
export type Hatch = { angle: number; gap: number; cross?: boolean };

export type DrawingElement =
  | { type: "sprite"; spriteId: string; x: number; y: number; scale: number; rotate?: number; flip?: boolean }
  | { type: "path"; d: string; weight?: Weight; hatch?: Hatch }
  | { type: "ellipse"; cx: number; cy: number; rx: number; ry: number; weight?: Weight; hatch?: Hatch }
  | { type: "rect"; x: number; y: number; w: number; h: number; weight?: Weight; hatch?: Hatch }
  | { type: "line"; x1: number; y1: number; x2: number; y2: number; weight?: Weight }
  | {
      type: "label";
      text: string;
      x: number;
      y: number;
      size?: "s" | "m" | "l";
      arrowTo?: { x: number; y: number };
      circled?: boolean;
      underlined?: boolean;
    }
  | { type: "strike"; text: string; x: number; y: number }
  | { type: "highlight"; x: number; y: number; w: number; h: number };

export type Drawing = { viewBox: [800, 560]; elements: DrawingElement[] };

export type CastMember = {
  id: string;
  name: string;
  tier: "traveler" | "keeper" | "citizen" | "folk";
  badge: number | null;
  look: string;
  custom: boolean;
};

export type BookPage = {
  id: string;
  n: number;
  text: string;
  place: string;
  characters: string[];
  kidPrompt?: string;
  marginNote?: string;
  locked?: boolean;
  art: { brief: string; renderer?: "rough"; drawing?: Drawing };
};

export type Book = {
  id: string;
  title: string;
  dedication: string;
  byline: string;
  kidName: string;
  n2Resolution: string;
  paper: "lined" | "dots" | "grid";
  soulVersion?: { commit: string; soul: string };
  status?: "drawing" | "ready";
  version?: number;
  kind?: "created" | "revised" | "restored";
  changelog?: string[];
  cast: CastMember[];
  castDrawings?: Record<string, Drawing>;
  pages: BookPage[];
};
