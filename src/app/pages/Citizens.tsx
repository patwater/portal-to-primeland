import { BadgeCard } from "../components/BadgeCard";
import { Link } from "../lib/router";
import { citizens, roster } from "../lib/world";

export function Citizens() {
  const folk = roster.filter((r) => r.tier === "folk");
  return (
    <section className="paper paper--grid page-pad">
      <div className="prose prose--wide">
        <h1 className="display display--sm">Citizens of Primeland</h1>
        <p>
          Everyone under the sun has been pre-assigned a unique prime, according to Patch. Each citizen wears theirs on their body, and the badge follows the letter: A wears 2, B wears 3, and Z wears 101.
        </p>
        <p><Link to="/cards">Read the cards together</Link> · <Link to="/blocks">Pick your blocks</Link></p>
      </div>
      <div className="card-grid card-grid--page">
        {citizens.map((c) => <BadgeCard key={c.id} entry={c} />)}
      </div>
      <div className="prose prose--wide">
        <h2 className="display display--xs">Folk without badges</h2>
        <p className="soft">They turn up in the story, but Patch has never numbered them. That says something about his system.</p>
        <ul className="folk">{folk.map((f) => <li key={f.id}><strong>{f.name}</strong>: {f.look}</li>)}</ul>
      </div>
    </section>
  );
}
