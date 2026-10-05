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
- [ ] 兩檔開頭註解寫「只給 Checkpoint 使用，不改 Webhook 分派」，且在第一個寫入前宣告 service_role
- [ ] zero：D 設 `points_balance=0`、`access_status='locked'`、`subscription_status='none'`，並附註解標為初始化
- [ ] zero：先刪 D 的 `subscription_events`，再刪 `subscriptions`、`report_unlocks`
- [ ] zero：建 1 份 `generation_status='success'` 報告 R（欄位同 reset C），結尾 SELECT 印出 R 的 id
- [ ] replay：依序刪除 `TESTU8PTS0001` 的 notifications → admin_actions → point_transactions → orders
- [ ] replay：建 `points_pack_5`、`amount=49`、`currency='TWD'`、`status='pending'` 訂單；不 INSERT `point_transactions`
- [ ] replay：結尾 SELECT `order_id`、`status`、本筆 credit 筆數、`points_balance`
- [ ] 以 PGlite 實跑：兩檔各連跑兩次不出錯，結尾 SELECT 除 id 外相同

**測試策略**：Test-After  
> 理由：SQL fixture，沿用單元 7 做法以文字斷言＋PGlite 實跑補測；畫面、probe 與回呼結果歸 US-009。

**優先級**：P0  
**相關功能**：C4 點數固定包  
**來源**：FR-4 / Scenario 3  
**依賴關係**：US-001
