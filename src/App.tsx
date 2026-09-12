import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { vector52Client, Vector52ApiError } from "./api/vector52Client";
import { WalletFlowForm } from "./components/WalletFlowForm";
import type { RequestPhase, WalletFlowResult } from "./domain/apiTypes";

type HealthState = "checking" | "online" | "degraded" | "offline";

const WalletFlowGraph = lazy(() =>
  import("./components/WalletFlowGraph").then((module) => ({ default: module.WalletFlowGraph }))
);

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const errorMessage = (error: unknown) => {
  if (error instanceof Vector52ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "La investigación falló por una causa desconocida.";
};

export default function App() {
  const [phase, setPhase] = useState<RequestPhase>("IDLE");
  const [health, setHealth] = useState<HealthState>("checking");
  const [result, setResult] = useState<WalletFlowResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHint, setInstallHint] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);

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
      setError(errorMessage(nextError));
      setPhase("ERROR");
    }
  };

  return (
    <div className="app-shell buildathon-app">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Vector52 inicio">
          <span className="brand-mark" aria-hidden="true">V</span>
          <span><strong>VECTOR52</strong><small>FORENSIC FLOW</small></span>
        </a>
        <nav className="main-nav" aria-label="Navegación principal">
          <a href="#investigate">Investigar</a>
          <a href="#method">Método</a>
          <a href="#integrations">Integraciones</a>
        </nav>
        <div className="topbar-actions">
          <span className={`api-chip api-${health}`} aria-label={`API ${health}`} title={`API ${health}`}>
            <span className="health-dot" aria-hidden="true" />
            <span className="api-label">API {health}</span>
          </span>
          <button className="install-action" type="button" onClick={() => void requestInstall()} disabled={isInstalled}>
            <span className="install-icon" aria-hidden="true">↓</span>
            {isInstalled ? "Instalada" : "Instalar PWA"}
          </button>
        </div>
      </header>

      {installHint ? (
        <div className="install-toast" role="status">
          <span aria-hidden="true">▣</span>
          <p>Cuando el navegador habilite la instalación, usa su menú → <strong>Instalar Vector52</strong>.</p>
          <button type="button" aria-label="Cerrar ayuda" onClick={() => setInstallHint(false)}>×</button>
        </div>
      ) : null}

      <main id="top">
        <section className="flow-hero">
          <div className="hero-badge"><span /> ETHEREUM BOLIVIA BUILDATHON 2026</div>
          <div className="flow-hero-grid">
            <div>
              <p className="eyebrow">Wallet intelligence · evidencia primero</p>
              <h1>Ve el movimiento.<br /><em>Cuestiona la historia.</em></h1>
              <p className="hero-lede">
                Vector52 transforma actividad onchain pública en un mapa investigable: ingresos a la izquierda,
                wallet al centro y egresos a la derecha, con cada conexión vinculada a su evidencia.
              </p>
              <div className="hero-actions">
                <a className="primary-link" href="#investigate">Investigar una wallet <span>→</span></a>
                <a className="secondary-link" href="#method">Ver límites forenses</a>
              </div>
            </div>
            <div className="mini-flow" aria-hidden="true">
              <div className="mini-label label-left">INGRESOS</div>
              <div className="mini-label label-right">EGRESOS</div>
              <i className="mini-edge e1" /><i className="mini-edge e2" /><i className="mini-edge e3" /><i className="mini-edge e4" />
              <span className="mini-node n1">A</span><span className="mini-node n2">B</span>
              <span className="mini-wallet">V52</span>
              <span className="mini-node mini-out n3">C</span><span className="mini-node mini-out n4">D</span>
            </div>
          </div>
          <div className="principle-strip">
            <span><strong>01</strong> Datos reales</span>
            <span><strong>02</strong> Fuente visible</span>
            <span><strong>03</strong> Unknown válido</span>
            <span><strong>04</strong> Sin custodia</span>
          </div>
        </section>

        <WalletFlowForm disabled={phase === "RUNNING"} onSubmit={(address, limit) => void investigate(address, limit)} />

        {phase === "RUNNING" ? (
          <section className="flow-loading" role="status">
            <div className="scanner" aria-hidden="true"><span /></div>
            <div><p className="eyebrow">Adquisición en curso</p><h2>Separando ingresos y egresos…</h2><p>Consultando Alchemy desde el backend. No se sustituirán resultados con datos ficticios.</p></div>
          </section>
        ) : null}

        {error ? (
          <section className="error-banner" role="alert">
            <div><p className="eyebrow">Investigación detenida</p><h2>No se fabricaron nodos</h2></div>
            <p>{error}</p>
          </section>
        ) : null}

        {result ? (
          <Suspense fallback={<section className="flow-loading"><div className="scanner" aria-hidden="true"><span /></div><div><h2>Preparando explorador…</h2></div></section>}>
            <WalletFlowGraph result={result} />
          </Suspense>
        ) : phase !== "RUNNING" && !error ? (
          <section className="graph-empty">
            <div className="empty-orbit" aria-hidden="true"><i /><i /><span>V52</span></div>
            <div>
              <p className="eyebrow">Lienzo forense</p>
              <h2>Una dirección pública inicia el mapa.</h2>
              <p>La vista mostrará transferencias directas verificables. No etiquetará identidades ni inferirá culpabilidad sin evidencia.</p>
            </div>
          </section>
        ) : null}

        <section className="buildathon-method" id="method">
          <div className="method-intro">
            <p className="eyebrow">Lo que lo hace distinto</p>
            <h2>No es un grafo decorativo.<br />Es una superficie de evidencia.</h2>
            <p>Arkham inspira la legibilidad del flujo. Vector52 añade una frontera clara entre observación, atribución e hipótesis.</p>
          </div>
          <div className="method-points">
            <article><span>OBSERVED</span><h3>Transferencia verificable</h3><p>Hash, bloque, activo, contraparte y fuente permanecen accesibles.</p></article>
            <article><span>NOT PROVEN</span><h3>Conexión ≠ identidad</h3><p>Recibir o enviar fondos no prueba control común ni conducta ilícita.</p></article>
            <article><span>EVENT HORIZON</span><h3>UNKNOWN es válido</h3><p>Cuando la evidencia termina, Vector52 lo declara en vez de completar la historia.</p></article>
          </div>
        </section>

        <section className="integration-section" id="integrations">
          <div><p className="eyebrow">Arquitectura Buildathon</p><h2>Una ruta funcional, integraciones con propósito.</h2></div>
          <div className="integration-grid">
            <article><span className="status-live">MVP ACTIVO</span><h3>Alchemy</h3><p>RPC privado y Transfers API para adquirir la actividad histórica sin exponer credenciales al navegador.</p></article>
            <article><span className="status-progress">EN INTEGRACIÓN</span><h3>The Graph + HSK</h3><p>Enriquecimiento de protocolos y evidencia indexada para extender el contexto multichain.</p></article>
            <article><span className="status-progress">EN INTEGRACIÓN</span><h3>MCP + x402</h3><p>El agente del usuario podrá solicitar análisis y pagar tareas intensivas mediante una frontera explícita.</p></article>
          </div>
        </section>
      </main>

      <footer><span>Vector52 · Ethereum Bolivia Buildathon 2026</span><span>Observe → Preserve → Explain → Verify</span></footer>
    </div>
  );
}
