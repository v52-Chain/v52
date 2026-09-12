import { FormEvent, useMemo, useState } from "react";
import { CalendarRange, Search, SlidersHorizontal } from "lucide-react";
import type { WalletFlowFilters } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import { BorderGlow } from "./reactbits/BorderGlow";

interface Props {
  locale: Locale;
  busy: boolean;
  accessLocked: boolean;
  onSubmit: (address: string, limit: number, filters: WalletFlowFilters) => void;
}

type RangePreset = "all" | "7d" | "30d" | "90d" | "custom";

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

function filtersForPreset(preset: RangePreset, fromDate: string, toDate: string): WalletFlowFilters {
  if (preset === "all") return {};
  if (preset === "custom") return { fromDate: fromDate || undefined, toDate: toDate || undefined };
  const days = Number(preset.slice(0, -1));
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - days);
  return { fromDate: isoDate(start), toDate: isoDate(today) };
}

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function WalletFlowForm({ locale, busy, accessLocked, onSubmit }: Props) {
  const [address, setAddress] = useState("");
  const [limit, setLimit] = useState(25);
  const [range, setRange] = useState<RangePreset>("30d");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [touched, setTouched] = useState(false);
  const valid = ETH_ADDRESS.test(address.trim());
  const copy = locale === "es" ? {
    eyebrow: "Investigación de wallet", title: "Visualiza el flujo real.", field: "Dirección pública",
    select: "Transferencias por dirección", loading: "Recopilando…", submit: "Investigar", connect: "Verifica tu wallet",
    invalid: "Escribe una dirección EVM válida: 0x + 40 caracteres hexadecimales.",
    help: "Solo datos públicos. Nunca ingreses una seed phrase ni una private key.",
    period: "Periodo de análisis", all: "Todo", custom: "Personalizado", from: "Desde", to: "Hasta", filters: "Filtros forenses"
  } : {
    eyebrow: "Wallet investigation", title: "Visualize the real flow.", field: "Public address",
    select: "Transfers per direction", loading: "Acquiring…", submit: "Investigate", connect: "Verify your wallet",
    invalid: "Enter a valid EVM address: 0x + 40 hexadecimal characters.",
    help: "Public data only. Never enter a seed phrase or private key.",
    period: "Analysis period", all: "All", custom: "Custom", from: "From", to: "To", filters: "Forensic filters"
  };
  const filters = useMemo(() => filtersForPreset(range, fromDate, toDate), [range, fromDate, toDate]);
  const invalidRange = Boolean(filters.fromDate && filters.toDate && filters.fromDate > filters.toDate);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid && !invalidRange) onSubmit(address.trim(), limit, filters);
  };

  return (
    <BorderGlow className="flow-search-glow" glowColor="82 225 204" edgeSensitivity={90}>
    <form className="flow-search" onSubmit={submit}>
      <div className="flow-search-heading">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
        </div>
        <span className="network-chip"><SlidersHorizontal size={14} aria-hidden="true" /> Ethereum Mainnet</span>
      </div>

      <div className="time-filter" aria-label={copy.period}>
        <div className="time-filter-label"><CalendarRange size={16} aria-hidden="true" /><span>{copy.period}</span></div>
        <div className="range-presets">
          {(["7d", "30d", "90d", "all", "custom"] as const).map((preset) => (
            <button key={preset} type="button" aria-pressed={range === preset} onClick={() => setRange(preset)}>
              {preset === "all" ? copy.all : preset === "custom" ? copy.custom : preset.toUpperCase()}
            </button>
          ))}
        </div>
        {range === "custom" ? (
          <div className="custom-range">
            <label><span>{copy.from}</span><input type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /></label>
            <label><span>{copy.to}</span><input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} /></label>
          </div>
        ) : null}
      </div>

      <label className="wallet-field">
        <span>{copy.field}</span>
        <div className="wallet-input-row">
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onBlur={() => setTouched(true)}
            placeholder="0x…"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={touched && !valid}
            aria-describedby="wallet-help"
          />
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} aria-label={copy.select}>
            <option value={10}>10 + 10</option>
            <option value={25}>25 + 25</option>
            <option value={50}>50 + 50</option>
          </select>
          <button type="submit" disabled={busy || accessLocked || !valid || invalidRange}>
            <Search size={17} aria-hidden="true" />
            {busy ? copy.loading : accessLocked ? copy.connect : copy.submit}
          </button>
        </div>
        <small id="wallet-help">
          {touched && !valid
            ? copy.invalid
            : copy.help}
        </small>
      </label>
    </form>
    </BorderGlow>
  );
}
