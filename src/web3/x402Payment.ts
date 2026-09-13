import { x402Client, x402HTTPClient } from "@x402/core/client";
import { type ClientEvmSigner } from "@x402/evm";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { getAddress, isAddress, type WalletClient } from "viem";
import { vector52ApiUrl, Vector52ApiError } from "../api/vector52Client";
import type {
  WalletFlowFilters,
  WebWalletFlowResponse,
  X402Capabilities
} from "../domain/apiTypes";

const FUJI_NETWORK = "eip155:43113";

const toSigner = (wallet: WalletClient): ClientEvmSigner => {
  if (!wallet.account) throw new Error("The connected wallet has no active account.");
  return {
    address: wallet.account.address,
    signTypedData: (message) => wallet.signTypedData({
      account: wallet.account!,
      ...message
    } as Parameters<WalletClient["signTypedData"]>[0])
  };
};

const paymentClientFor = (
  wallet: WalletClient,
  network: string,
  asset: string,
  exactAmountAtomic: string,
  expectedPayTo: string
) => {
  if (network !== FUJI_NETWORK) {
    throw new Error(`Unsupported payment network: ${network}`);
  }
  if (!isAddress(asset) || !isAddress(expectedPayTo)) {
    throw new Error("The x402 asset or recipient announced by Vector52 is invalid.");
  }

  const expectedAsset = getAddress(asset);
  const expectedRecipient = getAddress(expectedPayTo);

  const paymentClient = new x402Client()
    .setSpendControls({
      maxAmountPerPayment: false,
      allowedAssets: [{
        network: FUJI_NETWORK,
        asset: expectedAsset,
        maxAmountPerPayment: exactAmountAtomic
      }]
    })
    .registerPolicy((_version, requirements) => requirements.filter((requirement) => {
      try {
        return requirement.scheme === "exact"
          && requirement.network === network
          && isAddress(requirement.asset)
          && getAddress(requirement.asset) === expectedAsset
          && requirement.amount === exactAmountAtomic
          && isAddress(requirement.payTo)
          && getAddress(requirement.payTo) === expectedRecipient;
      } catch {
        return false;
      }
    }));

  registerExactEvmScheme(paymentClient, {
    signer: toSigner(wallet),
    networks: [FUJI_NETWORK]
  });
  return paymentClient;
};

export async function investigateWithX402(
  wallet: WalletClient,
  capabilities: X402Capabilities,
  accessToken: string,
  targetAddress: string,
  limit: number,
  filters: WalletFlowFilters,
  signal?: AbortSignal
): Promise<WebWalletFlowResponse> {
  if (!capabilities.ready || !capabilities.pay_to) {
    throw new Vector52ApiError("The Vector52 x402 payment channel is not ready.", 503, capabilities);
  }

  const paymentClient = paymentClientFor(
    wallet,
    capabilities.network,
    capabilities.asset,
    capabilities.amount_atomic,
    capabilities.pay_to
  );
  const paidFetch = wrapFetchWithPayment(globalThis.fetch, paymentClient);
  const response = await paidFetch(vector52ApiUrl("/v1/web/investigations/wallet-flow"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      target_address: targetAddress.trim(),
      chain_id: 1,
      limit,
      from_date: filters.fromDate,
      to_date: filters.toDate
    }),
    signal
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Vector52ApiError(
      response.status === 402
        ? "The x402 payment was not authorized or settled."
        : `Investigation failed (${response.status}).`,
      response.status,
      body
    );
  }

  const paymentResult = new x402HTTPClient(paymentClient).parsePaymentResult({
    status: response.status,
    getHeader: (name) => response.headers.get(name),
    body
  });
  if (paymentResult.paymentStatus !== "settled") {
    throw new Vector52ApiError(
      "The investigation response did not include a verifiable x402 settlement receipt.",
      402,
      paymentResult
    );
  }
  return body as WebWalletFlowResponse;
}
