import ForceGraph2D, {
  type ForceGraphMethods,
  type GraphData,
  type LinkObject,
  type NodeObject
} from "react-force-graph-2d";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { FlowTransfer, WalletFlowResult } from "../domain/apiTypes";

type ViewMode = "graph" | "table" | "raw";
type Direction = "IN" | "OUT";

interface FlowNode {
  id: string;
  address: string;
  asset: string;
  direction: Direction;
  count: number;
  total: number | null;
  transfers: FlowTransfer[];
}

interface RfgNode extends NodeObject {
  id: string;
  kind: "wallet" | "counterparty";
  address: string;
  direction?: Direction;
  asset?: string;
  total?: number | null;
  count: number;
  label: string;
  color: string;
}

interface RfgLink extends LinkObject<RfgNode> {
  id: string;
  source: string | RfgNode;
  target: string | RfgNode;
  direction: Direction;
  address: string;
  asset: string;
  total: number | null;
  count: number;
  txHash?: string;
  label: string;
  color: string;
}

interface SelectedEvidence {
  kind: "wallet" | "counterparty" | "relationship";
  title: string;
  address?: string;
  direction?: Direction;
  asset?: string;
  total?: number | null;
  count?: number;
  txHash?: string;
}

const PALETTE = {
  income: "#2dd4ae",
  incomeDark: "#123f38",
  expense: "#ff746c",
  expenseDark: "#4b272e",
  wallet: "#8474f4",
  paper: "#f7f7fb",
  canvas: "#1d1f24"
};

const short = (address: string) => address.length > 16 ? `${address.slice(0, 8)}…${address.slice(-6)}` : address;
const displayAmount = (value: number | null | undefined, asset = "") =>
  value === null || value === undefined
    ? asset
    : `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 4 }).format(value)} ${asset}`.trim();

function aggregate(transfers: FlowTransfer[], direction: Direction): FlowNode[] {
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
    .slice(0, 18)
    .map((node, index) => ({ ...node, id: `${direction.toLowerCase()}-${index}` }));
}

