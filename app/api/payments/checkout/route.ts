import { ERROR_MESSAGES } from "../../../../lib/constants";
import { computeCheckMacValue } from "../../../../lib/ecpay/check-mac";
import {
  alreadyUnlockedError,
  jsonError,
  loginRequiredError,
  paymentUnavailableError,
  persistFailedError,
  subscriptionInProgressError,
  validationError,
} from "../../../../lib/errors";
import { generateMerchantTradeNo } from "../../../../lib/payments/merchant-trade-no";
import { readEcpayCheckoutEnv } from "../../../../lib/payments/checkout-env";
import {
  SUBSCRIBE_REPORT_MONTHLY_PLAN_ID,
  UNLOCK_REPORT_LIFETIME_PLAN_ID,
  resolveCheckoutPlan,
} from "../../../../lib/payments/plans";
import { createServiceRoleClient } from "../../../../lib/supabase/server";
import { getSessionUser } from "../../../../lib/supabase/session";

export const dynamic = "force-dynamic";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function formatMerchantTradeDate(now = new Date()): string {
  return `${now.getFullYear()}/${pad2(now.getMonth() + 1)}/${pad2(now.getDate())} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
}

const PENDING_MONTHLY_WINDOW_MS = 5 * 60 * 1000;

type ServiceClient = Awaited<ReturnType<typeof createServiceRoleClient>>;

// Fail closed: a query error counts as blocked so we never open a second ECPay contract.
async function monthlyCheckoutBlocked(
  client: ServiceClient,
  userId: string,
  now: number,
): Promise<boolean> {
  const { data: subscription, error: subscriptionError } = await client
    .from("subscriptions")
    .select()
    .eq("user_id", userId)
    .maybeSingle();
  if (subscriptionError) {
    return true;
  }
  const periodEnd = (subscription as { current_period_end?: string } | null)
    ?.current_period_end;
  if (periodEnd && new Date(periodEnd).getTime() >= now) {
    return true;
  }

  const { data: pendingOrders, error: ordersError } = await client
    .from("orders")
    .select()
    .eq("user_id", userId)
    .eq("plan_id", SUBSCRIBE_REPORT_MONTHLY_PLAN_ID)
    .eq("status", "pending");
  if (ordersError) {
    return true;
  }
  return ((pendingOrders ?? []) as { created_at?: string }[]).some(
    (order) =>
      order.created_at !== undefined &&
      now - new Date(order.created_at).getTime() < PENDING_MONTHLY_WINDOW_MS,
  );
}

async function parseBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    if (body && typeof body === "object" && !Array.isArray(body)) {
      return body as Record<string, unknown>;
    }
  } catch {
    // 無效 JSON 視為沒有 plan_id
  }
  return {};
}

export async function POST(request: Request): Promise<Response> {
  const user = await getSessionUser();
  if (!user) {
    return jsonError(loginRequiredError());
  }

  const body = await parseBody(request);
  const planId = typeof body.plan_id === "string" ? body.plan_id : "";
  const plan = resolveCheckoutPlan(planId);
  if (!plan) {
    return jsonError(validationError(ERROR_MESSAGES.UNSUPPORTED_PLAN));
  }

  const client = await createServiceRoleClient();
  const { data: profile } = await client
    .from("profiles")
    .select()
    .eq("user_id", user.id)
    .maybeSingle();
  const accessStatus =
    profile && typeof profile === "object"
      ? (profile as { access_status?: string }).access_status
      : undefined;
  if (
    accessStatus === "unlocked" &&
    plan.planId === UNLOCK_REPORT_LIFETIME_PLAN_ID
  ) {
    return jsonError(alreadyUnlockedError());
  }

  const env = readEcpayCheckoutEnv();
  const isMonthly = plan.planId === SUBSCRIBE_REPORT_MONTHLY_PLAN_ID;
  if (!env || (isMonthly && !env.periodReturnUrl)) {
    return jsonError(paymentUnavailableError());
  }

  if (isMonthly && (await monthlyCheckoutBlocked(client, user.id, Date.now()))) {
    return jsonError(subscriptionInProgressError());
  }

  const merchantTradeNo = generateMerchantTradeNo();
  const { error: insertError } = await client.from("orders").insert({
    user_id: user.id,
    plan_id: plan.planId,
    merchant_trade_no: merchantTradeNo,
    amount: plan.amount,
    currency: plan.currency,
    status: "pending",
    trade_no: null,
    payment_date: null,
  });
  if (insertError) {
    return jsonError(persistFailedError());
  }

  const fields: Record<string, string> = {
    MerchantID: env.merchantId,
    MerchantTradeNo: merchantTradeNo,
    MerchantTradeDate: formatMerchantTradeDate(),
    PaymentType: "aio",
    TotalAmount: String(plan.amount),
    TradeDesc: plan.tradeDesc,
    ItemName: plan.itemName,
    ReturnURL: env.returnUrl,
    ClientBackURL: env.clientBackUrl,
    ChoosePayment: "Credit",
    EncryptType: "1",
  };
  if ("period" in plan) {
    fields.PeriodAmount = String(plan.amount);
    fields.PeriodType = plan.period.periodType;
    fields.Frequency = String(plan.period.frequency);
    fields.ExecTimes = String(plan.period.execTimes);
    fields.PeriodReturnURL = env.periodReturnUrl;
  }
  fields.CheckMacValue = computeCheckMacValue(
    fields,
    env.hashKey,
    env.hashIV,
  );

  return Response.json({
    checkout_url: env.checkoutUrl,
    fields,
  });
}
