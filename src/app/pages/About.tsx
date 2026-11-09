import { Link } from "../lib/router";

export function About() {
  return (
    <section className="paper paper--grid page-pad">
      <div className="prose">
        <h1 className="display display--sm">About this book</h1>
        <p>
          <em>A Portal to Primeland</em> began as a bedtime story that Patrick Atwater wrote by hand, on lined paper, for his
          daughter Taylor. It grew into a whole country of numbers, where every citizen wears a prime badge, the scissors
          cut corners, and a spider keeps the network connected.
        </p>
        <p>
          This site lets other families step through the same box. Every edition is written fresh around your kid, and it
          gets better each time you read it together and tell us what happened.
        </p>
        <p className="soft">
          Please don’t put last names, addresses, or school names into the blocks. The story only needs a first name and a
          few favorite things.
        </p>
        <p>
          <Link to="/blocks">Pick your blocks</Link> · <Link to="/b/sample">Read the sample edition</Link>
        </p>
        <p className="soft">
          Words and world © Patrick Atwater, shared under CC BY-NC-SA 4.0 (see the LICENSE file in the repository).
        </p>
      </div>
    </section>
  );
}
