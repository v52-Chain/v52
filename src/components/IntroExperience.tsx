import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Fingerprint,
  Pause,
  Play,
  Radar,
  Route,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import type { Locale } from "../domain/locale";

interface Props {
  locale: Locale;
  onLocale: (locale: Locale) => void;
  onEnter: () => void;
}

const SLIDE_MS = 5200;

function IncidentVisual({ locale }: { locale: Locale }) {
  return (
    <div className="intro-visual incident-visual" aria-hidden="true">
      <div className="clay-orb orb-violet" />
      <div className="clay-orb orb-coral" />
      <article className="incident-ticket clay-card">
        <span className="ticket-label">{locale === "es" ? "NUEVO CASO" : "NEW CASE"}</span>
        <strong>{locale === "es" ? "Transferencia no autorizada" : "Unauthorized transfer"}</strong>
        <div className="ticket-value">50,000 <small>USDT</small></div>
        <div className="ticket-address"><WalletCards size={17} />0x5C18…4135C</div>
      </article>
      <div className="trace-pulse"><Radar size={28} /><i /><i /></div>
      <article className="found-card clay-card"><CheckCircle2 size={19} /><span>{locale === "es" ? "Primera ruta observable" : "First observable route"}</span><strong>3 HOPS</strong></article>
    </div>
  );
}

function EvidenceVisual({ locale }: { locale: Locale }) {
  return (
    <div className="intro-visual evidence-visual" aria-hidden="true">
      <div className="mini-flow-card clay-card source"><span>A</span><small>{locale === "es" ? "ORIGEN" : "SOURCE"}</small></div>
      <div className="mini-flow-line line-one" />
      <div className="mini-flow-core"><Fingerprint size={36} /><b>V52</b></div>
      <div className="mini-flow-line line-two" />
      <div className="mini-flow-card clay-card exchange"><span>B</span><small>EXCHANGE</small></div>
      <article className="evidence-receipt clay-card">
        <span><ShieldCheck size={16} /> EVIDENCE RECEIPT</span>
        <dl><div><dt>TX</dt><dd>0xa84f…92c1</dd></div><div><dt>STATUS</dt><dd>OBSERVED</dd></div><div><dt>LIMIT</dt><dd>UNKNOWN VISIBLE</dd></div></dl>
      </article>
    </div>
  );
}

function AccessVisual({ locale }: { locale: Locale }) {
  return (
    <div className="intro-visual access-visual" aria-hidden="true">
      <article className="access-choice clay-card web-choice"><WalletCards size={24} /><span>WEB WALLET</span><strong>{locale === "es" ? "Investiga visualmente" : "Investigate visually"}</strong></article>
      <article className="access-choice clay-card agent-choice"><Bot size={24} /><span>MCP AGENT</span><strong>{locale === "es" ? "Pregunta en lenguaje natural" : "Ask in natural language"}</strong></article>
      <div className="access-bridge"><i /><Route size={25} /><i /></div>
      <article className="result-pill"><CheckCircle2 size={18} /><span>{locale === "es" ? "Una evidencia. Dos formas de operar." : "One evidence core. Two ways to operate."}</span></article>
    </div>
  );
}

export function IntroExperience({ locale, onLocale, onEnter }: Props) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const timer = window.setTimeout(() => {
      if (active < 2) setActive((current) => current + 1);
      else onEnter();
    }, SLIDE_MS);
    return () => window.clearTimeout(timer);
  }, [active, onEnter, paused]);

  const slides = locale === "es" ? [
    {
      eyebrow: "CUANDO ALGO SALE MAL",
      title: <>Perdiste cripto.<br /><em>La pista puede seguir onchain.</em></>,
      body: "Empieza con una wallet y una fecha. Vector52 reconstruye el flujo observable sin exigir que seas investigador blockchain.",
      visual: <IncidentVisual locale={locale} />
    },
    {
      eyebrow: "EVIDENCIA ANTES QUE NARRATIVA",
      title: <>Sigue la ruta.<br /><em>Conserva la prueba.</em></>,
      body: "Cada conexión conduce a una transferencia verificable. Cuando la evidencia termina, Vector52 responde UNKNOWN en lugar de inventar una conclusión.",
      visual: <EvidenceVisual locale={locale} />
    },
    {
      eyebrow: "TU INVESTIGACIÓN, TU FORMA",
      title: <>Explora en la web.<br /><em>O pregunta a tu agente.</em></>,
      body: "Usa el mapa visual con tu wallet o conecta Claude, Codex u otro cliente MCP para solicitar análisis en lenguaje natural y pagar mediante x402.",
      visual: <AccessVisual locale={locale} />
    }
  ] : [
    {
      eyebrow: "WHEN SOMETHING GOES WRONG",
      title: <>You lost crypto.<br /><em>The trail may continue onchain.</em></>,
      body: "Start with a wallet and a date. Vector52 reconstructs the observable flow without requiring blockchain investigation expertise.",
      visual: <IncidentVisual locale={locale} />
    },
    {
      eyebrow: "EVIDENCE BEFORE NARRATIVE",
      title: <>Follow the route.<br /><em>Preserve the proof.</em></>,
      body: "Every connection leads to a verifiable transfer. When evidence ends, Vector52 returns UNKNOWN instead of inventing a conclusion.",
      visual: <EvidenceVisual locale={locale} />
    },
    {
      eyebrow: "YOUR INVESTIGATION, YOUR WAY",
      title: <>Explore on the web.<br /><em>Or ask your agent.</em></>,
      body: "Use the visual map with your wallet or connect Claude, Codex, or another MCP client to request analysis in natural language and pay through x402.",
      visual: <AccessVisual locale={locale} />
    }
  ];

  return (
    <main className="intro-experience">
      <div className="intro-ambient ambient-one" /><div className="intro-ambient ambient-two" />
      <header className="intro-corner-bar">
        <div className="intro-brand"><span>V</span><div><strong>VECTOR52</strong><small>FORENSIC INTELLIGENCE</small></div></div>
        <div className="intro-tools">
          <div className="intro-language"><button type="button" aria-pressed={locale === "es"} onClick={() => onLocale("es")}>ES</button><button type="button" aria-pressed={locale === "en"} onClick={() => onLocale("en")}>EN</button></div>
          <button className="intro-skip" type="button" onClick={onEnter}>{locale === "es" ? "Omitir intro" : "Skip intro"}<ArrowRight size={15} /></button>
        </div>
      </header>

      <section className="intro-stage" aria-live="polite">
        {slides.map((slide, index) => (
          <article className={`intro-slide ${active === index ? "is-active" : ""}`} key={index} aria-hidden={active !== index}>
            <div className="intro-copy">
              <p className="intro-eyebrow"><span>0{index + 1}</span>{slide.eyebrow}</p>
              <h1>{slide.title}</h1>
              <p>{slide.body}</p>
              {index === 2 ? <button type="button" className="intro-enter" onClick={onEnter}>{locale === "es" ? "Abrir Vector52" : "Open Vector52"}<ArrowRight size={19} /></button> : null}
            </div>
            {slide.visual}
          </article>
        ))}
      </section>

      <footer className="intro-controls">
        <button type="button" className="intro-pause" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Play" : "Pause"}>{paused ? <Play size={16} /> : <Pause size={16} />}</button>
        <div className="intro-dots">
          {slides.map((_, index) => <button key={index} type="button" aria-label={`Slide ${index + 1}`} aria-current={active === index} onClick={() => setActive(index)}><i className={paused ? "is-paused" : ""} /></button>)}
        </div>
        <span>{active + 1} / {slides.length}</span>
      </footer>
    </main>
  );
}
