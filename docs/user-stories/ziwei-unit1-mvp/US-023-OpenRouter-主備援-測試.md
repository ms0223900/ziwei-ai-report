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
- [x] 聚焦測試因功能尚未實作而預期紅燈
- [x] 斷言：主成功不呼叫備援；主請求失敗 → 同模型重試 → 再備援
- [x] 模型有回但非合法 JSON／缺欄 → 走驗證失敗重試，不是 502
- [x] 傳輸失敗（timeout／非 2xx）才對應後續 502
- [x] key 只從 server env 讀取

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run lib/generation/openrouter.test.ts lib/generation/provider.test.ts` 因 `Cannot find module './openrouter'`／`./provider` 失敗（功能尚未實作）。待 US-024 轉綠。

---

**AC-1：因功能尚未實作而預期紅燈**

狀態：✅ 通過

- 失敗訊息：`Cannot find module './openrouter' imported from /workspace/lib/generation/openrouter.test.ts`
- 失敗訊息：`Cannot find module './provider' imported from /workspace/lib/generation/provider.test.ts`

---

**AC-2：主成功不呼叫備援；失敗則同模型重試再備援**

狀態：✅ 通過

- `lib/generation/openrouter.test.ts` 斷言成功只打一次 `OPENROUTER_PRIMARY_MODEL`；非 2xx／timeout 為主模型兩次再 `OPENROUTER_FALLBACK_MODEL`

---

**AC-3：非合法 JSON／缺欄走驗證重試，不是 502**

狀態：✅ 通過

- invalid JSON 與缺 `overall` 都 `ok: true` 於重試成功，或最終 `{ ok: false, kind: "schema" }`，不是 `kind: "transport"`

---

**AC-4：傳輸失敗才對應後續 502**

狀態：✅ 通過

- 三次非 2xx → `{ ok: false, kind: "transport" }`（Route 轉 502 由 US-024）

---

**AC-5：key 只從 server env 讀取**

狀態：✅ 通過

- `Authorization` 為 `Bearer` + `OPENROUTER_API_KEY`；明確不是 `NEXT_PUBLIC_OPENROUTER_API_KEY`

**測試策略**：Test-First（測試準備）
> 理由：重試／備援狀態機明確，適合 stub fetch 先紅後綠。

**優先級**：P0  
**相關功能**：Story 2a  
**依賴關係**：US-010
