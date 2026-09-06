# 單元 1 MVP — User Stories

> 來源：[`docs/specs/2026-09-05-ziwei-unit1-mvp.md`](../../specs/2026-09-05-ziwei-unit1-mvp.md)、[`docs/design-brief.md`](../../design-brief.md)、[`docs/architecture.md`](../../architecture.md)  
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

```
US-001 ─────► US-004 ─────► US-005 ─┐
US-006 ─────► US-007 ───────────────┤
US-008 ─────────────────────────────┤
US-002 ─────────────────────────────┤
US-003 ─────────────────────────────┼─► US-016 ─┐
US-009 ─────► US-010 ─┬─► US-011    │           │
                      ├─► US-012 ─► US-013 ─────┤
                      └─► US-014 ─► US-015 ─────┤
                                                ├─► US-017 ─► US-018 ─┬─► US-022
US-001 + US-008 ──────────────────────────────► US-019 ──────────────┤
US-015 ───────────────────────────────────────► US-020 ──────────────┤
US-008 ───────────────────────────────────────► US-021 ──────────────┘

US-010 ─────► US-023 ─────► US-024 ─┐
US-018 ─────────────────────────────┴─► US-025
```

Phase 0 完成條件：`docs/spec.md` 的 `focus` 與 AI spec 同為中文枚舉。  
Phase 1 完成條件：遷移可套用、驗證與高風險純函式測試綠。  
Phase 2 完成條件：三套 schema + Mock 三模式可跑。  
Phase 3 完成條件：`POST /api/reports` 依 error_code 回 400／422／502／503／200。  
Phase 4 完成條件：無痕可走完表單 → 畫面 A；高風險／失敗可重試。  
Phase 5 完成條件：Live 主失敗才切備援；bundle 無 key；Route 有 `maxDuration`。
