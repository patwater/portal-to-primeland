import { RoughBox, RoughCheck } from "./Rough";
import { CharacterArt } from "./CharacterArt";
import type { RosterEntry } from "../lib/world";

export function BadgeCard({ entry, selected, onToggle }: { entry: RosterEntry; selected?: boolean; onToggle?: (on: boolean) => void }) {
  return (
    <RoughBox seed={`card-${entry.id}`} className={`badge-card ${selected ? "is-selected" : ""}`} fill>
      <div className="badge-card__art"><CharacterArt entry={entry} /></div>
      <div className="badge-card__badge" aria-label={`Prime badge ${entry.badge}`}>{entry.badge}</div>
      <h3 className="badge-card__name">{entry.name}</h3>
      <p className="badge-card__says">“{entry.says}”</p>
      {onToggle && <RoughCheck seed={`pick-${entry.id}`} checked={!!selected} onChange={onToggle} label="Meet them" />}
    </RoughBox>
  );
}
