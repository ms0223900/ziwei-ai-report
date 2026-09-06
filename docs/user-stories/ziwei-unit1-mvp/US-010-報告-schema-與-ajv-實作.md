# US-010：報告 schema 與 ajv 實作

**作為** 系統  
**我想要** 用 ajv v8 驗證遮罩前物件  
**以便** 驗證失敗不寫入成功報告

**輸入格式**：
- 依賴：`ajv` v8（新增套件，勿用 ESLint 間接的 ajv@6）
- 檔案：`lib/schemas/report.basic.v1.json`、`report.advanced.v1.json`、`report.complete.v1.json`、`loader.ts`
- `SCHEMA_VERSION` 常數與報告列一致

**輸出格式**：
- 編譯單例的 loader（server-only；`resolveJsonModule`）
- 驗證 API：輸入未知物件，輸出 `{ ok: true, data }` 或 `{ ok: false, errors }`

**驗收條件**：
- [ ] US-009 測試轉綠
- [ ] 三份 schema 檔存在且 draft-07
- [ ] ajv 只驗遮罩前物件，不驗 HTTP 200 body
- [ ] `package.json` 有 ajv v8

**測試策略**：Test-First
> 理由：對 US-009 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-009
