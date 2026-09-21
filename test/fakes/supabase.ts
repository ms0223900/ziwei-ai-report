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
};

export type FakeSupabaseMemory = {
  users: Map<string, FakeUser>;
  profiles: Map<string, FakeProfile>;
  reports: Map<string, FakeReport>;
  orders: Map<string, FakeOrder>;
  pointTransactions: Map<string, FakePointTransaction>;
  reportUnlocks: Map<string, FakeReportUnlock>;
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
  | "report_unlocks";

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
        return { message: `duplicate ${key}` };
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
        return { message: `duplicate ${columns.join(",")}` };
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
  let includeRepresentation = false;

  const api = {
    select() {
      includeRepresentation = true;
      return api;
    },
    insert(row: Record<string, unknown>) {
      pendingInsert = { ...row };
      return api;
    },
    upsert(
      row: Record<string, unknown>,
      options?: { onConflict?: string; ignoreDuplicates?: boolean },
    ) {
      pendingInsert = { ...row };
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
        const existing = store.get(id);
        if (existing && upsertIgnoreDuplicates) {
          return { data: existing, error: null };
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
      return api.maybeSingle().then(onfulfilled, onrejected);
    },
  };

  return api;
}

export function createFakeServiceRoleClient(memory: FakeSupabaseMemory) {
  return {
    from(table: string) {
      if (
        table === "profiles" ||
        table === "reports" ||
        table === "orders" ||
        table === "point_transactions" ||
        table === "report_unlocks"
      ) {
        return createTableApi(memory, table);
      }
      throw new Error(`fake supabase: unsupported table ${table}`);
    },
    // Fake .rpc() stubs do not prove Story 4 / 5 / 8 migrations were applied.
    async rpc(fn: string, args?: Record<string, unknown>) {
      const handler = memory.rpc.get(fn);
      if (typeof handler === "function") {
        return handler(args);
      }
      if (handler) {
        return handler;
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
