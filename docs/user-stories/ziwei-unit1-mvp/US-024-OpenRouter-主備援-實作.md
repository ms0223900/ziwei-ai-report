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
- [x] US-023 測試轉綠
- [x] 通過 complete schema 後才 insert
- [x] HTTP 200 仍只回 basic 子集
- [x] 前端不得出現 OpenRouter URL 直連
- [x] 無 `NEXT_PUBLIC_` 帶 `OPENROUTER_API_KEY`

#### 驗收說明

**整體結論**：PASS ✅

> `AI_PROVIDER=openrouter` 時走 Live：主模型失敗才同模型重試一次再備援；complete schema 通過後才 insert。Mock 路徑不變。未打真實 OpenRouter 網路。

---

**AC-1：US-023 測試轉綠**

狀態：✅ 通過

- `npx vitest run lib/generation/openrouter.test.ts lib/generation/provider.test.ts` 全綠
- `lib/generation/openrouter.ts` 的 `generateOpenRouterReport()`：成功只打主模型一次；非 2xx／timeout 為主兩次再 `OPENROUTER_FALLBACK_MODEL`

---

**AC-2：complete 通過後才 insert**

狀態：✅ 通過

- `app/api/reports/route.ts` Live 分支：`validateComplete` 失敗或 `kind: "schema"` 回 422，不呼叫 `insertReport`
- transport → 502 `GENERATION_FAILED`；`app/api/reports/route.test.ts` 覆蓋這兩條

---

**AC-3：HTTP 200 只回 basic 子集**

狀態：✅ 通過

- 成功仍走 `buildReportResponse()`；Live 測試斷言 body 無 `rationale`／`path_compare`／`action_plan`／`advanced_json`

---

**AC-4：前端不直連 OpenRouter**

狀態：✅ 通過

- `components/home/HomeClient.tsx` 只 `fetch("/api/reports")`；`components/` 無 `openrouter.ai`

---

**AC-5：無 NEXT_PUBLIC_ 帶 OpenRouter key**

狀態：✅ 通過

- `readApiKey()` 只讀 `process.env.OPENROUTER_API_KEY`；測試 stub 了 `NEXT_PUBLIC_OPENROUTER_API_KEY` 且 Authorization 不含該值

**測試策略**：Test-First
> 理由：對 US-023 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 2a；Checkpoint A6  
**依賴關係**：US-023、US-011、US-018
