import { useState, type ReactNode } from "react";
import { RoughBox, RoughButton, RoughCheck, Squiggle } from "../components/Rough";
import { Link, navigate } from "../lib/router";
import { defaultBlocks, clean, n2Options, puzzleOptions, type Blocks as B } from "../lib/blocks";
import { citizens, keepers, numberedPlaces, placeName, roster } from "../lib/world";
import { PrimelandMap } from "../components/PrimelandMap";
import { BadgeCard } from "../components/BadgeCard";
import { load, save } from "../lib/storage";

function Page({ title, hint, children, open = false, seed }: { title: string; hint?: string; children: ReactNode; open?: boolean; seed: string }) {
  return (
    <RoughBox seed={seed} className="block-page paper paper--dots">
      <details open={open}>
        <summary>
          <span className="display display--xs">{title}</span>
          {hint && <span className="margin-note">{hint}</span>}
        </summary>
        <div className="block-page__body">{children}</div>
      </details>
    </RoughBox>
  );
}

function Field({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
      {note && <span className="margin-note">{note}</span>}
    </label>
  );
}

function Choice<T extends string | number>({ value, onChange, options, name }: { value: T; onChange: (v: T) => void; options: { id: T; name: string }[]; name: string }) {
  return (
    <div className="choices" role="radiogroup" aria-label={name}>
      {options.map((o) => (
        <RoughCheck key={String(o.id)} radio seed={`${name}-${o.id}`} checked={value === o.id} onChange={() => onChange(o.id)} label={o.name} />
      ))}
    </div>
  );
}

function Multi({ values, onChange, options, name }: { values: string[]; onChange: (v: string[]) => void; options: { id: string; name: string }[]; name: string }) {
  return (
    <div className="choices" role="group" aria-label={name}>
      {options.map((o) => (
        <RoughCheck
          key={o.id}
          seed={`${name}-${o.id}`}
          checked={values.includes(o.id)}
          onChange={(on) => onChange(on ? [...values, o.id] : values.filter((v) => v !== o.id))}
          label={o.name}
        />
      ))}
    </div>
  );
}

