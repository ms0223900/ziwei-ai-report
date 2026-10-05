# US-004：單次解鎖 fixture

**作為** 講師  
**我想要** 可重跑的單次解鎖 pending fixture  
**以便** U8-L-S／F／D 不必等真金流也能判讀

**輸入格式**：
- spec §2 FR-3、共通刪除順序；既有 `scripts/post-payment-checkpoint/{fixture-paid-no-credit,mark-failed}.sql` 與其測試

**輸出格式**：
- `scripts/unit8-checkpoint/fixture-lifetime-pending.sql`
- `scripts/unit8-checkpoint/unit8-checkpoint.test.ts`（本檔的文字斷言）

**驗收條件**：
- [ ] 開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」
- [ ] `begin;` 之後、第一個寫入之前以 `set_config` 宣告 service_role（`request.jwt.claim.role` 與 `request.jwt.claims`）
- [ ] 依序刪除 `TESTU8LIFE0001` 的 notifications（以 `source_id in (select id::text from orders …)`）→ admin_actions → orders
- [ ] D 設 `access_status='locked'`（D 的 UUID 取自 `reset-checkpoint.sql`）
- [ ] INSERT 訂單：`unlock_report_lifetime`、`amount=99`、`currency='TWD'`、`status='pending'`、無 `trade_no`
- [ ] INSERT `order_pending` 通知，key `order-pending:{id}`
- [ ] 結尾 SELECT `order_id`、`status`、`access_status`
- [ ] 不含 `update public.orders set status`；failed 變體沿用 `mark-failed.sql`，不另寫
- [ ] 以 PGlite 套用全部 migration 後連跑兩次：只有 1 筆 `TESTU8LIFE0001`、`order-pending:{本筆 id}` 1 筆、無外鍵錯誤

**測試策略**：Test-After  
> 理由：SQL fixture，沿用單元 7 US-029 做法，寫完以文字斷言＋PGlite 實跑補測；畫面與綠界回呼結果歸 US-009 真機實跑。

**優先級**：P0  
**相關功能**：C3 單次解鎖固定包  
**來源**：FR-3 / Scenario 3  
**依賴關係**：US-001
