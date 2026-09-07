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
- [x] US-009 測試轉綠
- [x] 三份 schema 檔存在且 draft-07
- [x] ajv 只驗遮罩前物件，不驗 HTTP 200 body
- [x] `package.json` 有 ajv v8

#### 驗收說明

**整體結論**：PASS ✅

> ajv v8 編譯三套 draft-07；遮罩後的 basic HTTP 形狀不能過 complete。

---

**AC-1：US-009 測試轉綠**

狀態：✅ 通過

- `npx vitest run lib/schemas/loader.test.ts` 8 passed
- `lib/schemas/loader.ts` 的 `validateBasic`／`validateAdvanced`／`validateComplete`

---

**AC-2：三份 schema 檔存在且 draft-07**

狀態：✅ 通過

- `report.basic.v1.json`／`report.advanced.v1.json`／`report.complete.v1.json` 皆標 `$schema` draft-07

---

**AC-3：ajv 只驗遮罩前物件**

狀態：✅ 通過

- complete 必要含 `action` 與進階三欄；US-009「masked HTTP body」案例必須失敗
- loader 不組 HTTP body

---

**AC-4：`package.json` 有 ajv v8**

狀態：✅ 通過

- 依賴 `ajv@8.20.0`；`SCHEMA_VERSION = 1`

**測試策略**：Test-First
> 理由：對 US-009 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-009
