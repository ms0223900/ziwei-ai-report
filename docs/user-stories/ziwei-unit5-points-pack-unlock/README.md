# 單元 5 — 點數包 × 單點解鎖 User Stories

> 來源：[`docs/specs/2026-09-21-ziwei-unit5-points-pack-unlock.md`](../../specs/2026-09-21-ziwei-unit5-points-pack-unlock.md)  
> 非阻塞項：[`docs/specs/2026-09-21-ziwei-unit5-points-pack-unlock-issues.md`](../../specs/2026-09-21-ziwei-unit5-points-pack-unlock-issues.md)  
> 前四版：[`ziwei-unit1-mvp`](../ziwei-unit1-mvp/README.md)、[`ziwei-unit2-commercial-entry`](../ziwei-unit2-commercial-entry/README.md)、[`ziwei-unit3-membership`](../ziwei-unit3-membership/README.md)、[`ziwei-unit4-ecpay-sandbox-unlock`](../ziwei-unit4-ecpay-sandbox-unlock/README.md)  
> **本目錄覆蓋點數包加點、受控扣 1 點、單點解鎖單一報告。** 不重做單元 4 驗簽／Tunnel／`1|OK`；不把 grant 或終身開通當成加點。  
> spec 第 7 節 5 項阻塞**不另開 US**，編入下表對應任務的驗收條件；`-issues.md` 非阻塞不進本目錄。本 spec **覆寫** `AGENTS.md`／`docs/spec.md`「本版不做扣點」以及單元 2「點數只買追問、不解鎖報告」——實作時以本檔來源 spec 為準。

## 課堂前置（非 US）

- 綠界驗簽、Tunnel、ReturnURL 仍走單元 4 SOP；本單元不加第二條 Webhook。
- 加點／扣點 AC 須先套用本目錄遷移；未套用不得勾 Story 4／5／8。
- 權益鍵一律是 `reports.id`（現有 `persist_id`），**禁止**用 `basic_json.report_id`。
- 訪客／舊列 `user_id` null 不可解鎖、不可 GET 進階；課堂須由已登入者**新產生**自己的報告。

## 不做（本版）

- 重做 CheckMacValue、Tunnel、測試特店、第二家金流、`PeriodReturnURL`
- `orders.fulfilled_at`、用 `access_status` 或 `reports.status` 代表單點解鎖
- 追問 API、訂閱、點數到期、退款、多包、浮動扣點
- 結果頁、通知、管理後台、舊報告 `user_id` 回填
- 完整單元 7 UI／單元 8 驗測劇本
- `points_balance >= 0` check（Could Have，不排程）

## 全域驗收 Checklist

### Phase 0 — 方案表

- [x] US-001 方案表第二筆 測試（預期紅燈；待實作轉綠）
- [x] US-002 方案表第二筆 實作

### Phase 1 — schema 與 fake

- [x] US-003 建立點數與解鎖關聯遷移
- [x] US-004 加點與扣點 RPC 遷移
- [x] US-005 記憶體 fake 點數與 RPC

### Phase 2 — 建單閘門

- [ ] US-006 點數包建單與閘門 測試
- [ ] US-007 點數包建單與閘門 實作

### Phase 3 — Webhook 履約

- [ ] US-008 履約分派與加點 測試
- [ ] US-009 履約分派與加點 實作

### Phase 4 — reports.user_id

- [ ] US-010 POST reports.user_id 測試
- [ ] US-011 POST reports.user_id 實作

### Phase 5 — 單點解鎖 RPC

- [ ] US-012 單點解鎖 Route 測試
- [ ] US-013 單點解鎖 Route 實作

### Phase 6 — 進階 GET

- [ ] US-014 進階 GET 擁有者檢查 測試
- [ ] US-015 進階 GET 擁有者檢查 實作

### Phase 7 — 視圖與畫面

- [ ] US-016 會員視圖第三態 測試
- [ ] US-017 會員視圖第三態 實作
- [ ] US-018 買點入口與單點解鎖畫面
- [ ] US-019 已單次解鎖選單 API 測試
- [ ] US-020 已單次解鎖選單 API 實作
- [ ] US-021 已單次解鎖選單畫面

### Phase 8 — 回跳文案與交棒

- [ ] US-022 付款處理中頁中性文案
- [ ] US-023 測試帳號與交棒

## 依賴鏈摘要

本圖是 `/next-task` 的**唯一**依賴來源；各 US「依賴關係」欄必須與此圖一致，禁止另畫一套。

