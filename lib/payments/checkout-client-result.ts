import { ERROR_MESSAGES } from "../constants";
import { parseCheckoutFields } from "./submit-ecpay-form";

export type CheckoutClientResult =
  | { type: "login" }
  | { type: "error"; message: string }
  | { type: "submit"; checkoutUrl: string; fields: Record<string, string> };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStringField(json: unknown, key: string): string | undefined {
  if (!isRecord(json)) {
    return undefined;
  }
  const value = json[key];
  return typeof value === "string" ? value : undefined;
}

export function parseCheckoutClientResult(
  status: number,
  json: unknown,
): CheckoutClientResult {
  if (status === 401) {
    return { type: "login" };
  }

  const ok = status >= 200 && status < 300;
  if (!ok) {
    return {
      type: "error",
      message:
        readStringField(json, "message") ?? ERROR_MESSAGES.PAYMENT_UNAVAILABLE,
    };
  }

  const checkoutUrl = readStringField(json, "checkout_url") ?? "";
  const fields = isRecord(json) ? parseCheckoutFields(json.fields) : null;
  if (!checkoutUrl || !fields) {
    return { type: "error", message: ERROR_MESSAGES.PAYMENT_UNAVAILABLE };
  }

  return { type: "submit", checkoutUrl, fields };
}
