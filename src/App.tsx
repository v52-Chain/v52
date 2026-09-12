import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ArrowRight, Bot, ChevronDown, Download, FileCheck2, Globe2, Network, PlugZap, Search, ShieldCheck, Waypoints, Zap } from "lucide-react";
import { vector52Client, Vector52ApiError } from "./api/vector52Client";
import { AuditForm } from "./components/AuditForm";
import { EvidenceInspector } from "./components/EvidenceInspector";
import { RunProgress } from "./components/RunProgress";
import { VerdictPanel } from "./components/VerdictPanel";
import { WalletFlowForm } from "./components/WalletFlowForm";
import { ConnectHub } from "./components/ConnectHub";
import { PixelCard } from "./components/reactbits/PixelCard";
import { Threads } from "./components/reactbits/Threads";
import type { AgentCapabilities, AuditResult, ClaimAuditRequest, RequestPhase, WalletFlowFilters, WalletFlowResult, WalletSession } from "./domain/apiTypes";
import type { Locale } from "./domain/locale";

type HealthState = "checking" | "online" | "degraded" | "offline";
type InvestigationMode = "wallet" | "claim";

const readWalletSession = (): WalletSession | null => {
  try {
    const raw = window.sessionStorage.getItem("v52-wallet-session");
    if (!raw) return null;
    const session = JSON.parse(raw) as WalletSession;
    return Date.parse(session.expires_at) > Date.now() ? session : null;
  } catch {
    return null;
  }
};

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
  const [auditPhase, setAuditPhase] = useState<RequestPhase>("IDLE");
  const [mode, setMode] = useState<InvestigationMode>("wallet");
  const [health, setHealth] = useState<HealthState>("checking");
  const [result, setResult] = useState<WalletFlowResult | null>(null);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);
  const [walletSession, setWalletSessionState] = useState<WalletSession | null>(readWalletSession);
  const [connectOpen, setConnectOpen] = useState(false);
  const [connectMode, setConnectMode] = useState<"web" | "agent">("web");
  const [credits, setCredits] = useState<number | null>(null);
  const [agentCapabilities, setAgentCapabilities] = useState<AgentCapabilities | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const activeAuditRequest = useRef<AbortController | null>(null);
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

  useEffect(() => {
    const controller = new AbortController();
    vector52Client.agentCapabilities(controller.signal).then(setAgentCapabilities).catch(() => setAgentCapabilities(null));
    return () => controller.abort();
  }, []);

  const setWalletSession = (session: WalletSession | null) => {
    setWalletSessionState(session);
    if (session) window.sessionStorage.setItem("v52-wallet-session", JSON.stringify(session));
    else window.sessionStorage.removeItem("v52-wallet-session");
    if (!session) setCredits(null);
  };

  const openConnect = (nextMode: "web" | "agent" = "web") => {
    setConnectMode(nextMode);
    setConnectOpen(true);
  };

  useEffect(() => () => {
    activeRequest.current?.abort();
    activeAuditRequest.current?.abort();
  }, []);

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

  const investigate = async (address: string, limit: number, filters: WalletFlowFilters) => {
    if (!walletSession) {
      setError(locale === "es" ? "Conecta y verifica tu wallet para abrir una investigación web." : "Connect and verify your wallet to open a web investigation.");
      return;
    }
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setPhase("RUNNING");
    setResult(null);
    setError(null);
    try {
      const next = await vector52Client.webWalletFlow(address, limit, filters, walletSession.access_token, controller.signal);
      setResult(next.result);
      if (next.credits_remaining !== undefined && next.credits_remaining !== null) setCredits(next.credits_remaining);
      setPhase("SUCCESS");
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") return;
      if (nextError instanceof Vector52ApiError && nextError.status === 401) setWalletSession(null);
      if (nextError instanceof Vector52ApiError && nextError.status === 402) openConnect("web");
      setError(errorMessage(nextError, locale));
      setPhase("ERROR");
    }
  };

  const auditClaim = async (request: ClaimAuditRequest) => {
    activeAuditRequest.current?.abort();
    const controller = new AbortController();
    activeAuditRequest.current = controller;
    setAuditPhase("RUNNING");
    setAuditResult(null);
    setAuditError(null);
    try {
      const next = await vector52Client.auditClaim(request, controller.signal);
      setAuditResult(next);
      setAuditPhase("SUCCESS");
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") return;
      setAuditError(errorMessage(nextError, locale));
      setAuditPhase("ERROR");
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
          <a href="#investigate"><Search size={15} />{copy.investigate}</a>
          <a href="#method"><Waypoints size={15} />{copy.method}</a>
          <a href="#integrations"><PlugZap size={15} />{copy.integrations}</a>
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
          <button className="connect-action" type="button" onClick={() => openConnect("web")}>
            <span className={walletSession ? "connect-status is-connected" : "connect-status"} />
            <span>{walletSession ? `${credits ?? "—"} ${locale === "es" ? "consultas" : "requests"}` : "Connect"}</span>
            <ChevronDown size={14} />
          </button>
          <button className="install-action" type="button" onClick={() => void requestInstall()} disabled={isInstalled}>
            <Download className="install-icon" size={16} aria-hidden="true" />
            {isInstalled ? copy.installed : copy.install}
          </button>
        </div>
      </header>

      <ConnectHub
        locale={locale}
        open={connectOpen}
        initialMode={connectMode}
        session={walletSession}
        agentCapabilities={agentCapabilities}
        onClose={() => setConnectOpen(false)}
        onSession={setWalletSession}
        onCredits={setCredits}
      />

      {installHint ? (
        <div className="install-toast" role="status">
          <span aria-hidden="true">▣</span>
          <p>{copy.installHelp}</p>
          <button type="button" aria-label={copy.close} onClick={() => setInstallHint(false)}>×</button>
        </div>
      ) : null}

      <main id="top">
        <section className="flow-hero desktop-hero">
          <Threads color={[.34, .48, .96]} amplitude={.46} distance={.18} enableMouseInteraction className="hero-threads" />
          <div className="desktop-hero-copy">
            <div className="hero-status"><span className="live-dot" />{copy.caseFile}</div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1>{copy.titleA}<br /><em>{copy.titleB}</em></h1>
            <p className="hero-lede">{copy.lede}</p>
            <div className="hero-actions">
              <a className="primary-link" href="#investigate"><Search size={18} />{copy.investigateWallet}<ArrowRight size={17} /></a>
              <a className="secondary-link" href="#method"><FileCheck2 size={17} />{copy.forensicLimits}</a>
            </div>
            <div className="hero-trust-row">
              <span><ShieldCheck size={16} />{copy.principles[1]}</span>
              <span><Network size={16} />{copy.principles[2]}</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="desktop-window-bar"><i /><i /><i /><span>VECTOR52 / CASE WORKSPACE</span></div>
            <img src="/images/vector52-cover.jpeg" alt="" />
            <div className="hero-evidence-card"><small>{copy.signal}</small><strong>{copy.traceTwoText}</strong><span>OBSERVE · PRESERVE · VERIFY</span></div>
          </div>
          <div className="principle-strip">
            {copy.principles.map((principle, index) => <span key={principle}><strong>0{index + 1}</strong> {principle}</span>)}
          </div>
        </section>

        <section className="access-channels" aria-label={locale === "es" ? "Canales de acceso" : "Access channels"}>
          <div className="access-intro">
            <p className="eyebrow">VECTOR52 ACCESS LAYER</p>
            <h2>{locale === "es" ? "Una inteligencia. Dos formas de operar." : "One intelligence core. Two ways to operate."}</h2>
            <p>{locale === "es" ? "La web autentica personas mediante firma; el canal MCP autoriza trabajo autónomo mediante pago x402." : "The web authenticates people with a signature; the MCP channel authorizes autonomous work through x402 payment."}</p>
          </div>
          <article className="access-card access-web">
            <div className="access-card-head"><span><Globe2 size={17} />WEB USER</span><b>{walletSession ? "READY" : "SIGN-IN"}</b></div>
            <h3>{locale === "es" ? "Investigación interactiva" : "Interactive investigation"}</h3>
            <p>{locale === "es" ? "Reown conecta la wallet. Una firma de mensaje crea una sesión temporal; nunca se solicita una private key." : "Reown connects the wallet. A message signature creates a temporary session; no private key is ever requested."}</p>
            <button className="access-open-action" type="button" onClick={() => openConnect("web")}><Globe2 size={16} />{walletSession ? (locale === "es" ? "Administrar acceso" : "Manage access") : (locale === "es" ? "Conectar wallet" : "Connect wallet")}<ArrowRight size={15} /></button>
          </article>
          <article className="access-card access-agent">
            <div className="access-card-head"><span><Bot size={17} />MCP AGENT</span><b className={agentCapabilities?.ready ? "is-ready" : "is-pending"}>{agentCapabilities?.ready ? "READY" : "CONFIG"}</b></div>
            <h3>{locale === "es" ? "Investigación autónoma pagada" : "Paid autonomous investigation"}</h3>
            <p>{locale === "es" ? "Claude, Codex u otro cliente MCP solicita el trabajo; el cliente del agente firma y paga USDC en Fuji antes de ejecutarlo." : "Claude, Codex or another MCP client requests work; the agent client signs and pays USDC on Fuji before execution."}</p>
            <div className="agent-route"><Zap size={15} /><code>POST /v1/agent/investigations/wallet-flow</code><span>{agentCapabilities?.amount_atomic ?? "—"} atomic</span></div>
            <button className="access-open-action agent" type="button" onClick={() => openConnect("agent")}><Bot size={16} />{locale === "es" ? "Configurar agente" : "Configure agent"}<ArrowRight size={15} /></button>
          </article>
        </section>

        <section className="investigation-switch" id="investigate" aria-label={locale === "es" ? "Tipo de investigación" : "Investigation type"}>
          <div>
            <p className="eyebrow">VECTOR52 CORE</p>
            <h2>{locale === "es" ? "Elige la superficie de investigación" : "Choose the investigation surface"}</h2>
          </div>
          <div className="investigation-tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "wallet"} onClick={() => setMode("wallet")}>
              {locale === "es" ? "Mapa de wallet" : "Wallet map"}
            </button>
            <button type="button" role="tab" aria-selected={mode === "claim"} onClick={() => setMode("claim")}>
              {locale === "es" ? "Auditar claim" : "Audit claim"}
            </button>
          </div>
        </section>

        {mode === "wallet" ? (
          <WalletFlowForm
            locale={locale}
            busy={phase === "RUNNING"}
            accessLocked={!walletSession}
            onSubmit={(address, limit, filters) => void investigate(address, limit, filters)}
          />
        ) : (
          <section className="workspace-grid claim-workspace">
            <AuditForm locale={locale} disabled={auditPhase === "RUNNING"} onSubmit={(request) => void auditClaim(request)} />
            <RunProgress phase={auditPhase} locale={locale} />
          </section>
        )}

        {mode === "wallet" && phase === "RUNNING" ? (
          <section className="flow-loading" role="status">
            <div className="scanner" aria-hidden="true"><span /></div>
            <div><p className="eyebrow">{copy.acquiring}</p><h2>{copy.separating}</h2><p>{copy.acquiringBody}</p></div>
          </section>
        ) : null}

        {mode === "wallet" && error ? (
          <section className="error-banner" role="alert">
            <div><p className="eyebrow">{copy.stopped}</p><h2>{copy.noFake}</h2></div>
            <p>{error}</p>
          </section>
        ) : null}

        {mode === "wallet" && result ? (
          <Suspense fallback={<section className="flow-loading"><div className="scanner" aria-hidden="true"><span /></div><div><h2>{copy.preparing}</h2></div></section>}>
            <WalletFlowGraph result={result} locale={locale} />
          </Suspense>
        ) : mode === "wallet" && phase !== "RUNNING" && !error ? (
          <section className="graph-empty">
            <div className="empty-orbit" aria-hidden="true"><i /><i /><span>V52</span></div>
            <div>
              <p className="eyebrow">{copy.canvas}</p>
              <h2>{copy.emptyTitle}</h2>
              <p>{copy.emptyBody}</p>
            </div>
          </section>
        ) : null}

        {mode === "claim" && auditError ? (
          <section className="error-banner" role="alert">
            <div><p className="eyebrow">{locale === "es" ? "Auditoría detenida" : "Audit stopped"}</p><h2>{copy.noFake}</h2></div>
            <p>{auditError}</p>
          </section>
        ) : null}

        {mode === "claim" && auditResult ? (
          <div className="audit-results" aria-live="polite">
            <VerdictPanel result={auditResult} locale={locale} />
            <EvidenceInspector supporting={auditResult.evidence_for} opposing={auditResult.evidence_against} locale={locale} />
          </div>
        ) : null}

        <section className="buildathon-method" id="method">
          <div className="method-intro">
            <p className="eyebrow">{copy.distinct}</p>
            <h2>{copy.methodTitleA}<br />{copy.methodTitleB}</h2>
            <p>{copy.methodBody}</p>
          </div>
          <div className="method-points">
            <PixelCard variant="cyan"><article><span>OBSERVED</span><h3>{copy.observedTitle}</h3><p>{copy.observedBody}</p></article></PixelCard>
            <PixelCard variant="violet"><article><span>NOT PROVEN</span><h3>{copy.notProvenTitle}</h3><p>{copy.notProvenBody}</p></article></PixelCard>
            <PixelCard variant="amber"><article><span>EVENT HORIZON</span><h3>{copy.horizonTitle}</h3><p>{copy.horizonBody}</p></article></PixelCard>
          </div>
        </section>

        <section className="integration-section" id="integrations">
          <div><p className="eyebrow">{copy.architecture}</p><h2>{copy.architectureTitle}</h2></div>
          <div className="integration-grid">
            <PixelCard variant="cyan"><article><span className="status-live">{copy.live}</span><h3>Alchemy</h3><p>{copy.alchemy}</p></article></PixelCard>
            <PixelCard variant="violet"><article><span className="status-progress">{copy.progress}</span><h3>The Graph + HSK</h3><p>{copy.graphHsk}</p></article></PixelCard>
            <PixelCard variant="amber"><article><span className="status-progress">{copy.progress}</span><h3>MCP + x402</h3><p>{copy.mcp}</p></article></PixelCard>
          </div>
        </section>
      </main>

      <footer><span>Vector52 · Ethereum Bolivia Buildathon 2026</span><span>{copy.footer}</span></footer>
    </div>
  );
}
