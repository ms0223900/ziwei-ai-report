# US-012：Mock 三模式測試

**作為** 開發者  
**我想要** 先有會失敗的 Mock 三模式測試  
**以便** 課程零 key 也能示範成功與驗證失敗

**輸入格式**：
- 函式契約（尚未實作）：`lib/generation/mock.ts`
- `MOCK_AI_MODE`：`valid`／`invalid-json`／`schema-missing-field`
- `valid`：兩份 canned；basic 過 `report.basic.v1`，advanced 過 `report.advanced.v1`；HTTP 用短 overall，不從進階件剝欄
- `invalid-json`：非 JSON
- `schema-missing-field`：basic canned 拿掉 `overall`

**輸出格式**：
- `lib/generation/mock.test.ts`
- 必須提交 repo 內 fixture（測試與實作共用，禁止只放暫時 `__fixtures__`）：
  - `lib/generation/fixtures/basic.valid.json`
  - `lib/generation/fixtures/advanced.valid.json`

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 三模式各有至少一則斷言
- [x] `valid` 斷言 basic canned **不含** 進階三欄為必要展示欄
- [x] `schema-missing-field` 拿掉的是 `overall`
- [x] basic fixture 的 `overall`／`work`／`relationship`／`action`／`disclaimer` 對齊 AI spec 成功 Response（Mock **正文**）；畫面小標「原局總覽／局象」屬 US-020 UI，不要寫進 JSON
- [x] advanced fixture 含 spec 表進階欄（`rationale`、`path_compare`、長度 7 的 `action_plan`），且不推翻 basic 結論；若無子筆記原文，檔內註明 `source: spec-stand-in`，禁止另造命盤故事

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/generation/mock.test.ts` 因 `Cannot find module './mock'` 失敗（功能尚未實作）。待 US-013 轉綠。

---

**AC-1：因功能尚未實作而預期紅燈**

狀態：✅ 通過

- 失敗訊息：`Cannot find module './mock' imported from /workspace/lib/generation/mock.test.ts`

---

**AC-2：三模式各有至少一則斷言**

狀態：✅ 通過

- `lib/generation/mock.test.ts` 分別覆蓋 `valid`／`invalid-json`／`schema-missing-field`

---

**AC-3：valid 的 basic 不含進階三欄**

狀態：✅ 通過

- 斷言 `rationale`／`path_compare`／`action_plan` 不在 `result.basic`

---

**AC-4：schema-missing-field 拿掉 overall**

狀態：✅ 通過

- `expect(result.basic).not.toHaveProperty("overall")`

---

**AC-5：basic fixture 正文對齊 spec 200 Response**

狀態：✅ 通過

- `lib/generation/fixtures/basic.valid.json` 的 overall／work／relationship／action／disclaimer 與 AI spec 成功 Response 逐字相同
- 測試拒絕 JSON 含「原局總覽／局象」

---

**AC-6：advanced fixture 進階欄且 spec-stand-in**

狀態：✅ 通過

- `lib/generation/fixtures/advanced.valid.json` 含 `source: spec-stand-in`、`path_compare` 物件、`action_plan` 長度 7，並加深同一條「小交付」敘事

**測試策略**：Test-First（測試準備）
> 理由：三模式輸出形狀明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-010
