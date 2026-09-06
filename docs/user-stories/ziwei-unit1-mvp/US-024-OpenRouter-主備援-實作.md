# US-024：OpenRouter 主備援實作

**作為** 系統  
**我想要** `AI_PROVIDER=openrouter` 時一次生成完整 JSON  
**以便** Mock 與 Live 共用 schema，主失敗才切備援

**輸入格式**：
- US-011 prompt；US-010 complete schema
- 模型名只來自 env，不寫死
- Production 備援路徑不以 Hobby 10 秒為硬 SLA（本機／預覽驗即可）

**輸出格式**：
- `lib/generation/openrouter.ts`、`provider.ts`
- typed union `{ ok: true, ... } | { ok: false, kind: 'transport' | 'schema' | ... }`
- Route（US-018）接上 Live 分支：transport → 502；schema → 422

**驗收條件**：
- [ ] US-023 測試轉綠
- [ ] 通過 complete schema 後才 insert
- [ ] HTTP 200 仍只回 basic 子集
- [ ] 前端不得出現 OpenRouter URL 直連
- [ ] 無 `NEXT_PUBLIC_` 帶 `OPENROUTER_API_KEY`

**測試策略**：Test-First
> 理由：對 US-023 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a；Checkpoint A6  
**依賴關係**：US-023、US-011、US-018
