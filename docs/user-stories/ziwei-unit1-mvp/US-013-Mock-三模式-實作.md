# US-013：Mock 三模式實作

**作為** 系統  
**我想要** 依 `MOCK_AI_MODE` 回 canned 或故意壞資料  
**以便** 不依賴 OpenRouter 也能驗 schema 門檻

**輸入格式**：
- env `MOCK_AI_MODE`（預設 `valid`）
- 示範輸入對應畫面 A 短文案（小圓／未知時辰／工作）

**輸出格式**：
- `lib/generation/mock.ts`
- 讀取 US-012 指定的 `lib/generation/fixtures/*.valid.json`（同一份，不另造第二套 canned）
- provider 可先只接 mock（Live 留給 US-024）

**驗收條件**：
- [x] US-012 測試轉綠
- [x] `valid` 的 basic／advanced 分別通過對應 schema
- [x] `invalid-json` 與 `schema-missing-field` 可供後續 Route 回 422
- [x] 不把進階長文案當畫面 A 的 `overall`
- [x] HTTP／畫面 A 使用 basic fixture，不從 advanced 剝欄位當短 overall

#### 驗收說明

**整體結論**：PASS ✅

> `generateMockReport` 讀同一套 canned；畫面 A 用短 basic，進階長 overall 不外流。

---

**AC-1：US-012 測試轉綠**

狀態：✅ 通過

- `npx vitest run lib/generation/mock.test.ts` 4 passed
- 全庫 `npx vitest run` 37 passed；`npm run typecheck`／`npm run lint` 通過

---

**AC-2：valid 的 basic／advanced 過 schema**

狀態：✅ 通過

- `lib/generation/mock.ts` 的 `generateMockReport("valid")` 回傳 fixture clone
- 測試以 `validateBasic`／`validateAdvanced` 斷言 `.ok === true`

---

**AC-3：兩種壞模式可供 422**

狀態：✅ 通過

- `invalid-json` 回不可 `JSON.parse` 的 `raw`
- `schema-missing-field` 拿掉 `overall`，`validateBasic` 失敗

---

**AC-4：不用進階長文案當 overall**

狀態：✅ 通過

- valid 的 `basic.overall` 不等於較長的 `advanced.overall`

---

**AC-5：畫面 A／HTTP 用 basic fixture**

狀態：✅ 通過

- valid 的 `basic` 等於 `lib/generation/fixtures/basic.valid.json`，未從 advanced 剝欄

**測試策略**：Test-First
> 理由：對 US-012 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-012
