export type FakeAccessStatus = "locked" | "unlocked";

export type FakeUser = {
  id: string;
  email: string;
};

export type FakeProfile = {
  user_id: string;
  display_name: string;
  access_status: FakeAccessStatus;
  points_balance: number;
  subscription_status: string;
};

export type FakeReport = {
  id: string;
  generation_status: "success" | "failed" | "pending";
  basic_json: Record<string, unknown>;
  advanced_json: Record<string, unknown> | null;
  nickname?: string;
  user_id?: string | null;
};

export type FakePointTransaction = {
  id: string;
  user_id: string;
  delta: number;
  type: "credit_purchase" | "debit_unlock";
  source_order_id: string | null;
  report_id: string | null;
};

export type FakeReportUnlock = {
  id: string;
  user_id: string;
  report_id: string;
  transaction_id: string;
  created_at?: string;
};

export type FakeRpcResult = { data: unknown; error: unknown };

export type FakeRpcHandler =
  | FakeRpcResult
  | ((
      args: Record<string, unknown> | undefined,
    ) => FakeRpcResult | Promise<FakeRpcResult>);

export type FakeOrderStatus = "pending" | "paid" | "failed";

export type FakeOrder = {
  id: string;
  user_id: string;
  plan_id: string;
  merchant_trade_no: string;
  amount: number;
  currency: string;
  status: FakeOrderStatus;
  trade_no: string | null;
  payment_date: string | null;
  created_at?: string;
};

export type FakeSubscriptionStatus = "active" | "past_due" | "cancelled" | "expired";

export type FakeSubscription = {
  id: string;
  user_id: string;
  plan_id: string;
  order_id: string | null;
  merchant_trade_no: string;
  status: FakeSubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  created_at?: string;
};

export type FakeSubscriptionEvent = {
  id: string;
  subscription_id: string;
  user_id: string;
  event_type:
    | "first_success"
    | "first_duplicate"
    | "renewal_success"
    | "payment_failed"
    | "cancelled"
    | "expired";
  idempotency_key: string;
  gwsr: string | null;
  total_success_times: number | null;
  rtn_code: string | null;
  processed_at: string;
};

export type FakeSupabaseMemory = {
  users: Map<string, FakeUser>;
  profiles: Map<string, FakeProfile>;
  reports: Map<string, FakeReport>;
  orders: Map<string, FakeOrder>;
  pointTransactions: Map<string, FakePointTransaction>;
  reportUnlocks: Map<string, FakeReportUnlock>;
  subscriptions: Map<string, FakeSubscription>;
  subscriptionEvents: Map<string, FakeSubscriptionEvent>;
  rpc: Map<string, FakeRpcHandler>;
};

type Filter = { column: string; value: unknown };

export function createFakeSupabaseMemory(): FakeSupabaseMemory {
  return {
    users: new Map(),
    profiles: new Map(),
    reports: new Map(),
    orders: new Map(),
    pointTransactions: new Map(),
    reportUnlocks: new Map(),
    subscriptions: new Map(),
    subscriptionEvents: new Map(),
    rpc: new Map(),
  };
}

export function setFakeRpc(
  memory: FakeSupabaseMemory,
  name: string,
  result: FakeRpcHandler,
) {
  memory.rpc.set(name, result);
}

export function seedFakeUser(
  memory: FakeSupabaseMemory,
  user: FakeUser,
  profile?: Partial<FakeProfile>,
) {
  memory.users.set(user.id, user);
  memory.profiles.set(user.id, {
    user_id: user.id,
    display_name: profile?.display_name ?? user.email.split("@")[0] ?? "",
    access_status: profile?.access_status ?? "locked",
    points_balance: profile?.points_balance ?? 0,
    subscription_status: profile?.subscription_status ?? "none",
  });
}

export function seedFakeReport(memory: FakeSupabaseMemory, report: FakeReport) {
  memory.reports.set(report.id, { ...report });
}

function matches(row: Record<string, unknown>, filters: Filter[]) {
  return filters.every((filter) => row[filter.column] === filter.value);
}

type FakeTable =
  | "profiles"
  | "reports"
  | "orders"
  | "point_transactions"
  | "report_unlocks"
  | "subscriptions"
  | "subscription_events";

