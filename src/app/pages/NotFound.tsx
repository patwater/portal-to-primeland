import { Link } from "../lib/router";

export function NotFound() {
  return (
    <section className="paper paper--grid page-pad">
      <div className="prose">
        <h1 className="display display--sm">That page wandered off.</h1>
        <p>We looked in the Lost and Found on Remainder Row, and it wasn't there either.</p>
        <p><Link to="/">Back to Primeland</Link> · <Link to="/b/sample">Read the sample edition</Link></p>
      </div>
    </section>
  );
}
