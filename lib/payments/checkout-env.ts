import "server-only";
import { readEcpayHashFromEnv } from "../ecpay/check-mac";

export type EcpayCheckoutEnv = {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  checkoutUrl: string;
  returnUrl: string;
  clientBackUrl: string;
};

/**
 * 錄影課 4-2：設為 1／true 時，建單 ReturnURL 改為本機不可達位址，
 * 綠界 Webhook 打不進來、訂單維持 pending。預設未設＝正式／一般行為不變。
 * 見 scripts/course-recording-reset.mjs webhook off｜on
 */
export const ECPAY_UNREACHABLE_RETURN_URL =
  "https://127.0.0.1:9/api/payments/ecpay/webhook";

export function isEcpayWebhookUnreachable(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const raw = env.ECPAY_WEBHOOK_UNREACHABLE?.trim() ?? "";
  return raw === "1" || raw.toLowerCase() === "true";
}

function composeFromAppBase(path: string): string {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  if (!base) {
    return "";
  }
  return `${base}${path}`;
}

export function readEcpayCheckoutEnv(): EcpayCheckoutEnv | null {
  const hash = readEcpayHashFromEnv();
  if (!hash) {
    return null;
  }
  const merchantId = process.env.ECPAY_MERCHANT_ID?.trim() ?? "";
  const checkoutUrl =
    process.env.ECPAY_CHECKOUT_URL?.trim() ||
    "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5";
  const returnUrl = isEcpayWebhookUnreachable()
    ? ECPAY_UNREACHABLE_RETURN_URL
    : process.env.ECPAY_RETURN_URL?.trim() ||
      composeFromAppBase("/api/payments/ecpay/webhook");
  const clientBackUrl =
    process.env.ECPAY_CLIENT_BACK_URL?.trim() ||
    composeFromAppBase("/orders/processing");
  if (!merchantId || !returnUrl || !clientBackUrl) {
    return null;
  }
  return {
    merchantId,
    hashKey: hash.hashKey,
    hashIV: hash.hashIV,
    checkoutUrl,
    returnUrl,
    clientBackUrl,
  };
}
