// Feedback a parent records while reading with their kid (brief section 6). Plain types and helpers,
// shared by the Worker and the client (no zod here, so the client bundle stays small).
export type PageFeedback = {
  seal?: boolean;   // Seal of Approval: "[kid] loved this page". Also locks the page.
  snip?: boolean;   // too long
  huh?: boolean;    // confusing
  spooky?: boolean; // too spooky
  moreOf?: { ids: string[]; text: string };
  note?: string;    // "What did [kid] say?"
};
export type Feedback = { pages: Record<string, PageFeedback>; notes?: string; kidQuote?: string; nextPlace?: string };

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const cleanText = (s: string | undefined, max: number) => (s ?? "").replace(CTRL, "").trim().slice(0, max);

/** True when there is something besides seals to act on. */
export function hasRequests(f: Feedback): boolean {
  if (f.notes?.trim() || f.kidQuote?.trim() || f.nextPlace) return true;
  return Object.values(f.pages).some((p) => p.snip || p.huh || p.spooky || p.note?.trim() || p.moreOf?.ids.length || p.moreOf?.text.trim());
}
export const lockedPageIds = (f: Feedback): string[] => Object.entries(f.pages).filter(([, p]) => p.seal).map(([id]) => id);
