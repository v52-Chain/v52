import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Bot, Download, FileCheck2, Search, ShieldCheck } from "lucide-react";
import { vector52Client, Vector52ApiError } from "./api/vector52Client";
import { AuditForm } from "./components/AuditForm";
import { EvidenceInspector } from "./components/EvidenceInspector";
import { RunProgress } from "./components/RunProgress";
import { VerdictPanel } from "./components/VerdictPanel";
import { WalletFlowForm } from "./components/WalletFlowForm";
import { ConnectHub } from "./components/ConnectHub";
import { IntroExperience } from "./components/IntroExperience";
import { ProjectInfoPage } from "./components/ProjectInfoPage";
import { PaidWalletFlow } from "./components/PaidWalletFlow";
import { WalletMenuButton } from "./components/WalletAccess";
import type { AgentCapabilities, AuditResult, ClaimAuditRequest, McpStatusResponse, McpToolDescriptor, RequestPhase, WalletFlowResult, WalletSession, WebCapabilities } from "./domain/apiTypes";
import type { Locale } from "./domain/locale";
import { reownConfigured } from "./web3/appkit";

type HealthState = "checking" | "online" | "degraded" | "offline";
type InvestigationMode = "wallet" | "claim";
type AppView = "intro" | "workspace" | "project";

