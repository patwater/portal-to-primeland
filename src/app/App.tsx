import { lazy, Suspense } from "react";
import { Link, usePath } from "./lib/router";
import { Landing } from "./pages/Landing";
import { NotFound } from "./pages/NotFound";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AccessGate } from "./components/AccessGate";

const named = <T extends string>(load: () => Promise<Record<T, React.ComponentType<any>>>, key: T) => lazy(() => load().then((m) => ({ default: m[key] })));
const Blocks = named(() => import("./pages/Blocks"), "Blocks");
const About = named(() => import("./pages/About"), "About");
const Cards = named(() => import("./pages/Cards"), "Cards");
const Citizens = named(() => import("./pages/Citizens"), "Citizens");
const Studio = named(() => import("./pages/Studio"), "Studio");
const Interview = named(() => import("./pages/Interview"), "Interview");
const BookLoader = named(() => import("./pages/BookLoader"), "BookLoader");

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
        <ErrorBoundary>
        <Suspense fallback={<p className="margin-note page-pad" role="status">Turning the page…</p>}>
        {path === "/" && <Landing />}
        {path === "/blocks" && <AccessGate><Blocks /></AccessGate>}
        {path === "/about" && <About />}
        {path === "/cards" && <AccessGate><Cards /></AccessGate>}
        {path === "/citizens" && <Citizens />}
        {path === "/studio/roster" && <Studio />}
        {path === "/interview" && <AccessGate><Interview /></AccessGate>}
        {isReader && <BookLoader id={path.slice(3)} />}
        {!["/", "/blocks", "/about", "/cards", "/citizens", "/studio/roster", "/interview"].includes(path) && !isReader && <NotFound />}
        </Suspense>
        </ErrorBoundary>
      </main>
    </>
  );
}
