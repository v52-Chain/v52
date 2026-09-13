import { useEffect, useMemo, useState } from "react";
import { SiClaude, SiCursor, SiOpencode } from "@icons-pack/react-simple-icons";
import {
  Bot,
  CircleDollarSign,
  Clipboard,
  ExternalLink,
  Globe2,
  KeyRound,
  Laptop,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";
import type { AgentCapabilities, McpStatusResponse, McpToolDescriptor, WalletSession, WebCapabilities } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import { WalletAccess } from "./WalletAccess";

interface Props {
  locale: Locale;
  open: boolean;
  initialMode?: AccessMode;
  session: WalletSession | null;
  webCapabilities: WebCapabilities | null;
  agentCapabilities: AgentCapabilities | null;
  mcpStatus: McpStatusResponse | null;
  mcpTools: McpToolDescriptor[];
  mcpLoading: boolean;
  mcpError: string | null;
  onRefreshMcp: () => void;
  onClose: () => void;
  onSession: (session: WalletSession | null) => void;
}

type AccessMode = "web" | "agent";
type AgentClient = "claude" | "codex" | "opencode" | "cursor" | "generic";
type AgentSignerMode = "local" | "team-demo";

const REMOTE_MCP_URL = (import.meta.env.VITE_MCP_SERVER_URL ?? "https://v52-mcp-production.up.railway.app/mcp").trim();
const LOCAL_MCP_URL = "http://127.0.0.1:8080/mcp";
const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const money = (atomic: string, decimals: number) => {
  const amount = Number(atomic) / 10 ** decimals;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(amount);
};

function CodexLogo({ size = 24 }: { size?: number }) {
  return (
    <svg role="img" aria-label="OpenAI Codex" width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

function AgentPanel({
  locale,
  capabilities,
  status,
  tools,
  loading,
  error,
  onRefresh
}: {
  locale: Locale;
  capabilities: AgentCapabilities | null;
  status: McpStatusResponse | null;
  tools: McpToolDescriptor[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [client, setClient] = useState<AgentClient>("claude");
  const [signerMode, setSignerMode] = useState<AgentSignerMode>("local");
  const [copied, setCopied] = useState<"setup" | "prompt" | null>(null);
  const serviceReady = status?.state === "READY";
  const paidTool = tools.find((tool) => tool.name === "vector52_wallet_flow");
  const atomicPrice = paidTool?.price_atomic ?? capabilities?.amount_atomic;
  const decimals = capabilities?.asset_decimals ?? 6;
  const displayPrice = capabilities?.amount_display ?? (atomicPrice ? money(atomicPrice, decimals) : "—");
  const receiver = capabilities?.pay_to;
  const mcpUrl = signerMode === "local" ? LOCAL_MCP_URL : REMOTE_MCP_URL;
  const promptReady = Boolean(receiver && atomicPrice && (signerMode === "local" || serviceReady));

  const setupByClient: Record<AgentClient, string> = {
    claude: `claude mcp add --transport http vector52 ${mcpUrl}`,
    codex: `[mcp_servers.vector52]\nurl = "${mcpUrl}"\nstartup_timeout_sec = 20\ntool_timeout_sec = 120`,
    opencode: `opencode mcp add vector52 --global --url ${mcpUrl}`,
    cursor: JSON.stringify({ mcpServers: { vector52: { url: mcpUrl } } }, null, 2),
    generic: JSON.stringify({ mcpServers: { vector52: { type: "http", url: mcpUrl } } }, null, 2)
  };
  const setup = setupByClient[client];
  const testPrompt = locale === "es"
    ? `Usa vector52_status sin pagar. Confirma estado READY, pay_to ${receiver ?? "[RECEPTOR]"} y precio ${atomicPrice ?? "[PRECIO]"} atómicos. Si coinciden, ejecuta vector52_wallet_flow una sola vez con targetAddress [WALLET], limit 10 y maxPaymentUsdc ${displayPrice}. Muestra receptor, importe, txHash, request_id, ingresos y egresos. No repitas el pago.`
    : `Call vector52_status without paying. Confirm READY, pay_to ${receiver ?? "[RECIPIENT]"}, and ${atomicPrice ?? "[PRICE]"} atomic units. If they match, call vector52_wallet_flow exactly once with targetAddress [WALLET], limit 10, and maxPaymentUsdc ${displayPrice}. Return recipient, amount, txHash, request_id, incoming, and outgoing counts. Do not repeat the payment.`;

  const copy = async (value: string, kind: "setup" | "prompt") => {
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  };

  return (
    <div className="agent-connect-panel">
      <div className={`mcp-live-status state-${status?.state.toLowerCase() ?? "checking"}`}>
        <span className="mcp-live-pulse" aria-hidden="true" />
        <div>
          <small>VECTOR52 AGENT GATEWAY</small>
          <strong>{loading ? (locale === "es" ? "Verificando servicio…" : "Checking service…") : status?.state ?? "UNREACHABLE"}</strong>
          <p>{error ?? status?.reason ?? (locale === "es" ? "Esperando respuesta del backend." : "Waiting for the backend.")}</p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} aria-label={locale === "es" ? "Actualizar estado MCP" : "Refresh MCP status"}>
          <RefreshCw className={loading ? "spin" : ""} size={16} />
        </button>
      </div>

      <div className="agent-client-grid" role="listbox" aria-label="MCP client">
        <button type="button" aria-selected={client === "claude"} onClick={() => setClient("claude")}>
          <span className="claude-mark"><SiClaude size={24} color="#D97757" /></span><strong>Claude</strong><small>Claude Code / Desktop</small>
        </button>
        <button type="button" aria-selected={client === "codex"} onClick={() => setClient("codex")}>
          <span className="codex-mark"><CodexLogo size={23} /></span><strong>Codex</strong><small>config.toml</small>
        </button>
        <button type="button" aria-selected={client === "opencode"} onClick={() => setClient("opencode")}>
          <span className="opencode-mark"><SiOpencode size={24} color="#1f1f1f" /></span><strong>OpenCode</strong><small>CLI · Streamable HTTP</small>
        </button>
        <button type="button" aria-selected={client === "cursor"} onClick={() => setClient("cursor")}>
          <span className="cursor-mark"><SiCursor size={23} color="#111827" /></span><strong>Cursor</strong><small>.cursor/mcp.json</small>
        </button>
        <button type="button" aria-selected={client === "generic"} onClick={() => setClient("generic")}>
          <span className="generic-mark"><Bot size={22} /></span><strong>Other</strong><small>Streamable HTTP</small>
        </button>
      </div>

      <div className="agent-signer-choice" role="radiogroup" aria-label={locale === "es" ? "Origen del pago del agente" : "Agent payment source"}>
        <button type="button" role="radio" aria-checked={signerMode === "local"} onClick={() => setSignerMode("local")}>
          <Laptop size={18} />
          <span><strong>{locale === "es" ? "Mi signer local" : "My local signer"}</strong><small>{locale === "es" ? "Paga mi wallet de prueba" : "My test wallet pays"}</small></span>
          <b>{locale === "es" ? "RECOMENDADO" : "RECOMMENDED"}</b>
        </button>
        <button type="button" role="radio" aria-checked={signerMode === "team-demo"} onClick={() => setSignerMode("team-demo")}>
          <Server size={18} />
          <span><strong>{locale === "es" ? "Gateway del equipo" : "Team gateway"}</strong><small>{locale === "es" ? "Solo demostración controlada" : "Controlled demo only"}</small></span>
        </button>
      </div>

      {signerMode === "local" ? (
        <div className="agent-secret-boundary">
          <KeyRound size={18} />
          <div>
            <strong>{locale === "es" ? "La clave queda en tu equipo" : "The key stays on your device"}</strong>
            <p>{locale === "es"
              ? "Ejecuta v52-mcp localmente y configura una wallet burner de Fuji en su archivo .env ignorado por Git. Nunca pegues una private key en Vector52, Codex, Claude, OpenCode ni en un prompt."
              : "Run v52-mcp locally and configure a Fuji burner wallet in its Git-ignored .env file. Never paste a private key into Vector52, Codex, Claude, OpenCode, or a prompt."}</p>
            <code>Copy-Item .env.example .env · npm install · npm run dev</code>
          </div>
        </div>
      ) : (
        <div className="agent-secret-boundary is-demo">
          <Server size={18} />
          <div>
            <strong>{locale === "es" ? "El servidor paga con la wallet del equipo" : "The server pays with the team wallet"}</strong>
            <p>{locale === "es"
              ? "Este modo no representa una cuenta multiusuario: todos comparten el signer configurado en Railway. Úsalo únicamente para la demo de la Buildathon con límites estrictos."
              : "This is not a multi-user account: every caller shares the signer configured in Railway. Use it only for the Buildathon demo with strict limits."}</p>
          </div>
        </div>
      )}

      <div className="mcp-endpoint-card">
        <div className="mcp-endpoint-head">
          <span><Network size={15} /> {signerMode === "local" ? "VECTOR52 LOCAL MCP" : status?.service ?? "VECTOR52 REMOTE MCP"}{signerMode === "team-demo" && status?.version ? ` · ${status.version}` : ""}</span>
          <b className={signerMode === "local" || serviceReady ? "ready" : "pending"}>{signerMode === "local" ? "LOCAL SIGNER" : serviceReady ? "SERVICE READY" : "NOT VERIFIED"}</b>
        </div>
        <code>{setup}</code>
        <button type="button" onClick={() => void copy(setup, "setup")}><Clipboard size={15} /> {copied === "setup" ? "Copied" : "Copy setup"}</button>
      </div>

      <div className="mcp-payment-facts">
        <div><small>{locale === "es" ? "PRECIO POR PETICIÓN" : "PRICE PER REQUEST"}</small><strong>{displayPrice} <span>USDC Fuji</span></strong></div>
        <div><small>PAY TO</small><code title={receiver}>{receiver ? short(receiver) : "Not announced"}</code></div>
        <div><small>{locale === "es" ? "MODELO" : "MODEL"}</small><strong>{capabilities?.billing_model ?? "PER_REQUEST"}</strong></div>
      </div>

      {tools.length ? (
        <div className="mcp-tool-list">
          <div><span>{locale === "es" ? "TOOLS VERIFICADAS" : "VERIFIED TOOLS"}</span><b>{tools.length}</b></div>
          {tools.map((tool) => (
            <article key={tool.name}>
              <code>{tool.name}</code>
              <p>{tool.description}</p>
              <span className={tool.payment === "X402" ? "paid" : "free"}>{tool.payment}</span>
            </article>
          ))}
        </div>
      ) : null}

      <div className="mcp-test-prompt">
        <div><Sparkles size={15} /><span>{locale === "es" ? "PROMPT DE PRUEBA SEGURA" : "SAFE TEST PROMPT"}</span></div>
        <p>{testPrompt}</p>
        <button type="button" disabled={!promptReady} onClick={() => void copy(testPrompt, "prompt")}>
          <Clipboard size={14} /> {copied === "prompt" ? (locale === "es" ? "Copiado" : "Copied") : (locale === "es" ? "Copiar prompt" : "Copy prompt")}
        </button>
      </div>

      <div className="agent-flow-steps">
        <span><b>01</b>{locale === "es" ? "Añade Vector52" : "Add Vector52"}</span>
        <i />
        <span><b>02</b>{locale === "es" ? "El agente descubre tools" : "Agent discovers tools"}</span>
        <i />
        <span><b>03</b>{locale === "es" ? "x402 paga al ejecutar" : "x402 pays on execution"}</span>
      </div>
      <p className="agent-disclaimer"><ShieldCheck size={16} /> {locale === "es" ? "La PWA no recibe secretos. El signer MCP valida red, token, importe y receptor antes de autorizar una sola petición x402." : "The PWA receives no secrets. The MCP signer validates network, token, amount, and recipient before authorizing one x402 request."}</p>
      <a className="mcp-doc-link" href="https://docs.anthropic.com/en/docs/claude-code/mcp" target="_blank" rel="noreferrer">Claude MCP docs <ExternalLink size={14} /></a>
    </div>
  );
}

export function ConnectHub({ locale, open, initialMode = "web", session, webCapabilities, agentCapabilities, mcpStatus, mcpTools, mcpLoading, mcpError, onRefreshMcp, onClose, onSession }: Props) {
  const [mode, setMode] = useState<AccessMode>("web");
  const webPaymentReady = Boolean(webCapabilities?.ready && webCapabilities.pay_to);
  const webPrice = webCapabilities?.amount_display
    ?? (webCapabilities?.amount_atomic
      ? money(webCapabilities.amount_atomic, webCapabilities.asset_decimals ?? 6)
      : "—");

  useEffect(() => {
    if (open) setMode(initialMode);
  }, [initialMode, open]);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.body.classList.add("modal-open");
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);

  const title = useMemo(() => mode === "web"
    ? (locale === "es" ? "Conecta tu wallet" : "Connect your wallet")
    : (locale === "es" ? "Conecta tu agente" : "Connect your agent"), [locale, mode]);

  if (!open) return null;
  return (
    <div className="connect-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="connect-dialog" role="dialog" aria-modal="true" aria-labelledby="connect-title">
        <header className="connect-dialog-header">
          <div><span className="connect-kicker">VECTOR52 ACCESS CONTROL</span><h2 id="connect-title">{title}</h2></div>
          <button type="button" aria-label={locale === "es" ? "Cerrar" : "Close"} onClick={onClose}><X size={20} /></button>
        </header>

        <div className="connect-mode-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "web"} onClick={() => setMode("web")}><Globe2 size={17} /><span><strong>Web Wallet</strong><small>{locale === "es" ? "Interactivo" : "Interactive"}</small></span></button>
          <button type="button" role="tab" aria-selected={mode === "agent"} onClick={() => setMode("agent")}><Bot size={17} /><span><strong>MCP Agent</strong><small>{locale === "es" ? "Autónomo" : "Autonomous"}</small></span></button>
        </div>

        <div className="connect-dialog-body">
          {mode === "web" ? (
            <>
              <div className="connect-intro"><WalletCards size={20} /><div><strong>{locale === "es" ? "Conecta y revisa tu saldo" : "Connect and review your balance"}</strong><span>{locale === "es" ? "Aquí solo administras la cuenta. La firma de sesión y el pago ocurren al pulsar Investigar." : "This panel only manages the account. Session and payment signatures happen when you press Investigate."}</span></div></div>
              <WalletAccess locale={locale} session={session} onSession={onSession} />
              <div className={`web-payment-contract ${webPaymentReady ? "is-ready" : "is-pending"}`}>
                <div className="web-payment-icon"><CircleDollarSign size={22} /></div>
                <div>
                  <small>PAY PER INVESTIGATION · AVALANCHE FUJI</small>
                  <strong>{webPrice} USDC</strong>
                  <p>{locale === "es"
                    ? "Al pulsar Investigar, Vector52 solicita la firma x402, liquida el pago y recién entonces ejecuta el análisis. No existen créditos ni cobros ocultos."
                    : "When you press Investigate, Vector52 requests the x402 signature, settles the payment, and only then runs the analysis. There are no credits or hidden charges."}</p>
                </div>
                <span>{webPaymentReady ? "READY" : "NOT READY"}</span>
              </div>
              {webCapabilities?.pay_to ? (
                <div className="web-payment-recipient">
                  <ShieldCheck size={15} />
                  <span>{locale === "es" ? "Receptor verificado" : "Verified recipient"}</span>
                  <code title={webCapabilities.pay_to}>{short(webCapabilities.pay_to)}</code>
                </div>
              ) : null}
            </>
          ) : <AgentPanel locale={locale} capabilities={agentCapabilities} status={mcpStatus} tools={mcpTools} loading={mcpLoading} error={mcpError} onRefresh={onRefreshMcp} />}
        </div>
      </section>
    </div>
  );
}
