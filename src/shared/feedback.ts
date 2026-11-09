// Feedback a parent records while reading with their kid (brief section 6). Shared by the Worker and the client.
import { z } from "zod";

export const pageFeedbackSchema = z.object({
  seal: z.boolean().optional(),   // Seal of Approval: "[kid] loved this page". Also locks the page.
  snip: z.boolean().optional(),   // too long
  huh: z.boolean().optional(),    // confusing
  spooky: z.boolean().optional(), // too spooky
  moreOf: z.object({ ids: z.array(z.string().max(80)).max(6), text: z.string().max(200) }).optional(),
  note: z.string().max(200).optional(), // "What did [kid] say?"
});
export const feedbackSchema = z.object({
  pages: z.record(z.string().max(24), pageFeedbackSchema).default({}),
  notes: z.string().max(400).optional(),
  kidQuote: z.string().max(300).optional(),
  nextPlace: z.string().max(80).optional(),
});
export type PageFeedback = z.infer<typeof pageFeedbackSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;

const CTRL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
export const cleanText = (s: string | undefined, max: number) => (s ?? "").replace(CTRL, "").trim().slice(0, max);

/** True when there is something besides seals to act on. */
export function hasRequests(f: Feedback): boolean {
  if (f.notes?.trim() || f.kidQuote?.trim() || f.nextPlace) return true;
  return Object.values(f.pages).some((p) => p.snip || p.huh || p.spooky || p.note?.trim() || p.moreOf?.ids.length || p.moreOf?.text.trim());
}
export const lockedPageIds = (f: Feedback): string[] => Object.entries(f.pages).filter(([, p]) => p.seal).map(([id]) => id);