const FAKE_TABLES: readonly FakeTable[] = [
  "profiles",
  "reports",
  "orders",
  "point_transactions",
  "report_unlocks",
  "subscriptions",
  "subscription_events",
];

// Tables whose inserts get a default created_at, mirroring `default now()`.
const CREATED_AT_DEFAULT: readonly FakeTable[] = ["orders", "subscriptions"];

function tableConfig(memory: FakeSupabaseMemory, table: FakeTable) {
  if (table === "profiles") {
    return {
      store: memory.profiles,
      idKey: "user_id",
      uniqueKeys: [] as string[],
      uniqueComposites: [] as string[][],
    };
  }
  if (table === "reports") {
    return {
      store: memory.reports,
      idKey: "id",
      uniqueKeys: [] as string[],
      uniqueComposites: [] as string[][],
    };
  }
  if (table === "point_transactions") {
    return {
      store: memory.pointTransactions,
      idKey: "id",
      uniqueKeys: ["source_order_id"],
      uniqueComposites: [] as string[][],
    };
  }
  if (table === "report_unlocks") {
    return {
      store: memory.reportUnlocks,
      idKey: "id",
      uniqueKeys: [] as string[],
      uniqueComposites: [["user_id", "report_id"]],
    };
  }
  if (table === "subscriptions") {
    return {
      store: memory.subscriptions,
      idKey: "id",
      uniqueKeys: ["user_id", "merchant_trade_no"],
      uniqueComposites: [] as string[][],
    };
  }
  if (table === "subscription_events") {
    return {
      store: memory.subscriptionEvents,
      idKey: "id",
      uniqueKeys: ["idempotency_key"],
      uniqueComposites: [] as string[][],
    };
  }
  return {
    store: memory.orders,
    idKey: "id",
    uniqueKeys: ["merchant_trade_no"],
    uniqueComposites: [] as string[][],
  };
}

function uniqueConflict(
  store: Map<string, unknown>,
  idKey: string,
  id: string,
  row: Record<string, unknown>,
  uniqueKeys: string[],
  uniqueComposites: string[][] = [],
) {
  for (const key of uniqueKeys) {
    const value = row[key];
    if (value === undefined || value === null) {
      continue;
    }
    for (const existing of store.values()) {
      const record = existing as Record<string, unknown>;
      if (String(record[idKey]) === id) {
        continue;
      }
      if (record[key] === value) {
        return { code: "23505", message: `duplicate ${key}` };
      }
    }
  }
  for (const columns of uniqueComposites) {
    if (columns.some((column) => row[column] === undefined || row[column] === null)) {
      continue;
    }
    for (const existing of store.values()) {
      const record = existing as Record<string, unknown>;
      if (String(record[idKey]) === id) {
        continue;
      }
      if (columns.every((column) => record[column] === row[column])) {
        return { code: "23505", message: `duplicate ${columns.join(",")}` };
      }
    }
  }
  return null;
}

