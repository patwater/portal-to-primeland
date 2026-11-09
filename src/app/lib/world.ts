import rosterJson from "../../generated/roster.json";
import placesJson from "../../generated/places.json";

export type RosterEntry = {
  id: string; tier: "traveler" | "keeper" | "citizen" | "folk"; name: string; home?: string; letter?: string; badge: number | null;
  badgeNote?: string; look: string; background: string; says: string; hook: string; spriteId: string;
};
export type Place = { id: string; number: number | null; name: string; region: string; description: string; residents: string[] };

export const roster = rosterJson as RosterEntry[];
export const places = placesJson as Place[];
export const citizens = roster.filter((r) => r.tier === "citizen");
export const keepers = roster.filter((r) => r.tier === "keeper");
export const numberedPlaces = places.filter((p) => p.number != null);
export const placeName = (id: string) => places.find((p) => p.id === id)?.name ?? id;

/** Short name for map labels: drops a leading "The". */
export const shortName = (n: string) => n.replace(/^The /, "");

export { useIndex, loadIndex, type SpriteInfo, type ExtraInfo, type RosterSheetInfo } from "./sprites";
