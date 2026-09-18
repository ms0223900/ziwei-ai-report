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
- [ ] 欄位與 unique 對齊 spec
- [ ] RLS on；authenticated 僅自身 SELECT；anon 無寫入
- [ ] client 無法把 `status` 改成 `paid`
- [ ] 未改 `profiles` schema、未加 `reports.user_id`

**測試策略**：Test-After  
> 理由：驗收靠遷移內容與套用後的表／policy，不適合先寫單元測試。

**優先級**：P0  
**相關功能**：Story 3／5／6  
**依賴關係**：無
