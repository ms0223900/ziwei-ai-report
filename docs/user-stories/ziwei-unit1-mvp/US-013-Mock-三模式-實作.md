# US-013：Mock 三模式實作

**作為** 系統  
**我想要** 依 `MOCK_AI_MODE` 回 canned 或故意壞資料  
**以便** 不依賴 OpenRouter 也能驗 schema 門檻

**輸入格式**：
- env `MOCK_AI_MODE`（預設 `valid`）
- 示範輸入對應畫面 A 短文案（小圓／未知時辰／工作）

**輸出格式**：
- `lib/generation/mock.ts`
- canned JSON（basic／advanced 兩份）
- provider 可先只接 mock（Live 留給 US-024）

**驗收條件**：
- [ ] US-012 測試轉綠
- [ ] `valid` 的 basic／advanced 分別通過對應 schema
- [ ] `invalid-json` 與 `schema-missing-field` 可供後續 Route 回 422
- [ ] 不把進階長文案當畫面 A 的 `overall`

**測試策略**：Test-First
> 理由：對 US-012 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-012
