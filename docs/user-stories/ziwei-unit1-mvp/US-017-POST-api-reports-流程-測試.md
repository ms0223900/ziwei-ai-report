# US-017：POST /api/reports 流程測試

**作為** 開發者  
**我想要** 先有會失敗的 Route 流程測試  
**以便** 驗證→高風險→生成→ajv→寫入→遮罩的分支鎖死

**輸入格式**：
- 契約：`POST /api/reports`、`Content-Type: application/json`、無登入
- 依賴以 mock 取代：validation、high-risk、mock generation、ajv、store、masking
- HTTP 對照：400 `VALIDATION_ERROR`；422 `SCHEMA_INVALID`；502 僅 OpenRouter 傳輸失敗；503 `PERSIST_FAILED`；高風險 200 + `HIGH_RISK` 且不 insert

**輸出格式**：
- Route 的單元／整合測試（mock fetch／store）
- 示範合法 body：`{ nickname, birth_date, birth_time: null, focus: "工作" }`，**不含** `time_unknown`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 涵蓋：合法 Mock valid → 200 無 `error_code` 且無進階三欄；驗證失敗 400 不呼叫生成／不 insert；高風險 200 不 insert；invalid-json／缺欄 422 不 insert；insert 失敗 503
- [ ] 高風險與成功報告都可能是 HTTP 200，測試必須用 `error_code` 分流，不能只看 `ok`
- [ ] 502 案例可先用 stub「provider 傳輸失敗」（Live 實作在 US-024）

**測試策略**：Test-First（測試準備）
> 理由：狀態轉換與 HTTP 對照明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 1／2a／2b／4／5  
**依賴關係**：US-005、US-007、US-008、US-013、US-015、US-016
