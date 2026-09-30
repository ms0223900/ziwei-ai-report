# US-025：補償 API 與處置原因 實作

**作為** 白名單管理者  
**我想要** 用既有加點函式對「已 paid、無 credit」的點數包補償一次  
**以便** 不必直接改餘額

**輸入格式**：
- US-024 的紅燈測試；US-004 的通知 helper

**輸出格式**：
- `lib/admin/is-admin.ts`、`lib/admin/derive-order-reason.ts`
- `app/api/admin/compensations/route.ts`（`POST`）
- `.env.example` 新增 `ADMIN_USER_IDS=`（空值）

**驗收條件**：
- [x] US-024 測試轉綠
- [x] 加點只呼叫 `fulfill_points_pack_order`；不新增 `admin_credit`，不直接 UPDATE `points_balance`
- [x] `ADMIN_USER_IDS` 與 service role 只在 server（`import "server-only"`）；沒有 `NEXT_PUBLIC_` 版本
- [x] 不實作 `grant_lifetime`、`retry_fulfillment`

#### 驗收說明

**整體結論**：PASS ✅

> US-024 的 27 項紅燈轉綠；全專案 579 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-024 測試轉綠**

狀態：✅ 通過

- `lib/admin/is-admin.ts` 的 `isAdminUser()`、`lib/admin/derive-order-reason.ts` 的 `deriveOrderReason()`
- `app/api/admin/compensations/route.ts` 的 `POST()`：401 → 403 → 422（action／reason／uuid）→ 404 → 資格不符寫 rejected（422）→ 已有 credit 寫 skipped → 呼叫加點 → 寫 ok 紀錄 → `admin_compensated` 通知
- 決定：skipped 紀錄也用獨立唯一鍵 `compensate:{id}:credit_points:skipped:{uuid}`，不占成功鍵；加點已提交但紀錄寫入失敗時仍回 `ok`，只記 log、不回滾加點

**AC-2：只呼叫 `fulfill_points_pack_order`；不新增 `admin_credit`、不直接 UPDATE `points_balance`**

狀態：✅ 通過

- 餘額只透過 RPC 改變；`before_state`／`after_state` 取自 profile 與 RPC 回傳的 `points_balance`

**AC-3：`ADMIN_USER_IDS` 與 service role 只在 server；沒有 `NEXT_PUBLIC_` 版本**

狀態：✅ 通過

- `is-admin.ts` 含 `import "server-only"`；`.env.example` 新增空值 `ADMIN_USER_IDS=`
- `lib/security/secrets-not-leaked.test.ts` 把 `ADMIN_USER_IDS` 納入機密清單（`.env.example` 為空、無 `NEXT_PUBLIC_` 版本、app 原始碼不讀 `NEXT_PUBLIC_ADMIN*`）

**AC-4：不實作 `grant_lifetime`、`retry_fulfillment`**

狀態：✅ 通過

- 非 `credit_points` 一律 `422` `{ "error": "本版只接受補點" }`

**測試策略**：Test-First  
> 理由：對 US-024 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 6  
**來源**：Story 6 / Scenario 1～4  
**依賴關係**：US-004、US-024
