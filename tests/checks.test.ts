import { describe, expect, it } from "vitest";
import { avoidTerms, checkInterview, checkStory, wordBudget } from "../src/worker/checks";
import { blocks, interview, story } from "./fixtures";

const errs = (s = story(), b = blocks()) => checkStory(s, b).join("\n");

describe("checkStory", () => {
  it("accepts a good book", () => expect(errs()).toBe(""));
  it("enforces the page count", () => expect(errs(story(9))).toMatch(/expected exactly 10 pages/));
  it("rejects unknown characters and places", () => {
    const s = story(); s.pages[0].characters.push("nobody"); s.pages[1].place = "narnia";
    expect(errs(s)).toMatch(/unknown character "nobody"/); expect(errs(s)).toMatch(/unknown place "narnia"/);
  });
  it("checks custom citizen badges: prime, unused, after the roster's highest", () => {
    const add = (badge: number | null) => { const s = story(); s.cast.push({ id: "gus", name: "Gus", tier: "citizen", badge, look: "x", custom: true }); return errs(s); };
    expect(add(137)).toBe("");                               // the next unused prime now that Pip wears 131
    expect(add(131)).toMatch(/already taken/);             // Pip
    expect(add(133)).toMatch(/needs a prime badge|taken/);   // 133 = 7 x 19
    expect(add(127)).toMatch(/already taken/);               // Total wears 127
    expect(add(null)).toMatch(/needs a prime badge/);
    expect(add(7)).toMatch(/already taken/);
  });
  it("gives no badge to travelers", () => {
    const s = story(); s.cast[0].badge = 5;
    expect(errs(s)).toMatch(/must not have a badge/);
  });
  it("rejects denylisted names but allows Nodebug Humbug", () => {
    const s = story(); s.pages[2].text += " Then Milo drove past.";
    expect(errs(s)).toMatch(/borrowed name "milo"/);
    const ok = story(); ok.pages[2].text += " Patch, the Nodebug Humbug, waved.";
    expect(errs(ok)).toBe("");
    const bad = story(); bad.pages[2].text += " What a humbug!";
    expect(errs(bad)).toMatch(/humbug/);
  });
  it("rejects em dashes", () => { const s = story(); s.pages[0].text += " Wait — what?"; expect(errs(s)).toMatch(/em dash/); });
  it("enforces the tic budget", () => {
    const s = story(); s.pages[0].text += " quizzical"; s.pages[1].text += " quizzical";
    expect(errs(s)).toMatch(/quizzical/);
    const e = story(); for (let i = 0; i < 4; i++) e.pages[i].text += " Wow...";
    expect(errs(e)).toMatch(/ellipsis/);
  });
  it("holds the word budget for the kid's age", () => {
    const s = story(); s.pages[0].text = "Too short.";
    expect(errs(s)).toMatch(/page 1: 2 words/);
    expect(wordBudget(4)).toEqual({ min: 24, max: 88 });
    expect(wordBudget(8).max).toBeGreaterThan(wordBudget(4).max);
  });
  it("honors the avoid list", () => {
    const b = blocks({ avoid: "spiders, thunder and the dark" });
    const s = story(); s.pages[4].text += " A big spider crept in.";
    expect(errs(s, b)).toMatch(/avoid "spiders"/);
    const t = story(); t.pages[4].text += " Thunder rolled.";
    expect(errs(t, b)).toMatch(/avoid "thunder"/);
  });
  it("keeps the worked example out of other families' books", () => {
    const s = story(); s.pages[1].text += " Scout wagged."; s.pages[2].text += " Taylor waved.";
    expect(errs(s)).toMatch(/Scout leaked/); expect(errs(s)).toMatch(/Taylor leaked/);
    expect(errs(s, blocks({ companion: "scout" }))).not.toMatch(/Scout leaked/);
  });
  it("drops Brock when the prologue is off", () => {
    const s = story(); s.pages[0].text += " Brock glowered.";
    expect(errs(s, blocks({ brock: false }))).toMatch(/Brock appears/);
  });
  it("requires chosen keepers to appear", () => {
    expect(errs(story(), blocks({ keepers: ["alpha-and-beta"] }))).toMatch(/never appears/);
  });
});

describe("avoidTerms", () => {
  it("splits on commas and 'and', drops long phrases", () => {
    expect(avoidTerms("spiders, thunder and the dark")).toEqual(["spiders", "thunder", "the dark"]);
    expect(avoidTerms("a very long phrase that is not a term")).toEqual([]);
  });
});

describe("checkInterview", () => {
  it("accepts a good interview", () => expect(checkInterview(interview())).toEqual([]));
  it("needs one or two kid questions", () => {
    const iv = interview(); iv.questions.forEach((q) => (q.askKid = false));
    expect(checkInterview(iv).join()).toMatch(/askKid/);
  });
  it("refuses private questions and long ones", () => {
    const iv = interview(); iv.questions[0].text = "What is your kid's last name?";
    expect(checkInterview(iv).join()).toMatch(/private/);
  });
});
