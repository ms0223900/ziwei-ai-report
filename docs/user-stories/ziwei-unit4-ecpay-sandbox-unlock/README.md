# 單元 4 — 綠界沙盒 × 單次解鎖 User Stories

> 來源：[`docs/specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md`](../../specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md)  
> 非阻塞項：[`docs/specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock-issues.md`](../../specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock-issues.md)  
> 前三版：[`ziwei-unit1-mvp`](../ziwei-unit1-mvp/README.md)、[`ziwei-unit2-commercial-entry`](../ziwei-unit2-commercial-entry/README.md)、[`ziwei-unit3-membership`](../ziwei-unit3-membership/README.md)  
> **本目錄覆蓋沙盒建單、Webhook 解鎖、處理中頁、正式預覽警告與 grant 課堂繞過。** 不重做單元 1 生成／遮罩；不把 unit2 預覽假文當成已付款。  
> `-issues.md` 非阻塞不進本目錄。本 spec **覆寫** `AGENTS.md`／`docs/spec.md`「本版不做金流」——實作時以本檔來源 spec 為準。

## 課堂前置（非 US）

- **沙盒怎麼測**：見 [howto-ecpay-sandbox.md](./howto-ecpay-sandbox.md)（US-020 交付；Tunnel 或既有公開 HTTPS；禁止 ngrok）。
- 五類金流驗測**必須**走綠界 ReturnURL，**禁止**用 grant 冒充 Story 5～9。
- `profiles` 遷移已在單元 3；本單元**不改** `profiles` schema。
- 公開測試特店帳密寫在 SOP，不當程式常數、不進 git。

## 不做（本版）

- QueryTradeInfo、處理中頁輪詢（Story 11，Later）
- 點數加扣、`PeriodReturnURL` 訂閱週期、改 `points_balance`／`subscription_status`
- 第二家金流、站內付、正式商店、退款、發票、`OrderResultURL` 解鎖、ngrok、ATM／CVS
- 官方 SDK 算檢查碼（手寫 SHA256 即可）
- 另建 entitlement 表、改 `profiles` schema、`reports.user_id`
- 刪除 `POST /api/dev/grant-access`，或把它接到「解鎖完整報告」

## 全域驗收 Checklist

### Phase 0 — env 與 matcher

- [x] US-001 金流環境變數與機密守門
- [x] US-002 proxy 排除 webhook 測試（預期紅燈；待實作轉綠）
- [x] US-003 proxy 排除 webhook 實作

### Phase 1 — orders 與 fake

- [x] US-004 建立 orders 遷移
- [x] US-005 記憶體 fake orders

### Phase 2 — 簽章與方案

- [x] US-006 CheckMacValue 測試（預期紅燈；待實作轉綠）
- [ ] US-007 CheckMacValue 實作
- [ ] US-008 方案表與交易編號 測試
- [ ] US-009 方案表與交易編號 實作

### Phase 3 — 建單

- [ ] US-010 checkout 建單 測試
- [ ] US-011 checkout 建單 實作

### Phase 4 — Webhook

- [ ] US-012 webhook 處理 測試
- [ ] US-013 webhook 處理 實作

### Phase 5 — CTA 與回跳

- [ ] US-014 未開通付款 CTA 測試
- [ ] US-015 未開通付款 CTA 實作
- [ ] US-016 訪客登入彈窗與綠界導轉
- [ ] US-017 付款處理中頁

### Phase 6 — 正式預覽

- [ ] US-018 正式環境預覽警告 測試
- [ ] US-019 正式環境預覽警告 實作

### Phase 7 — SOP、grant、接點

- [ ] US-020 Tunnel 與五類驗測 SOP
- [ ] US-021 grant 與付款互動 測試
- [ ] US-022 grant 與付款互動 實作
- [ ] US-023 plan_id 履約分流接點說明

## 依賴鏈摘要

本圖是 `/next-task` 的**唯一**依賴來源；各 US「依賴關係」欄必須與此圖一致，禁止另畫一套。

```
US-001 ─┬─► US-011
        └─► US-013
US-002 ─────► US-003 ─────► US-013
US-004 ─┬─► US-011
        └─► US-013
US-005 ─┬─► US-010 ─────► US-011 ─┬─► US-016 ──► US-020
        ├─► US-012 ─────► US-013 ─┼─► US-020
        │                        └─► US-022
        └─► US-021 ──────────────────► US-022
US-006 ─┬─► US-007 ─┬─► US-011
        │          └─► US-013
        └─► US-012
US-008 ─────► US-009 ─────► US-011
US-011 ───────────────────────────► US-022
US-014 ─────► US-015 ─┬─► US-016
                      └─► US-019
US-017 ───────────────────────────► US-020
US-018 ─────► US-019 ─────────────► US-020 ──► US-023
```

Phase 0 完成條件：ECPay URL／Hash 槽位就位且 Hash 不進 client；proxy matcher 排除實際 Webhook 路徑。  
Phase 1 完成條件：`orders` SQL 可套用；記憶體 fake 有 `orders` 且 `merchant_trade_no` unique。  
Phase 2 完成條件：建單與 Webhook 共用 CheckMacValue；方案表只認 `unlock_report_lifetime`／99 TWD；交易編號 ≤20 且唯一。  
Phase 3 完成條件：checkout 401／400／409／500／200 契約成立；金額以後端為準。  
Phase 4 完成條件：驗簽→對單對金額→模擬不履約→失敗不解鎖→成功 paid＋unlocked；冪等與補償。  
Phase 5 完成條件：訪客彈窗不建單；locked 可導轉；unlocked 無付款 CTA；回跳只顯示處理中。  
Phase 6 完成條件：`.env.production` 預覽為 `0`；production＋誤設 `1` 有警告且無 overlay。  
Phase 7 完成條件：SOP 可走五類驗測；grant 保留且非正式付款；`plan_id` 分流只寫接點、不加點。

## spec Story 對照

| Story | 承接 US |
| --- | --- |
| 1 未登入攔截 | US-010／US-011（401）；US-016（彈窗） |
| 2 已開通略過 | US-010／US-011（409）；US-014／US-015（無 CTA） |
| 3 建單導轉 | US-008～US-011、US-016 |
| 4 處理中頁 | US-017 |
| 5～9 Webhook | US-006／US-007、US-012／US-013 |
| 10 SOP | US-020 |
| 11 QueryTradeInfo | **不排程**（Later） |
| 12 點數／訂閱完整實作 | **不排程**；僅 US-023 接點說明 |
| 13 正式預覽警告 | US-018／US-019 |
| 14 grant 金手指 | US-021／US-022；SOP 交叉 |

## 重構掃描記錄

- 已掃描至：US-005（2026-09-18）
- 已知待觀察熱點（開工後更新）：
  - `proxy.ts`／`lib/supabase/session-guards.test.ts`
  - `test/fakes/supabase.ts`
  - `lib/membership/view.ts`、`components/report/AdvancedLockedPanel.tsx`
  - `lib/commercial/preview.ts`／`CommercialPreviewBar`
