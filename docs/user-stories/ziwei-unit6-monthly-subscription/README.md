# 單元 6 — 月繳訂閱 × 週期狀態與權限同步 User Stories

> 來源：[`docs/specs/2026-09-25-ziwei-unit6-monthly-subscription.md`](../../specs/2026-09-25-ziwei-unit6-monthly-subscription.md)  
> 非阻塞項：[`docs/specs/2026-09-25-ziwei-unit6-monthly-subscription-issues.md`](../../specs/2026-09-25-ziwei-unit6-monthly-subscription-issues.md)  
> 前一版：[`ziwei-unit5-points-pack-unlock`](../ziwei-unit5-points-pack-unlock/README.md)  
> **本目錄覆蓋月繳訂閱的建單、首次開通、週期續訂／失敗、取消／到期、權限判斷，以及移除追問。** 不重做單元 4 的驗簽、Tunnel、`1|OK`；訂閱不寫 `access_status`，也不寫 `report_unlocks`。  
> spec 第 7 節的阻塞項**不另開 US**，已編入下表對應任務的驗收條件；`-issues.md` 的非阻塞項不進本目錄。本 spec **覆寫** `docs/spec.md`「不建 subscriptions」，實作時以來源 spec 為準。

## PM 定案（2026-09-25）

- 訂閱只要求**新產生**的報告能看進階；重整後重開舊報告不做。
- 點數解鎖的報告在訂閱取消或到期後仍可見。
- 月繳 pending 訂單的建單閘門為 **5 分鐘**（演示用）。

## 獨立審查（2026-09-25，3 視角）

- 已回填：依賴補齊、只作回歸的斷言不要求紅燈、fake 時間欄位、RPC 先寫事件並加鎖、取消冪等鍵含 MTN、`unlock_report_with_point` 簽名不變、真機實跑集中到 US-022、新檔先放空殼、腳本 CLI 守衛。
- 未能查證：Next 16 官方文件（repo 未安裝 `node_modules`，且 nextjs.org 被網路代理擋下）；實作前請先讀 `node_modules/next/dist/docs/`。

## 不做（本版）

- 追問、年繳、升降級、退款、換卡、催收、暫停／恢復
- 用 `access_status` 或 `report_unlocks` 代表訂閱
- 呼叫綠界 `CreditCardPeriodAction` Cancel、定期定額訂單查詢補單（Should Have）
- 我的報告清單、結果頁、通知、管理後台（單元 7）
- 完整驗測矩陣（單元 8）

## 全域驗收 Checklist

### Phase 0 — 方案表
- [x] US-001 方案表第三筆 測試（預期紅燈；待實作轉綠）
- [x] US-002 方案表第三筆 實作

### Phase 1 — schema 與 fake
- [⚠️] US-003 建立訂閱表遷移（待 Supabase 套用實測）
- [⚠️] US-004 訂閱 RPC 遷移（待 Supabase 套用實測）
- [x] US-005 記憶體 fake 訂閱表與 RPC

### Phase 2 — proxy
- [x] US-006 proxy 排除週期 Webhook 測試（預期紅燈；待實作轉綠）
- [ ] US-007 proxy 排除週期 Webhook 實作

### Phase 3 — 建單閘門
- [ ] US-008 月繳建單與閘門 測試（預期紅燈；待實作轉綠）
- [ ] US-009 月繳建單與閘門 實作

### Phase 4 — ReturnURL 首次
- [ ] US-010 ReturnURL 訂閱分派 測試（預期紅燈；待實作轉綠）
- [ ] US-011 ReturnURL 訂閱分派 實作

### Phase 5 — PeriodReturnURL
- [ ] US-012 PeriodReturnURL 測試（預期紅燈；待實作轉綠）
- [ ] US-013 PeriodReturnURL 實作

### Phase 6 — 權限判斷
- [ ] US-014 權益判斷與進階 GET 測試（預期紅燈；待實作轉綠）
- [ ] US-015 權益判斷與進階 GET 實作

### Phase 7 — 視圖與畫面
- [ ] US-016 會員視圖訂閱態 測試（預期紅燈；待實作轉綠）
- [ ] US-017 會員視圖訂閱態 實作
- [ ] US-018 首頁訂閱接線與月繳入口
- [ ] US-019 移除追問文案與入口

