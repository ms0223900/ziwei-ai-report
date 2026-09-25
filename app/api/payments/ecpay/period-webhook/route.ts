import {
  readEcpayHashFromEnv,
  verifyCheckMacValue,
} from "../../../../../lib/ecpay/check-mac";
import {
  SUBSCRIBE_REPORT_MONTHLY_PLAN_ID,
  resolveCheckoutPlan,
} from "../../../../../lib/payments/plans";
import { createServiceRoleClient } from "../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const MONTHLY_AMOUNT = resolveCheckoutPlan(SUBSCRIBE_REPORT_MONTHLY_PLAN_ID)?.amount;

function ok(): Response {
  return new Response("1|OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function reject(reason: string): Response {
  console.error("[ecpay period webhook]", reason);
  return new Response("0|Error", {
    status: 400,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

async function readFormFields(request: Request): Promise<Record<string, string>> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/x-www-form-urlencoded")) {
    return {};
  }
  const params = new URLSearchParams(await request.text());
  const fields: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    fields[key] = value;
  }
  return fields;
}

function trimField(fields: Record<string, string>, key: string): string {
  return (fields[key] ?? "").trim();
}

function toDecimalInt(value: unknown): number | null {
  const n = Number(String(value ?? "").trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return null;
  }
  return n;
}

// ProcessDate is Asia/Taipei "yyyy/MM/dd HH:mm:ss"; the RPC falls back to now() on null.
function parseProcessDate(raw: string): string | null {
  const match = /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw);
  if (!match) {
    return null;
  }
  const parsed = new Date(
    `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+08:00`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export async function POST(request: Request): Promise<Response> {
  const fields = await readFormFields(request);
  const hash = readEcpayHashFromEnv();
  if (!hash) {
    return reject("missing hash");
  }
  if (!verifyCheckMacValue(fields, fields.CheckMacValue ?? "", hash.hashKey, hash.hashIV)) {
    return reject("check mac mismatch");
  }

  const merchantTradeNo = trimField(fields, "MerchantTradeNo");
  const client = await createServiceRoleClient();
  const { data: subscription, error: subscriptionError } = await client
    .from("subscriptions")
    .select()
    .eq("merchant_trade_no", merchantTradeNo)
    .maybeSingle();
  if (
    subscriptionError ||
    !subscription ||
    toDecimalInt(fields.Amount) !== MONTHLY_AMOUNT
  ) {
    return reject("subscription or amount mismatch");
  }

  if (trimField(fields, "SimulatePaid") === "1") {
    return ok();
  }

  const rtnCode = trimField(fields, "RtnCode");
  const totalSuccessTimes = toDecimalInt(fields.TotalSuccessTimes);
  // Official docs spell it gwsr; older SDK samples send Gwsr.
  const gwsr = trimField(fields, "gwsr") || trimField(fields, "Gwsr") || null;
  const processDateRaw = trimField(fields, "ProcessDate");

  let eventType: "first_duplicate" | "renewal_success" | "payment_failed";
  let idempotencyKey: string;
  if (rtnCode === "1") {
    if (totalSuccessTimes === null) {
      return reject("missing TotalSuccessTimes");
    }
    // The first authorization is fulfilled via ReturnURL; never extend twice for it.
    eventType = totalSuccessTimes === 1 ? "first_duplicate" : "renewal_success";
    idempotencyKey = `period:${merchantTradeNo}:${totalSuccessTimes}`;
  } else {
    // TotalSuccessTimes does not advance on failure, so it cannot key the event.
    eventType = "payment_failed";
    idempotencyKey = `failed:${merchantTradeNo}:${gwsr ?? processDateRaw}`;
  }

  const { data, error } = await client.rpc("apply_subscription_period_event", {
    p_merchant_trade_no: merchantTradeNo,
    p_idempotency_key: idempotencyKey,
    p_event_type: eventType,
    p_rtn_code: rtnCode,
    p_total_success_times: totalSuccessTimes,
    p_gwsr: gwsr,
    p_processed_at: parseProcessDate(processDateRaw),
  });
  const row = (Array.isArray(data) ? data[0] : data) as { ok?: boolean } | null;
  if (error || row?.ok !== true) {
    return reject("period event write failed");
  }
  return ok();
}