```
US-001 ─────► US-002 ─────► US-006 ─────► US-007 ─────► US-018
US-003 ─┬─► US-004 ─┬─► US-009
        │          └─► US-013
        └─► US-005 ─┬─► US-006
                    ├─► US-008 ─────► US-009
                    ├─► US-010 ─────► US-011 ─────► US-015 ─┬─► US-018 ─────► US-021
                    │                                      └─► US-021
                    ├─► US-012 ─────► US-013 ─┬─► US-018
                    │                        └─► US-020 ─────► US-021
                    ├─► US-014 ─────► US-015
                    └─► US-019 ─────► US-020
US-016 ─────► US-017 ─────► US-018
US-009 ──────────────────────────────────────────► US-023
US-013 ──────────────────────────────────────────► US-023
US-021 ──────────────────────────────────────────► US-023
US-022 ──────────────────────────────────────────► US-023
```

Phase 0 完成條件：方案表同時有終身與 `points_pack_5`（49／+5／品名定稿）；未知 plan 仍失敗。  
Phase 1 完成條件：遷移可套用；RPC 簽名帶 `p_user_id`；fake 有帳本／解鎖列／`.rpc()`。  
Phase 2 完成條件：已開通可買點數包；終身方案仍 409。  
Phase 3 完成條件：已履約才跳過；點數包加點、終身只改 `access_status`；paid 無 credit 會補加。  
Phase 4 完成條件：登入新報告寫 `user_id`；訪客列為 null。  
Phase 5 完成條件：只送 `persist_id`；扣 1 點與解鎖列同一事務；不足／終身／重複不誤扣。  
Phase 6 完成條件：進階 GET 先查擁有者；單點成功 JSON 的 `access_status` 不是 `"unlocked"`。  
Phase 7 完成條件：已開通不隱藏買點；locked 可單點解鎖；選單只列 `report_unlocks`。  
Phase 8 完成條件：回跳頁不教「再送同一生辰即見進階」；howto 有兩帳號與單元 7／8 欄位。

## spec Story 對照

| Story | 承接 US |
| --- | --- |
| 1 方案表第二筆 | US-001／US-002；US-006／US-007（建單 49） |
| 2 建單閘門依 plan_id | US-006／US-007 |
| 3 已開通仍顯示買點 | US-016／US-017（買點旗標）；US-018（入口） |
| 4 Webhook 已履約才跳過＋分派 | US-004、US-008／US-009 |
| 5 credit unique 冪等與補償 | US-008／US-009 |
| 6 終身路徑不加點 | US-008／US-009 |
| 7 reports.user_id | US-003、US-010／US-011；他人／null → `forbidden` 在 US-012／US-013 |
| 8 單點解鎖 RPC | US-004、US-012／US-013 |
| 9 GET／畫面分離＋擁有者 | US-014／US-015、US-016／US-017（旗標）、US-018（畫面）；回跳課堂規則 US-022 |
| 10 簡單選單 | US-019／US-020／US-021 |
| 11 點數不足 | US-012／US-013（API）；US-018（畫面） |
| 12 Client 不可寫權益 | US-003 |
| 13 測試帳號與交棒 | US-023 |

## spec 第 7 節阻塞對照

| 阻塞 | 處理方式 | 承接 US |
| --- | --- | --- |
| 問題 1：service role 下 `auth.uid()` 為 null | RPC `unlock_report_with_point(report_id, p_user_id)`；Handler `getSessionUser()` 注入；禁止信任 body `user_id` | US-004／US-012／US-013 |
| 問題 2：`report_id` ≠ `persist_id` | 權益鍵一律 `reports.id`（`persist_id`）；禁止 `basic_json.report_id`；畫面 POST 值＝`persist_id` | US-012／US-013、US-018、US-019／US-020 |
| 問題 3：畫面仍是終身二元態 | 改 `resolveMembershipView` 第三態、`HomeClient.loadAdvanced` 在 locked×單點仍 GET（由 US-018 擁有）、GET JSON 單點不得回 `"unlocked"`；選單點選沿用同一閘門 | US-014／US-015、US-016／US-017、US-018、US-021 |
| 問題 4：已 paid 整段跳過／無加點事務 | `fulfill_points_pack_order`；控制流：失敗先停、再分派；unique 衝突當已履約 | US-004、US-008／US-009 |
| 問題 5：回跳「再送同一生辰」 | 中性處理中文案；訪客列須登入後新產生 | US-022、US-023 |

## 重構掃描記錄

- 已掃描至：US-005（2026-09-21）
- 已知待觀察熱點：無
- 備註：US-003／US-004 各寫一份 migration；US-005 只動 fake。未達 churn／反模式門檻。