### Phase 8 — 素材與交棒
- [ ] US-020 固定 Payload 腳本 測試（預期紅燈；待實作轉綠）
- [ ] US-021 固定 Payload 腳本 實作
- [ ] US-022 取消 Checkpoint 與三位測試會員
- [ ] US-023 交棒與文件更新

## 依賴鏈摘要

本清單是 `/next-task` 的**唯一**依賴來源；各 US 的「依賴關係」欄必須與此圖一致。所有依賴都指向編號較小的 US，照編號順序執行不會被卡住。

```
US-001 ← 無
US-002 ← US-001
US-003 ← 無
US-004 ← US-003
US-005 ← US-004
US-006 ← 無
US-007 ← US-006
US-008 ← US-002、US-005
US-009 ← US-008
US-010 ← US-002、US-005
US-011 ← US-004、US-010
US-012 ← US-002、US-005
US-013 ← US-004、US-007、US-012
US-014 ← US-005
US-015 ← US-004、US-014
US-016 ← 無
US-017 ← US-016
US-018 ← US-009、US-015、US-017
US-019 ← US-018
US-020 ← 無
US-021 ← US-020
US-022 ← US-004、US-009、US-011、US-013、US-015、US-021
US-023 ← US-019、US-022
```

- Phase 0 完成條件：方案表有 `subscribe_report_monthly`（19／M／1／12）；`periodReturnUrl` 可組出，且不影響既有方案。
- Phase 1 完成條件：兩表與四支 RPC 遷移已套用；RPC 只 grant 給 service_role；fake 支援新表與 RPC。
- Phase 2 完成條件：`/api/payments/ecpay/period-webhook` 不經過 proxy。
- Phase 3 完成條件：月繳 fields 含定期定額參數；期末未過或 5 分鐘內有 pending 單時回 409。
- Phase 4 完成條件：首次授權建立 active 訂閱；重送或已取消時不改期末。
- Phase 5 完成條件：續訂只延一次；失敗設 past_due；cancelled／expired 不復活。
- Phase 6 完成條件：權限順序為永久 → 點數 → 訂閱（只看期間）；單點解鎖在訂閱有效時不扣點。
- Phase 7 完成條件：新報告在訂閱有效時顯示進階；403 時退回鎖定；畫面沒有追問。
- Phase 8 完成條件：腳本可重播六組事件；三位會員就緒；交棒清單與 `docs/spec.md` 已更新。

## spec Story 對照

| Story | 承接 US |
| --- | --- |
| 1 方案表與定期定額建單 | US-001／US-002、US-008／US-009、US-018（入口） |
| 2 建單閘門 | US-008／US-009 |
| 3 ReturnURL 首次 | US-004、US-010／US-011 |
| 4 PeriodReturnURL 續訂 | US-004、US-012／US-013 |
| 5 扣款失敗 | US-004、US-012／US-013；S5-4 由 US-022 承接 |
| 6 取消與到期 | US-004、US-014（S6-2／S6-4）、US-022 |
| 7 權限判斷 | US-014／US-015、US-016／US-017、US-018 |
| 8 單點解鎖 RPC | US-004（SQL＋套用後實跑）、US-005、US-014（回歸）／US-015、US-018（畫面） |
| 9 移除追問 | US-019 |
| 10 固定素材與三位會員 | US-020／US-021、US-022 |
| 11 Client 不可寫 | US-003（S11-1 套用後實測）、US-004（S11-3 套用後實測）；S11-2 已由既有 guard 擋下 |
| 12 交棒單元 7／8 | US-023 |

## spec 第 7 節阻塞對照

| 阻塞 | 處理方式 | 承接 US |
| --- | --- | --- |
| 1：proxy matcher 攔截 period-webhook | matcher 排除 `api/payments/ecpay/`，並擴充 session-guards 測試 | US-006／US-007 |
| 2：Checkpoint 被 `profiles_guard_entitlements` 擋下 | `security definer` 繞不過（guard 看的是 JWT 的角色）；一律用 service role client 呼叫，或在同一個 transaction 內先 `set_config` 兩個 claim | US-022 |
| 3：重整後無法重開舊報告 | PM 已定案不做；S7-3 只驗新報告 | US-018 |
| 4：`scripts/` 無法 import `server-only` 的 check-mac | 腳本自行實作，並以 vitest 對照 | US-020／US-021 |
