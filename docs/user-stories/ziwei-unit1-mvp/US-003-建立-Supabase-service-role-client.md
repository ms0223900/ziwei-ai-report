# US-003：建立 Supabase service-role client

**作為** 系統  
**我想要** 只在 server 用 service role 連 Supabase  
**以便** Route Handler 能寫 `reports` 且 key 不進 client

**輸入格式**：
- env：`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`
- Next 16：`await cookies()`；本版不讀 session

**輸出格式**：
- `lib/supabase/env.ts`：讀取並檢查必要 env
- `lib/supabase/server.ts`：service-role client（server-only）
- 禁止 `NEXT_PUBLIC_*` 帶 service role key

**驗收條件**：
- [ ] server client 使用 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 缺少必要 env 時有明確錯誤，不靜默連上
- [ ] 檔案可被 Route Handler import；不可被 client component 當瀏覽器模組使用
- [ ] 無 anon 寫入 `reports` 的路徑

**測試策略**：Test-After
> 理由：主要是 env 接線與 server-only 邊界，需真實 env／建置檢查，不是純函式 I/O。

**優先級**：P0  
**相關功能**：Story 2b；Checkpoint A2  
**依賴關係**：無
