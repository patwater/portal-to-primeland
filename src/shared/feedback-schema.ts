// Zod schemas for feedback. Server side only: the client imports ./feedback, which has no zod in it.
import { z } from "zod";
import type { Feedback, PageFeedback } from "./feedback";
// Compile-time check that the schema and the plain types below never drift apart.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const _pageMatches: Same<z.infer<typeof pageFeedbackSchema>, PageFeedback> = true;
export const _feedbackMatches: Same<z.infer<typeof feedbackSchema>, Feedback> = true;


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

