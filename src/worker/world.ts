// The generated roster and places, typed for the Worker.
import rosterJson from "../generated/roster.json";
import placesJson from "../generated/places.json";
import type { Place, RosterEntry } from "../../scripts/roster-lib";

export const roster = rosterJson as unknown as RosterEntry[];
export const places = placesJson as unknown as Place[];
