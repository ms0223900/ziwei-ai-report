# US-023：OpenRouter 主備援測試

**作為** 開發者  
**我想要** 先有會失敗的 OpenRouter 呼叫測試  
**以便** 主模型請求或驗證失敗才切備援

**輸入格式**：
- 契約：`lib/generation/openrouter.ts`、`lib/generation/provider.ts`
- `POST https://openrouter.ai/api/v1/chat/completions`；`Authorization: Bearer $OPENROUTER_API_KEY`
- 主模型 = `OPENROUTER_PRIMARY_MODEL`；禁止依請求自動選模型
- 僅當主模型**請求**失敗（timeout／非 2xx）或**驗證**失敗：同模型再試 1 次，仍失敗才切 `OPENROUTER_FALLBACK_MODEL`
- 產出必須過 `report.complete.v1` 再拆 basic／advanced
- 用 stub `fetch`，不打真網路

**輸出格式**：
- `lib/generation/openrouter.test.ts` 與／或 `provider.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言：主成功不呼叫備援；主請求失敗 → 同模型重試 → 再備援
- [ ] 模型有回但非合法 JSON／缺欄 → 走驗證失敗重試，不是 502
- [ ] 傳輸失敗（timeout／非 2xx）才對應後續 502
- [ ] key 只從 server env 讀取

**測試策略**：Test-First（測試準備）
> 理由：重試／備援狀態機明確，適合 stub fetch 先紅後綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-010