function createTableApi(memory: FakeSupabaseMemory, table: FakeTable) {
  const { store, idKey, uniqueKeys, uniqueComposites } = tableConfig(
    memory,
    table,
  );
  const filters: Filter[] = [];
  let pendingInsert: Record<string, unknown> | null = null;
  let pendingUpdate: Record<string, unknown> | null = null;
  let upsertIgnoreDuplicates = false;
  let isUpsert = false;
  let includeRepresentation = false;
  let orderBy: { column: string; ascending: boolean } | null = null;

  const api = {
    select() {
      includeRepresentation = true;
      return api;
    },
    insert(row: Record<string, unknown>) {
      pendingInsert = { ...row };
      isUpsert = false;
      return api;
    },
    upsert(
      row: Record<string, unknown>,
      options?: { onConflict?: string; ignoreDuplicates?: boolean },
    ) {
      pendingInsert = { ...row };
      isUpsert = true;
      upsertIgnoreDuplicates = options?.ignoreDuplicates === true;
      return api;
    },
    update(row: Record<string, unknown>) {
      pendingUpdate = { ...row };
      return api;
    },
    eq(column: string, value: unknown) {
      filters.push({ column, value });
      return api;
    },
    order(column: string, options?: { ascending?: boolean }) {
      orderBy = { column, ascending: options?.ascending !== false };
      return api;
    },
    // Awaiting a plain select (no single/maybeSingle) returns every match, like PostgREST.
    async list() {
      const rows = [...store.values()].filter((row) =>
        matches(row as unknown as Record<string, unknown>, filters),
      ) as Record<string, unknown>[];
      if (orderBy) {
        const { column, ascending } = orderBy;
        rows.sort((a, b) => {
          const left = String(a[column] ?? "");
          const right = String(b[column] ?? "");
          return ascending ? left.localeCompare(right) : right.localeCompare(left);
        });
      }
      return { data: rows, error: null };
    },
    async maybeSingle() {
      if (pendingInsert) {
        const derivedUnlockId =
          table === "report_unlocks" &&
          pendingInsert.user_id != null &&
          pendingInsert.report_id != null
            ? `${String(pendingInsert.user_id)}:${String(pendingInsert.report_id)}`
            : null;
        const id = String(
          pendingInsert[idKey] ?? derivedUnlockId ?? crypto.randomUUID(),
        );
        pendingInsert[idKey] = id;
        if (CREATED_AT_DEFAULT.includes(table) && pendingInsert.created_at == null) {
          pendingInsert.created_at = new Date().toISOString();
        }
        const existing = store.get(id);
        if (existing && upsertIgnoreDuplicates) {
          return { data: existing, error: null };
        }
        if (existing && !isUpsert) {
          return { data: null, error: { message: `duplicate ${idKey}` } };
        }
        const conflict = uniqueConflict(
          store as Map<string, unknown>,
          idKey,
          id,
          pendingInsert,
          uniqueKeys,
          uniqueComposites,
        );
        if (conflict) {
          return { data: null, error: conflict };
        }
        store.set(id, { ...(existing ?? {}), ...pendingInsert } as never);
        return { data: store.get(id) ?? null, error: null };
      }

      if (pendingUpdate) {
        const current = [...store.values()].find((row) =>
          matches(row as unknown as Record<string, unknown>, filters),
        );
        if (!current) {
          return { data: null, error: { message: "not found" } };
        }
        const next = { ...current, ...pendingUpdate } as Record<string, unknown>;
        const nextId = String(next[idKey]);
        const conflict = uniqueConflict(
          store as Map<string, unknown>,
          idKey,
          nextId,
          next,
          uniqueKeys,
          uniqueComposites,
        );
        if (conflict) {
          return { data: null, error: conflict };
        }
        store.set(nextId, next as never);
        if (!includeRepresentation) {
          return { data: null, error: null };
        }
        return { data: next, error: null };
      }

      const current = [...store.values()].find((row) =>
        matches(row as unknown as Record<string, unknown>, filters),
      );
      return { data: current ?? null, error: null };
    },
    async single() {
      const result = await api.maybeSingle();
      if (!result.data) {
        return { data: null, error: result.error ?? { message: "not found" } };
      }
      return result;
    },
    then<TResult1 = unknown, TResult2 = never>(
      onfulfilled?:
        | ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>)
        | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      const result =
        pendingInsert || pendingUpdate ? api.maybeSingle() : api.list();
      return result.then(onfulfilled, onrejected);
    },
  };

  return api;
}

export function createFakeServiceRoleClient(memory: FakeSupabaseMemory) {
  return {
    from(table: string) {
      if ((FAKE_TABLES as readonly string[]).includes(table)) {
        return createTableApi(memory, table as FakeTable);
      }
      throw new Error(`fake supabase: unsupported table ${table}`);
    },
    // Fake .rpc() stubs do not prove Story 4 / 5 / 8 migrations were applied,
    // nor do the built-in subscription RPCs prove the unit 6 migrations were.
    async rpc(fn: string, args?: Record<string, unknown>) {
      const handler = memory.rpc.get(fn);
      if (typeof handler === "function") {
        return handler(args);
      }
      if (handler) {
        return handler;
      }
      const builtin = BUILTIN_RPCS[fn];
      if (builtin) {
        return { data: [builtin(memory, args ?? {})], error: null };
      }
      return { data: null, error: null };
    },
    auth: {
      admin: {
        async listUsers() {
          return {
            data: { users: [...memory.users.values()] },
            error: null,
          };
        },
        async getUserById(id: string) {
          const user = memory.users.get(id) ?? null;
          return {
            data: { user },
            error: user ? null : { message: "not found" },
          };
        },
      },
    },
  };
}

const TAIPEI_OFFSET_MS = 8 * 60 * 60 * 1000;

