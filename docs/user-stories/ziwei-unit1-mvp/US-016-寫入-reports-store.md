# US-016：寫入 reports store

**作為** 系統  
**我想要** ajv 通過後同時寫入 basic 與 advanced  
**以便** 未解鎖也能日後打開已存欄位

**輸入格式**：
- 已通過對應 schema 的 `basic_json` 與 `advanced_json`
- 正規化後的生辰欄位；`status='basic'`；`generation_status='success'`
- metadata：`model`／`provider`／`prompt_version`／`schema_version`／`request_id`／`generated_at`
- 即使 `AI_PROVIDER=mock` 仍要寫 Supabase

**輸出格式**：
- `lib/reports/store.ts`：service-role insert
- 成功回列（含 DB `id`）；失敗丟可對應 HTTP 503 的錯誤
- 驗證失敗路徑**不**呼叫本函式（由 Route 保證）

**驗收條件**：
- [ ] 成功列同時有 `basic_json` 與 `advanced_json`
- [ ] `status` 固定 `basic`；成功列 `generation_status=success`
- [ ] Mock 的 JSON `report_id` 可為 `rpt_demo_001`，DB `id` 仍是 uuid
- [ ] insert 失敗不把該次標成已解鎖
- [ ] 本版不實作 `GET /api/reports/:id`
- [ ] 必須對**已套用** `reports` 表做一次 service-role insert 成功；缺 Supabase／未跑遷移則本任務保持未完成，**禁止**只 stub client 就勾完

**測試策略**：Test-After
> 理由：依賴真實 Supabase 與已套用的遷移；stub 只能當開發輔助，不能當驗收。

**優先級**：P0  
**相關功能**：Story 2b  
**依賴關係**：US-002、US-003、US-008、US-010、US-015
