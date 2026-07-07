import { Component } from "react";

/**
 * ErrorBoundary — kap çdo gabim renderimi në React dhe shfaq
 * një mesazh të qartë në vend të ekranit të bardhë.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg, #f7f6f3)", padding: 24 }}>
        <div style={{ maxWidth: 420, width: "100%", background: "var(--surface, #fff)", border: "1px solid var(--border, #e5e3de)", borderRadius: 16, padding: "28px 26px", textAlign: "center" }}>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-1, #1c1917)", marginBottom: 8 }}>
            Diçka shkoi keq
          </p>
          <p style={{ fontSize: 13, color: "var(--text-3, #78716c)", lineHeight: 1.6, marginBottom: 18 }}>
            Ndodhi një gabim i papritur gjatë shfaqjes së faqes. Provo ta ringarkosh —
            nëse problemi vazhdon, dil dhe kyçu sërish.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: "var(--accent, #e8602c)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Ringarko faqen
            </button>
            <button
              onClick={() => { localStorage.clear(); window.location.href = "/login"; }}
              style={{ padding: "9px 18px", borderRadius: 10, border: "1px solid var(--border, #e5e3de)", background: "transparent", color: "var(--text-2, #44403c)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              Dil dhe kyçu sërish
            </button>
          </div>
          {import.meta.env.DEV && (
            <pre style={{ marginTop: 16, textAlign: "left", fontSize: 11, color: "#b91c1c", background: "#fef2f2", borderRadius: 8, padding: 10, overflow: "auto", maxHeight: 140 }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </div>
      </div>
    );
  }
}
