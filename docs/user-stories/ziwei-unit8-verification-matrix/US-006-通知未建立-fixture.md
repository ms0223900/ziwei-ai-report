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
- [ ] 開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」，並在同一 transaction 第一個寫入前宣告 service_role
- [ ] INSERT `points_pack_5` 訂單 `TESTU8NTF0001`（`paid`、`amount=49`、有 `trade_no`），使用 `on conflict (merchant_trade_no) do nothing`
- [ ] 以 `select id from orders where merchant_trade_no='TESTU8NTF0001'` 取 id 後呼叫 `fulfill_points_pack_order`
- [ ] 刪除 `idempotency_key = 'credit:' || <該 id>` 的通知；不 INSERT 任何成功通知
- [ ] 結尾 SELECT `order_id`、`status`、`credits`、`credit_notifications`、`points_balance`
- [ ] 以 PGlite 實跑：第一次 RPC 回 `credited`、`credits=1`、`credit_notifications=0`；第二次回 `already_fulfilled`、credit 仍 1 筆、餘額不變
- [ ] README 註明：換帳號前要先依外鍵順序手動刪除舊的 `TESTU8NTF0001`

**測試策略**：Test-After  
> 理由：SQL fixture，以文字斷言＋PGlite 實跑補測；結果頁、通知面板與管理頁歸 US-009。

**優先級**：P0  
**相關功能**：C6 通知未建立  
**來源**：FR-6 / Scenario 2  
**依賴關係**：US-001
