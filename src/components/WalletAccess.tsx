import { useEffect, useMemo, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { Check, CheckCircle2, ChevronDown, CircleDollarSign, Copy, LogIn, Network, RefreshCw, WalletCards } from "lucide-react";
import { type Address } from "viem";
import { useBalance, useChainId, useSwitchChain } from "wagmi";
import type { WalletSession } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import { reownConfigured } from "../web3/appkit";

interface Props {
  locale: Locale;
  session: WalletSession | null;
  onSession: (session: WalletSession | null) => void;
}

interface MenuProps {
  locale: Locale;
  onOpen: () => void;
}

const FUJI_CHAIN_ID = 43113;
const FUJI_USDC = "0x5425890298aed601595a70AB815c96711a31Bc65" as Address;
const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

const displayBalance = (value?: string, maximumFractionDigits = 4) => {
  if (value === undefined) return "—";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits }).format(parsed);
};

export function WalletMenuButton(props: MenuProps) {
  if (!reownConfigured) {
    return (
      <button className="connect-action" type="button" onClick={props.onOpen}>
        <span className="connect-status" /><span>Connect</span><ChevronDown size={14} />
      </button>
    );
  }
  return <ConfiguredWalletMenuButton {...props} />;
}

function ConfiguredWalletMenuButton({ locale, onOpen }: MenuProps) {
  const { address, isConnected } = useAppKitAccount();
  return (
    <button
      className="connect-action"
      type="button"
      onClick={onOpen}
      aria-label={isConnected && address
        ? `${locale === "es" ? "Wallet conectada" : "Connected wallet"}: ${address}`
        : (locale === "es" ? "Conectar wallet" : "Connect wallet")}
    >
      <span className={isConnected ? "connect-status is-connected" : "connect-status"} />
      <span>{isConnected && address ? short(address) : "Connect"}</span>
      <ChevronDown size={14} />
    </button>
  );
}

export function WalletAccess(props: Props) {
  if (!reownConfigured) return <WalletSetupMissing locale={props.locale} />;
  return <ConfiguredWalletAccess {...props} />;
}

function WalletSetupMissing({ locale }: { locale: Locale }) {
  return (
    <div className="wallet-access-state is-setup">
      <WalletCards size={19} />
      <div><strong>Reown AppKit</strong><span>{locale === "es" ? "Configura VITE_REOWN_PROJECT_ID" : "Set VITE_REOWN_PROJECT_ID"}</span></div>
    </div>
  );
}

function ConfiguredWalletAccess({ locale, session, onSession }: Props) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const { switchChainAsync, isPending: switching } = useSwitchChain();
  const walletAddress = address as Address | undefined;
  const [copied, setCopied] = useState(false);
  const nativeBalance = useBalance({
    address: walletAddress,
    chainId: FUJI_CHAIN_ID,
    query: { enabled: Boolean(walletAddress) }
  });
  const usdcBalance = useBalance({
    address: walletAddress,
    chainId: FUJI_CHAIN_ID,
    token: FUJI_USDC,
    query: { enabled: Boolean(walletAddress) }
  });

  useEffect(() => {
    if (!isConnected || !address || (session && session.address.toLowerCase() !== address.toLowerCase())) {
      onSession(null);
    }
  }, [address, isConnected, onSession, session]);

  const sessionReady = useMemo(() => Boolean(
    session
    && address
    && session.address.toLowerCase() === address.toLowerCase()
    && Date.parse(session.expires_at) > Date.now()
  ), [address, session]);

  if (!isConnected || !address) {
    return (
      <button className="wallet-connect-action" type="button" onClick={() => void open()}>
        <WalletCards size={18} />{locale === "es" ? "Conectar wallet" : "Connect wallet"}
      </button>
    );
  }

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  };
  const refreshBalances = () => void Promise.all([nativeBalance.refetch(), usdcBalance.refetch()]);

  return (
    <div className="wallet-account-panel">
      <div className="wallet-account-head">
        <div className="wallet-account-avatar"><CheckCircle2 size={20} /></div>
        <div><small>{locale === "es" ? "WALLET CONECTADA" : "CONNECTED WALLET"}</small><strong title={address}>{short(address)}</strong></div>
        <button type="button" onClick={() => void copyAddress()} aria-label={locale === "es" ? "Copiar dirección" : "Copy address"}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
        </button>
      </div>

      <div className="wallet-balance-grid" aria-label={locale === "es" ? "Saldos en Avalanche Fuji" : "Avalanche Fuji balances"}>
        <article><CircleDollarSign size={17} /><span><small>USDC · FUJI</small><strong>{usdcBalance.isLoading ? "…" : displayBalance(usdcBalance.data?.formatted, 6)}</strong></span></article>
        <article><Network size={17} /><span><small>AVAX · FUJI</small><strong>{nativeBalance.isLoading ? "…" : displayBalance(nativeBalance.data?.formatted)}</strong></span></article>
      </div>

      <div className="wallet-account-actions">
        {chainId !== FUJI_CHAIN_ID ? (
          <button type="button" disabled={switching} onClick={() => void switchChainAsync({ chainId: FUJI_CHAIN_ID })}>
            <Network size={14} />{switching ? (locale === "es" ? "Cambiando…" : "Switching…") : (locale === "es" ? "Cambiar a Fuji" : "Switch to Fuji")}
          </button>
        ) : <span className="wallet-network-ready"><i />Avalanche Fuji</span>}
        <button type="button" onClick={refreshBalances}><RefreshCw size={14} />{locale === "es" ? "Actualizar" : "Refresh"}</button>
        <button type="button" onClick={() => void open({ view: "Account" })}><LogIn size={14} />{locale === "es" ? "Cuenta" : "Account"}</button>
      </div>

      <p className="wallet-signing-note">
        {sessionReady
          ? (locale === "es" ? "Sesión lista. El pago solo se firma al iniciar una investigación." : "Session ready. Payment is only signed when an investigation starts.")
          : (locale === "es" ? "No necesitas verificar aquí. La firma de sesión y el pago se solicitarán al investigar." : "No verification is needed here. Session and payment signatures are requested when you investigate.")}
      </p>
    </div>
  );
}
