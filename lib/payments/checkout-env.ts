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
  const returnUrl =
    process.env.ECPAY_RETURN_URL?.trim() ||
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
