# US-018：POST /api/reports 實作

**作為** 系統  
**我想要** 唯一 API 跑完整生成流程  
**以便** 前端只打自己的後端、從不直連 OpenRouter

**輸入格式**：
- `app/api/reports/route.ts`：`force-dynamic`；非 `runtime='edge'`
- 順序：驗證 → 高風險掃描 → 生成 → ajv（遮罩前）→ insert → 遮罩
- `AI_PROVIDER=mock` 為本任務主路徑（Live 接 US-024）

**輸出格式**：
- Route Handler 回 JSON；成功走 US-015
- 高風險：200 + `{ error_code, category, message, disclaimer }`，不 insert
- 本任務可設 `maxDuration`（US-025 再對齊 Hobby 說明）

**驗收條件**：
- [ ] US-017 測試轉綠
- [ ] `MOCK_AI_MODE=valid` 示範輸入 POST 後，已套用的 `reports` 表有新列：`generation_status=success`，同時有 `basic_json` 與 `advanced_json`（缺表／缺 key 則本任務未完成）
- [ ] 省略 `focus` 的合法請求成功時，寫入列與 HTTP body 的 `focus` 皆為 `整體`
- [ ] `MOCK_AI_MODE=invalid-json` 時 DB 無新成功列
- [ ] 輸入錯誤 400；schema 失敗 422；寫入失敗 503
- [ ] 同一次 POST 遮罩不再打模型
- [ ] 前端 bundle 路徑不出現 OpenRouter key

**測試策略**：Test-First
> 理由：對 US-017 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a／2b；Checkpoint A4  
**依賴關係**：US-017
