import { useEffect, useMemo, useState } from "react";
import { SiClaude } from "@icons-pack/react-simple-icons";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clipboard,
  Code2,
  ExternalLink,
  Globe2,
  LoaderCircle,
  Network,
  ShieldCheck,
  Sparkles,
  WalletCards,
  X
} from "lucide-react";
import { useChainId, useSwitchChain, useWalletClient } from "wagmi";
import { vector52Client } from "../api/vector52Client";
import type { AccessPlan, AgentCapabilities, CreditBalance, WalletSession } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import { reownConfigured } from "../web3/appkit";
import { purchaseWithX402 } from "../web3/x402Payment";
import { WalletAccess } from "./WalletAccess";

interface Props {
  locale: Locale;
  open: boolean;
  initialMode?: AccessMode;
  session: WalletSession | null;
  agentCapabilities: AgentCapabilities | null;
  onClose: () => void;
  onSession: (session: WalletSession | null) => void;
  onCredits: (credits: number | null) => void;
}

type AccessMode = "web" | "agent";
type AgentClient = "claude" | "codex" | "generic";

const MCP_URL = (import.meta.env.VITE_MCP_SERVER_URL ?? "http://localhost:8080/mcp").trim();
const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
const money = (atomic: string, decimals: number) => {
  const amount = Number(atomic) / 10 ** decimals;
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: decimals }).format(amount);
};

