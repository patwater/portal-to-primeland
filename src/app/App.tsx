import { Link, usePath } from "./lib/router";
import { Landing } from "./pages/Landing";
import { Blocks } from "./pages/Blocks";
import { Reader } from "./pages/Reader";
import { About } from "./pages/About";
import { sampleBook } from "./lib/sample";

export function App() {
  const path = usePath();
  const isReader = path.startsWith("/b/");
  return (
    <>
      <a className="skip" href="#main">Skip to the story</a>
      {!isReader && (
        <header className="topbar no-print">
          <Link to="/" className="topbar__title">A Portal to Primeland</Link>
          <nav aria-label="Main">
            <Link to="/blocks">Pick your blocks</Link>
            <Link to="/b/sample">Sample edition</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
      )}
      <main id="main">
        {path === "/" && <Landing />}
        {path === "/blocks" && <Blocks />}
        {path === "/about" && <About />}
        {path.startsWith("/b/") && <Reader book={sampleBook} />}
        {!["/", "/blocks", "/about"].includes(path) && !isReader && <Landing />}
      </main>
    </>
  );
}
