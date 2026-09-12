import { x402Client, x402HTTPClient } from "@x402/core/client";
import { type ClientEvmSigner } from "@x402/evm";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import type { WalletClient } from "viem";
import { vector52ApiUrl, Vector52ApiError } from "../api/vector52Client";
import type { AccessPlan, CreditPurchase } from "../domain/apiTypes";

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

export async function purchaseWithX402(
  wallet: WalletClient,
  plan: AccessPlan,
  accessToken: string
): Promise<CreditPurchase> {
  if (plan.network !== FUJI_NETWORK) {
    throw new Error(`Unsupported payment network: ${plan.network}`);
  }

  const paymentClient = new x402Client()
    .setSpendControls({
      maxAmountPerPayment: false,
      allowedAssets: [{
        network: FUJI_NETWORK,
        asset: plan.asset,
        maxAmountPerPayment: plan.price_atomic
      }]
    })
    .registerPolicy((_version, requirements) => requirements.filter((requirement) =>
      requirement.network === plan.network
      && requirement.asset.toLowerCase() === plan.asset.toLowerCase()
      && BigInt(requirement.amount) <= BigInt(plan.price_atomic)
    ));

  registerExactEvmScheme(paymentClient, {
    signer: toSigner(wallet),
    networks: [FUJI_NETWORK]
  });

  const paidFetch = wrapFetchWithPayment(globalThis.fetch, paymentClient);
  const response = await paidFetch(vector52ApiUrl("/v1/web/credits/purchase"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ plan_id: plan.id })
  });

  const body = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Vector52ApiError(
      response.status === 402 ? "The x402 payment was not settled." : `Purchase failed (${response.status}).`,
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
    throw new Vector52ApiError("The server did not return a verifiable settlement receipt.", 402, paymentResult);
  }
  return body as CreditPurchase;
}
