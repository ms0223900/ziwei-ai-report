# US-029：Checkpoint 與真機實跑

**作為** 講師  
**我想要** 一份可重跑的 Checkpoint 與 howto  
**以便** 課堂上能重現七態結果頁、failed 終態與一次補償

**輸入格式**：
- US-006、US-010、US-012、US-014、US-016、US-017、US-020、US-023、US-026 的成果；單元 6 的 `scripts/subscription-checkpoint/` 與 `scripts/ecpay-subscription-payload.mjs`

**輸出格式**：
- `scripts/post-payment-checkpoint/`：fixture SQL（一筆 `points_pack_5`、`status=paid`、`trade_no` 與 `payment_date` 有值、無 credit）；呼叫 `markOrderFailed` 的 service role 腳本
- `howto-post-payment-delivery.md`（本目錄）

**驗收條件**：
- [ ] fixture 只在 Checkpoint 使用；不改單元 5「ReturnURL 已 paid 且無 credit 必須補加點」分支
- [ ] fixture SQL 用 transaction 內 `set_config` 宣告 service_role（沿用單元 6 寫法），可重跑
- [ ] 真機：建單後綠界回跳到 `/orders/processing?order={id}`，並有一則 `order_pending`
- [ ] 真機：依序取得 `accepted`、`unlock_completed`、`points_credited`、`subscription_active`、`needs_manual`（fixture）、`incomplete`（腳本 mark failed）的畫面截圖或文字紀錄
- [ ] 真機：管理者對 fixture 補償一次 → 餘額 +5；再送一次 → `skipped_already_fulfilled`
- [ ] 真機：`/notifications` 看得到上述各事件的通知並可標已讀
- [ ] howto 列出 `ADMIN_USER_IDS` 設定方式與每步預期結果

**測試策略**：Exploratory  
> 理由：需要真實 Supabase、綠界 sandbox 與手動操作，以實跑紀錄驗收；邏輯已由前面的測試覆蓋。

**優先級**：P0  
**相關功能**：Story 1～6  
**來源**：Story 6（§2 測試 fixture）；Story 4 / Scenario 6  
**依賴關係**：US-006、US-010、US-012、US-014、US-016、US-017、US-020、US-023、US-026
