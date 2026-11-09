import { Link, usePath } from "./lib/router";
import { Landing } from "./pages/Landing";
import { Blocks } from "./pages/Blocks";
import { Reader } from "./pages/Reader";
import { About } from "./pages/About";
import { Cards } from "./pages/Cards";
import { Citizens } from "./pages/Citizens";
import { Studio } from "./pages/Studio";
import { Interview } from "./pages/Interview";
import { BookLoader } from "./pages/BookLoader";

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
            <Link to="/citizens">Citizens</Link>
            <Link to="/about">About</Link>
          </nav>
        </header>
      )}
      <main id="main">
        {path === "/" && <Landing />}
        {path === "/blocks" && <Blocks />}
        {path === "/about" && <About />}
        {path === "/cards" && <Cards />}
        {path === "/citizens" && <Citizens />}
        {path === "/studio/roster" && <Studio />}
        {path === "/interview" && <Interview />}
        {isReader && <BookLoader id={path.slice(3)} />}
        {!["/", "/blocks", "/about", "/cards", "/citizens", "/studio/roster", "/interview"].includes(path) && !isReader && <Landing />}
      </main>
    </>
  );
}
