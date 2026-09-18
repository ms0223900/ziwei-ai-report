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
};

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
};

type Filter = { column: string; value: unknown };

export function createFakeSupabaseMemory(): FakeSupabaseMemory {
  return {
    users: new Map(),
    profiles: new Map(),
    reports: new Map(),
    orders: new Map(),
  };
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

type FakeTable = "profiles" | "reports" | "orders";

function tableConfig(memory: FakeSupabaseMemory, table: FakeTable) {
  if (table === "profiles") {
    return {
      store: memory.profiles,
      idKey: "user_id",
      uniqueKeys: [] as string[],
    };
  }
  if (table === "reports") {
    return { store: memory.reports, idKey: "id", uniqueKeys: [] as string[] };
  }
  return {
    store: memory.orders,
    idKey: "id",
    uniqueKeys: ["merchant_trade_no"],
  };
}

function uniqueConflict(
  store: Map<string, unknown>,
  idKey: string,
  id: string,
  row: Record<string, unknown>,
  uniqueKeys: string[],
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
  return null;
}

function createTableApi(memory: FakeSupabaseMemory, table: FakeTable) {
  const { store, idKey, uniqueKeys } = tableConfig(memory, table);
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
        const id = String(pendingInsert[idKey] ?? crypto.randomUUID());
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
      if (table === "profiles" || table === "reports" || table === "orders") {
        return createTableApi(memory, table);
      }
      throw new Error(`fake supabase: unsupported table ${table}`);
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
