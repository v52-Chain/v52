import { useEffect, useRef, useState } from "react";
import { vector52Client, Vector52ApiError } from "./api/vector52Client";
import { AuditForm } from "./components/AuditForm";
import { EvidenceInspector } from "./components/EvidenceInspector";
import { RunProgress } from "./components/RunProgress";
import { VerdictPanel } from "./components/VerdictPanel";
import type { AuditResult, ClaimAuditRequest, RequestPhase } from "./domain/apiTypes";

type HealthState = "checking" | "online" | "degraded" | "offline";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const errorMessage = (error: unknown) => {
  if (error instanceof Vector52ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "The audit failed for an unknown reason.";
};

export default function App() {
  const [phase, setPhase] = useState<RequestPhase>("IDLE");
  const [health, setHealth] = useState<HealthState>("checking");
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    vector52Client
      .health(controller.signal)
      .then((response) => setHealth(response.status === "ok" ? "online" : "degraded"))
      .catch(() => setHealth("offline"));

    return () => controller.abort();
  }, []);

  useEffect(() => () => activeRequest.current?.abort(), []);

  useEffect(() => {
    setIsInstalled(window.matchMedia("(display-mode: standalone)").matches);

    const handleInstallable = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstallPrompt(null);
      setInstallHint(false);
      setIsInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", handleInstallable);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallable);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const requestInstall = async () => {
    if (!installPrompt) {
      setInstallHint(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstallPrompt(null);
    }
  };

  const runAudit = async (request: ClaimAuditRequest) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPhase("RUNNING");
    setResult(null);
    setError(null);

    try {
      const nextResult = await vector52Client.auditClaim(request, controller.signal);
      setResult(nextResult);
      setPhase("SUCCESS");
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") return;
      setError(errorMessage(nextError));
      setPhase("ERROR");
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Vector52 home">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span>
            <strong>VECTOR52</strong>
            <small>PROOF LAB</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Primary navigation">
          <a href="#audit">Audit</a>
          <a href="#method">How it works</a>
          <a href="#ecosystem">Ecosystem</a>
        </nav>

        <div className="topbar-actions">
          <span className={`api-chip api-${health}`} aria-label={`API ${health}`} title={`API ${health}`}>
            <span className="health-dot" aria-hidden="true" />
            <span className="api-label">API {health}</span>
          </span>
          <button className="install-action" type="button" onClick={() => void requestInstall()} disabled={isInstalled}>
            <span className="install-icon" aria-hidden="true">↓</span>
            {isInstalled ? "Installed" : "Install app"}
          </button>
        </div>
      </header>

      {installHint ? (
        <div className="install-toast" role="status">
          <span aria-hidden="true">▣</span>
          <p>
            Run the production preview or wait for the browser to mark the PWA installable. You can also use
            Chrome&apos;s menu → <strong>Install Vector52</strong>.
          </p>
          <button type="button" aria-label="Close install help" onClick={() => setInstallHint(false)}>×</button>
        </div>
      ) : null}

      <main id="top">
        <section className="hero">
          <img
            className="hero-illustration"
            src="/images/vector52-hero.webp"
            alt="An original illustration of an analyst organizing public onchain evidence around a crystal vault."
          />
          <div className="hero-copy">
            <span className="event-kicker">BUILT FROM SCRATCH · ETHONLINE 2026</span>
            <p className="eyebrow"><span aria-hidden="true">◆</span> Ethereum evidence, made challengeable</p>
            <h1>Audit the story behind a transaction.</h1>
            <p className="hero-lede">
              Vector52 turns one Ethereum transaction and one claim into a traceable verdict—showing the proof,
              the counterevidence and what remains unknown.
            </p>
            <div className="hero-actions">
              <a className="primary-link" href="#audit">Start an audit <span aria-hidden="true">→</span></a>
              <a className="secondary-link" href="#method">Explore the method</a>
            </div>
            <div className="trust-row" aria-label="Product principles">
              <span>No wallet required</span>
              <span>Public data only</span>
              <span>Explicit unknowns</span>
            </div>
          </div>
          <aside className="proof-console" aria-label="Vector52 evidence path">
            <p>ONE TRACEABLE PATH</p>
            <ol>
              <li><span>01</span> Transaction</li>
              <li><span>02</span> Evidence</li>
              <li><span>03</span> Verdict</li>
            </ol>
          </aside>
        </section>

        <section className="workspace-grid" id="audit">
          <AuditForm disabled={phase === "RUNNING"} onSubmit={runAudit} />
          <RunProgress phase={phase} />
        </section>

        {error ? (
          <section className="error-banner" role="alert">
            <div>
              <p className="eyebrow">Audit stopped</p>
              <h2>No evidence was substituted</h2>
            </div>
            <p>{error}</p>
          </section>
        ) : null}

        {result ? (
          <div className="results-stack" aria-live="polite">
            <VerdictPanel result={result} />
            <EvidenceInspector supporting={result.evidence_for} opposing={result.evidence_against} />
          </div>
        ) : (
          <section className="empty-state" aria-label="No audit result">
            <div className="empty-art" aria-hidden="true">
              <span className="empty-file">V52</span>
              <span className="empty-spark">✦</span>
            </div>
            <div>
              <p className="eyebrow">Evidence surface</p>
              <h2>Your audit will appear here</h2>
              <p>Results are never generated locally just to make the interface look complete.</p>
            </div>
          </section>
        )}

        <section className="method-section" id="method">
          <div className="method-heading">
            <div>
              <p className="eyebrow">How Vector52 works</p>
              <h2>From public transaction to defensible conclusion.</h2>
            </div>
            <p>Every layer keeps its source and limits visible, so an explanation can be challenged and reproduced.</p>
          </div>
          <div className="method-layout">
            <figure className="method-visual">
              <img
                src="/images/evidence-layers.webp"
                alt="An original illustration of transaction, indexing, protocol and verdict evidence layers."
                loading="lazy"
              />
              <figcaption>Raw data stays distinct from interpretation.</figcaption>
            </figure>
            <div className="method-grid">
              <article className="method-card card-blue">
                <span className="method-number">01</span>
                <div className="method-icon">TX</div>
                <h3>Define the claim</h3>
                <p>Provide a transaction, a falsifiable statement and an optional subject address.</p>
              </article>
              <article className="method-card card-pink">
                <span className="method-number">02</span>
                <div className="method-icon">RPC</div>
                <h3>Preserve evidence</h3>
                <p>Acquire live Ethereum and indexed data while retaining source, block and hashes.</p>
              </article>
              <article className="method-card card-yellow">
                <span className="method-number">03</span>
                <div className="method-icon">DEX</div>
                <h3>Resolve meaning</h3>
                <p>Translate Uniswap events and separate protocol volume from subject contribution.</p>
              </article>
              <article className="method-card card-mint">
                <span className="method-number">04</span>
                <div className="method-icon">✓?</div>
                <h3>Explain the verdict</h3>
                <p>Return supporting evidence, counterevidence, gaps and an explicit verdict.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="ecosystem-section" id="ecosystem">
          <div className="ecosystem-heading">
            <div>
              <p className="eyebrow">ETHOnline partner prize targets</p>
              <h2>Built with the Ethereum ecosystem.</h2>
            </div>
            <p>
              Each integration must carry real product weight. A logo never substitutes for working code,
              provenance or a reproducible demo.
            </p>
          </div>

          <div className="sponsor-grid">
            <a className="sponsor-card sponsor-graph" href="https://ethglobal.com/events/ethonline2026/prizes/the-graph" target="_blank" rel="noreferrer">
              <img src="/sponsors/the-graph.png" alt="The Graph" loading="lazy" />
              <div>
                <span className="sponsor-status">TARGET INTEGRATION</span>
                <h3>The Graph</h3>
                <p>Indexed, live blockchain evidence with visible provenance and degraded states.</p>
              </div>
              <span className="sponsor-arrow" aria-hidden="true">↗</span>
            </a>
            <a className="sponsor-card sponsor-uniswap" href="https://ethglobal.com/events/ethonline2026/prizes/uniswap-foundation" target="_blank" rel="noreferrer">
              <img src="/sponsors/uniswap.png" alt="Uniswap" loading="lazy" />
              <div>
                <span className="sponsor-status">TARGET INTEGRATION</span>
                <h3>Uniswap</h3>
                <p>Protocol semantics that turn raw swap events into an attributable action.</p>
              </div>
              <span className="sponsor-arrow" aria-hidden="true">↗</span>
            </a>
            <a className="sponsor-card sponsor-bazantic" href="https://bazantic.com/" target="_blank" rel="noreferrer">
              <img src="/sponsors/bazantic.png" alt="Bazantic" loading="lazy" />
              <div>
                <span className="sponsor-status">CONDITIONAL · PENDING GO</span>
                <h3>Bazantic</h3>
                <p>Agent-ready distribution only after the core audit path passes every P0 gate.</p>
              </div>
              <span className="sponsor-arrow" aria-hidden="true">↗</span>
            </a>
          </div>

          <p className="independence-note">
            Vector52 is an independent ETHOnline 2026 hackathon project. It is not produced, operated or endorsed
            by the Ethereum Foundation, ethereum.org, ETHGlobal or the listed sponsor organizations.
          </p>
        </section>
      </main>

      <footer>
        <span>Vector52 · An independent ETHOnline 2026 project</span>
        <span>Open evidence · explicit limits</span>
      </footer>
    </div>
  );
}
