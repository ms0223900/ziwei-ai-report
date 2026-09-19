import {
  readEcpayHashFromEnv,
  verifyCheckMacValue,
} from "../../../../../lib/ecpay/check-mac";
import { createServiceRoleClient } from "../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

type OrderRow = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
  trade_no: string | null;
  payment_date: string | null;
};

type ProfileRow = {
  user_id: string;
  access_status?: string;
  points_balance?: number;
  subscription_status?: string;
};

function ok(): Response {
  return new Response("1|OK", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

function reject(reason: string): Response {
  console.error("[ecpay webhook]", reason);
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
  const raw = await request.text();
  const params = new URLSearchParams(raw);
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

function parseEcpayPaymentDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }
  const match =
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(trimmed);
  if (!match) {
    console.error("[ecpay webhook] PaymentDate parse failed", trimmed);
    return null;
  }
  const iso = `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+08:00`;
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    console.error("[ecpay webhook] PaymentDate parse failed", trimmed);
    return null;
  }
  return parsed.toISOString();
}

async function loadOrder(
  client: Awaited<ReturnType<typeof createServiceRoleClient>>,
  merchantTradeNo: string,
): Promise<OrderRow | null> {
  const { data, error } = await client
    .from("orders")
    .select()
    .eq("merchant_trade_no", merchantTradeNo)
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return null;
  }
  const row = data as OrderRow;
  if (!row.id || !row.user_id) {
    return null;
  }
  return row;
}

async function loadProfile(
  client: Awaited<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
): Promise<ProfileRow | null> {
  const { data, error } = await client
    .from("profiles")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data || typeof data !== "object") {
    return null;
  }
  return data as ProfileRow;
}

async function markOrderFailed(
  client: Awaited<ReturnType<typeof createServiceRoleClient>>,
  orderId: string,
): Promise<boolean> {
  const { error } = await client
    .from("orders")
    .update({ status: "failed" })
    .eq("id", orderId);
  return !error;
}

async function markOrderPaid(
  client: Awaited<ReturnType<typeof createServiceRoleClient>>,
  order: OrderRow,
  tradeNo: string,
  paymentDate: string | null,
): Promise<boolean> {
  const { error } = await client
    .from("orders")
    .update({
      status: "paid",
      trade_no: tradeNo || order.trade_no,
      payment_date: paymentDate,
    })
    .eq("id", order.id);
  return !error;
}

async function unlockIfLocked(
  client: Awaited<ReturnType<typeof createServiceRoleClient>>,
  profile: ProfileRow | null,
  userId: string,
): Promise<boolean> {
  if (profile?.access_status === "unlocked") {
    return true;
  }
  const { error } = await client
    .from("profiles")
    .update({ access_status: "unlocked" })
    .eq("user_id", userId);
  return !error;
}

export async function POST(request: Request): Promise<Response> {
  const fields = await readFormFields(request);
  const hash = readEcpayHashFromEnv();
  if (!hash) {
    return reject("missing hash");
  }

  const checkMacValue = fields.CheckMacValue ?? "";
  if (!verifyCheckMacValue(fields, checkMacValue, hash.hashKey, hash.hashIV)) {
    return reject("check mac mismatch");
  }

  const merchantTradeNo = trimField(fields, "MerchantTradeNo");
  const client = await createServiceRoleClient();
  const order = await loadOrder(client, merchantTradeNo);
  const tradeAmt = toDecimalInt(fields.TradeAmt);
  if (!order || tradeAmt === null || tradeAmt !== toDecimalInt(order.amount)) {
    return reject("order or amount mismatch");
  }

  // Later (unit 5/6): branch on DB orders.plan_id here — not ECPay CustomField.
  // This unit only fulfills unlock_report_lifetime → unlocked; no points / PeriodReturnURL.

  const simulatePaid = trimField(fields, "SimulatePaid");
  if (simulatePaid === "1") {
    return ok();
  }

  const profile = await loadProfile(client, order.user_id);
  const rtnCode = trimField(fields, "RtnCode");
  const tradeNo = trimField(fields, "TradeNo");
  const paymentDate = parseEcpayPaymentDate(fields.PaymentDate ?? "");

  if (order.status === "paid") {
    const unlocked = await unlockIfLocked(client, profile, order.user_id);
    if (!unlocked) {
      return reject("unlock compensation failed");
    }
    return ok();
  }

  if (rtnCode !== "1") {
    await markOrderFailed(client, order.id);
    return ok();
  }

  const paid = await markOrderPaid(client, order, tradeNo, paymentDate);
  if (!paid) {
    return reject("order paid write failed");
  }

  const unlocked = await unlockIfLocked(client, profile, order.user_id);
  if (!unlocked) {
    return reject("entitlement write failed");
  }

  return ok();
}
