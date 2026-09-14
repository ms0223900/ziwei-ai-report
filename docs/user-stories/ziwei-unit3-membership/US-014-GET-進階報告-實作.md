# US-014：GET 進階報告 實作

**作為** 已開通會員  
**我想要** 用 `persist_id` 讀該份進階真文  
**以便** 不重跑模型、也不放寬 POST 遮罩

**輸入格式**：
- US-013 紅燈測試
- cookie session + 自身 `profiles`
- service role 依 `reports.id` 讀列
- POST／`buildReportResponse` 禁止清單不變

**輸出格式**：
- `app/api/reports/[persistId]/route.ts`
- 200 只組 spec 列出的欄位

**驗收條件**：
- [x] US-013 測試轉綠
- [x] 已開通者 POST 200 仍無進階三欄，隨後 GET 才有
- [x] 未開通 GET 403
- [x] 不新增報告列表 API

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run app/api/reports/[persistId]/route.test.ts` → 4 passed。`npm run build` 列出 `ƒ /api/reports/[persistId]`，無列表路由。本包未對遠端 reports 列做 live GET。

---

**AC-1：US-013 轉綠**

狀態：✅ 通過

- 無 session 401、locked 403、`rpt_demo_001` 404、已開通 200 組 `basic ∪` 進階三欄且無頂層 `advanced_json`

**AC-2：POST 仍遮罩、GET 才有真文**

狀態：✅ 通過

- `buildReportResponse` 禁止清單未改；POST 測試仍斷言無進階三欄
- GET 200 才帶 `rationale`／`path_compare`／`action_plan`，`action` 取 `basic_json`

**AC-3：未開通 403**

狀態：✅ 通過

- `access_status !== unlocked` → 403「尚未開通，無法讀取進階報告。」且無進階欄

**AC-4：無列表 API**

狀態：✅ 通過

- 只新增動態 `[persistId]` GET，無 `/api/reports` 列表 handler

**測試策略**：Test-First
> 理由：對 US-013 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 6  
**依賴關係**：US-002、US-004、US-007、US-013
