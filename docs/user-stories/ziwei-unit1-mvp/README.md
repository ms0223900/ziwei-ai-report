# 單元 1 MVP — User Stories

> 來源：[`docs/specs/2026-09-05-ziwei-unit1-mvp.md`](../../specs/2026-09-05-ziwei-unit1-mvp.md)、[`docs/design-brief.md`](../../design-brief.md)、[`docs/architecture.md`](../../architecture.md)、[`designs/ziwei-unit1.pen`](../../../designs/ziwei-unit1.pen)  
> 非阻塞項：[`docs/specs/2026-09-05-ziwei-unit1-mvp-issues.md`](../../specs/2026-09-05-ziwei-unit1-mvp-issues.md)  
> 現況：Checkpoint A1 已完成；本目錄覆蓋 A2–A7。  
> **不做**：會員／登入、RLS owner policy、訂單／ECPay、真正解鎖或扣點、追問主流程、畫面 B/C/D。

## 全域驗收 Checklist

### Phase 0 — 規格對齊

- [ ] US-001 對齊 focus 中文枚舉

### Phase 1 — A2 資料與政策

- [ ] US-002 建立 reports 遷移
- [ ] US-003 建立 Supabase service-role client
- [ ] US-004 生辰驗證規則測試
- [ ] US-005 生辰驗證規則實作
- [ ] US-006 高風險短路測試
- [ ] US-007 高風險短路實作
- [ ] US-008 共用常數與錯誤碼

### Phase 2 — A3 Schema／Mock

- [ ] US-009 報告 schema 與 ajv 測試
- [ ] US-010 報告 schema 與 ajv 實作
- [ ] US-011 Prompt v1
- [ ] US-012 Mock 三模式測試
- [ ] US-013 Mock 三模式實作

### Phase 3 — A4 API

- [ ] US-014 遮罩組裝測試
- [ ] US-015 遮罩組裝實作
- [ ] US-016 寫入 reports store
- [ ] US-017 POST /api/reports 流程測試
- [ ] US-018 POST /api/reports 實作

### Phase 4 — A5 畫面

- [ ] US-019 生辰表單畫面
- [ ] US-020 基本分析與鎖定 CTA
- [ ] US-021 高風險與失敗可重試畫面
- [ ] US-022 單頁表單結果切換

### Phase 5 — A6／A7 Live

- [ ] US-023 OpenRouter 主備援測試
- [ ] US-024 OpenRouter 主備援實作
- [ ] US-025 maxDuration 與機密不外洩

## 依賴鏈摘要

本圖是 `/next-task` 的**唯一**依賴來源；各 US「依賴關係」欄必須與此圖一致，禁止另畫一套。Vitest 由 US-004 導入；US-006／US-009 直接依賴它，其後測試任務經 US-010 傳遞。

```
US-001 ─────► US-004 ─┬─► US-005
                      ├─► US-006 ─────► US-007
                      ├─► US-009 ─────► US-010 ─┬─► US-011
                      │                         ├─► US-012 ─► US-013
                      │                         ├─► US-014 ─► US-015
                      │                         └─► US-023
US-002 ─┐
US-003 ─┤
US-008 ─┼─► US-016
US-010 ─┤
US-015 ─┘

US-005 ─┐
US-007 ─┤
US-008 ─┤
US-013 ─┼─► US-017 ─────► US-018 ─┬─► US-022
US-015 ─┤                         │
US-016 ─┘                         │
US-001 ─┬─► US-019 ───────────────┤
US-008 ─┘                         │
US-015 ─────► US-020 ─────────────┤
US-008 ─────► US-021 ─────────────┘

US-011 ─┐
US-018 ─┼─► US-024
US-023 ─┘
US-018 ─┬─► US-025
US-024 ─┘
```

Phase 0 完成條件：`docs/spec.md` 的 `focus` 與 AI spec 同為中文枚舉。  
Phase 1 完成條件：`npm test` 可跑（Vitest 由 US-004 導入）；驗證與高風險測試綠；遷移檔已提交（表是否已套用由 US-016 把關）。  
Phase 2 完成條件：三套 schema + repo 內 canned fixture + Mock 三模式可跑。  
Phase 3 完成條件：`POST /api/reports` 依 error_code 回 400／422／502／503／200；Mock `valid` 成功路徑在已套用的 `reports` 表寫入一列。  
Phase 4 完成條件：無痕可走完表單 → 畫面 A；高風險／失敗可重試；desktop＋mobile 對齊 `designs/ziwei-unit1.pen` 對應 frame（對稿可用 `designs/ziwei-unit1-previews/` 同名 PNG）。

### 畫面視覺來源（Phase 4）

| 優先 | 來源 | 管什麼 |
| --- | --- | --- |
| 1 | AI spec | 產品行為、schema、HTTP、`error_code`、高風險固定句、不得假裝解鎖 |
| 2 | `designs/ziwei-unit1.pen` | 畫面結構、元件（按鈕／欄位／聚焦段／封條／鎖定佔位／ChartMatrix）、desktop／mobile 各狀態 |
| 3 | design-brief／brand／`assets/design-tokens.json` | 色票、字級原則、禁用清單；token 名稱須與 `.pen` 的 `$paper`／`$sheet`／`$ink`／`$seal` 等一致 |

`.pen` 與 spec 衝突時（例如露出進階真文、假裝付款）：跟 spec。文案以 spec／US-008 常數為準；版面以 `.pen` 為準。

| US | `.pen` frame | Preview PNG |
| --- | --- | --- |
| US-019 | `Desktop / 01 生辰表單`、`Desktop / 02 表單驗證錯誤`；`Mobile / 01`、`02` | `desktop-01-birth-form.png`、`desktop-02-form-error.png`；`mobile-01-*`、`mobile-02-*` |
| US-020 | `Desktop / 04 基本分析 畫面 A`、`Desktop / 05 CTA 點擊`；`Mobile / 04`、`05` | `desktop-04-report-a.png`、`desktop-05-cta-clicked.png`；對應 mobile |
| US-021 | `Desktop / 03 生成中`、`06 生成失敗`、`07 高風險`；`Note / 其餘高風險固定句`；對應 Mobile `03`／`06`／`07` | `desktop-03-generating.png`、`desktop-06-fail.png`、`desktop-07-high-risk.png`；對應 mobile |
| US-022 | 上列全部狀態串在同一頁 | 同上，desktop＋mobile 各走一輪 |

Phase 5 完成條件：Live 主失敗才切備援；bundle 無 key；Route 有 `maxDuration`。
