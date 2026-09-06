# US-003：建立 Supabase service-role client

**作為** 系統  
**我想要** 只在 server 用 service role 連 Supabase  
**以便** Route Handler 能寫 `reports` 且 key 不進 client

**輸入格式**：
- env：`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
- Next 16：`await cookies()`；本版不讀 session

**輸出格式**：
- `lib/supabase/env.ts`：讀取並檢查必要 env
- `lib/supabase/server.ts`：service-role client（server-only）
- 禁止 `NEXT_PUBLIC_*` 帶 service role key

**驗收條件**：
- [x] server client 使用 `SUPABASE_SERVICE_ROLE_KEY`
- [x] 缺少必要 env 時有明確錯誤，不靜默連上
- [x] 檔案可被 Route Handler import；不可被 client component 當瀏覽器模組使用
- [x] 無 anon 寫入 `reports` 的路徑

#### 驗收說明

**整體結論**：PASS ✅

> service-role client 只在 server 組裝；缺 env 會丟繁中錯誤。尚未建立寫入 `reports` 的 store（US-016）。

---

**AC-1：server client 使用 `SUPABASE_SERVICE_ROLE_KEY`**

狀態：✅ 通過

- `lib/supabase/env.ts` 的 `getSupabaseServiceRoleEnv()` 讀 `SUPABASE_SERVICE_ROLE_KEY`
- `lib/supabase/server.ts` 的 `createServiceRoleClient()` 把該 key 傳給 `createClient`

---

**AC-2：缺少必要 env 時有明確錯誤**

狀態：✅ 通過

- 缺 `NEXT_PUBLIC_SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY` 時 `throw new Error(...)`，不建立 client

---

**AC-3：可被 Route Handler import；不可當瀏覽器模組**

狀態：✅ 通過

- 兩檔皆 `import "server-only"`（Next 在 Client Component 誤 import 會建置失敗）
- `createServiceRoleClient` 為 async，並 `await cookies()`（Next 16；本版不讀 session）
- `npm run typecheck` 通過

---

**AC-4：無 anon 寫入 `reports` 的路徑**

狀態：✅ 通過

- `lib/supabase/` 未使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，也無 browser client
- 本任務未新增任何 insert `reports` 的程式

**測試策略**：Test-After
> 理由：主要是 env 接線與 server-only 邊界，需真實 env／建置檢查，不是純函式 I/O。

**優先級**：P0  
**相關功能**：Story 2b；Checkpoint A2  
**依賴關係**：無
