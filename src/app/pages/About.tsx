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
        <h2 className="display display--xs">What we keep, and for how long</h2>
        <p>
          A finished book is saved so you can read it again and send it back through the portal. We keep the book, its
          drawings, your page stamps and notes, and the answers you gave to write it. Books are never listed anywhere:
          anyone with the share link can read one, and only the private edit link can change or delete it. A book is
          removed 400 days after you last touched it, or the moment you choose <em>Delete this book</em> in the reader,
          which removes every edition, drawing and note. Your kid's details are sent to Anthropic's Claude to write and
          draw the book, and are never written to our logs.
        </p>
        <p className="soft">
          Please don’t put last names, addresses, or school names into the blocks. The story only needs a first name and a
          few favorite things.
        </p>
        <p>
          <Link to="/blocks">Pick your blocks</Link> · <Link to="/b/sample">Read the sample edition</Link> · <Link to="/citizens">Citizens of Primeland</Link>
        </p>
        <p className="soft">
          Words and world © Patrick Atwater, shared under CC BY-NC-SA 4.0 (see the LICENSE file in the repository).
        </p>
      </div>
    </section>
  );
}