export function Blocks() {
  const [b, setB] = useState<B>(() => {
    // Saved blocks can name characters or places that have since been renamed or removed: keep only ids that still exist.
    const saved = { ...defaultBlocks, ...load<Partial<B>>("primeland.blocks", {}) };
    const known = (ids: string[], pool: { id: string }[]) => ids.filter((id) => pool.some((x) => x.id === id));
    return { ...saved, keepers: known(saved.keepers ?? [], keepers), citizens: known(saved.citizens ?? [], citizens), places: known(saved.places ?? [], numberedPlaces) };
  });
  const [tried, setTried] = useState(false);
  const set = <K extends keyof B>(k: K, v: B[K]) =>
    setB((cur) => {
      const next = { ...cur, [k]: v };
      save("primeland.blocks", next);
      return next;
    });
  const text = (k: "name" | "nickname" | "look" | "shout" | "count" | "giggle" | "petName" | "petKind" | "petDetail" | "arrivalCustom" | "thingamajig" | "title" | "dedication" | "byline", max = 200) => ({
    value: b[k] as string,
    maxLength: max,
    onChange: (e: { target: { value: string } }) => set(k, clean(e.target.value, max) as never),
  });
  const kid = b.name.trim() || "your kid";
  const missing = !b.name.trim();
  const cap = (k: "loves", i: number, v: string) => set(k, b.loves.map((x, j) => (j === i ? clean(v) : x)) as B["loves"]);
  const [justAdded, setJustAdded] = useState<string[]>([]);
  const togglePlace = (id: string) => {
    if (b.places.includes(id)) return set("places", b.places.filter((p) => p !== id));
    const next = [...b.places, id].slice(-4);
    set("places", next);
    // Preselect the new place's citizens so the family can see who lives there.
    const residents = (numberedPlaces.find((p) => p.id === id)?.residents ?? []).filter((r) => citizens.some((c) => c.id === r) && !b.citizens.includes(r));
    if (residents.length) {
      set("citizens", [...b.citizens, ...residents]);
      setJustAdded(residents.map((r) => roster.find((x) => x.id === r)?.name ?? r));
    } else setJustAdded([]);
  };
  const toggleCitizen = (id: string, on: boolean) => set("citizens", on ? [...b.citizens, id] : b.citizens.filter((c) => c !== id));

  return (
    <section className="paper paper--dots page-pad">
      <div className="form-head">
        <h1 className="display">Pick your blocks</h1>
        <p className="subtitle">Only a name is required. Everything else has a sensible default.</p>
        <Squiggle seed="blocks" width={260} />
      </div>

      <form
        className="blocks"
        onSubmit={(e) => {
          e.preventDefault();
          setTried(true);
          if (b.name.trim()) navigate("/interview");
        }}
      >
        <Page open seed="pgA" title="A. Your kid, the hero" hint="the blank traveler card">
          <Field label="Name, as it should appear in the book">
            <input type="text" required placeholder="Your kid's name…" {...text("name")} aria-invalid={tried && missing} />
          </Field>
          <Field label="What they call themselves" note="used in dialogue, like “baby T”"><input type="text" {...text("nickname")} /></Field>
          <Field label={`Age: ${b.age}`} note="age drives page length, vocabulary, and how much math shows">
            <input type="range" min={2} max={8} value={b.age} onChange={(e) => set("age", Number(e.target.value))} />
          </Field>
          <Field label="What they look like in the book" note="hair, a signature outfit or item"><input type="text" placeholder="polka-dot jumpsuit and Crocs" {...text("look")} /></Field>
          <Field label="What they shout when excited"><input type="text" placeholder="Box!" {...text("shout")} /></Field>
          <Field label={`If a pair of scissors asked ${kid} for their number, what would they say?`} note="a color, a word, or nonsense are all welcome">
            <input type="text" placeholder="Gray!" {...text("count")} />
          </Field>
          <div className="field"><span className="field__label">Three things {kid} loves right now</span>
            {b.loves.map((v, i) => <input key={i} type="text" value={v} maxLength={200} onChange={(e) => cap("loves", i, e.target.value)} aria-label={`Thing they love ${i + 1}`} />)}
          </div>
          <Field label="What makes them giggle"><input type="text" {...text("giggle")} /></Field>
        </Page>

        <Page seed="pgB" title="B. Companion">
          <Choice name="companion" value={b.companion} onChange={(v) => set("companion", v)} options={[
            { id: "scout", name: "Scout the Watchdog (a nervous dog tangled in a smartwatch)" },
            { id: "cat", name: "A curious cat" }, { id: "robot", name: "A pocket robot" },
            { id: "real", name: "Our real pet" }, { id: "none", name: "No companion" },
          ]} />
          {b.companion === "real" && (
            <>
              <Field label="Pet's name"><input type="text" {...text("petName")} /></Field>
              <Field label="What kind of pet"><input type="text" {...text("petKind")} /></Field>
              <Field label="One detail about them"><input type="text" {...text("petDetail")} /></Field>
            </>
          )}
          {b.companion !== "none" && <p className="margin-note">Whoever comes along will pick up a gadget in the portal, the way Scout picked up his watch.</p>}
        </Page>

        <Page seed="pgC" title="C. How the portal arrives">
          <Choice name="arrival" value={b.arrival} onChange={(v) => set("arrival", v)} options={[
            { id: "hill", name: "The long and lonesome hill" }, { id: "porch", name: "Our front porch" },
            { id: "grandma", name: "Grandma's house" }, { id: "park", name: "The park" }, { id: "custom", name: "Somewhere else" },
          ]} />
          {b.arrival === "custom" && <Field label="Where does the box show up?"><input type="text" {...text("arrivalCustom")} /></Field>}
          <RoughCheck seed="brock" checked={b.brock} onChange={(v) => set("brock", v)} label="Include the Brock prologue (a bored boy tears open his new thingamajig and leaves the empty cube behind)" />
          {b.brock && <Field label="What is Brock's toy called?"><input type="text" {...text("thingamajig")} /></Field>}
        </Page>

        <Page seed="pgD" title="D. Places to visit" hint="pick two to four">
          <p className="soft">The bubble-wrap landing and the Scissor Gate are always included. Tap a place on the map.</p>
          <div className="map-wrap paper paper--grid">
            <PrimelandMap selected={b.places} onToggle={togglePlace} />
          </div>
          <div className="place-list">
            <Multi name="places" values={b.places} onChange={(v) => { const added = v.find((x) => !b.places.includes(x)); const removed = b.places.find((x) => !v.includes(x)); togglePlace((added ?? removed)!); }} options={numberedPlaces.map((p) => ({ id: p.id, name: `${p.number}. ${p.name}` }))} />
          </div>
          <p className="margin-note">{b.places.length ? `Chosen: ${b.places.map(placeName).join(", ")}.` : "Nothing chosen yet. The story will choose for you."}</p>
          {b.places.length === 1 && <p className="margin-note">One more, please, if you like (two to four).</p>}
        </Page>

        <Page seed="pgE" title="E. Who to meet">
          <p className="field__label">Keepers (one to three)</p>
          <Multi name="keepers" values={b.keepers} onChange={(v) => set("keepers", v.slice(-3))} options={keepers.map((k) => ({ id: k.id, name: `${k.name}: ${k.says}` }))} />
          <p className="field__label">Citizens ({b.citizens.length} picked)</p>
          {justAdded.length > 0 && <p className="margin-note" role="status">Added from the places you picked: {justAdded.join(", ")}.</p>}
          <div className="card-grid">
            {citizens.map((c) => <BadgeCard key={c.id} entry={c} selected={b.citizens.includes(c.id)} onToggle={(on) => toggleCitizen(c.id, on)} />)}
          </div>
          <RoughCheck seed="surprise" checked={b.surprise} onChange={(v) => set("surprise", v)} label="Surprise me with extra citizens in the background" />
          {b.surprise && <Choice name="density" value={b.density} onChange={(v) => set("density", v)} options={[{ id: "few", name: "a few" }, { id: "some", name: "some" }, { id: "lots", name: "lots" }]} />}
          <p><Link to="/cards">Read the cards together</Link>, and let your kid choose who to meet.</p>
        </Page>

        <Page seed="pgF" title="F. The puzzle at the heart of the story">
          <Choice name="puzzle" value={b.puzzle} onChange={(v) => set("puzzle", v)} options={puzzleOptions} />
          <p className="field__label">Who is the blip in N2? (optional)</p>
          <Choice name="n2" value={b.n2} onChange={(v) => set("n2", v)} options={n2Options.map((o) => ({ id: o.id, name: o.teaser ? `${o.name}. ${o.teaser}` : o.name }))} />
        </Page>

        <Page seed="pgG" title="G. Tone and shape">
          <p className="field__label">Mood</p>
          <Choice name="mood" value={b.mood} onChange={(v) => set("mood", v)} options={[{ id: "calm", name: "calm bedtime" }, { id: "giggly", name: "giggly" }, { id: "adventure", name: "big adventure" }]} />
          <p className="field__label">Rhyme</p>
          <Choice name="rhyme" value={b.rhyme} onChange={(v) => set("rhyme", v)} options={[{ id: "none", name: "none" }, { id: "sprinkles", name: "sprinkles" }, { id: "lots", name: "lots" }]} />
          <p className="field__label">Math depth</p>
          <Choice name="math" value={b.math} onChange={(v) => set("math", v)} options={[{ id: "shapes", name: "just numbers and shapes" }, { id: "primes", name: "primes" }, { id: "sieves", name: "primes plus sieves and patterns" }]} />
          <p className="field__label">Length</p>
          <Choice name="length" value={b.length} onChange={(v) => set("length", v)} options={[{ id: 6, name: "6 pages" }, { id: 10, name: "10 pages" }, { id: 14, name: "14 pages" }]} />
          <p className="field__label">Ending</p>
          <Choice name="ending" value={b.ending} onChange={(v) => set("ending", v)} options={[{ id: "dinner", name: "home in time for dinner" }, { id: "souvenir", name: "back through the box with a souvenir" }, { id: "cliffhanger", name: "a cliffhanger for the next chapter" }]} />
        </Page>

        <Page seed="pgH" title="H. The book itself">
          <Field label="Title"><input type="text" {...text("title")} /></Field>
          <Field label="Dedication"><input type="text" placeholder={`For ${kid}, my little …`} {...text("dedication")} /></Field>
          <Field label="Byline"><input type="text" placeholder={`by a grown-up & ${kid}`} {...text("byline")} /></Field>
          <p className="field__label">Paper for the text pages</p>
          <Choice name="paper" value={b.paper} onChange={(v) => set("paper", v)} options={[{ id: "lined", name: "lined notebook" }, { id: "dots", name: "dot grid" }, { id: "grid", name: "square grid" }]} />
        </Page>

        <Page seed="pgI" title="I. Notes for the Storyteller" hint="grown-ups only">
          <p className="margin-note">Please don’t include last names, addresses, or school names.</p>
          <Field label="Anything to avoid" note="fears or words"><textarea rows={2} maxLength={400} value={b.avoid} onChange={(e) => set("avoid", clean(e.target.value, 400))} /></Field>
          <Field label="Something from real life to weave in" note="a new sibling, a first day of school"><textarea rows={2} maxLength={400} value={b.realLife} onChange={(e) => set("realLife", clean(e.target.value, 400))} /></Field>
        </Page>

        <div className="form-foot">
          <RoughButton big type="submit" seed="portal" className="wobble">Open the portal →</RoughButton>
          {tried && missing && <p className="notice" role="alert">The Delivery Man needs a name for the label, please.</p>}
        </div>
      </form>
    </section>
  );
}
