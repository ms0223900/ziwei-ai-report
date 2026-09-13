# US-018：記憶體 fake Supabase client

**作為** 開發者  
**我想要** 用記憶體假 client 測 grant／GET  
**以便** 不連遠端 DB 也能驗 HTTP 契約與狀態轉換

**輸入格式**：
- 記憶體：`users`／`profiles`／`reports`
- 需支援：`from("profiles"|"reports").select|update|upsert|eq|single|maybeSingle`、`auth.admin.listUsers`／`getUserById`
- 不模擬 RLS、Confirm email、真實 cookie

**輸出格式**：
- `test/fakes/supabase.ts` 與同目錄測試
- `US-011`／`US-013` 改走此 fake，不各自手刻 chain

**驗收條件**：
- [x] 可 seed locked profile，並用 email 找到 user
- [x] `update access_status` 後再讀仍是 `unlocked`
- [x] 可依 `reports.id` 讀回 basic／advanced JSON
- [x] `upsert ignoreDuplicates` 不覆寫既有權益／display_name
- [x] 不連遠端、不讀 `SUPABASE_SERVICE_ROLE_KEY`

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run test/fakes/supabase.test.ts` → 5 passed。記憶體 Map 模擬 `profiles`／`reports`／`auth.admin`，不連遠端。

---

**AC-1：seed locked 並用 email 找 user**

狀態：✅ 通過

- `test/fakes/supabase.ts` 的 `seedFakeUser()` 預設 `access_status=locked`
- `auth.admin.listUsers()` 回傳 seed 的 email／id

**AC-2：update 後再讀仍 unlocked**

狀態：✅ 通過

- `from("profiles").update({ access_status: "unlocked" }).eq("user_id", …)` 寫入同一 Map
- 第二次 `select().single()` 仍是 `unlocked`

**AC-3：依 reports.id 讀 JSON**

狀態：✅ 通過

- `seedFakeReport()` + `from("reports").eq("id", …).single()` 回 basic／advanced

**AC-4：ignoreDuplicates 不覆寫**

狀態：✅ 通過

- upsert 遇到既有列且 `ignoreDuplicates: true` 時回原列，`小園`／`unlocked` 不變

**AC-5：不連遠端、不讀 service role**

狀態：✅ 通過

- fake 原始碼不含 `process.env`、`SUPABASE_SERVICE_ROLE_KEY`、`createClient`

**測試策略**：Test-After
> 理由：測試替身本身是明確 I/O 契約，寫完即可用單元測試鎖行為。

**優先級**：P0  
**相關功能**：Story 6／7 測試底座  
**依賴關係**：無
