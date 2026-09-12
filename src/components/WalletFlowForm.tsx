import { FormEvent, useState } from "react";
import type { Locale } from "../domain/locale";
import { BorderGlow } from "./reactbits/BorderGlow";

interface Props {
  locale: Locale;
  disabled: boolean;
  onSubmit: (address: string, limit: number) => void;
}

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function WalletFlowForm({ locale, disabled, onSubmit }: Props) {
  const [address, setAddress] = useState("");
  const [limit, setLimit] = useState(25);
  const [touched, setTouched] = useState(false);
  const valid = ETH_ADDRESS.test(address.trim());
  const copy = locale === "es" ? {
    eyebrow: "Investigación de wallet", title: "Visualiza el flujo real.", field: "Dirección pública",
    select: "Transferencias por dirección", loading: "Recopilando…", submit: "Investigar",
    invalid: "Escribe una dirección EVM válida: 0x + 40 caracteres hexadecimales.",
    help: "Solo datos públicos. Nunca ingreses una seed phrase ni una private key."
  } : {
    eyebrow: "Wallet investigation", title: "Visualize the real flow.", field: "Public address",
    select: "Transfers per direction", loading: "Acquiring…", submit: "Investigate",
    invalid: "Enter a valid EVM address: 0x + 40 hexadecimal characters.",
    help: "Public data only. Never enter a seed phrase or private key."
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid) onSubmit(address.trim(), limit);
  };

  return (
    <BorderGlow className="flow-search-glow" glowColor="82 225 204" edgeSensitivity={90}>
    <form className="flow-search" onSubmit={submit} id="investigate">
      <div className="flow-search-heading">
        <div>
          <p className="eyebrow">{copy.eyebrow}</p>
          <h2>{copy.title}</h2>
        </div>
        <span className="network-chip"><span aria-hidden="true">◆</span> Ethereum Mainnet</span>
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
          <button type="submit" disabled={disabled || !valid}>
            {disabled ? copy.loading : copy.submit}<span aria-hidden="true">→</span>
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