const viewFromPath = (): AppView => {
  if (window.location.pathname.startsWith("/app")) return "workspace";
  if (window.location.pathname.startsWith("/project")) return "project";
  return "intro";
};

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
  const [view, setView] = useState<AppView>(viewFromPath);
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
  const [webCapabilities, setWebCapabilities] = useState<WebCapabilities | null>(null);
  const [agentCapabilities, setAgentCapabilities] = useState<AgentCapabilities | null>(null);
  const [mcpStatus, setMcpStatus] = useState<McpStatusResponse | null>(null);
  const [mcpTools, setMcpTools] = useState<McpToolDescriptor[]>([]);
  const [mcpLoading, setMcpLoading] = useState(true);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const activeAuditRequest = useRef<AbortController | null>(null);
  const copy = COPY[locale];

  const navigate = useCallback((nextView: AppView) => {
    const path = nextView === "workspace" ? "/app" : nextView === "project" ? "/project" : "/";
    if (window.location.pathname !== path) window.history.pushState({ view: nextView }, "", path);
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const openWorkspace = useCallback(() => navigate("workspace"), [navigate]);

  useEffect(() => {
    const handlePopState = () => setView(viewFromPath());
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const refreshMcp = useCallback(async (signal?: AbortSignal) => {
    setMcpLoading(true);
    setMcpError(null);
    try {
      const [webCapabilitiesResult, agentCapabilitiesResult, status, tools] = await Promise.allSettled([
        vector52Client.webCapabilities(signal),
        vector52Client.agentCapabilities(signal),
        vector52Client.mcpStatus(signal),
        vector52Client.mcpTools(signal)
      ]);
      if (signal?.aborted) return;
      setWebCapabilities(webCapabilitiesResult.status === "fulfilled" ? webCapabilitiesResult.value : null);
      setAgentCapabilities(agentCapabilitiesResult.status === "fulfilled" ? agentCapabilitiesResult.value : null);
      setMcpStatus(status.status === "fulfilled" ? status.value : null);
      setMcpTools(tools.status === "fulfilled" && tools.value.state === "READY" ? tools.value.tools : []);
      const failure = [agentCapabilitiesResult, status, tools].find((result) => result.status === "rejected");
      if (failure?.status === "rejected") setMcpError(errorMessage(failure.reason, locale));
    } catch (nextError) {
      if (nextError instanceof DOMException && nextError.name === "AbortError") return;
      setMcpStatus(null);
      setMcpTools([]);
      setWebCapabilities(null);
      setAgentCapabilities(null);
      setMcpError(errorMessage(nextError, locale));
    } finally {
      if (!signal?.aborted) setMcpLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshMcp(controller.signal);
    return () => controller.abort();
  }, [refreshMcp]);

  useEffect(() => {
    if (!connectOpen || connectMode !== "agent") return;
    void refreshMcp();
    const timer = window.setInterval(() => void refreshMcp(), 30_000);
    return () => window.clearInterval(timer);
  }, [connectMode, connectOpen, refreshMcp]);

  const setWalletSession = (session: WalletSession | null) => {
    setWalletSessionState(session);
    if (session) window.sessionStorage.setItem("v52-wallet-session", JSON.stringify(session));
    else window.sessionStorage.removeItem("v52-wallet-session");
  };

  const openConnect = (nextMode: "web" | "agent" = "web") => {
    setConnectMode(nextMode);
    setConnectOpen(true);
  };

  useEffect(() => () => {
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

  const startPaidInvestigation = () => {
    setPhase("RUNNING");
    setResult(null);
    setError(null);
  };

  const failPaidInvestigation = (nextError: unknown) => {
    setError(errorMessage(nextError, locale));
    setPhase("ERROR");
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

  if (view === "intro") {
    return <IntroExperience locale={locale} onLocale={setLocale} onEnter={openWorkspace} />;
  }

  if (view === "project") {
    return <ProjectInfoPage locale={locale} onLocale={setLocale} onLaunch={() => navigate("workspace")} onIntro={() => navigate("intro")} />;
  }

  return (
    <div className="app-shell buildathon-app">
      <header className="topbar">
        <button className="brand brand-button" type="button" onClick={() => navigate("intro")} aria-label={copy.home}>
          <span className="brand-mark" aria-hidden="true">V</span>
          <span><strong>VECTOR52</strong><small>FORENSIC FLOW</small></span>
        </button>
        <nav className="main-nav" aria-label={copy.nav}>
          <button type="button" className="is-active"><Search size={15} />{copy.investigate}</button>
          <button type="button" onClick={() => navigate("project")}><FileCheck2 size={15} />{locale === "es" ? "Proyecto" : "Project"}</button>
          <button type="button" onClick={() => openConnect("agent")}><Bot size={15} />{locale === "es" ? "Agente" : "Agent"}</button>
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
          <WalletMenuButton locale={locale} onOpen={() => openConnect("web")} />
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
        webCapabilities={webCapabilities}
        agentCapabilities={agentCapabilities}
        mcpStatus={mcpStatus}
        mcpTools={mcpTools}
        mcpLoading={mcpLoading}
        mcpError={mcpError}
        onRefreshMcp={() => void refreshMcp()}
        onClose={() => setConnectOpen(false)}
        onSession={setWalletSession}
      />

      {installHint ? (
        <div className="install-toast" role="status">
          <span aria-hidden="true">▣</span>
          <p>{copy.installHelp}</p>
          <button type="button" aria-label={copy.close} onClick={() => setInstallHint(false)}>×</button>
        </div>
      ) : null}

      <main id="top">
        <section className="workspace-welcome">
          <div>
            <p className="eyebrow"><ShieldCheck size={15} /> VECTOR52 CASE WORKSPACE</p>
            <h1>{locale === "es" ? "¿Qué necesitas investigar hoy?" : "What do you need to investigate today?"}</h1>
            <p>{locale === "es" ? "Pega una wallet y acota las fechas. Cada resultado conservará su fuente y sus límites." : "Paste a wallet and narrow the dates. Every result will preserve its source and its limits."}</p>
          </div>
          <button type="button" className="agent-prompt-card" onClick={() => openConnect("agent")}>
            <Bot size={21} />
            <span><small>{locale === "es" ? "PREFIERO CONTAR LO QUE PASÓ" : "I'D RATHER DESCRIBE WHAT HAPPENED"}</small><strong>{locale === "es" ? "Investigar con mi agente" : "Investigate with my agent"}</strong></span>
            <span className="agent-prompt-arrow">→</span>
          </button>
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
          reownConfigured ? (
            <PaidWalletFlow
              locale={locale}
              busy={phase === "RUNNING"}
              session={walletSession}
              capabilities={webCapabilities}
              onSession={setWalletSession}
              onStart={startPaidInvestigation}
              onSuccess={(response) => {
                setResult(response.result);
                setPhase("SUCCESS");
              }}
              onError={failPaidInvestigation}
            />
          ) : (
            <WalletFlowForm
              locale={locale}
              busy={false}
              accessLocked
              submitLabel={locale === "es" ? "Configurar Reown" : "Configure Reown"}
              paymentReady
              onSubmit={() => openConnect("web")}
            />
          )
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

      </main>

      <footer className="workspace-statusbar"><span><i className={`status-dot api-${health}`} />Vector52 Core · {health}</span><button type="button" onClick={() => navigate("project")}>{locale === "es" ? "Método y límites" : "Method and limits"}</button><span>{copy.footer}</span></footer>
    </div>
  );
}
