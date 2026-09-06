# US-011：Prompt v1

**作為** 系統  
**我想要** 合併基本＋進階規則的單一系統提示  
**以便** Live 一次產出完整 JSON 且進階不推翻基本

**輸入格式**：
- AI spec Story 2a：子筆記基本／進階 Prompt 合併；只輸出 JSON
- 必須同時要求 basic 的 `action`、`locked_fields` 與進階 `rationale`／`path_compare`／`action_plan`
- `focus` 中文枚舉；娛樂聲明

**輸出格式**：
- `lib/prompts/zwds-v1.ts`：系統提示字串 + `PROMPT_VERSION`
- 改 prompt 必須遞增版號（本任務給初版號）

**驗收條件**：
- [ ] 單一系統提示，不是兩次互不參考的 prompt
- [ ] 輸出清單含 `action` 與進階三欄
- [ ] export `PROMPT_VERSION`
- [ ] 本任務不呼叫 OpenRouter

**測試策略**：Exploratory
> 理由：文案／prompt 仍可能依子筆記微調，不適先寫死斷言；schema 由 US-010 把關欄位。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-010