// Mirrors `((ts at time zone 'Asia/Taipei') + interval '1 month') at time zone 'Asia/Taipei'`,
// including clamping 1/31 to the last day of February.
export function addOneMonthTaipei(iso: string): string {
  const local = new Date(new Date(iso).getTime() + TAIPEI_OFFSET_MS);
  const day = local.getUTCDate();
  local.setUTCDate(1);
  local.setUTCMonth(local.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0),
  ).getUTCDate();
  local.setUTCDate(Math.min(day, lastDay));
  return new Date(local.getTime() - TAIPEI_OFFSET_MS).toISOString();
}

type RpcRow = Record<string, unknown>;
type BuiltinRpc = (memory: FakeSupabaseMemory, args: Record<string, unknown>) => RpcRow;

function findSubscription(
  memory: FakeSupabaseMemory,
  predicate: (sub: FakeSubscription) => boolean,
) {
  return [...memory.subscriptions.values()].find(predicate) ?? null;
}

function hasEventKey(memory: FakeSupabaseMemory, key: string) {
  return [...memory.subscriptionEvents.values()].some(
    (event) => event.idempotency_key === key,
  );
}


function addEvent(
  memory: FakeSupabaseMemory,
  event: Omit<FakeSubscriptionEvent, "id">,
) {
  const id = crypto.randomUUID();
  memory.subscriptionEvents.set(id, { id, ...event });
}

function setProfileSubscriptionStatus(
  memory: FakeSupabaseMemory,
  userId: string,
  status: string,
) {
  const profile = memory.profiles.get(userId);
  if (profile) {
    memory.profiles.set(userId, { ...profile, subscription_status: status });
  }
}

function isActiveNow(sub: FakeSubscription | null) {
  return sub !== null && new Date(sub.current_period_end).getTime() >= Date.now();
}

