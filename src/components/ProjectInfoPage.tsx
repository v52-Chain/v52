import { ArrowLeft, ArrowRight, Bot, CheckCircle2, CircleAlert, FileCheck2, Route, Search, ShieldCheck, Users, WalletCards } from "lucide-react";
import type { Locale } from "../domain/locale";

interface Props {
  locale: Locale;
  onLocale: (locale: Locale) => void;
  onLaunch: () => void;
  onIntro: () => void;
}

export function ProjectInfoPage({ locale, onLocale, onLaunch, onIntro }: Props) {
  const es = locale === "es";
  return (
    <div className="project-page">
      <header className="project-topbar">
        <button className="brand brand-button" type="button" onClick={onIntro}><span className="brand-mark">V</span><span><strong>VECTOR52</strong><small>FORENSIC FLOW</small></span></button>
        <nav aria-label={es ? "Navegación del proyecto" : "Project navigation"}>
          <button type="button" className="is-active"><FileCheck2 size={16} />{es ? "El proyecto" : "The project"}</button>
          <button type="button" onClick={onLaunch}><Search size={16} />{es ? "Investigar" : "Investigate"}</button>
        </nav>
        <div className="project-actions"><div className="language-switch"><button type="button" aria-pressed={es} onClick={() => onLocale("es")}>ES</button><button type="button" aria-pressed={!es} onClick={() => onLocale("en")}>EN</button></div><button type="button" className="project-launch-small" onClick={onLaunch}>{es ? "Abrir app" : "Open app"}<ArrowRight size={16} /></button></div>
      </header>

      <main className="project-content">
        <section className="project-hero">
          <div><button className="back-link" type="button" onClick={onLaunch}><ArrowLeft size={15} />{es ? "Volver al workspace" : "Back to workspace"}</button><p className="eyebrow">WHY VECTOR52</p><h1>{es ? "Una pérdida cripto necesita una ruta de acción, no otro dashboard." : "A crypto loss needs a path to action, not another dashboard."}</h1><p>{es ? "Vector52 transforma datos públicos onchain en una investigación navegable: qué observamos, qué podemos demostrar, dónde termina la evidencia y qué debe hacer el analista después." : "Vector52 turns public onchain data into a navigable investigation: what we observed, what can be proven, where evidence ends, and what an analyst should do next."}</p><button type="button" className="primary-link" onClick={onLaunch}>{es ? "Iniciar una investigación" : "Start an investigation"}<ArrowRight size={18} /></button></div>
          <div className="project-case-stack" aria-hidden="true"><article className="clay-card"><span>01</span><Route size={24} /><strong>{es ? "Ruta observable" : "Observable route"}</strong><small>Wallet → DEX → Exchange</small></article><article className="clay-card"><span>02</span><ShieldCheck size={24} /><strong>{es ? "Evidencia preservada" : "Preserved evidence"}</strong><small>TX · block · source · hash</small></article><article className="clay-card"><span>03</span><Bot size={24} /><strong>{es ? "Agente guiado" : "Guided agent"}</strong><small>MCP · rules · x402</small></article></div>
        </section>

        <section className="project-section">
          <div className="section-heading"><p className="eyebrow">THE REAL PROBLEM</p><h2>{es ? "Los exploradores muestran movimientos. Las víctimas necesitan entender el caso." : "Explorers show movements. Victims need to understand the case."}</h2></div>
          <div className="project-problem-grid">
            <article className="soft-card coral"><CircleAlert size={22} /><h3>{es ? "Incidente urgente" : "Urgent incident"}</h3><p>{es ? "Una transferencia no autorizada deja hashes, wallets y ansiedad, pero no una ruta clara para actuar." : "An unauthorized transfer leaves hashes, wallets and anxiety, but no clear path to act."}</p></article>
            <article className="soft-card violet"><Users size={22} /><h3>{es ? "Expertise inaccesible" : "Inaccessible expertise"}</h3><p>{es ? "El análisis suele depender de especialistas costosos y herramientas diseñadas para equipos de inteligencia." : "Analysis often depends on expensive specialists and tools designed for intelligence teams."}</p></article>
            <article className="soft-card cyan"><FileCheck2 size={22} /><h3>{es ? "Conclusiones sin expediente" : "Claims without a case file"}</h3><p>{es ? "Un grafo llamativo no basta para contactar a un exchange, documentar el evento o sostener una afirmación." : "A compelling graph is not enough to contact an exchange, document the event, or support a claim."}</p></article>
          </div>
        </section>

        <section className="project-section project-flow-section">
          <div className="section-heading"><p className="eyebrow">HOW IT WORKS</p><h2>{es ? "De un dato simple a una investigación verificable." : "From one simple detail to a verifiable investigation."}</h2></div>
          <div className="project-flow-steps">
            <article><span>01</span><WalletCards /><h3>{es ? "Describe o pega" : "Describe or paste"}</h3><p>{es ? "Wallet, transacción, fecha y contexto conocido." : "Wallet, transaction, date and known context."}</p></article>
            <i />
            <article><span>02</span><Route /><h3>{es ? "Reconstruye" : "Reconstruct"}</h3><p>{es ? "Entradas, salidas, hops y servicios observables." : "Inputs, outputs, hops and observable services."}</p></article>
            <i />
            <article><span>03</span><ShieldCheck /><h3>{es ? "Separa" : "Separate"}</h3><p>{es ? "Evidencia, claim, hipótesis y unknown." : "Evidence, claim, hypothesis and unknown."}</p></article>
            <i />
            <article><span>04</span><FileCheck2 /><h3>{es ? "Entrega" : "Deliver"}</h3><p>{es ? "Expediente verificable para el siguiente paso." : "Verifiable case file for the next step."}</p></article>
          </div>
        </section>

        <section className="arkham-section">
          <div><p className="eyebrow">WHY NOT JUST ARKHAM?</p><h2>{es ? "Vector52 no reemplaza a Arkham. Convierte inteligencia en un proceso forense." : "Vector52 does not replace Arkham. It turns intelligence into a forensic process."}</h2><p>{es ? "Arkham y los exploradores son fuentes útiles para descubrir actividad. Vector52 añade una capa orientada al caso: intake para no expertos, filtros reproducibles, reglas de atribución, procedencia, límites explícitos y acceso mediante el agente del usuario." : "Arkham and explorers are useful sources for discovering activity. Vector52 adds a case-oriented layer: non-expert intake, reproducible filters, attribution rules, provenance, explicit limits, and access through the user's own agent."}</p></div>
          <div className="comparison-card"><div><span>{es ? "EXPLORADOR / INTELLIGENCE" : "EXPLORER / INTELLIGENCE"}</span><p>{es ? "Descubrir wallets, entidades y actividad." : "Discover wallets, entities and activity."}</p></div><ArrowRight /><div><span>VECTOR52</span><p>{es ? "Construir, explicar y verificar un expediente." : "Build, explain and verify a case file."}</p></div></div>
        </section>

        <section className="truth-section">
          <div><ShieldCheck size={28} /><h2>{es ? "Lo que sí prometemos" : "What we do promise"}</h2><ul><li><CheckCircle2 />{es ? "Cada arista enlazada a su transacción fuente." : "Every edge linked to its source transaction."}</li><li><CheckCircle2 />{es ? "Reglas y límites visibles." : "Visible rules and limits."}</li><li><CheckCircle2 />{es ? "UNKNOWN como resultado válido." : "UNKNOWN as a valid result."}</li></ul></div>
          <div><CircleAlert size={28} /><h2>{es ? "Lo que no prometemos" : "What we do not promise"}</h2><ul><li><CircleAlert />{es ? "Identificar personas solo por una wallet." : "Identifying people from a wallet alone."}</li><li><CircleAlert />{es ? "Rastrear después de todo privacy boundary." : "Tracing beyond every privacy boundary."}</li><li><CircleAlert />{es ? "Recuperación automática o garantizada." : "Automatic or guaranteed recovery."}</li></ul></div>
        </section>

        <section className="project-cta"><div><p className="eyebrow">OPEN A CASE</p><h2>{es ? "Empieza con lo que sabes." : "Start with what you know."}</h2><p>{es ? "Una wallet y una fecha son suficientes para abrir la primera vista del flujo." : "A wallet and a date are enough to open the first view of the flow."}</p></div><button type="button" onClick={onLaunch}>{es ? "Abrir Vector52" : "Open Vector52"}<ArrowRight size={18} /></button></section>
      </main>
    </div>
  );
}
