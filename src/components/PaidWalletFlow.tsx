import { useRef } from "react";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useChainId, useSignMessage, useSwitchChain, useWalletClient } from "wagmi";
import { vector52Client, Vector52ApiError } from "../api/vector52Client";
import type {
  WalletFlowFilters,
  WalletSession,
  WebCapabilities,
  WebWalletFlowResponse
} from "../domain/apiTypes";
import type { Locale } from "../domain/locale";
import { investigateWithX402 } from "../web3/x402Payment";
import { WalletFlowForm } from "./WalletFlowForm";

interface Props {
  locale: Locale;
  busy: boolean;
  session: WalletSession | null;
  capabilities: WebCapabilities | null;
  onSession: (session: WalletSession | null) => void;
  onStart: () => void;
  onSuccess: (response: WebWalletFlowResponse) => void;
  onError: (error: unknown) => void;
}

const isCurrentSession = (session: WalletSession | null, address?: string) => Boolean(
  session
  && address
  && session.address.toLowerCase() === address.toLowerCase()
  && Date.parse(session.expires_at) > Date.now()
);

export function PaidWalletFlow({
  locale,
  busy,
  session,
  capabilities,
  onSession,
  onStart,
  onSuccess,
  onError
}: Props) {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const { signMessageAsync } = useSignMessage();
  const { switchChainAsync } = useSwitchChain();
  const running = useRef(false);

  const price = capabilities?.amount_display
    ?? (capabilities?.amount_atomic ? String(Number(capabilities.amount_atomic) / 1_000_000) : null);
  const sessionReady = isCurrentSession(session, address);
  const submitLabel = !isConnected
    ? (locale === "es" ? "Conectar wallet" : "Connect wallet")
    : !price
      ? (locale === "es" ? "Verificar precio · investigar" : "Check price · investigate")
    : !sessionReady
      ? (locale === "es" ? `Firmar y pagar ${price} USDC` : `Sign and pay ${price} USDC`)
      : (locale === "es" ? `Pagar ${price} USDC · investigar` : `Pay ${price} USDC · investigate`);

  const authenticate = async (): Promise<WalletSession> => {
    if (!address) throw new Error(locale === "es" ? "No hay una wallet conectada." : "No wallet is connected.");
    if (sessionReady && session) return session;

    const challenge = await vector52Client.walletChallenge(address, 43113);
    const signature = await signMessageAsync({ message: challenge.message });
    const verified = await vector52Client.walletVerify({
      nonce: challenge.nonce,
      message: challenge.message,
      signature
    });
    onSession(verified);
    return verified;
  };

  const run = async (targetAddress: string, limit: number, filters: WalletFlowFilters) => {
    if (running.current) return;
    if (!isConnected || !address) {
      await open();
      return;
    }
    if (!walletClient) {
      onError(new Error(locale === "es" ? "La wallet todavía no está lista para firmar." : "The wallet is not ready to sign yet."));
      return;
    }

    running.current = true;
    onStart();
    try {
      if (chainId !== 43113) await switchChainAsync({ chainId: 43113 });
      const verifiedSession = await authenticate();
      // Validate the bearer session before entering the paid middleware. This
      // prevents an expired browser session from settling and then failing 401.
      await vector52Client.walletIdentity(verifiedSession.access_token);
      const currentCapabilities = capabilities?.ready
        ? capabilities
        : await vector52Client.webCapabilities();
      if (!currentCapabilities.ready || !currentCapabilities.pay_to) {
        throw new Vector52ApiError(
          locale === "es"
            ? "El canal x402 no está listo o no anuncia la wallet receptora. No se realizó ningún pago."
            : "The x402 channel is not ready or does not announce its recipient. No payment was made.",
          503,
          currentCapabilities
        );
      }
      const response = await investigateWithX402(
        walletClient,
        currentCapabilities,
        verifiedSession.access_token,
        targetAddress,
        limit,
        filters
      );
      onSuccess(response);
    } catch (error) {
      if (error instanceof Vector52ApiError && error.status === 401) onSession(null);
      onError(error);
    } finally {
      running.current = false;
    }
  };

  return (
    <WalletFlowForm
      locale={locale}
      busy={busy}
      accessLocked={!sessionReady}
      submitLabel={submitLabel}
      paymentReady
      onSubmit={(targetAddress, limit, filters) => void run(targetAddress, limit, filters)}
    />
  );
}
