# US-006：通知未建立 fixture

**作為** 學員  
**我想要** 一筆「已履約、成功通知不存在」的固定資料  
**以便** 區分「沒通知」與「沒履約」

**輸入格式**：
- spec §2 FR-6；`fulfill_points_pack_order`（`supabase/migrations/20260921000001_points_rpc.sql`）

**輸出格式**：
- `scripts/unit8-checkpoint/fixture-notification-missing.sql`
- `unit8-checkpoint.test.ts` 新增本檔斷言

**驗收條件**：
- [x] 開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」，並在同一 transaction 第一個寫入前宣告 service_role
- [x] INSERT `points_pack_5` 訂單 `TESTU8NTF0001`（`paid`、`amount=49`、有 `trade_no`），使用 `on conflict (merchant_trade_no) do nothing`
- [x] 以 `select id from orders where merchant_trade_no='TESTU8NTF0001'` 取 id 後呼叫 `fulfill_points_pack_order`
- [x] 刪除 `idempotency_key = 'credit:' || <該 id>` 的通知；不 INSERT 任何成功通知
- [x] 結尾 SELECT `order_id`、`status`、`credits`、`credit_notifications`、`points_balance`
- [x] 以 PGlite 實跑：第一次 RPC 回 `credited`、`credits=1`、`credit_notifications=0`；第二次回 `already_fulfilled`、credit 仍 1 筆、餘額不變
- [x] README 註明：換帳號前要先依外鍵順序手動刪除舊的 `TESTU8NTF0001`


#### 驗收說明

**整體結論**：PASS ✅（US-007 完成後由 PARTIAL 轉為 PASS）

> `fixture-notification-missing.sql` 已建立，文字斷言全過；另以 PGlite 0.x 建立 `auth.users` 與 `auth.uid()`／`auth.role()` 的替身、套用 `supabase/migrations/` 全部 8 支 migration 後實跑（腳本放 scratchpad，不入庫）：第一次 `credits=1`、`credit_notifications=0`、餘額 5，第二次完全相同。README 的「換帳號先刪舊單」說明已由 US-007 補上。

---

**AC-1：檔頭註解與 service_role**

狀態：✅ 通過

**AC-2：冪等建單**

狀態：✅ 通過

- `insert … on conflict (merchant_trade_no) do nothing`（`orders_merchant_trade_no_key` 為 unique）

**AC-3：以 MTN 取 id 後呼叫 RPC**

狀態：✅ 通過

- `fulfill_points_pack_order((select id from public.orders where merchant_trade_no = 'TESTU8NTF0001'))`

**AC-4：刪除 `credit:{id}`，不寫成功通知**

狀態：✅ 通過

- 刪除的 key 與 `app/api/payments/ecpay/webhook/route.ts` 的 `credit:${order.id}` 相同（測試同時比對兩邊）；全文沒有 `insert into public.notifications`

**AC-5：結尾 SELECT**

狀態：✅ 通過

- 輸出 `order_id`、`status`、`credits`、`credit_notifications`、`points_balance`

**AC-6：PGlite 兩次實跑**

狀態：✅ 通過

- 第一次跑完 credit 1 筆、餘額 0→5；第二次餘額仍是 5；另外手動再呼叫 RPC，回 `already_fulfilled`

**AC-7：README 註明換帳號前先刪舊單**

狀態：✅ 通過

- `scripts/unit8-checkpoint/README.md`「點數」第 4 點寫明依外鍵順序刪除舊的 `TESTU8NTF0001`（由 US-007 補上）

**測試策略**：Test-After  
> 理由：SQL fixture，以文字斷言＋PGlite 實跑補測；結果頁、通知面板與管理頁歸 US-009。

**優先級**：P0  
**相關功能**：C6 通知未建立  
**來源**：FR-6 / Scenario 2  
**依賴關係**：US-001
