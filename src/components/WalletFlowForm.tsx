import { FormEvent, useState } from "react";

interface Props {
  disabled: boolean;
  onSubmit: (address: string, limit: number) => void;
}

const ETH_ADDRESS = /^0x[a-fA-F0-9]{40}$/;

export function WalletFlowForm({ disabled, onSubmit }: Props) {
  const [address, setAddress] = useState("");
  const [limit, setLimit] = useState(25);
  const [touched, setTouched] = useState(false);
  const valid = ETH_ADDRESS.test(address.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (valid) onSubmit(address.trim(), limit);
  };

  return (
    <form className="flow-search" onSubmit={submit} id="investigate">
      <div className="flow-search-heading">
        <div>
          <p className="eyebrow">Investigación de wallet</p>
          <h2>Visualiza el flujo real.</h2>
        </div>
        <span className="network-chip"><span aria-hidden="true">◆</span> Ethereum Mainnet</span>
      </div>

      <label className="wallet-field">
        <span>Dirección pública</span>
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
          <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} aria-label="Transferencias por dirección">
            <option value={10}>10 + 10</option>
            <option value={25}>25 + 25</option>
            <option value={50}>50 + 50</option>
          </select>
          <button type="submit" disabled={disabled || !valid}>
            {disabled ? "Recopilando…" : "Investigar"}<span aria-hidden="true">→</span>
          </button>
        </div>
        <small id="wallet-help">
          {touched && !valid
            ? "Escribe una dirección EVM válida: 0x + 40 caracteres hexadecimales."
            : "Solo datos públicos. Nunca ingreses una seed phrase ni una private key."}
        </small>
      </label>
    </form>
  );
}
