import { RoughBox, RoughButton, Squiggle } from "../components/Rough";
import { DrawingRenderer } from "../components/DrawingRenderer";
import { cube, ground, kid, cat } from "../lib/draw";
import { Link, navigate } from "../lib/router";
import { myBooks } from "../lib/api";

const cover = {
  viewBox: [800, 560] as [800, 560],
  elements: [ground(470), ...cube(520, 466, 1.5, true), ...kid(250, 466, 1.2), ...cat(120, 466, 0.75)],
};

export function Landing() {
  return (
    <section className="landing paper paper--dots">
      <div className="landing__cover">
        <p className="margin-note">notebook no. 1, “for my lil’ mailer”</p>
        <h1 className="display">
          A Portal to <span className="hl">Primeland</span>
        </h1>
        <p className="subtitle">Chapter the First, in which a box is opened.</p>
        <Squiggle seed="cover" width={320} />
        <div className="landing__art">
          <DrawingRenderer drawing={cover} seed="cover" alt="A big blue cube standing open on a hill, with a small child and a cat running toward it." />
        </div>
        <RoughBox className="landing__note" seed="note">
          <p>
            <strong>A story you build with your kid.</strong> Pick your blocks, then step inside. Tell us a little about your
            kid, answer a few questions from the Delivery Man, and a short picture book appears, set in a country made of
            numbers. Read it together, tell us what your kid thought of each page, and send it back through the portal for a
            better edition.
          </p>
          <p className="soft">Every number has its place, and every kid has their story.</p>
        </RoughBox>
        {myBooks().length > 0 && (
          <RoughBox className="landing__note" seed="mine">
            <h2 className="field__label">Your books on this device</h2>
            <ul className="folk">{myBooks().map((b) => <li key={b.id}><Link to={`/b/${b.id}${b.editToken ? `#edit=${b.editToken}` : ""}`}>{b.title}</Link> for {b.kidName}</li>)}</ul>
          </RoughBox>
        )}
        <div className="landing__cta">
          <RoughButton big seed="start" onClick={() => navigate("/blocks")}>Pick your blocks →</RoughButton>
          <RoughButton seed="sample" onClick={() => navigate("/b/sample")}>Read the sample edition</RoughButton>
        </div>
      </div>
    </section>
  );
}
