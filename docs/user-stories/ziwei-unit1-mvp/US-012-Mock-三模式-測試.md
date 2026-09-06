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
- canned fixture 檔（可先寫在測試 `__fixtures__`，實作再共用）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 三模式各有至少一則斷言
- [ ] `valid` 斷言 basic canned **不含** 進階三欄為必要展示欄
- [ ] `schema-missing-field` 拿掉的是 `overall`

**測試策略**：Test-First（測試準備）
> 理由：三模式輸出形狀明確，適合先紅後綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-010
