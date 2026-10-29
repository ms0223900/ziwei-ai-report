# US-005：Live prompt 時辰規則與版本

**作為** 訪客  
**我想要** 走 OpenRouter 生成時，模型被要求依我選的時辰撰寫  
**以便** 正式環境的報告也反映時辰

**輸入格式**：
- spec §2 Story A2
- `lib/prompts/zwds-v1.ts`、`lib/prompts/zwds-v1.test.ts`（`:15` 斷言 `zwds-v1`）

**輸出格式**：
- `ZWDS_SYSTEM_PROMPT` 硬性規則第 5 條改為時辰未知／已知兩句
- `PROMPT_VERSION = "zwds-v2"`；測試同步

**驗收條件**：
- [ ] 規則保留：時辰未知時 overall 開頭須帶「（未知時辰，準確度較低）」
- [ ] 規則新增：時辰已知時 overall 須以「（{birth_time}時）」開頭、至少一句依該時辰寫出與其他時辰不同的敘述、全文不得出現「未知時辰」
- [ ] `zwds-v1.test.ts` 斷言 prompt 同時含兩條規則，且 `PROMPT_VERSION === "zwds-v2"`
- [ ] 新寫入報告的 `reports.prompt_version` 為 `zwds-v2`（route 測試或 fake store 斷言）
- [ ] `userPrompt` 不變
- [ ] `npm run lint`、`npm run typecheck` 通過

**測試策略**：Test-After  
> 理由：prompt 文案調整，斷言只是字串包含與版本常數，先改文案再補斷言即可。

**優先級**：P0  
**相關功能**：Story A2 Live prompt  
**來源**：Story A2 / Scenario 1、2  
**依賴關係**：無
