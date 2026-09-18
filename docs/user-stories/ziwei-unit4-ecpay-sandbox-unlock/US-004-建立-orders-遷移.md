# US-004：建立 orders 遷移

**作為** 系統  
**我想要** 受 RLS 保護的 `orders` 表  
**以便** 建單與 Webhook 用 `merchant_trade_no` 冪等，client 不能改成 paid

**輸入格式**：
- spec §4 欄位表：`id`、`user_id`、`plan_id`、`merchant_trade_no` unique、`amount`、`currency`、`status`（pending／paid／failed）、`trade_no`、`payment_date`、時間戳
- RLS：`authenticated` 僅 SELECT 自身；INSERT／UPDATE／DELETE 僅 service role
- 檔名自訂時間戳；勿用 `003_payments.sql` 硬撞；欄位名以 `merchant_trade_no` 為準（不用 architecture 的 `order_number`）
- **不**改 `profiles`、不加 `reports.user_id`

**輸出格式**：
- `supabase/migrations/` 新時間戳 SQL
- 本任務只交付可套用 SQL；未套用成功前，不得把 US-011／US-013 勾成完成

**驗收條件**：
- [x] 欄位與 unique 對齊 spec
- [x] RLS on；authenticated 僅自身 SELECT；anon 無寫入
- [x] client 無法把 `status` 改成 `paid`
- [x] 未改 `profiles` schema、未加 `reports.user_id`

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run supabase/migrations/create-orders.migration.test.ts` 4 passed。本任務只交付可套用 SQL，未對遠端套用；未勾 US-011／US-013。

---

**AC-1：欄位與 unique 對齊 spec**

狀態：✅ 通過

- `supabase/migrations/20260918000000_create_orders.sql` 含 spec 欄位、`unique (merchant_trade_no)`、`status` check pending／paid／failed
- 檔名非 `003_payments.sql`；欄位名為 `merchant_trade_no`

---

**AC-2：RLS 與 authenticated 僅 SELECT**

狀態：✅ 通過

- `enable row level security`；`orders_select_own` 限 `auth.uid() = user_id`
- 無 INSERT／UPDATE／DELETE policy；`revoke all` from anon；authenticated 僅 `grant select`

---

**AC-3：client 無法把 status 改成 paid**

狀態：✅ 通過

- authenticated 無 UPDATE 權限
- `orders_guard_status` 在非 `service_role` 時阻擋 `status` 變更

---

**AC-4：未改 profiles、未加 reports.user_id**

狀態：✅ 通過

- 新遷移無 `alter table public.profiles`／`reports`
- `20260905000000_create_reports.sql` 的 create table 本體仍無 `user_id` 欄

**測試策略**：Test-After  
> 理由：驗收靠遷移內容與套用後的表／policy，不適合先寫單元測試。

**優先級**：P0  
**相關功能**：Story 3／5／6  
**依賴關係**：無
