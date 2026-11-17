# 2-3 現場示範：前端改不了權益欄位（`/dev-tamper`）

> 僅限 `cp-02-dev-tamper` 分支，**不要合進 main**。此頁是錄課／示範用的暫時頁面。
> 基底：`cp-02-done`（`bb957ac`）。頁面：`app/dev-tamper/page.tsx`。

## 示範目的

主題句：**安全要由後端審核把關。** 前端用登入者自己的 session 直接改 `profiles.access_status`，資料庫會拒絕。

## 預期結果

| 按鈕 | 預期畫面 | 擋下來的是誰 |
| --- | --- | --- |
| 從瀏覽器把自己改成 unlocked | `status: 403`、`code: "42501"`、`message: "permission denied for table profiles"`、`rows: null` | 欄位 GRANT：`authenticated` 只有 `display_name` 的 UPDATE 權限（migration L42–44），PostgreSQL 在改任何一列前就檢查欄位權限，所以是報錯，不是改到 0 列 |
| （選用）改別人的顯示名稱 | `status: 200`、`code: null`、`rows: []` | RLS：`profiles_update_own`（`auth.uid() = user_id`）把別人的列過濾掉，不報錯、改到 0 列 |

第二道防線 `profiles_guard_entitlements`（L61–84）：只有欄位權限被放寬時才會走到，會報 `profiles entitlement columns are read-only`（`P0001`）。示範畫面若出現這句而非 `42501`，代表資料庫權限和 migration 不一致。

## R4：用 A 的 session 讀 B（唯讀 SELECT，對應 2-3 分鏡 S6-2）

migration 有 `grant select on profiles to authenticated` 與 policy `profiles_select_own`（`auth.uid() = user_id`）。所以讀別人的列**不報錯**，RLS 只是把它過濾掉。

| 按鈕 | 預期畫面 |
| --- | --- |
| 讀取自己的 profile（對照） | `status: 200`、`count: 1`、`rows` 內是 A 自己、`access_status: "locked"` |
| 讀取別人的 profile（RLS） | `status: 200`、`code: null`、`count: 0`、`rows: []` |

錄製流程：

1. 一般視窗以 A 登入，開 `/dev-tamper`。頁首（`AppHeader`）顯示的就是 A，用來證明「發出查詢的是 A，不是殘留的其他登入狀態」。
2. **畫面外**在 SQL Editor 查 B 的 `user_id`，貼進輸入框。輸入框會顯示 ID，用 OpenScreen 的 Blur 蓋住。
3. 先按「讀取自己」，看到 1 列。
4. 再按「讀取別人」，看到 `count: 0`、`rows: []`、沒有錯誤。旁白重點：看的是資料結果，不是有沒有報錯；沒有報錯不代表規則沒生效。
5. （建議）回 SQL Editor 跑下面的查詢，證明 B 那列確實存在，且這是管理者視角，與瀏覽器的 A session 不同：

```sql
select user_id, display_name, access_status
from public.profiles
where user_id = '<B 的 user_id>';
```

**彩排必做：** `rows: []` 也可能只是 B 的 ID 貼錯或 B 根本不存在。錄之前先用上面的查詢確認 B 那列存在，否則這個對照沒有意義。

## 步驟

1. 切分支並啟動：

```bash
git fetch origin
git switch cp-02-dev-tamper
npm install
npm run dev
```

2. `.env.local` 指向 `ziwei-demo`（`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`），Auth 的 Confirm email 已關，`NEXT_PUBLIC_COMMERCIAL_PREVIEW=0`。**鏡頭前不要打開 `.env.local`。**
3. migration 至少套到 `20260905000000_create_reports.sql`、`20260913000000_create_profiles.sql`，且要是 `bb957ac` 版（含 `service_role` 最小權限 grant）。
4. 用帳號 A 登入（帳號要在 profiles migration 套用**之後**註冊），開 `http://localhost:3000/dev-tamper`。
5. 先做下面的彩排檢查，通過再錄。

## 彩排檢查（每次錄之前）

- [ ] 在 `ziwei-demo` 的 SQL Editor 跑唯讀查詢，預期：`col_update` 只有 `display_name`；policy 有 `profiles_select_own`、`profiles_update_own`；trigger 有 `profiles_guard_entitlements`、`profiles_set_updated_at`；`rls` 為 `true`。

```sql
select 'col_update' as k, column_name::text as v
from information_schema.column_privileges
where table_schema = 'public' and table_name = 'profiles'
  and grantee = 'authenticated' and privilege_type = 'UPDATE'
union all
select 'policy', (policyname || ':' || cmd)::text
from pg_policies where schemaname = 'public' and tablename = 'profiles'
union all
select 'trigger', tgname::text
from pg_trigger where tgrelid = 'public.profiles'::regclass and not tgisinternal
union all
select 'rls', relrowsecurity::text
from pg_class where oid = 'public.profiles'::regclass;
```

- [ ] 乾跑：按主按鈕，畫面為 `403` / `42501` / `permission denied for table profiles` / `rows: null`。
- [ ] 確認沒改到：

```sql
select display_name, access_status
from public.profiles
where user_id = '<帳號 A 的 user_id>';
```

`access_status` 仍是 `locked`。

- [ ] 頁首仍顯示帳號 A 的名稱。

> 驗證狀態：預期結果依 migration 與 PostgreSQL／PostgREST 行為推論，**尚未在實際 `ziwei-demo` 跑過**。第一次彩排結果請記回 Notion 手冊 8-2。

## 如果改成功了（資安漏洞）

判斷：畫面 `status: 200` 且 `rows` 內 `access_status` 為 `unlocked`，或重整後頁首變已開通。

1. 停止錄影，該 take 作廢。
2. 把帳號改回來。`profiles_guard_entitlements` 看的是 JWT 角色，所以要在同一個 transaction 先宣告 service role（未實測）：

```sql
begin;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
update public.profiles set access_status = 'locked' where user_id = '<帳號 A 的 user_id>';
commit;
```

3. 用上面的彩排查詢找原因：`col_update` 是否多了 `access_status`（有人 `grant update` 整張表），或 `profiles_guard_entitlements` trigger 不見了。
4. 依 migration L39–44（GRANT）與 L61–84（guard）修回，重跑全部彩排項目，通過才繼續。
5. 2-4／2-5 的開通流程要一併檢查。

## 常見狀況

| 現象 | 原因 |
| --- | --- |
| 畫面顯示「沒有登入：請先登入再試」 | 沒登入就按；不是示範要的結果 |
| 出現 `profiles entitlement columns are read-only` | 欄位權限被放寬，與 migration 不一致 |
| 出現 `200` 且有 `unlocked` | 資安漏洞，照上節處理 |

## 錄完清理

- [ ] 在 SQL Editor 確認帳號 A、B 都仍是 `locked`。
- [ ] 這個分支不要合進 main；要回到乾淨的課程分支，`git switch cp-02-done`。
