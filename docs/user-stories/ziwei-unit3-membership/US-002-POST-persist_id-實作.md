# US-002：POST persist_id 實作

**作為** 系統  
**我想要** POST 成功時回傳 `reports.id` 當 `persist_id`  
**以便** 已開通者能用 uuid 再 GET，而不打 `rpt_demo_001`

**輸入格式**：
- US-001 紅燈測試
- `insertReport` 已回傳列（現況 `persistMaskedReport` 丟棄回傳值）
- `MaskedReportView`／`overlay.ts` 需能帶 `persist_id`

**輸出格式**：
- `lib/masking/buildReportResponse.ts` 附加 `persist_id`
- `app/api/reports/route.ts` 使用 `insertReport` 的 `id`
- overlay／前端型別能讀到 `persist_id`（畫面三態留給 US-017）

**驗收條件**：
- [x] US-001 測試轉綠
- [x] POST 200 有 uuid `persist_id`，無進階三欄／`advanced_json`
- [x] Mock `valid` 連續兩次成功 POST，`persist_id` 不同
- [x] 不改生成、ajv、高風險短路

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/masking/buildReportResponse.test.ts app/api/reports/route.test.ts components/report/overlay.test.ts` → 25 passed。

---

**AC-1：US-001 轉綠**

狀態：✅ 通過

- `buildReportResponse` 現在必收並回傳 `persist_id`

**AC-2：POST 200 有 persist_id、無進階欄**

狀態：✅ 通過

- `persistMaskedReport` 把 `insertReport().id` 傳進 `buildReportResponse`
- route 測試斷言 `buildReportResponse` 收到該 id，body 無進階四鍵

**AC-3：連續兩次 POST 不同 persist_id**

狀態：✅ 通過

- `returns a different persist_id for two successful mock valid POSTs`

**AC-4：不改生成／ajv／高風險**

狀態：✅ 通過

- 未改 `lib/generation/*`、`lib/schemas/*`、`lib/policy/high-risk.ts`

**測試策略**：Test-First
> 理由：對 US-001 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 6  
**依賴關係**：US-001
