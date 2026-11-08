# US-017：取消 Checkpoint 補失效通知

**作為** 講師  
**我想要** 取消訂閱後另一次寫入 `subscription_inactive`  
**以便** 通知失敗不會回滾取消（spec 第 7 節阻塞 2）

**輸入格式**：
- `scripts/subscription-checkpoint/cancel.sql`（`cancel_subscription` 在函式內寫 `cancelled` 事件，key 為 `cancel:{subscription_id}:{merchant_trade_no}`）
- US-001 的 `notifications` 表

**輸出格式**：
- `scripts/subscription-checkpoint/cancel.sql`：取消的 transaction `commit;` 之後，另一段 transaction 以該 key 讀 `subscription_events.id` 並 INSERT 通知（`on conflict (idempotency_key) do nothing`）
- 對應的 PGlite 測試（沿用單元 6 US-022 驗法）

**驗收條件**：
- [ ] 取消後 → 恰一則 `subscription_inactive`，key 為 `sub:{cancelled 事件 id}`、`source_type=subscription_event`
- [ ] 再跑一次 `cancel.sql` → 通知仍一則，取消結果與單元 6 相同（`already_cancelled`）
- [ ] 通知段落失敗時，取消已 commit（訂閱仍是 cancelled）
- [ ] 不改 `cancel_subscription` 函式；`expire.sql` 不新增通知
- [ ] S5-4：只有 `now > current_period_end`、沒有 `expired` 列 → 沒有 `subscription_inactive`

**測試策略**：Test-After  
> 理由：SQL checkpoint，以 PGlite 套用後實跑驗證。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 5 / Scenario 4（`cancelled` 半邊）；spec §7 問題 2  
**依賴關係**：US-001
