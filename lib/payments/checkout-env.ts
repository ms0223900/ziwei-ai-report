import "server-only";
import { readEcpayHashFromEnv } from "../ecpay/check-mac";

export type EcpayCheckoutEnv = {
  merchantId: string;
  hashKey: string;
  hashIV: string;
  checkoutUrl: string;
  returnUrl: string;
  // 回跳頁基底（無尾斜線）。ClientBackURL 由建單後的 route 以 `${appBaseUrl}/orders/processing?order={id}` 組成。
  appBaseUrl: string;
  // 月繳方案才需要；空字串時只有月繳建單不可用，不影響其他方案。
  periodReturnUrl: string;
};

function composeFromAppBase(path: string): string {
  const base = process.env.APP_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  if (!base) {
    return "";
  }
  return `${base}${path}`;
}

// 優先 APP_BASE_URL；沒設時退回舊 ECPAY_CLIENT_BACK_URL 的 origin（只取來源，不會原樣送出整段值）。
function readAppBaseUrl(): string {
  const fromApp = composeFromAppBase("");
  if (fromApp) {
    return fromApp;
  }
  const legacy = process.env.ECPAY_CLIENT_BACK_URL?.trim();
  if (!legacy) {
    return "";
  }
  try {
    return new URL(legacy).origin;
  } catch {
    return "";
  }
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
  const returnUrl =
    process.env.ECPAY_RETURN_URL?.trim() ||
    composeFromAppBase("/api/payments/ecpay/webhook");
  const appBaseUrl = readAppBaseUrl();
  const periodReturnUrl =
    process.env.ECPAY_PERIOD_RETURN_URL?.trim() ||
    composeFromAppBase("/api/payments/ecpay/period-webhook");
  if (!merchantId || !returnUrl || !appBaseUrl) {
    return null;
  }
  return {
    merchantId,
    hashKey: hash.hashKey,
    hashIV: hash.hashIV,
    checkoutUrl,
    returnUrl,
    appBaseUrl,
    periodReturnUrl,
  };
}
