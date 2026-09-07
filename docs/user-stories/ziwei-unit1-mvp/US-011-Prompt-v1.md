# US-011：Prompt v1

**作為** 系統  
**我想要** 合併基本＋進階規則的單一系統提示  
**以便** Live 一次產出完整 JSON 且進階不推翻基本

**輸入格式**：
- 來源優先：Notion Prompt 子筆記（若已放進 repo）
- 若 repo 無子筆記原文：依 AI spec Story 2a 合併規則撰寫，並在檔內註明 `source: spec-stand-in`；禁止另造與 schema 不符的欄位清單或命盤邏輯
- 必須同時要求 basic 的 `action`、`locked_fields` 與進階 `rationale`／`path_compare`／`action_plan`
- `focus` 中文枚舉；娛樂聲明；只輸出 JSON

**輸出格式**：
- `lib/prompts/zwds-v1.ts`：系統提示字串 + `PROMPT_VERSION`（提示正文進 git）
- 改 prompt 必須遞增版號（本任務給初版號）

**驗收條件**：
- [x] 單一系統提示，不是兩次互不參考的 prompt
- [x] 輸出清單含 `action` 與進階三欄
- [x] export `PROMPT_VERSION`
- [x] 本任務不呼叫 OpenRouter
- [x] 檔內可指出來源（子筆記路徑或 `spec-stand-in`）

#### 驗收說明

**整體結論**：PASS ✅

> 單一 `ZWDS_SYSTEM_PROMPT`；欄位對齊 complete schema；不呼叫 OpenRouter。Exploratory 另加輕量字串契約測試。

---

**AC-1：單一系統提示**

狀態：✅ 通過

- `lib/prompts/zwds-v1.ts` 只 export 一份 `ZWDS_SYSTEM_PROMPT`
- 規則第 6 點要求 advanced 三欄加深同一條 basic 敘事

---

**AC-2：輸出清單含 action 與進階三欄**

狀態：✅ 通過

- prompt 必要鍵含 `action`、`locked_fields`、`rationale`、`path_compare`、`action_plan`
- `path_compare` 寫成物件（`path_a`／`path_b`／`note`），對齊 US-010 schema

---

**AC-3：export PROMPT_VERSION**

狀態：✅ 通過

- `PROMPT_VERSION = "zwds-v1"`

---

**AC-4：不呼叫 OpenRouter**

狀態：✅ 通過

- 模組無 `fetch`／OpenRouter；只輸出字串與版本常數

---

**AC-5：來源可指出**

狀態：✅ 通過

- 檔頭註明 `source: spec-stand-in`

**測試策略**：Exploratory
> 理由：文案／prompt 仍可能依子筆記微調，不適先寫死斷言；schema 由 US-010 把關欄位。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-010
