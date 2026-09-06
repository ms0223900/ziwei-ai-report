# US-009：報告 schema 與 ajv 測試

**作為** 開發者  
**我想要** 先有會失敗的 schema／ajv 測試  
**以便** 未通過驗證的 JSON 不算交付

**輸入格式**：
- 三套 draft-07（尚未實作）：`report.basic.v1`、`report.advanced.v1`、`report.complete.v1`
- `report_id`：schema 型別為 string，**不得**宣告 `format: uuid`（如此 `rpt_demo_001` 與 Live 的 uuid 字串都應通過）
- basic 必要含 `action`、`locked_fields`；不含進階三欄為必要
- advanced 必要含 `rationale`／`path_compare`／`action_plan`（長度 7）
- complete = basic 必要 ∪ advanced 必要
- 缺 `overall` 的 basic 必須失敗

**輸出格式**：
- `lib/schemas/loader.test.ts`（或同等）
- 使用最小合法 fixture，不要求 Live 真呼叫

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（以 US-004 的 `npm test` 跑；紅燈不得是沒有測試指令）
- [ ] 合法 basic／advanced／complete fixture 各至少一筆預期通過（實作後）
- [ ] 缺 `overall`、非 JSON 物件必須失敗
- [ ] schema **沒有** `report_id.format: uuid`；`rpt_demo_001` 與一筆 uuid 字串 fixture **都通過**（禁止寫成「長得像 uuid 就拒絕」）
- [ ] 不拿「已遮罩 HTTP body」當完整 schema 通過條件

**測試策略**：Test-First（測試準備）
> 理由：schema 通過／失敗是明確 I/O。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-004
