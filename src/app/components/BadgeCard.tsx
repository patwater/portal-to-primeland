import { RoughBox, RoughCheck } from "./Rough";
import { CharacterArt } from "./CharacterArt";
import type { RosterEntry } from "../lib/world";

export function BadgeCard({ entry, selected, onToggle, level = 3 }: { entry: RosterEntry; selected?: boolean; onToggle?: (on: boolean) => void; level?: 2 | 3 }) {
  const H = `h${level}` as "h2" | "h3";
  return (
    <RoughBox seed={`card-${entry.id}`} className={`badge-card ${selected ? "is-selected" : ""}`} fill>
      <div className="badge-card__art"><CharacterArt entry={entry} /></div>
      <div className="badge-card__badge" aria-label={`Prime badge ${entry.badge}`}>{entry.badge}</div>
      <H className="badge-card__name">{entry.name}</H>
      <p className="badge-card__says">“{entry.says}”</p>
      {onToggle && <RoughCheck seed={`pick-${entry.id}`} checked={!!selected} onChange={onToggle} label="Meet them" />}
    </RoughBox>
  );
}
