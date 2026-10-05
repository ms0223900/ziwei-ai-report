# US-005：點數 fixture

**作為** 講師  
**我想要** 0 點不足狀態與可重送的點數包訂單  
**以便** U8-P-F／U8-P-S／U8-P-D 可穩定重現

**輸入格式**：
- spec §2 FR-4、共通刪除順序；`reset-checkpoint.sql` 的 C 報告欄位

**輸出格式**：
- `scripts/unit8-checkpoint/fixture-points-zero.sql`
- `scripts/unit8-checkpoint/fixture-points-replay.sql`
- `unit8-checkpoint.test.ts` 新增兩檔的斷言

**驗收條件**：
- [x] 兩檔開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」，且在第一個寫入前宣告 service_role
- [x] zero：D 設 `points_balance=0`、`access_status='locked'`、`subscription_status='none'`，並附註解標為初始化
- [x] zero：先刪 D 的 `subscription_events`，再刪 `subscriptions`、`report_unlocks`
- [x] zero：建 1 份 `generation_status='success'` 報告 R（欄位同 reset C），結尾 SELECT 印出 R 的 id
- [x] replay：依序刪除 `TESTU8PTS0001` 的 notifications → admin_actions → point_transactions → orders
- [x] replay：建 `points_pack_5`、`amount=49`、`currency='TWD'`、`status='pending'` 訂單；不 INSERT `point_transactions`
- [x] replay：結尾 SELECT `order_id`、`status`、本筆 credit 筆數、`points_balance`
- [x] 以 PGlite 實跑：兩檔各連跑兩次不出錯，結尾 SELECT 除 id 外相同


#### 驗收說明

**整體結論**：PASS ✅

> `fixture-points-zero.sql` 與 `fixture-points-replay.sql` 已建立，文字斷言全過；另以 PGlite 0.x 建立 `auth.users` 與 `auth.uid()`／`auth.role()` 的替身、套用 `supabase/migrations/` 全部 8 支 migration 後實跑（腳本放 scratchpad，不入庫）。

---

**AC-1：檔頭註解與 service_role**

狀態：✅ 通過

- 兩檔都通過 `declares service_role before writing` 測試

**AC-2～3：zero 的初始化與刪除順序**

狀態：✅ 通過

- 依序刪除 `subscription_events`、`subscriptions`、`report_unlocks`，之後才 `update public.profiles` 為 0 點、locked、`subscription_status='none'`；該段註解標為「初始化」
- PGlite：D 先掛一筆有效訂閱再跑 zero，結果 `subscriptions=0`

**AC-4：報告 R**

狀態：✅ 通過

- 建一份 `success` 報告；結尾 SELECT 以 `created_at desc limit 1` 取 R 的 id，並列出 `debit_unlock`、`report_unlocks` 筆數（皆為 0）

**AC-5～7：replay**

狀態：✅ 通過

- 依序刪除 notifications、admin_actions、point_transactions、orders；建 `points_pack_5`、49 元的 pending 訂單，不寫 credit；結尾 SELECT `order_id`、`status`、`credits`、`points_balance`

**AC-8：PGlite 各連跑兩次**

狀態：✅ 通過

- 兩檔各跑兩次都沒有錯誤；除 id 換新外結果相同（zero：0 點；replay：pending、`credits=0`）

**測試策略**：Test-After  
> 理由：SQL fixture，沿用單元 7 做法以文字斷言＋PGlite 實跑補測；畫面、probe 與回呼結果歸 US-009。

**優先級**：P0  
**相關功能**：C4 點數固定包  
**來源**：FR-4 / Scenario 3  
**依賴關係**：US-001
