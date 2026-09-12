import cytoscape, { type Core, type ElementDefinition, type EventObject } from "cytoscape";
import { useEffect, useMemo, useRef, useState } from "react";
import type { FlowTransfer, WalletFlowResult } from "../domain/apiTypes";

type ViewMode = "graph" | "table" | "raw";

interface FlowNode {
  id: string;
  address: string;
  asset: string;
  direction: "IN" | "OUT";
  count: number;
  total: number | null;
  transfers: FlowTransfer[];
}

interface SelectedEvidence {
  kind: "wallet" | "counterparty" | "relationship";
  title: string;
  address?: string;
  direction?: "IN" | "OUT";
  asset?: string;
  total?: number | null;
  count?: number;
  txHash?: string;
}

const short = (address: string) => address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
const displayAmount = (value: number | null | undefined, asset = "") =>
  value === null || value === undefined
    ? asset
    : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value)} ${asset}`.trim();

function aggregate(transfers: FlowTransfer[], direction: "IN" | "OUT"): FlowNode[] {
  const nodes = new Map<string, Omit<FlowNode, "id">>();
  for (const transfer of transfers) {
    const key = `${transfer.counterparty}:${transfer.asset}:${direction}`;
    const numeric = transfer.value === null || transfer.value === undefined ? null : Number(transfer.value);
    const current = nodes.get(key) ?? {
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
  return [...nodes.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 14)
    .map((node, index) => ({ ...node, id: `${direction.toLowerCase()}-${index}` }));
}

function positions(nodes: FlowNode[], side: "left" | "right", height = 620) {
  if (nodes.length === 0) return new Map<string, { x: number; y: number }>();
  const columns = nodes.length > 8 ? 2 : 1;
  const rows = Math.ceil(nodes.length / columns);
  const usable = height - 120;
  return new Map(nodes.map((node, index) => {
    const column = Math.floor(index / rows);
    const row = index % rows;
    const x = side === "left" ? 115 + column * 145 : 885 - column * 145;
    const y = rows === 1 ? height / 2 : 60 + (row * usable) / (rows - 1);
    return [node.id, { x, y }];
  }));
}

export function WalletFlowGraph({ result }: { result: WalletFlowResult }) {
  const incoming = useMemo(() => aggregate(result.incoming, "IN"), [result.incoming]);
  const outgoing = useMemo(() => aggregate(result.outgoing, "OUT"), [result.outgoing]);
  const allNodes = useMemo(() => [...incoming, ...outgoing], [incoming, outgoing]);
  const [view, setView] = useState<ViewMode>("graph");
  const [selected, setSelected] = useState<SelectedEvidence>({
    kind: "wallet",
    title: "Wallet investigada",
    address: result.address,
    count: result.incoming.length + result.outgoing.length
  });
  const graphRef = useRef<HTMLDivElement | null>(null);
  const cyRef = useRef<Core | null>(null);

  const assetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transfer of [...result.incoming, ...result.outgoing]) {
      counts.set(transfer.asset, (counts.get(transfer.asset) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [result]);

  useEffect(() => {
    if (view !== "graph" || !graphRef.current) return;

    const incomingPositions = positions(incoming, "left");
    const outgoingPositions = positions(outgoing, "right");
    const elements: ElementDefinition[] = [
      {
        data: {
          id: "wallet",
          label: `V52\n${short(result.address)}`,
          kind: "wallet",
          address: result.address,
          count: result.incoming.length + result.outgoing.length
        },
        position: { x: 500, y: 310 },
        classes: "wallet"
      }
    ];

    for (const node of allNodes) {
      const isIncoming = node.direction === "IN";
      elements.push({
        data: {
          id: node.id,
          label: `${short(node.address)}\n${displayAmount(node.total, node.asset)}`,
          kind: "counterparty",
          address: node.address,
          direction: node.direction,
          asset: node.asset,
          total: node.total,
          count: node.count,
          txHash: node.transfers[0]?.tx_hash
        },
        position: (isIncoming ? incomingPositions : outgoingPositions).get(node.id),
        classes: isIncoming ? "income" : "expense"
      });
      elements.push({
        data: {
          id: `edge-${node.id}`,
          source: isIncoming ? node.id : "wallet",
          target: isIncoming ? "wallet" : node.id,
          label: `${isIncoming ? "RECEIVED" : "SENT"} · ${displayAmount(node.total, node.asset)}`,
          kind: "relationship",
          address: node.address,
          direction: node.direction,
          asset: node.asset,
          total: node.total,
          count: node.count,
          txHash: node.transfers[0]?.tx_hash
        },
        classes: isIncoming ? "income-edge" : "expense-edge"
      });
    }

    const cy = cytoscape({
      container: graphRef.current,
      elements,
      layout: { name: "preset", fit: true, padding: 48 },
      minZoom: 0.25,
      maxZoom: 2.5,
      wheelSensitivity: 0.18,
      boxSelectionEnabled: true,
      autounselectify: false,
      style: [
        {
          selector: "node",
          style: {
            width: 78,
            height: 78,
            label: "data(label)",
            color: "#f7f7fb",
            "font-family": "DM Mono, monospace",
            "font-size": 8,
            "font-weight": 500,
            "text-wrap": "wrap",
            "text-max-width": "72px",
            "text-valign": "center",
            "text-halign": "center",
            "background-color": "#303441",
            "border-width": 2,
            "border-color": "#777b88",
            "overlay-opacity": 0
          }
        },
        {
          selector: "node.income",
          style: { "background-color": "#153f39", "border-color": "#27c5a6" }
        },
        {
          selector: "node.expense",
          style: { "background-color": "#4a282e", "border-color": "#f06a62" }
        },
        {
          selector: "node.wallet",
          style: {
            width: 108,
            height: 108,
            "font-size": 10,
            "font-weight": 700,
            "background-color": "#7565df",
            "background-gradient-stop-colors": ["#59d3bd", "#7565df"],
            "background-gradient-direction": "to-bottom-right",
            "border-width": 4,
            "border-color": "#c8bfff"
          }
        },
        {
          selector: "node:selected",
          style: { "border-width": 6, "border-color": "#ffffff", "overlay-opacity": 0 }
        },
        {
          selector: "edge",
          style: {
            width: 1.5,
            "curve-style": "bezier",
            "line-color": "#858995",
            "target-arrow-color": "#858995",
            "target-arrow-shape": "triangle",
            "arrow-scale": 0.8,
            label: "data(label)",
            color: "#aeb1ba",
            "font-family": "DM Mono, monospace",
            "font-size": 6,
            "text-background-color": "#171820",
            "text-background-opacity": 0.86,
            "text-background-padding": "3px",
            "text-rotation": "autorotate",
            "overlay-opacity": 0
          }
        },
        {
          selector: "edge.income-edge",
          style: { "line-color": "#249f89", "target-arrow-color": "#31c9ac" }
        },
        {
          selector: "edge.expense-edge",
          style: { "line-color": "#b34d49", "target-arrow-color": "#f06a62" }
        },
        {
          selector: "edge:selected",
          style: { width: 4, color: "#ffffff", "text-background-opacity": 1 }
        }
      ]
    });

    const selectElement = (event: EventObject) => {
      const data = event.target.data();
      setSelected({
        kind: data.kind,
        title: data.kind === "relationship"
          ? (data.direction === "IN" ? "Transferencia recibida" : "Transferencia enviada")
          : data.kind === "wallet" ? "Wallet investigada" : "Contraparte",
        address: data.address,
        direction: data.direction,
        asset: data.asset,
        total: data.total,
        count: data.count,
        txHash: data.txHash
      });
    };
    cy.on("tap", "node, edge", selectElement);
    cyRef.current = cy;

    const resize = new ResizeObserver(() => {
      cy.resize();
      cy.fit(undefined, 44);
    });
    resize.observe(graphRef.current);

    return () => {
      resize.disconnect();
      cy.destroy();
      cyRef.current = null;
    };
  }, [allNodes, incoming, outgoing, result, view]);

  const zoom = (factor: number) => {
    const cy = cyRef.current;
    if (!cy) return;
    cy.zoom({ level: cy.zoom() * factor, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
  };

  return (
    <section className="flow-result neo-flow" aria-live="polite">
      <div className="neo-toolbar">
        <div className="neo-tabs" role="tablist" aria-label="Vista de resultados">
          {(["graph", "table", "raw"] as const).map((mode) => (
            <button key={mode} type="button" role="tab" aria-selected={view === mode} onClick={() => setView(mode)}>
              {mode === "graph" ? "Graph" : mode === "table" ? "Table" : "RAW"}
            </button>
          ))}
        </div>
        <div className="neo-query"><span aria-hidden="true">›</span> MATCH (income)-[transfer]-&gt;(wallet)-[transfer]-&gt;(expense)</div>
        <div className="neo-source"><i /> LIVE · {result.source.provider.toUpperCase()}</div>
      </div>

      <div className="neo-content">
        <div className="neo-main">
          {view === "graph" ? (
            <>
              <div className="neo-column-hints" aria-hidden="true"><span>INGRESOS</span><span>WALLET</span><span>EGRESOS</span></div>
              <div ref={graphRef} className="cytoscape-canvas" aria-label="Grafo interactivo de transferencias" />
              <div className="graph-controls" aria-label="Controles del grafo">
                <button type="button" onClick={() => zoom(1.25)} aria-label="Acercar">+</button>
                <button type="button" onClick={() => zoom(0.8)} aria-label="Alejar">−</button>
                <button type="button" onClick={() => cyRef.current?.fit(undefined, 48)} aria-label="Ajustar grafo">⌗</button>
                <button type="button" onClick={() => cyRef.current?.center()} aria-label="Centrar grafo">◎</button>
              </div>
              <div className="drag-hint">Arrastra nodos · rueda para zoom · arrastra el fondo para mover</div>
            </>
          ) : null}
          {view === "table" ? <TransferTable transfers={[...result.incoming, ...result.outgoing]} /> : null}
          {view === "raw" ? <pre className="raw-result">{JSON.stringify(result, null, 2)}</pre> : null}
        </div>

        <aside className="neo-overview">
          <div className="overview-title"><div><span>RESULTS OVERVIEW</span><strong>{allNodes.length + 1} nodes · {allNodes.length} relationships</strong></div><span aria-hidden="true">↕</span></div>

          <div className="overview-group">
            <h3>Nodes</h3>
            <div className="tag-cloud">
              <span className="tag-wallet">Wallet (1)</span>
              <span className="tag-income">Income ({incoming.length})</span>
              <span className="tag-expense">Expense ({outgoing.length})</span>
              {assetCounts.map(([asset, count]) => <span key={asset} className="tag-asset">{asset} ({count})</span>)}
            </div>
          </div>

          <div className="overview-group">
            <h3>Relationships</h3>
            <div className="tag-cloud">
              <span>RECEIVED ({incoming.length})</span>
              <span>SENT ({outgoing.length})</span>
              <span>CONNECTED ({allNodes.length})</span>
            </div>
          </div>

          <div className="overview-group selected-record">
            <h3>Selected evidence</h3>
            <span className={`direction-pill ${selected.direction === "OUT" ? "pill-out" : "pill-in"}`}>{selected.title}</span>
            {selected.address ? <><code>{selected.address}</code><button type="button" onClick={() => void navigator.clipboard.writeText(selected.address!)}>Copiar dirección</button></> : null}
            <dl>
              {selected.direction ? <><dt>Direction</dt><dd>{selected.direction === "IN" ? "Incoming" : "Outgoing"}</dd></> : null}
              {selected.asset ? <><dt>Asset</dt><dd>{selected.asset}</dd></> : null}
              {selected.total !== undefined ? <><dt>Visible amount</dt><dd>{displayAmount(selected.total, selected.asset)}</dd></> : null}
              {selected.count !== undefined ? <><dt>Transfers</dt><dd>{selected.count}</dd></> : null}
            </dl>
            {selected.txHash ? <a href={`https://etherscan.io/tx/${selected.txHash}`} target="_blank" rel="noreferrer">Abrir transacción ↗</a> : null}
          </div>
        </aside>
      </div>

      <div className="neo-footer">
        <div><span>FUENTE</span><strong>Alchemy Transfers API</strong></div>
        <div><span>MÉTODO</span><strong>{result.source.method}</strong></div>
        <div><span>ADQUIRIDO</span><strong>{new Date(result.acquired_at).toLocaleString()}</strong></div>
        <div><span>ESTADO</span><strong>{result.limits.truncated ? "MUESTRA LIMITADA" : "MUESTRA COMPLETA"}</strong></div>
      </div>
      <ul className="flow-warnings">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
    </section>
  );
}

function TransferTable({ transfers }: { transfers: FlowTransfer[] }) {
  return (
    <div className="neo-table-wrap">
      <table className="neo-table">
        <thead><tr><th>Direction</th><th>Counterparty</th><th>Relationship</th><th>Asset</th><th>Block</th><th>Evidence</th></tr></thead>
        <tbody>{transfers.map((transfer) => (
          <tr key={transfer.transfer_id}>
            <td><span className={transfer.direction === "IN" ? "table-in" : "table-out"}>{transfer.direction}</span></td>
            <td><code>{short(transfer.counterparty)}</code></td>
            <td>{transfer.direction === "IN" ? "RECEIVED" : "SENT"}</td>
            <td>{transfer.value ?? "?"} {transfer.asset}</td>
            <td>{transfer.block_number ?? "UNKNOWN"}</td>
            <td><a href={`https://etherscan.io/tx/${transfer.tx_hash}`} target="_blank" rel="noreferrer">TX ↗</a></td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}
