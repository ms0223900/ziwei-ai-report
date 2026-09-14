# US-013：GET 進階報告 測試

**作為** 開發者  
**我想要** 先有會失敗的已開通讀取契約測試  
**以便** 訪客／未開通拿不到進階三欄，已開通拿到 basic ∪ 進階真文

**輸入格式**：
- `GET /api/reports/[persistId]`
- 無 session → 401 `UNAUTHENTICATED`「請先登入。」
- session 且非 `unlocked` → 403 `FORBIDDEN`，body 無進階三欄
- 非 uuid（含 `rpt_demo_001`）→ 404，不是 500
- 找不到列／非 success／無 `advanced_json` → 404
- 200：`tier=advanced`；`action`／`overall`／`work`／`relationship` 取 `basic_json`；三欄取 `advanced_json`；無頂層 `advanced_json` 整包

**輸出格式**：
- 對應 `*.test.ts`（建議 `app/api/reports/[persistId]/route.test.ts`）
- 資料層用 `test/fakes/supabase.ts`（US-018）；session 可另 mock `getSessionUser`

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言 401／403／404 皆不含 `rationale`／`path_compare`／`action_plan`
- [x] 斷言 200 有 7 天 `action_plan` 與 `action`（即使 advanced fixture 無 `action`）
- [x] 斷言非 uuid 走 404

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run app/api/reports/[persistId]/route.test.ts` 4 failed，皆因 `Cannot find module './route'`（功能尚未實作）。待 US-014 轉綠。

---

**AC-1：預期紅燈**

狀態：✅ 通過

- 失敗訊息：`Cannot find module '/app/api/reports/[persistId]/route'`
- 路徑：`app/api/reports/[persistId]/route.test.ts`

**AC-2～4：契約斷言已寫入**

狀態：✅ 通過

- 401／403／404 皆檢查 body 無 `rationale`／`path_compare`／`action_plan`／`advanced_json`
- 200：`action` 取 `basic.valid.json`；`action_plan` 長度 7 且首日含「第 1 天」
- `rpt_demo_001` → 404 `NOT_FOUND`，不是 500
- session 用 mock `getSessionUser`；資料層走 `test/fakes/supabase.ts`

**測試策略**：Test-First（測試準備）
> 理由：狀態碼與欄位組裝是明確 API 契約。

**優先級**：P0  
**相關功能**：Story 6；spec 第 7 節問題 2／6  
**依賴關係**：US-018
