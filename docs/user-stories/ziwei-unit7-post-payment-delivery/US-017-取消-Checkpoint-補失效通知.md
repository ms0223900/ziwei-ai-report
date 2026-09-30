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
- [x] 取消後 → 恰一則 `subscription_inactive`，key 為 `sub:{cancelled 事件 id}`、`source_type=subscription_event`
- [x] 再跑一次 `cancel.sql` → 通知仍一則，取消結果與單元 6 相同（`already_cancelled`）
- [x] 通知段落失敗時，取消已 commit（訂閱仍是 cancelled）
- [x] 不改 `cancel_subscription` 函式；`expire.sql` 不新增通知
- [x] S5-4：只有 `now > current_period_end`、沒有 `expired` 列 → 沒有 `subscription_inactive`

#### 驗收說明

**整體結論**：PASS ✅

> `cancel.sql` 在取消交易 commit 後，另一段交易補寫 `subscription_inactive`。以 PGlite 依序套用全部 migration 後實跑腳本，5 條 AC 皆成立；repo 內另加靜態內容測試。全專案測試、lint、typecheck 皆通過。

---

**AC-1：取消後恰一則 `subscription_inactive`，key 為 `sub:{cancelled 事件 id}`**

狀態：✅ 通過

- `scripts/subscription-checkpoint/cancel.sql`：以 `cancel:{subscription_id}:{merchant_trade_no}` join 出 cancelled 事件，INSERT `source_type=subscription_event`、`source_id`＝事件 id
- PGlite 實跑：第一次 `cancelled`，通知一則，key 與事件 id 相符

**AC-2：再跑一次仍一則，取消結果 `already_cancelled`**

狀態：✅ 通過

- `on conflict (idempotency_key) do nothing`；PGlite 第二次跑回 `already_cancelled`、通知仍 1 則、訂閱仍 cancelled

**AC-3：通知段落失敗時，取消已 commit**

狀態：✅ 通過

- PGlite 先把 `notifications` 改名讓 INSERT 失敗：腳本報錯，但訂閱仍是 `cancelled`

**AC-4：不改 `cancel_subscription`；`expire.sql` 不新增通知**

狀態：✅ 通過

- 未動任何 migration；`scripts/subscription-checkpoint/checkpoint-notifications.test.ts` 斷言 INSERT 在第一個 `commit;` 之後的新交易、`expire.sql` 不含 notifications

**AC-5：S5-4 只有期末過去、沒有 `expired` 列 → 沒有 `subscription_inactive`**

狀態：✅ 通過

- PGlite 跑 `expire.sql`：事件 0 列、通知 0 則

- 註：PGlite 不等於 Supabase SQL Editor；實際執行留待 US-029 真機實跑。PGlite 驗證是 scratch 腳本，未進 repo（repo 沒有 PGlite 依賴，沿用單元 6 做法）

**測試策略**：Test-After  
> 理由：SQL checkpoint，以 PGlite 套用後實跑驗證。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 5 / Scenario 4（`cancelled` 半邊）；spec §7 問題 2  
**依賴關係**：US-001
