# 單元 7 — 付款後交付 × 最小維運 User Stories

> 來源：[`docs/specs/2026-09-28-ziwei-unit7-post-payment-delivery.md`](../../specs/2026-09-28-ziwei-unit7-post-payment-delivery.md)  
> 非阻塞項：[`docs/specs/2026-09-28-ziwei-unit7-post-payment-delivery-issues.md`](../../specs/2026-09-28-ziwei-unit7-post-payment-delivery-issues.md)  
> 前一版：[`ziwei-unit6-monthly-subscription`](../ziwei-unit6-monthly-subscription/README.md)  
> **本目錄覆蓋回跳帶訂單 id、七態結果頁、`failed` 終態、八種 App 內通知、管理者補點，以及報告頁不採信回跳。** 不重做驗簽、加點、扣點、訂閱起訖；通知只做 App 內，不接 Email。  
> spec 第 7 節兩項阻塞已在 spec 內給出處理方式，**不另開 US**，編入對應任務驗收；`-issues.md` 的非阻塞項不進本目錄。

## 實作前的共同約定

- `mark_order_failed` 做成 **server 端 TS 函式**（`lib/payments/mark-order-failed.ts`），不做成 SQL RPC：spec 要求「通知 INSERT 失敗不把 `failed` 改回 `pending`」，放進同一個 SQL 函式會一起回滾。
- `unlock_report_with_point`、`activate_subscription_from_order`、`apply_subscription_period_event` 都**不回傳** transaction／event id。通知鍵所需的 id，一律在 RPC 成功後以既有 unique 欄位（`point_transactions` 的 `user_id`+`report_id`+`type=debit_unlock`；`subscription_events.idempotency_key`）另查一次，不改 RPC 簽名。
- 新 API（`/api/orders/processing`、`/api/notifications*`、`/api/admin/*`）需要 session，**不可**加進 proxy 排除清單。

## 不做（本版）

- pending 逾時的生產寫入路徑（門檻未定，MVP: false）
- 結果頁 client 端重查按鈕、自動輪詢（MVP: false）；`primaryCta.kind=refresh` 在畫面上渲染為指向同一結果頁的連結，重新整理即重讀
- `grant_lifetime`、`retry_fulfillment`、手改訂閱期間、「我的訂單與權益」、`expired` 事件寫入
- Email、推播、帳戶中心、退款、發票、第四種 `orders.status`

## 全域驗收 Checklist

### Phase 0 — schema、fake 與通知寫入
- [x] US-001 建立 notifications 與 admin_actions 遷移
- [x] US-002 記憶體 fake 通知與管理紀錄
- [x] US-003 通知寫入 helper 測試（預期紅燈；待實作轉綠 → 已由 US-004 轉綠）
- [x] US-004 通知寫入 helper 實作

### Phase 1 — 回跳帶訂單 id
- [x] US-005 ClientBackURL 與 pending 通知 測試（預期紅燈；待實作轉綠 → 已由 US-006 轉綠）
- [x] US-006 ClientBackURL 與 pending 通知 實作

### Phase 2 — failed 終態
- [x] US-007 mark_order_failed 測試（預期紅燈；待實作轉綠 → 已由 US-008 轉綠）
- [x] US-008 mark_order_failed 實作
- [x] US-009 ReturnURL failed 終態 測試（預期紅燈；待實作轉綠 → 已由 US-010 轉綠）
- [x] US-010 ReturnURL failed 終態 實作
- [x] US-011 PeriodReturnURL failed 短路 測試（預期紅燈；待實作轉綠 → 已由 US-012 轉綠）
- [x] US-012 PeriodReturnURL failed 短路 實作

### Phase 3 — 履約與扣點通知
- [x] US-013 履約成功通知 測試（預期紅燈；待實作轉綠 → 已由 US-014 轉綠）
- [x] US-014 履約成功通知 實作
- [x] US-015 單點解鎖通知 測試（預期紅燈；待實作轉綠 → 已由 US-016 轉綠）
- [x] US-016 單點解鎖通知 實作
- [x] US-017 取消 Checkpoint 補失效通知

### Phase 4 — 結果頁
- [x] US-018 結果讀取 API 測試（預期紅燈；待實作轉綠 → 已由 US-019 轉綠）
- [x] US-019 結果讀取 API 實作
- [⚠️] US-020 結果頁畫面（窄螢幕版面待人工確認）

