# US-025：maxDuration 與機密不外洩

**作為** 系統  
**我想要** Route 有足夠時長且 key 只在 server  
**以便** Live 備援可跑完、公開網址不洩密

**輸入格式**：
- `app/api/reports/route.ts`：`maxDuration` 建議 ≥ 60
- 掃：原始碼、`.env.example`、前端 bundle 字串
- 機密：`SUPABASE_SERVICE_ROLE_KEY`、`OPENROUTER_API_KEY`、ECPay HashKey/HashIV

**輸出格式**：
- Route `maxDuration` 設定
- 必要時 `vercel.json` functions duration
- 文件一句：備援 AC 允許本機／預覽驗證，不以 Hobby 10 秒為硬 SLA

**驗收條件**：
- [ ] Route Handler 設 `maxDuration`（≥ 60）
- [ ] 無 `NEXT_PUBLIC_*` 帶上述機密
- [ ] `.env.example` 僅留位、無真實值
- [ ] `grep` 前端產出找不到 `OPENROUTER_API_KEY`／service role 實值
- [ ] 不實作開發控制台切 Mock／Live

**測試策略**：Test-After
> 理由：建置設定與字串掃描，不適先寫行為測試。

**優先級**：P0  
**相關功能**：Story 2a 機密／備援；規格 §7 問題 2；Checkpoint A6／A7  
**依賴關係**：US-018、US-024
