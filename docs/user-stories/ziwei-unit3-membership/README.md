# 單元 3 — 會員、資料與使用權限 User Stories

> 來源：[`docs/specs/2026-09-13-ziwei-unit3-membership.md`](../../specs/2026-09-13-ziwei-unit3-membership.md)  
> 非阻塞項：[`docs/specs/2026-09-13-ziwei-unit3-membership-issues.md`](../../specs/2026-09-13-ziwei-unit3-membership-issues.md)  
> 前兩版：[`ziwei-unit1-mvp`](../ziwei-unit1-mvp/README.md)、[`ziwei-unit2-commercial-entry`](../ziwei-unit2-commercial-entry/README.md)  
> **本目錄覆蓋會員最小閉環**。不重做單元 1 生成；不把 unit2 預覽假文當成已開通。  
> spec 第 7 節 7 項阻塞**不另開 US**，編入下表對應任務的驗收條件；`-issues.md` 非阻塞不進本目錄。

## 課堂前置（非 US）

- Supabase Auth **關閉 Confirm email**，否則註冊無 session，US-008／US-009 重整 AC 無法過。
- 雙帳號隔離、權益欄寫入失敗：須先把 US-004 遷移套到目標專案，再用 anon + 兩組使用者 JWT 驗；SQL Editor owner 不算過關。

## 不做（本版）

- 密碼重設、社群登入、完整會員中心
- `reports.user_id`、reports owner-only RLS
- 訂單／ECPay／Webhook／扣點／訂閱週期／追問 API
- 放寬 `POST /api/reports` 或 `buildReportResponse` 帶進階三欄
- 以前端或 Client SDK 開通當正式開通
- 把 `/` 做成未登入不能進

## 全域驗收 Checklist

### Phase 0 — persist_id 與 env

- [x] US-001 POST persist_id 測試
- [x] US-002 POST persist_id 實作
- [x] US-003 會員環境變數與機密守門

### Phase 1 — profiles

- [x] US-004 建立 profiles 遷移
- [x] US-005 ensureProfile 測試
- [x] US-006 ensureProfile 實作

### Phase 2 — Auth 入口

- [x] US-007 SSR session 與刷新層
- [x] US-008 Email 註冊與登入頁
- [x] US-009 頁首登入入口與 session 區
- [x] US-010 更新顯示名稱

### Phase 3 — 受控開通與進階讀取

- [x] US-018 記憶體 fake Supabase client
- [x] US-011 grant-access 測試（預期紅燈；待實作轉綠）
- [ ] US-012 grant-access 實作
- [x] US-013 GET 進階報告 測試（預期紅燈；待實作轉綠）
- [ ] US-014 GET 進階報告 實作

### Phase 4 — 三態畫面

- [ ] US-015 會員三態視圖 測試
- [ ] US-016 會員三態視圖 實作
- [ ] US-017 三態報告畫面

## 依賴鏈摘要

本圖是 `/next-task` 的**唯一**依賴來源；各 US「依賴關係」欄必須與此圖一致，禁止另畫一套。

```
US-001 ─────► US-002 ─────► US-014 ─────► US-017
US-003 ─────► US-012
US-004 ─┬─► US-006 ─────► US-009 ─┬─► US-010
        ├─► US-008 ─────► US-009  └─► US-017
        ├─► US-012
        └─► US-014
US-005 ─────► US-006
US-007 ─┬─► US-008
        ├─► US-009
        └─► US-014
US-018 ─┬─► US-011 ─────► US-012
        └─► US-013 ─────► US-014
US-015 ─────► US-016 ─────► US-017
```

Phase 0 完成條件：POST 200 有 uuid `persist_id`、仍無進階三欄；env 與機密守門就位。  
Phase 1 完成條件：`profiles` SQL 可套用；`ensureProfile` 只補列、不覆寫權益。  
Phase 2 完成條件：可註冊／登入／登出／重整；頁首有入口；訪客仍可 POST；可改 `display_name`。  
Phase 3 完成條件：受控 grant 可開通；GET 僅已開通回進階真文。  
Phase 4 完成條件：先處於該身分再生成，三態畫面正確；登出清真文；預覽 B ≠ 已開通。

## spec 第 7 節阻塞對照

| 阻塞 | 處理方式 | 承接 US |
| --- | --- | --- |
| 問題 1：ensure 覆寫開通 | insert-if-missing；禁止 UPSERT 覆寫權益／display_name | US-005／US-006 |
| 問題 2：AGENTS／rules 禁會員與進階 | 本目錄以 unit3 spec 為準；POST 遮罩不變；僅 GET 已開通可帶三欄；`/` 不強制登入 | US-007／US-009／US-013／US-014 |
| 問題 3：離頁丟掉 persist_id | 驗收＝先處於該身分再生成 | US-017 |
| 問題 4：ssr 必須 getAll／setAll | cookie adapter + getUser／getClaims | US-007 |
| 問題 5：production 預覽=1 | unlocked 覆蓋預覽態，不用 EXAMPLE_BLOCKS | US-015／US-016／US-017 |
| 問題 6：Mock advanced 無 action | GET 合併 basic_json ∪ 進階三欄 | US-013／US-014 |
| 問題 7：GRANT 須先 REVOKE | 遷移先 REVOKE 表層 UPDATE | US-004 |

## 重構掃描記錄

- 已掃描至：US-010（2026-09-13）
- 已知待觀察熱點：
  - `lib/membership/ensureProfile.ts`（新建；只補列）
  - `supabase/migrations/20260913000000_create_profiles.sql`
  - `components/auth/AuthSessionBar.tsx`（US-009／US-010 同檔；仍短）
  - `lib/supabase/session.ts`／`update-session.ts`（cookie adapter 重複 getAll／setAll，未達重構門檻）
- 備註：無反模式達重構門檻。低／中風險，暫不重構。
