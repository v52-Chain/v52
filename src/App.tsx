import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { vector52Client, Vector52ApiError } from "./api/vector52Client";
import { WalletFlowForm } from "./components/WalletFlowForm";
import type { RequestPhase, WalletFlowResult } from "./domain/apiTypes";
import type { Locale } from "./domain/locale";

type HealthState = "checking" | "online" | "degraded" | "offline";

const WalletFlowGraph = lazy(() =>
  import("./components/WalletFlowGraph").then((module) => ({ default: module.WalletFlowGraph }))
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const COPY = {
  es: {
    home: "Vector52 inicio", nav: "Navegación principal", investigate: "Investigar", method: "Método", integrations: "Integraciones",
    installed: "Instalada", install: "Instalar PWA", installHelp: "Cuando el navegador habilite la instalación, usa su menú → Instalar Vector52.", close: "Cerrar ayuda",
    caseFile: "EXPEDIENTE V52-001 · RED ABIERTA", liveTrace: "RASTREO EN VIVO", signal: "SEÑAL FORENSE",
    eyebrow: "Wallet intelligence · evidencia primero", titleA: "Sigue el dinero.", titleB: "Interroga la evidencia.",
    lede: "Convierte una dirección pública en una escena investigable. Cada nodo conduce a una transferencia verificable; cada límite de conocimiento permanece visible.",
    investigateWallet: "Abrir investigación", forensicLimits: "Ver protocolo forense",
    traceOne: "PISTA 01", traceOneText: "Origen detectado", traceTwo: "PISTA 02", traceTwoText: "Ruta preservada", confidence: "EVIDENCIA", confidenceText: "No inferida",
    principles: ["Datos reales", "Fuente visible", "Unknown válido", "Sin custodia"],
    acquiring: "Adquisición en curso", separating: "Reconstruyendo el flujo…", acquiringBody: "Consultando Alchemy desde el backend. No se sustituirán resultados con datos ficticios.",
    stopped: "Investigación detenida", noFake: "No se fabricaron nodos", preparing: "Preparando sala de investigación…",
    canvas: "Lienzo forense", emptyTitle: "Una dirección pública abre el expediente.", emptyBody: "La vista mostrará transferencias directas verificables. No etiquetará identidades ni inferirá culpabilidad sin evidencia.",
    distinct: "Lo que lo hace distinto", methodTitleA: "No es un grafo decorativo.", methodTitleB: "Es una superficie de evidencia.", methodBody: "Vector52 separa observación, atribución e hipótesis para evitar que una conexión se convierta en una acusación.",
    observedTitle: "Transferencia verificable", observedBody: "Hash, bloque, activo, contraparte y fuente permanecen accesibles.",
    notProvenTitle: "Conexión ≠ identidad", notProvenBody: "Recibir o enviar fondos no prueba control común ni conducta ilícita.",
    horizonTitle: "UNKNOWN es válido", horizonBody: "Cuando la evidencia termina, Vector52 lo declara en vez de completar la historia.",
    architecture: "Arquitectura Buildathon", architectureTitle: "Una investigación real. Integraciones con propósito.", live: "MVP ACTIVO", progress: "EN INTEGRACIÓN",
    alchemy: "RPC privado y Transfers API para adquirir actividad histórica sin exponer credenciales al navegador.",
    graphHsk: "Enriquecimiento de protocolos y evidencia indexada para extender el contexto multichain.",
    mcp: "El agente del usuario podrá solicitar análisis y pagar tareas intensivas mediante una frontera explícita.",
    footer: "Observa → Preserva → Explica → Verifica"
  },
  en: {
    home: "Vector52 home", nav: "Main navigation", investigate: "Investigate", method: "Method", integrations: "Integrations",
    installed: "Installed", install: "Install PWA", installHelp: "When installation becomes available, use your browser menu → Install Vector52.", close: "Close help",
    caseFile: "CASE FILE V52-001 · OPEN NETWORK", liveTrace: "LIVE TRACE", signal: "FORENSIC SIGNAL",
    eyebrow: "Wallet intelligence · evidence first", titleA: "Follow the money.", titleB: "Question the evidence.",
    lede: "Turn a public address into an explorable investigation space. Every node leads to a verifiable transfer; every limit of knowledge remains visible.",
    investigateWallet: "Open investigation", forensicLimits: "View forensic protocol",
    traceOne: "LEAD 01", traceOneText: "Origin detected", traceTwo: "LEAD 02", traceTwoText: "Path preserved", confidence: "EVIDENCE", confidenceText: "Not inferred",
    principles: ["Real data", "Visible source", "Unknown is valid", "Non-custodial"],
    acquiring: "Acquisition in progress", separating: "Reconstructing the flow…", acquiringBody: "Querying Alchemy through the backend. Results will never be replaced with fictional data.",
    stopped: "Investigation stopped", noFake: "No nodes were fabricated", preparing: "Preparing investigation room…",
    canvas: "Forensic canvas", emptyTitle: "A public address opens the case.", emptyBody: "The view will show directly verifiable transfers. It will not label identities or infer wrongdoing without evidence.",
    distinct: "What makes it different", methodTitleA: "This is not a decorative graph.", methodTitleB: "It is an evidence surface.", methodBody: "Vector52 separates observation, attribution and hypothesis so a connection never becomes an accusation.",
    observedTitle: "Verifiable transfer", observedBody: "Hash, block, asset, counterparty and source remain accessible.",
    notProvenTitle: "Connection ≠ identity", notProvenBody: "Receiving or sending funds does not prove common control or wrongdoing.",
    horizonTitle: "UNKNOWN is valid", horizonBody: "When evidence ends, Vector52 says so instead of completing the story.",
    architecture: "Buildathon architecture", architectureTitle: "One real investigation. Purposeful integrations.", live: "LIVE MVP", progress: "INTEGRATING",
    alchemy: "Private RPC and Transfers API acquire historical activity without exposing credentials to the browser.",
    graphHsk: "Indexed protocol enrichment and evidence extend the investigation into a multichain context.",
    mcp: "The user's agent can request analysis and pay for intensive tasks through an explicit boundary.",
    footer: "Observe → Preserve → Explain → Verify"
  }
} as const;

const errorMessage = (error: unknown, locale: Locale) => {
  if (error instanceof Vector52ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return locale === "es" ? "La investigación falló por una causa desconocida." : "The investigation failed for an unknown reason.";
};

export default function App() {
  const [locale, setLocale] = useState<Locale>(() => window.localStorage.getItem("v52-locale") === "en" ? "en" : "es");
  const [phase, setPhase] = useState<RequestPhase>("IDLE");
  const [health, setHealth] = useState<HealthState>("checking");
  const [result, setResult] = useState<WalletFlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const copy = COPY[locale];

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem("v52-locale", locale);
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    vector52Client.health(controller.signal)
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
    if (choice.outcome === "accepted") setInstallPrompt(null);
  };

  const investigate = async (address: string, limit: number) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPhase("RUNNING");
    setResult(null);
    setError(null);
    try {
      const next = await vector52Client.walletFlow(address, limit, controller.signal);
      setResult(next);
      setPhase("SUCCESS");
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") return;
      setError(errorMessage(nextError, locale));
      setPhase("ERROR");
    }
  };

  return (
    <div className="app-shell buildathon-app">
      <header className="topbar">
        <a className="brand" href="#top" aria-label={copy.home}>
          <span className="brand-mark" aria-hidden="true">V</span>
          <span><strong>VECTOR52</strong><small>FORENSIC FLOW</small></span>
        </a>
        <nav className="main-nav" aria-label={copy.nav}>
          <a href="#investigate">{copy.investigate}</a>
          <a href="#method">{copy.method}</a>
          <a href="#integrations">{copy.integrations}</a>
        </nav>
        <div className="topbar-actions">
          <span className={`api-chip api-${health}`} aria-label={`API ${health}`} title={`API ${health}`}>
            <span className="health-dot" aria-hidden="true" />
            <span className="api-label">API {health}</span>
          </span>
          <div className="language-switch" aria-label="Language / Idioma">
            <button type="button" aria-pressed={locale === "es"} onClick={() => setLocale("es")}>ES</button>
            <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
          </div>
          <button className="install-action" type="button" onClick={() => void requestInstall()} disabled={isInstalled}>
            <span className="install-icon" aria-hidden="true">↓</span>
            {isInstalled ? copy.installed : copy.install}
          </button>
        </div>
      </header>

      {installHint ? (
        <div className="install-toast" role="status">
          <span aria-hidden="true">▣</span>
          <p>{copy.installHelp}</p>
          <button type="button" aria-label={copy.close} onClick={() => setInstallHint(false)}>×</button>
        </div>
      ) : null}

      <main id="top">
        <section className="flow-hero detective-hero">
          <div className="hero-badge"><span /> {copy.caseFile}<strong>{copy.liveTrace}</strong></div>
          <div className="flow-hero-grid">
            <div className="hero-copy-block">
              <div className="case-index"><span>CASE</span><strong>52</strong><i /></div>
              <p className="eyebrow">{copy.eyebrow}</p>
              <h1>{copy.titleA}<br /><em>{copy.titleB}</em></h1>
              <p className="hero-lede">{copy.lede}</p>
              <div className="hero-actions">
                <a className="primary-link" href="#investigate">{copy.investigateWallet} <span>→</span></a>
                <a className="secondary-link" href="#method">{copy.forensicLimits}</a>
              </div>
            </div>
            <div className="investigation-console" aria-hidden="true">
              <div className="console-meta"><span>CHAIN://ETH-MAINNET</span><span>BLOCK 23919874</span></div>
              <div className="case-stage">
                <div className="hero-eclipse" />
                <div className="hero-vector">V</div>
                <div className="scan-beam" />
                <div className="target-reticle"><span>V52</span></div>
                <i className="trace-line trace-a" /><i className="trace-line trace-b" /><i className="trace-line trace-c" /><i className="trace-line trace-d" />
                <span className="trace-node node-a">01</span><span className="trace-node node-b">02</span>
                <span className="trace-node out node-c">03</span><span className="trace-node out node-d">04</span>
                <div className="evidence-tile tile-a"><small>{copy.traceOne}</small><strong>{copy.traceOneText}</strong><span>0x8d8A…6045</span></div>
                <div className="evidence-tile tile-b"><small>{copy.traceTwo}</small><strong>{copy.traceTwoText}</strong><span>HASH VERIFIED</span></div>
                <div className="confidence-dial"><span>100%</span><small>{copy.confidence}</small><b>{copy.confidenceText}</b></div>
              </div>
              <div className="console-foot"><span>● {copy.signal}</span><span>OBSERVE / PRESERVE / VERIFY</span></div>
            </div>
          </div>
          <div className="principle-strip">
            {copy.principles.map((principle, index) => <span key={principle}><strong>0{index + 1}</strong> {principle}</span>)}
          </div>
        </section>

        <WalletFlowForm locale={locale} disabled={phase === "RUNNING"} onSubmit={(address, limit) => void investigate(address, limit)} />

        {phase === "RUNNING" ? (
          <section className="flow-loading" role="status">
            <div className="scanner" aria-hidden="true"><span /></div>
            <div><p className="eyebrow">{copy.acquiring}</p><h2>{copy.separating}</h2><p>{copy.acquiringBody}</p></div>
          </section>
        ) : null}

        {error ? (
          <section className="error-banner" role="alert">
            <div><p className="eyebrow">{copy.stopped}</p><h2>{copy.noFake}</h2></div>
            <p>{error}</p>
          </section>
        ) : null}

        {result ? (
          <Suspense fallback={<section className="flow-loading"><div className="scanner" aria-hidden="true"><span /></div><div><h2>{copy.preparing}</h2></div></section>}>
            <WalletFlowGraph result={result} locale={locale} />
          </Suspense>
        ) : phase !== "RUNNING" && !error ? (
          <section className="graph-empty">
            <div className="empty-orbit" aria-hidden="true"><i /><i /><span>V52</span></div>
            <div>
              <p className="eyebrow">{copy.canvas}</p>
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyBody}</p>
            </div>
          </section>
        ) : null}

        <section className="buildathon-method" id="method">
          <div className="method-intro">
            <p className="eyebrow">{copy.distinct}</p>
            <h2>{copy.methodTitleA}<br />{copy.methodTitleB}</h2>
            <p>{copy.methodBody}</p>
          </div>
          <div className="method-points">
            <article><span>OBSERVED</span><h3>{copy.observedTitle}</h3><p>{copy.observedBody}</p></article>
            <article><span>NOT PROVEN</span><h3>{copy.notProvenTitle}</h3><p>{copy.notProvenBody}</p></article>
            <article><span>EVENT HORIZON</span><h3>{copy.horizonTitle}</h3><p>{copy.horizonBody}</p></article>
          </div>
        </section>

        <section className="integration-section" id="integrations">
          <div><p className="eyebrow">{copy.architecture}</p><h2>{copy.architectureTitle}</h2></div>
          <div className="integration-grid">
            <article><span className="status-live">{copy.live}</span><h3>Alchemy</h3><p>{copy.alchemy}</p></article>
            <article><span className="status-progress">{copy.progress}</span><h3>The Graph + HSK</h3><p>{copy.graphHsk}</p></article>
            <article><span className="status-progress">{copy.progress}</span><h3>MCP + x402</h3><p>{copy.mcp}</p></article>
          </div>
        </section>
      </main>

      <footer><span>Vector52 · Ethereum Bolivia Buildathon 2026</span><span>{copy.footer}</span></footer>
    </div>
  );
}