function WebPlanPanel({
  locale,
  session,
  onCredits
}: {
  locale: Locale;
  session: WalletSession;
  onCredits: (credits: number | null) => void;
}) {
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { switchChainAsync } = useSwitchChain();
  const [plan, setPlan] = useState<AccessPlan | null>(null);
  const [balance, setBalance] = useState<CreditBalance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  const refreshBalance = async () => {
    const next = await vector52Client.creditBalance(session.access_token);
    setBalance(next);
    onCredits(next.available);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      vector52Client.accessPlans(),
      vector52Client.creditBalance(session.access_token)
    ]).then(([plans, nextBalance]) => {
      if (!active) return;
      setPlan(plans.plans[0] ?? null);
      setBalance(nextBalance);
      onCredits(nextBalance.available);
    }).catch((nextError) => {
      if (active) setError(nextError instanceof Error ? nextError.message : "Unable to load access plan.");
    });
    return () => { active = false; };
  }, [session.access_token]);

  const purchase = async () => {
    if (!plan || !walletClient) return;
    setBusy(true);
    setError(null);
    setSettled(false);
    try {
      if (chainId !== 43113) await switchChainAsync({ chainId: 43113 });
      await purchaseWithX402(walletClient, plan, session.access_token);
      await refreshBalance();
      setSettled(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Payment could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  if (!plan) {
    return <div className="connect-loading"><LoaderCircle className="spin" size={18} /> Loading server plan…</div>;
  }

  const price = money(plan.price_atomic, plan.asset_decimals);
  return (
    <div className="web-plan-panel">
      <div className="credit-meter">
        <div><span>{locale === "es" ? "CONSULTAS DISPONIBLES" : "AVAILABLE REQUESTS"}</span><strong>{balance?.available ?? "—"}</strong></div>
        <div className="credit-meter-track"><i style={{ width: `${Math.min(100, ((balance?.available ?? 0) / plan.requests) * 100)}%` }} /></div>
        <small>{short(session.address)} · {chainId === 43113 ? "Avalanche Fuji" : "Switch to Fuji at checkout"}</small>
      </div>

      <article className="plan-card">
        <div className="plan-card-top">
          <span><Sparkles size={15} /> BUILDATHON PASS</span>
          <b>{plan.enabled ? "LIVE" : "NOT READY"}</b>
        </div>
        <h3>{plan.name}</h3>
        <p>{locale === "es" ? "Un pago verificable, treinta investigaciones web." : "One verifiable payment, thirty web investigations."}</p>
        <div className="plan-price"><strong>{price}</strong><span>USDC</span><small>/ {plan.requests} requests</small></div>
        <ul>
          <li><Check size={15} /> x402 Exact payment</li>
          <li><Check size={15} /> Avalanche Fuji Testnet</li>
          <li><Check size={15} /> No subscription · no custody</li>
        </ul>
        <button className="purchase-action" type="button" disabled={busy || !plan.enabled || !walletClient} onClick={() => void purchase()}>
          {busy ? <LoaderCircle className="spin" size={17} /> : <CircleDollarSign size={17} />}
          {busy
            ? (locale === "es" ? "Autorizando pago…" : "Authorizing payment…")
            : `${locale === "es" ? "Pagar" : "Pay"} ${price} USDC · ${locale === "es" ? "activar" : "activate"} ${plan.requests}`}
          {!busy ? <ChevronRight size={16} /> : null}
        </button>
        <small className="purchase-note">{locale === "es" ? "Tu wallet siempre muestra y autoriza el pago. Vector52 nunca recibe tu clave." : "Your wallet always displays and authorizes the payment. Vector52 never receives your key."}</small>
      </article>
      {settled ? <p className="connect-success"><CheckCircle2 size={16} /> {locale === "es" ? "Pago liquidado. Créditos acreditados." : "Payment settled. Credits granted."}</p> : null}
      {error ? <p className="connect-error">{error}</p> : null}
    </div>
  );
}

function AgentPanel({ locale, capabilities }: { locale: Locale; capabilities: AgentCapabilities | null }) {
  const [client, setClient] = useState<AgentClient>("claude");
  const [copied, setCopied] = useState(false);
  const command = `claude mcp add --transport http vector52 ${MCP_URL}`;
  const config = JSON.stringify({ mcpServers: { vector52: { type: "http", url: MCP_URL } } }, null, 2);
  const content = client === "claude" ? command : config;

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="agent-connect-panel">
      <div className="agent-client-grid" role="listbox" aria-label="MCP client">
        <button type="button" aria-selected={client === "claude"} onClick={() => setClient("claude")}>
          <span className="claude-mark"><SiClaude size={24} color="#D97757" /></span><strong>Claude</strong><small>Claude Code / Desktop</small>
        </button>
        <button type="button" aria-selected={client === "codex"} onClick={() => setClient("codex")}>
          <span className="codex-mark"><Code2 size={22} /></span><strong>Codex</strong><small>MCP config</small>
        </button>
        <button type="button" aria-selected={client === "generic"} onClick={() => setClient("generic")}>
          <span className="generic-mark"><Bot size={22} /></span><strong>Other</strong><small>Streamable HTTP</small>
        </button>
      </div>

      <div className="mcp-endpoint-card">
        <div className="mcp-endpoint-head">
          <span><Network size={15} /> VECTOR52 REMOTE MCP</span>
          <b className={capabilities?.ready ? "ready" : "pending"}>{capabilities?.ready ? "x402 READY" : "CORE PENDING"}</b>
        </div>
        <code>{content}</code>
        <button type="button" onClick={() => void copy()}><Clipboard size={15} /> {copied ? "Copied" : "Copy setup"}</button>
      </div>

      <div className="agent-flow-steps">
        <span><b>01</b>{locale === "es" ? "Añade Vector52" : "Add Vector52"}</span>
        <i />
        <span><b>02</b>{locale === "es" ? "Claude descubre tools" : "Claude discovers tools"}</span>
        <i />
        <span><b>03</b>{locale === "es" ? "x402 paga al ejecutar" : "x402 pays on execution"}</span>
      </div>
      <p className="agent-disclaimer"><ShieldCheck size={16} /> {locale === "es" ? "El agente firma desde su wallet. La web no instala software, no custodia llaves y no afirma conexión hasta que el cliente confirme el servidor." : "The agent signs from its wallet. The web installs no software, holds no keys, and claims no connection until the client confirms the server."}</p>
      <a className="mcp-doc-link" href="https://docs.anthropic.com/en/docs/claude-code/mcp" target="_blank" rel="noreferrer">Claude MCP docs <ExternalLink size={14} /></a>
    </div>
  );
}

export function ConnectHub({ locale, open, initialMode = "web", session, agentCapabilities, onClose, onSession, onCredits }: Props) {
  const [mode, setMode] = useState<AccessMode>("web");

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
              <div className="connect-intro"><WalletCards size={20} /><div><strong>{locale === "es" ? "Tu wallet es tu sesión" : "Your wallet is your session"}</strong><span>{locale === "es" ? "Conecta y firma un mensaje gratuito. No es una transacción." : "Connect and sign a free message. This is not a transaction."}</span></div></div>
              <WalletAccess locale={locale} session={session} onSession={onSession} />
              {session && reownConfigured ? <WebPlanPanel locale={locale} session={session} onCredits={onCredits} /> : null}
            </>
          ) : <AgentPanel locale={locale} capabilities={agentCapabilities} />}
        </div>
      </section>
    </div>
  );
}