const BUILTIN_RPCS: Record<string, BuiltinRpc> = {
  activate_subscription_from_order(memory, args) {
    const order = memory.orders.get(String(args.p_order_id ?? ""));
    if (!order) {
      return { ok: false, reason: "not_found" };
    }
    if (order.plan_id !== "subscribe_report_monthly") {
      return { ok: false, reason: "wrong_plan" };
    }
    const key = `return:${order.merchant_trade_no}`;
    if (hasEventKey(memory, key)) {
      return { ok: true, reason: "already_fulfilled" };
    }
    const existing = findSubscription(memory, (sub) => sub.user_id === order.user_id);
    if (
      existing &&
      isActiveNow(existing) &&
      existing.merchant_trade_no !== order.merchant_trade_no
    ) {
      return { ok: false, reason: "conflict" };
    }
    const start = order.payment_date ?? new Date().toISOString();
    const sub: FakeSubscription = {
      id: existing?.id ?? crypto.randomUUID(),
      user_id: order.user_id,
      plan_id: order.plan_id,
      order_id: order.id,
      merchant_trade_no: order.merchant_trade_no,
      status: "active",
      current_period_start: start,
      current_period_end: addOneMonthTaipei(start),
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    memory.subscriptions.set(sub.id, sub);
    addEvent(memory, {
      subscription_id: sub.id,
      user_id: sub.user_id,
      event_type: "first_success",
      idempotency_key: key,
      gwsr: null,
      total_success_times: null,
      rtn_code: null,
      processed_at: start,
    });
    setProfileSubscriptionStatus(memory, sub.user_id, "active");
    return { ok: true, reason: "activated" };
  },

  apply_subscription_period_event(memory, args) {
    const eventType = String(args.p_event_type ?? "");
    if (!["first_duplicate", "renewal_success", "payment_failed"].includes(eventType)) {
      return { ok: false, reason: "invalid_event" };
    }
    const sub = findSubscription(
      memory,
      (row) => row.merchant_trade_no === args.p_merchant_trade_no,
    );
    if (!sub) {
      return { ok: false, reason: "not_found" };
    }
    const key = String(args.p_idempotency_key ?? "");
    if (hasEventKey(memory, key)) {
      return { ok: true, reason: "already_processed" };
    }
    addEvent(memory, {
      subscription_id: sub.id,
      user_id: sub.user_id,
      event_type: eventType as FakeSubscriptionEvent["event_type"],
      idempotency_key: key,
      gwsr: (args.p_gwsr as string | null | undefined) ?? null,
      total_success_times:
        (args.p_total_success_times as number | null | undefined) ?? null,
      rtn_code: (args.p_rtn_code as string | null | undefined) ?? null,
      processed_at:
        (args.p_processed_at as string | null | undefined) ?? new Date().toISOString(),
    });
    if (sub.status === "cancelled" || sub.status === "expired") {
      return { ok: true, reason: "recorded_inactive" };
    }
    if (eventType === "first_duplicate") {
      return { ok: true, reason: "duplicate_first" };
    }
    if (eventType === "renewal_success") {
      memory.subscriptions.set(sub.id, {
        ...sub,
        status: "active",
        current_period_end: addOneMonthTaipei(sub.current_period_end),
      });
      setProfileSubscriptionStatus(memory, sub.user_id, "active");
      return { ok: true, reason: "renewed" };
    }
    memory.subscriptions.set(sub.id, { ...sub, status: "past_due" });
    setProfileSubscriptionStatus(memory, sub.user_id, "past_due");
    return { ok: true, reason: "past_due" };
  },

  cancel_subscription(memory, args) {
    const sub = findSubscription(memory, (row) => row.user_id === args.p_user_id);
    if (!sub) {
      return { ok: false, reason: "not_found" };
    }
    const key = `cancel:${sub.id}:${sub.merchant_trade_no}`;
    if (hasEventKey(memory, key)) {
      return { ok: true, reason: "already_cancelled" };
    }
    const now = Date.now();
    addEvent(memory, {
      subscription_id: sub.id,
      user_id: sub.user_id,
      event_type: "cancelled",
      idempotency_key: key,
      gwsr: null,
      total_success_times: null,
      rtn_code: null,
      processed_at: new Date(now).toISOString(),
    });
    memory.subscriptions.set(sub.id, {
      ...sub,
      status: "cancelled",
      current_period_end: new Date(now - 1000).toISOString(),
    });
    setProfileSubscriptionStatus(memory, sub.user_id, "cancelled");
    return { ok: true, reason: "cancelled" };
  },

  unlock_report_with_point(memory, args) {
    const userId = args.p_user_id as string | null | undefined;
    const reportId = String(args.report_id ?? "");
    const profile = userId ? memory.profiles.get(userId) : undefined;
    const balance = profile?.points_balance ?? 0;
    const report = memory.reports.get(reportId);
    if (!userId || !profile || !report || report.user_id !== userId) {
      return { ok: false, reason: "forbidden", points_balance: balance };
    }
    if (profile.access_status === "unlocked") {
      return { ok: true, reason: "lifetime", points_balance: balance };
    }
    const unlocked = [...memory.reportUnlocks.values()].some(
      (row) => row.user_id === userId && row.report_id === reportId,
    );
    if (unlocked) {
      return { ok: true, reason: "already_unlocked", points_balance: balance };
    }
    if (isActiveNow(findSubscription(memory, (sub) => sub.user_id === userId))) {
      return { ok: true, reason: "subscription", points_balance: balance };
    }
    if (balance < 1) {
      return { ok: false, reason: "insufficient", points_balance: balance };
    }
    const txId = crypto.randomUUID();
    memory.pointTransactions.set(txId, {
      id: txId,
      user_id: userId,
      delta: -1,
      type: "debit_unlock",
      source_order_id: null,
      report_id: reportId,
    });
    memory.reportUnlocks.set(`${userId}:${reportId}`, {
      id: `${userId}:${reportId}`,
      user_id: userId,
      report_id: reportId,
      transaction_id: txId,
      created_at: new Date().toISOString(),
    });
    memory.profiles.set(userId, { ...profile, points_balance: balance - 1 });
    return { ok: true, reason: "unlocked", points_balance: balance - 1 };
  },
};

export function seedFakeSubscription(
  memory: FakeSupabaseMemory,
  subscription: Partial<FakeSubscription> &
    Pick<FakeSubscription, "user_id" | "merchant_trade_no" | "current_period_end">,
) {
  const row: FakeSubscription = {
    id: subscription.id ?? crypto.randomUUID(),
    plan_id: "subscribe_report_monthly",
    order_id: null,
    status: "active",
    current_period_start: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...subscription,
  };
  memory.subscriptions.set(row.id, row);
  return row;
}
