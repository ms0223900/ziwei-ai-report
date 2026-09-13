# US-007：SSR session 與刷新層

**作為** 系統  
**我想要** 用 `@supabase/ssr` cookie 保存與刷新登入態  
**以便** 重整後仍認得同一使用者

**輸入格式**：
- `@supabase/ssr` 已在 `package.json`
- cookie adapter **必須** `getAll` + `setAll`
- 授權用 `getUser()`／`getClaims()`，不用 `getSession()` 當唯一依據
- 瀏覽器只拿 anon key；`createServiceRoleClient` 不得進 client
- `lib/supabase/env.ts` 是 `server-only`，browser 不可 import
- `/` 不得做成未登入就擋下；matcher 預留排除未來 webhook

**輸出格式**：
- `lib/supabase/client.ts`（browser）
- server session client（可擴 `lib/supabase/server.ts` 或新檔，與 service role 分開）
- 根 `middleware.ts` 或 Next 16 `proxy.ts`（擇一，能刷新即可）

**驗收條件**：
- [ ] cookie 寫入使用 `getAll`／`setAll`
- [ ] 讀身分走 `getUser` 或 `getClaims`
- [ ] client bundle 無 `SUPABASE_SERVICE_ROLE_KEY`
- [ ] 未登入仍可開 `/` 與呼叫 `POST /api/reports`

**測試策略**：Test-After
> 理由：接線與 cookie adapter 屬整合，視覺／重整手動驗比預寫失敗測試有效。

**優先級**：P0  
**相關功能**：Story 2b；spec 第 7 節問題 2／4  
**依賴關係**：無