### Phase 5 — 通知列表
- [x] US-021 通知列表與已讀 API 測試（預期紅燈；待實作轉綠 → 已由 US-022 轉綠）
- [x] US-022 通知列表與已讀 API 實作
- [x] US-023 通知頁面

### Phase 6 — 管理者補償
- [x] US-024 補償 API 與處置原因 測試（預期紅燈；待實作轉綠 → 已由 US-025 轉綠）
- [x] US-025 補償 API 與處置原因 實作
- [x] US-026 管理者查詢頁

### Phase 7 — 報告頁
- [x] US-027 報告頁主 CTA 測試（全部為回歸斷言，既有行為已符合）
- [x] US-028 報告頁主 CTA 實作

### Phase 8 — 實跑與交棒
- [⚠️] US-029 Checkpoint 與真機實跑（腳本與 howto 已備，真機實跑待人工）
- [ ] US-030 交棒與文件更新

## 依賴鏈摘要

本清單是 `/next-task` 的**唯一**依賴來源；各 US 的「依賴關係」欄必須與此圖一致。所有依賴都指向編號較小的 US。

```
US-001 ← 無
US-002 ← US-001
US-003 ← US-002
US-004 ← US-003
US-005 ← US-002
US-006 ← US-004、US-005
US-007 ← US-002
US-008 ← US-004、US-007
US-009 ← US-002
US-010 ← US-008、US-009
US-011 ← US-002
US-012 ← US-011
US-013 ← US-010、US-012
US-014 ← US-004、US-013
US-015 ← US-002
US-016 ← US-004、US-015
US-017 ← US-001
US-018 ← US-002
US-019 ← US-018
US-020 ← US-019
US-021 ← US-002
US-022 ← US-021
US-023 ← US-022
US-024 ← US-002
US-025 ← US-004、US-024
US-026 ← US-025
US-027 ← 無
US-028 ← US-027
US-029 ← US-006、US-010、US-012、US-014、US-016、US-017、US-020、US-023、US-026
US-030 ← US-028、US-029
```

- Phase 0 完成條件：兩表遷移可套用、authenticated 不能 INSERT；fake 支援兩表；同一 key 只寫一則通知、寫入失敗不 throw。
- Phase 1 完成條件：`ClientBackURL` 帶 `?order={id}` 且 CheckMac 相符；建單後恰一則 `order_pending`。
- Phase 2 完成條件：只有 pending 能變 failed；failed 之後 ReturnURL／PeriodReturnURL 都回 `1|OK` 且不履約。
- Phase 3 完成條件：六種履約／扣點／訂閱通知各在正確寫入點恰一則，重送不增加。
- Phase 4 完成條件：API 七態互斥、401／404／缺 order 行為正確；頁面忽略付款 query。
- Phase 5 完成條件：列表只含自己的列；已讀只設一次。
- Phase 6 完成條件：補點只 +5 一次、帳本仍 `credit_purchase`；非白名單 403。
- Phase 7 完成條件：永久或訂閱有效時主 CTA 不是「用 1 點解鎖」。
- Phase 8 完成條件：howto 可重現七態與補償；`docs/spec.md`／`architecture.md` 已更新。

## spec Story 對照

| Story | 承接 US |
| --- | --- |
| 1 回跳帶訂單 id | US-005／US-006（通知鍵依賴 US-003／US-004） |
| 2 結果頁只讀履約證據 | US-018／US-019、US-020 |
| 3 誰可以看 | US-018／US-019、US-020 |
| 4 訂單終態 failed | US-007／US-008、US-009／US-010、US-011／US-012；S4-5 由 US-018 承接 |
| 5 App 內通知 | US-001～US-004、US-006、US-008、US-013／US-014、US-015／US-016、US-017、US-021～US-023、US-025 |
| 6 管理者查詢與補點 | US-001、US-024／US-025、US-026、US-029（fixture 實跑）；S6-5 由 US-009 回歸 |
| 7 報告頁不採信回跳 | US-027／US-028 |

## spec 第 7 節阻塞對照

| 阻塞 | 規格處理 | 承接 US |
| --- | --- | --- |
| 1：七個 screen 不是封閉分割 | `failed` 一律 `incomplete`；訂閱證據必須 `subscriptions.order_id` 等於本筆 | US-018／US-019 |
| 2：`cancelled` 通知沒有 Route Handler | checkpoint commit 取消後，以 `cancel:{subscription_id}:{merchant_trade_no}` 讀 event id，再另一次 INSERT；`expired` 不建通知 | US-017 |
