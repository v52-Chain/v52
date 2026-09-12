import { useEffect, useState } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { CheckCircle2, KeyRound, LoaderCircle, LogIn, WalletCards } from "lucide-react";
import { useChainId, useSignMessage } from "wagmi";
import { vector52Client } from "../api/vector52Client";
import type { WalletSession } from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import { reownConfigured } from "../web3/appkit";

interface Props {
  locale: Locale;
  session: WalletSession | null;
  onSession: (session: WalletSession | null) => void;
}

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

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
  const { signMessageAsync, isPending } = useSignMessage();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (!isConnected || !address || (session && session.address.toLowerCase() !== address.toLowerCase())) {
      onSession(null);
    }
  }, [address, isConnected]);

  const authenticate = async () => {
    if (!address) return;
    setError(null);
    setVerifying(true);
    try {
      if (chainId !== 1 && chainId !== 43113) {
        throw new Error(
          locale === "es"
            ? "Cambia la wallet a Ethereum Mainnet o Avalanche Fuji."
            : "Switch the wallet to Ethereum Mainnet or Avalanche Fuji."
        );
      }
      const challenge = await vector52Client.walletChallenge(address, chainId);
      const signature = await signMessageAsync({ message: challenge.message });
      const nextSession = await vector52Client.walletVerify({
        nonce: challenge.nonce,
        message: challenge.message,
        signature
      });
      onSession(nextSession);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Wallet authentication failed.");
    } finally {
      setVerifying(false);
    }
  };

  if (!isConnected || !address) {
    return (
      <button className="wallet-connect-action" type="button" onClick={() => void open()}>
        <WalletCards size={18} />{locale === "es" ? "Conectar wallet" : "Connect wallet"}
      </button>
    );
  }

  if (!session) {
    return (
      <div className="wallet-access-stack">
        <button className="wallet-connect-action verify" type="button" disabled={verifying || isPending} onClick={() => void authenticate()}>
          {verifying || isPending ? <LoaderCircle className="spin" size={18} /> : <KeyRound size={18} />}
          {locale === "es" ? `Verificar ${short(address)}` : `Verify ${short(address)}`}
        </button>
        <button className="wallet-manage" type="button" onClick={() => void open({ view: "Account" })}><LogIn size={14} />{locale === "es" ? "Cuenta" : "Account"}</button>
        {error ? <small className="wallet-error">{error}</small> : null}
      </div>
    );
  }

  return (
    <div className="wallet-access-stack">
      <button className="wallet-access-state is-verified" type="button" onClick={() => void open({ view: "Account" })}>
        <CheckCircle2 size={18} /><div><strong>{short(session.address)}</strong><span>{locale === "es" ? "Sesión verificada" : "Verified session"}</span></div>
      </button>
    </div>
  );
}