function nodeFromEndpoint(endpoint: string | RfgNode): RfgNode | null {
  return typeof endpoint === "object" ? endpoint : null;
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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 680 });
  const graphHostRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<ForceGraphMethods<RfgNode, RfgLink> | undefined>(undefined);

  const graphData = useMemo<GraphData<RfgNode, RfgLink>>(() => {
    const nodes: RfgNode[] = [{
      id: "wallet",
      kind: "wallet",
      address: result.address,
      count: result.incoming.length + result.outgoing.length,
      label: `V52 · ${short(result.address)}`,
      color: PALETTE.wallet
    }];
    const links: RfgLink[] = [];

    for (const node of allNodes) {
      const isIncoming = node.direction === "IN";
      nodes.push({
        id: node.id,
        kind: "counterparty",
        address: node.address,
        direction: node.direction,
        asset: node.asset,
        total: node.total,
        count: node.count,
        label: `${short(node.address)} · ${displayAmount(node.total, node.asset)}`,
        color: isIncoming ? PALETTE.income : PALETTE.expense
      });
      links.push({
        id: `edge-${node.id}`,
        source: isIncoming ? node.id : "wallet",
        target: isIncoming ? "wallet" : node.id,
        direction: node.direction,
        address: node.address,
        asset: node.asset,
        total: node.total,
        count: node.count,
        txHash: node.transfers[0]?.tx_hash,
        label: `${isIncoming ? "RECEIVED" : "SENT"} · ${displayAmount(node.total, node.asset)}`,
        color: isIncoming ? PALETTE.income : PALETTE.expense
      });
    }
    return { nodes, links };
  }, [allNodes, result]);

  const assetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const transfer of [...result.incoming, ...result.outgoing]) {
      counts.set(transfer.asset, (counts.get(transfer.asset) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7);
  }, [result]);

  useLayoutEffect(() => {
    const host = graphHostRef.current;
    if (!host) return;
    const measure = () => setDimensions({ width: Math.max(host.clientWidth, 320), height: Math.max(host.clientHeight, 560) });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [view]);

  useEffect(() => {
    if (view !== "graph") return;
    const timer = window.setTimeout(() => {
      const graph = graphRef.current;
      const charge = graph?.d3Force("charge");
      const link = graph?.d3Force("link");
      charge?.strength?.(-250);
      link?.distance?.(150);
      graph?.d3ReheatSimulation();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [graphData, view]);

  const selectNode = (node: RfgNode) => {
    setSelected({
      kind: node.kind,
      title: node.kind === "wallet" ? "Wallet investigada" : "Contraparte",
      address: node.address,
      direction: node.direction,
      asset: node.asset,
      total: node.total,
      count: node.count
    });
    if (node.x !== undefined && node.y !== undefined) {
      graphRef.current?.centerAt(node.x, node.y, 450);
      graphRef.current?.zoom(1.5, 450);
    }
  };

  const selectLink = (link: RfgLink) => setSelected({
    kind: "relationship",
    title: link.direction === "IN" ? "Transferencia recibida" : "Transferencia enviada",
    address: link.address,
    direction: link.direction,
    asset: link.asset,
    total: link.total,
    count: link.count,
    txHash: link.txHash
  });

  const paintNode = (node: RfgNode, context: CanvasRenderingContext2D, scale: number) => {
    if (node.x === undefined || node.y === undefined) return;
    const isWallet = node.kind === "wallet";
    const active = selected.address === node.address || hoveredNode === node.id;
    const radius = isWallet ? 25 : 13 + Math.min(node.count, 5);
    const fill = isWallet ? PALETTE.wallet : node.direction === "IN" ? PALETTE.incomeDark : PALETTE.expenseDark;
    const stroke = isWallet ? "#c9c0ff" : node.color;

    context.save();
    context.shadowColor = node.color;
    context.shadowBlur = active ? 24 : isWallet ? 18 : 9;
    context.beginPath();
    context.arc(node.x, node.y, radius, 0, Math.PI * 2);
    context.fillStyle = fill;
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = active ? 3.5 : isWallet ? 2.6 : 1.8;
    context.strokeStyle = active ? "#ffffff" : stroke;
    context.stroke();

    if (isWallet) {
      const gradient = context.createLinearGradient(node.x - radius, node.y - radius, node.x + radius, node.y + radius);
      gradient.addColorStop(0, "#51d2ba");
      gradient.addColorStop(1, PALETTE.wallet);
      context.beginPath();
      context.arc(node.x, node.y, radius - 3, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.fill();
    }

    context.fillStyle = PALETTE.paper;
    context.font = `${isWallet ? 700 : 600} ${isWallet ? 9 : 6.5}px DM Mono, monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(isWallet ? "V52" : node.direction ?? "?", node.x, node.y - (isWallet ? 2 : 0));

    const fontSize = Math.max(5.5, 10 / scale);
    context.font = `500 ${fontSize}px DM Mono, monospace`;
    const address = isWallet ? short(node.address) : short(node.address);
    const amount = isWallet ? `${node.count} transfers` : displayAmount(node.total, node.asset);
    const widest = Math.max(context.measureText(address).width, context.measureText(amount).width) + 8;
    const labelY = node.y + radius + 9;
    context.fillStyle = "rgba(23, 24, 32, .9)";
    context.beginPath();
    context.roundRect(node.x - widest / 2, labelY - 6, widest, 17, 3);
    context.fill();
    context.fillStyle = "#f2f3f5";
    context.fillText(address, node.x, labelY);
    context.fillStyle = "#9da2ad";
    context.fillText(amount, node.x, labelY + 7);
    context.restore();
  };

  const paintNodePointer = (node: RfgNode, color: string, context: CanvasRenderingContext2D) => {
    if (node.x === undefined || node.y === undefined) return;
    context.fillStyle = color;
    context.beginPath();
    context.arc(node.x, node.y, node.kind === "wallet" ? 30 : 21, 0, Math.PI * 2);
    context.fill();
  };

  const paintLinkLabel = (link: RfgLink, context: CanvasRenderingContext2D, scale: number) => {
    const source = nodeFromEndpoint(link.source);
    const target = nodeFromEndpoint(link.target);
    if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) return;
    if (scale < 0.72 && hoveredLink !== link.id) return;
    const x = (source.x + target.x) / 2;
    const y = (source.y + target.y) / 2;
    const angle = Math.atan2(target.y - source.y, target.x - source.x);
    const fontSize = Math.max(4.8, 8 / scale);
    context.save();
    context.translate(x, y);
    context.rotate(angle > Math.PI / 2 || angle < -Math.PI / 2 ? angle + Math.PI : angle);
    context.font = `600 ${fontSize}px DM Mono, monospace`;
    const width = context.measureText(link.label).width + 7;
    context.fillStyle = "rgba(27, 28, 34, .88)";
    context.fillRect(-width / 2, -fontSize, width, fontSize + 3);
    context.fillStyle = hoveredLink === link.id ? "#ffffff" : link.color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(link.label, 0, -fontSize / 2 + 1);
    context.restore();
  };

  const resetLayout = () => {
    for (const node of graphData.nodes) {
      node.fx = undefined;
      node.fy = undefined;
    }
    graphRef.current?.d3ReheatSimulation();
    window.setTimeout(() => graphRef.current?.zoomToFit(550, 60), 500);
  };

  return (
    <section className="flow-result neo-flow force-flow" aria-live="polite">
      <div className="neo-toolbar">
        <div className="neo-tabs" role="tablist" aria-label="Vista de resultados">
          {(["graph", "table", "raw"] as const).map((mode) => (
            <button key={mode} type="button" role="tab" aria-selected={view === mode} onClick={() => setView(mode)}>
              {mode === "graph" ? "Force Graph" : mode === "table" ? "Table" : "RAW"}
            </button>
          ))}
        </div>
        <div className="neo-query"><span aria-hidden="true">›</span> FLOW (income)-[transfer]-&gt;(wallet)-[transfer]-&gt;(expense)</div>
        <div className="neo-source"><i /> LIVE · {result.source.provider.toUpperCase()}</div>
      </div>

      <div className="neo-content">
        <div className="neo-main force-main">
          {view === "graph" ? (
            <>
              <div className="neo-column-hints" aria-hidden="true"><span>INGRESOS</span><span>WALLET</span><span>EGRESOS</span></div>
              <div ref={graphHostRef} className="force-canvas" aria-label="Grafo dinámico de transferencias">
                <ForceGraph2D<RfgNode, RfgLink>
                  ref={graphRef}
                  width={dimensions.width}
                  height={dimensions.height}
                  graphData={graphData}
                  backgroundColor="rgba(0,0,0,0)"
                  dagMode="lr"
                  dagLevelDistance={250}
                  warmupTicks={80}
                  cooldownTicks={160}
                  d3AlphaDecay={0.025}
                  d3VelocityDecay={0.35}
                  nodeCanvasObject={paintNode}
                  nodePointerAreaPaint={paintNodePointer}
                  nodeLabel={(node) => `${node.label}\n${node.kind === "wallet" ? "Wallet investigada" : "Contraparte pública"}`}
                  linkColor={(link) => hoveredLink === link.id ? "#ffffff" : `${link.color}88`}
                  linkWidth={(link) => hoveredLink === link.id ? 3 : 1.25}
                  linkLabel={(link) => link.label}
                  linkDirectionalArrowLength={6}
                  linkDirectionalArrowRelPos={0.94}
                  linkDirectionalArrowColor={(link) => link.color}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleSpeed={0.006}
                  linkDirectionalParticleWidth={(link) => hoveredLink === link.id ? 4 : 2.2}
                  linkDirectionalParticleColor={(link) => link.color}
                  linkCanvasObjectMode={() => "after"}
                  linkCanvasObject={paintLinkLabel}
                  linkHoverPrecision={8}
                  minZoom={0.25}
                  maxZoom={5}
                  onNodeClick={selectNode}
                  onNodeHover={(node) => setHoveredNode(node?.id ? String(node.id) : null)}
                  onNodeDragEnd={(node) => { node.fx = node.x; node.fy = node.y; }}
                  onLinkClick={selectLink}
                  onLinkHover={(link) => setHoveredLink(link?.id ? String(link.id) : null)}
                  onEngineStop={() => graphRef.current?.zoomToFit(450, 58)}
                />
              </div>
              <div className="graph-controls" aria-label="Controles del grafo">
                <button type="button" onClick={() => graphRef.current?.zoom((graphRef.current?.zoom() ?? 1) * 1.3, 250)} aria-label="Acercar">+</button>
                <button type="button" onClick={() => graphRef.current?.zoom((graphRef.current?.zoom() ?? 1) * 0.77, 250)} aria-label="Alejar">−</button>
                <button type="button" onClick={() => graphRef.current?.zoomToFit(450, 58)} aria-label="Ajustar grafo">⌗</button>
                <button type="button" onClick={resetLayout} aria-label="Reiniciar física">↻</button>
              </div>
              <div className="drag-hint"><i /> Simulación activa · arrastra nodos · rueda para zoom · clic para investigar</div>
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
            <div className="tag-cloud"><span>RECEIVED ({incoming.length})</span><span>SENT ({outgoing.length})</span><span>CONNECTED ({allNodes.length})</span></div>
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
        <div><span>MOTOR VISUAL</span><strong>react-force-graph · d3-force</strong></div>
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
