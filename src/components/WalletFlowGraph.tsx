import { useMemo, useState } from "react";
import type { FlowTransfer, WalletFlowResult } from "../domain/apiTypes";

interface FlowNode {
  key: string;
  address: string;
  asset: string;
  direction: "IN" | "OUT";
  count: number;
  total: number | null;
  transfers: FlowTransfer[];
}

const short = (address: string) => address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
const displayAmount = (value: number | null, asset: string) =>
  value === null ? asset : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value)} ${asset}`;

function aggregate(transfers: FlowTransfer[], direction: "IN" | "OUT"): FlowNode[] {
  const nodes = new Map<string, FlowNode>();
  for (const transfer of transfers) {
    const key = `${transfer.counterparty}:${transfer.asset}:${direction}`;
    const numeric = transfer.value === null || transfer.value === undefined ? null : Number(transfer.value);
    const current = nodes.get(key) ?? {
      key,
      address: transfer.counterparty,
      asset: transfer.asset,
      direction,
      count: 0,
      total: 0,
      transfers: []
    };
    current.count += 1;
    current.transfers.push(transfer);
    if (numeric === null || !Number.isFinite(numeric)) current.total = null;
    else if (current.total !== null) current.total += numeric;
    nodes.set(key, current);
  }
  return [...nodes.values()].sort((a, b) => b.count - a.count).slice(0, 10);
}

const yFor = (index: number, length: number) => length <= 1 ? 300 : 70 + index * (460 / (length - 1));

export function WalletFlowGraph({ result }: { result: WalletFlowResult }) {
  const incoming = useMemo(() => aggregate(result.incoming, "IN"), [result.incoming]);
  const outgoing = useMemo(() => aggregate(result.outgoing, "OUT"), [result.outgoing]);
  const [selected, setSelected] = useState<FlowNode | null>(null);

  return (
    <section className="flow-result" aria-live="polite">
      <div className="flow-result-head">
        <div>
          <p className="eyebrow">Mapa adquirido · {result.source.authority}</p>
          <h2>Ingresos <span>→</span> Wallet <span>→</span> Egresos</h2>
        </div>
        <div className="flow-counts" aria-label="Resumen de transferencias">
          <span className="in-count">{result.incoming.length} ingresos</span>
          <span className="out-count">{result.outgoing.length} egresos</span>
        </div>
      </div>

      <div className="graph-legend">
        <span><i className="legend-in" /> Fondos recibidos</span>
        <span><i className="legend-wallet" /> Wallet investigada</span>
        <span><i className="legend-out" /> Fondos enviados</span>
      </div>

      <div className="graph-scroll" role="region" aria-label="Grafo de transferencias" tabIndex={0}>
        <svg className="flow-graph" viewBox="0 0 1000 600" role="img" aria-labelledby="graph-title graph-desc">
          <title id="graph-title">Flujo directo de la wallet {result.address}</title>
          <desc id="graph-desc">Los ingresos están a la izquierda y los egresos a la derecha. Selecciona un nodo para ver su evidencia.</desc>
          <defs>
            <linearGradient id="walletGradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#6ee7d0" />
              <stop offset="1" stopColor="#7868e6" />
            </linearGradient>
            <filter id="nodeShadow" x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx="0" dy="5" stdDeviation="6" floodOpacity=".18" />
            </filter>
          </defs>

          <text x="64" y="34" className="graph-column-label graph-label-in">INGRESOS</text>
          <text x="500" y="34" textAnchor="middle" className="graph-column-label">WALLET</text>
          <text x="936" y="34" textAnchor="end" className="graph-column-label graph-label-out">EGRESOS</text>

          {incoming.map((node, index) => {
            const y = yFor(index, incoming.length);
            return <path key={`line-${node.key}`} d={`M 183 ${y} C 310 ${y}, 360 300, 453 300`} className="graph-edge edge-in" />;
          })}
          {outgoing.map((node, index) => {
            const y = yFor(index, outgoing.length);
            return <path key={`line-${node.key}`} d={`M 547 300 C 640 300, 690 ${y}, 817 ${y}`} className="graph-edge edge-out" />;
          })}

          {incoming.map((node, index) => <Node key={node.key} node={node} x={140} y={yFor(index, incoming.length)} selected={selected?.key === node.key} onSelect={setSelected} />)}
          {outgoing.map((node, index) => <Node key={node.key} node={node} x={860} y={yFor(index, outgoing.length)} selected={selected?.key === node.key} onSelect={setSelected} />)}

          <g className="wallet-node" transform="translate(500 300)" filter="url(#nodeShadow)">
            <circle r="53" />
            <text y="-7" textAnchor="middle" className="wallet-v">V52</text>
            <text y="15" textAnchor="middle" className="wallet-address">{short(result.address)}</text>
          </g>
        </svg>
      </div>

      <div className="graph-evidence">
        {selected ? (
          <>
            <div>
              <span className={`direction-pill ${selected.direction === "IN" ? "pill-in" : "pill-out"}`}>
                {selected.direction === "IN" ? "INGRESO" : "EGRESO"}
              </span>
              <h3>{short(selected.address)}</h3>
              <code>{selected.address}</code>
            </div>
            <div className="selected-metrics">
              <span>Activo<strong>{selected.asset}</strong></span>
              <span>Volumen visible<strong>{displayAmount(selected.total, selected.asset)}</strong></span>
              <span>Transferencias<strong>{selected.count}</strong></span>
            </div>
            <a href={`https://etherscan.io/tx/${selected.transfers[0].tx_hash}`} target="_blank" rel="noreferrer">
              Abrir evidencia en Etherscan ↗
            </a>
          </>
        ) : (
          <p><strong>Selecciona un nodo.</strong> Verás contraparte, activo, volumen visible y enlace a la transacción fuente.</p>
        )}
      </div>

      <div className="flow-provenance">
        <div><span>FUENTE</span><strong>Alchemy Transfers API</strong></div>
        <div><span>MÉTODO</span><strong>{result.source.method}</strong></div>
        <div><span>ADQUIRIDO</span><strong>{new Date(result.acquired_at).toLocaleString()}</strong></div>
        <div><span>ESTADO</span><strong>{result.limits.truncated ? "MUESTRA LIMITADA" : "MUESTRA COMPLETA"}</strong></div>
      </div>

      <ul className="flow-warnings">
        {result.warnings.map((warning) => <li key={warning}>{warning}</li>)}
      </ul>
    </section>
  );
}

function Node({ node, x, y, selected, onSelect }: { node: FlowNode; x: number; y: number; selected: boolean; onSelect: (node: FlowNode) => void }) {
  return (
    <g
      className={`counterparty-node node-${node.direction.toLowerCase()} ${selected ? "is-selected" : ""}`}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={`${node.direction === "IN" ? "Ingreso desde" : "Egreso hacia"} ${node.address}, ${displayAmount(node.total, node.asset)}`}
      onClick={() => onSelect(node)}
      onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onSelect(node); }}
    >
      <circle r="41" filter="url(#nodeShadow)" />
      <text y="-5" textAnchor="middle" className="node-address">{short(node.address)}</text>
      <text y="15" textAnchor="middle" className="node-amount">{displayAmount(node.total, node.asset)}</text>
      {node.count > 1 ? <text x="31" y="-29" textAnchor="middle" className="node-badge">{node.count}</text> : null}
    </g>
  );
}
