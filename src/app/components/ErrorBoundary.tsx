import { Component, type ReactNode } from "react";

/** Catches anything that throws while drawing a page (including a chunk that failed to load) and speaks in the book's voice. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(e: Error) { console.error("render failed:", e.name); } // name only: the message could hold a child's name
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="paper paper--grid page-pad" role="alert">
        <div className="prose">
          <h1 className="display display--sm">Oh no no no.</h1>
          <p>The scissors got tangled. Shall we try that again?</p>
          <p><button className="linkish" onClick={() => window.location.reload()}>Reload the page</button> · <a href="/">Back to Primeland</a></p>
        </div>
      </section>
    );
  }
}
