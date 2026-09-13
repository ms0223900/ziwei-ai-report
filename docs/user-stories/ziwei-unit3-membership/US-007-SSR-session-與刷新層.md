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
- [x] cookie 寫入使用 `getAll`／`setAll`
- [x] 讀身分走 `getUser` 或 `getClaims`
- [x] client bundle 無 `SUPABASE_SERVICE_ROLE_KEY`
- [x] 未登入仍可開 `/` 與呼叫 `POST /api/reports`

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/supabase/session-guards.test.ts lib/supabase/public-env.test.ts lib/security/secrets-not-leaked.test.ts` 通過。`npm run typecheck` 通過。

---

**AC-1：cookie 使用 getAll／setAll**

狀態：✅ 通過

- `lib/supabase/session.ts` 與 `lib/supabase/update-session.ts` 的 cookie adapter 皆為 `getAll` + `setAll`
- `proxy.ts` 呼叫 `updateSession`，不改寫 `/` 為必登入

**AC-2：讀身分走 getUser**

狀態：✅ 通過

- `getSessionUser()` 與 proxy 刷新皆呼叫 `auth.getUser()`，未用 `getSession()` 當唯一依據

**AC-3：client bundle 無 service role**

狀態：✅ 通過

- `lib/supabase/client.ts` 只讀 public env；`secrets-not-leaked` 守門仍含 `SUPABASE_SERVICE_ROLE_KEY`

**AC-4：未登入仍可開／與 POST**

狀態：✅ 通過

- proxy 不 `redirect`；缺 public env 時直接 `NextResponse.next()`
- `HomeClient` 訪客 `POST /api/reports` 流程未改，既有測試仍綠

**測試策略**：Test-After
> 理由：接線與 cookie adapter 屬整合，視覺／重整手動驗比預寫失敗測試有效。

**優先級**：P0  
**相關功能**：Story 2b；spec 第 7 節問題 2／4  
**依賴關係**：無
