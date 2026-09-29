# 單元 3 — 會員、資料與使用權限最小閉環（AI 開發規格）

> 來源 Ticket：[🧽 【Spec】會員、資料與使用權限最小閉環](https://app.notion.com/p/0f8b6b7b8f6d472a8e7bda84fa589191)（Notion，2026-09-13 擷取；無頁面留言）  
> 課程大綱原文稱「單元 2｜會員」；**本 repo 已占用單元 2 = 解鎖預留入口**，本檔依使用者指定與既有檔名慣例編號為 **單元 3**。  
> 前兩版規格：[`2026-09-05-ziwei-unit1-mvp.md`](2026-09-05-ziwei-unit1-mvp.md)（生成／遮罩／`reports`）、[`2026-09-11-ziwei-unit2-commercial-entry.md`](2026-09-11-ziwei-unit2-commercial-entry.md)（具名槽位／即將開放／預覽假文）  
> 濃縮對照：[`docs/spec.md`](../spec.md) §4（仍寫「單元 2 會員」，內容對齊本單）。  
> 本檔為開發類規格（第 0～6 節 + 獨立審查後第 7 節）。第 2～5 節已依第 7 節收斂（ensure 只補列、欄位 REVOKE、ssr cookie adapter、先登入再生成、GET 合併 basic、登出清真文）。

---

## 0. Context

- **Problem**: 單元 1／2 已能讓訪客生成基本摘要並看到鎖定槽位，但產品不認得登入者，也沒有受 RLS 保護的會員列。後續單次解鎖／點數／訂閱沒有可信的更新對象；若用前端改狀態或用 unit2 預覽假文當成開通，課堂會誤判金流與權限已通。
- **Goal**: 以 Supabase Auth 辨識「你是誰」、以 `profiles` 保存最小會員資料、以 `access_status` 回答「能不能用」。同一份報告功能依訪客／已登入未開通／已開通三態顯示正確內容；權益欄位只能由受控後端改寫。不重做單元 1 生成邏輯，不串金流、不扣點、不啟用追問。
- **Impacted Areas**:
  - 新建：`supabase/migrations/`（`profiles` + Auth trigger + 欄位 GRANT／RLS；檔名自訂、勿沿用 architecture 佔位名 `002_membership.sql` 若會與既有時間戳衝突）、`lib/supabase/client.ts`、`lib/supabase/session.ts`（cookie session）、`app/(auth)/login`、`app/(auth)/register`、根 `middleware.ts`、`app/api/reports/[persistId]/route.ts`、`app/api/dev/grant-access/route.ts`、頁首 session／登入入口元件
  - 改動：`lib/supabase/server.ts`（本版起讀 session）、`app/api/reports/route.ts`（POST 200 **附加** `persist_id`，遮罩規則不變）、`lib/masking/buildReportResponse.ts`（附加 `persist_id`）、`components/report/overlay.ts`／`ReportCard.tsx`／`AdvancedLockedPanel.tsx`／`HomeClient.tsx`／`app/layout.tsx`（三態與登入區）、`.env.example`
  - 沿用不改生成：`lib/generation/*`、`lib/schemas/*`、`lib/policy/high-risk.ts`、`lib/validation/birth.ts`；`COMMERCIAL_PREVIEW` 預覽條與假文規則仍受 unit2 約束
  - 明確不做：`orders`／`credits`／`subscriptions`／`follow_ups` 表、ECPay、Webhook、追問 API、密碼重設、社群登入、完整會員中心、`reports.user_id` 綁定
- **Stakeholders**: 訪客；已註冊未開通會員；已開通會員；課程學員／講師（受控模擬開通）；後續單元 4～6 的受控更新接點

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 訪客看到免費體驗與登入入口**  
  As a 訪客, I want 不登入也能跑完基本摘要，並在頁首看到註冊／登入入口, So that 我能先體驗免費切線，再決定建立帳號。

- **Story 2a — Email 註冊**  
  As a 求測者, I want 用 Email 與密碼註冊, So that 產品能建立可辨識的身分（不是會員中心）。

- **Story 2b — 登入、登出與重整後仍認得我**  
  As a 會員, I want 登入、登出，且重新整理後仍保持登入狀態, So that Auth 穩定回答「你是誰」。

- **Story 3 — 建立或讀取自身 profiles**  
  As a 剛取得有效 session 的會員, I want 系統建立或讀取我自己的一列 `profiles`（預設未開通）, So that 後續權限有寫入對象。

- **Story 4 — 改顯示名稱、改不了權益**  
  As a 會員, I want 更新自己的 `display_name` 並在頁首看到新名稱, So that 可編輯欄位與權益欄位分開；前端無法自行開通、加點或改訂閱。

- **Story 5 — 雙帳號隔離**  
  As a 會員 A, I want 只能讀寫自己的 `profiles`, So that 會員 B 的列對我不可見也不可改。

- **Story 6 — 同一報告功能的三態畫面**  
  As a 求測者, I want 訪客／已登入未開通／已開通在同一份報告功能上看到不同內容與下一步, So that 「能不能用」寫在畫面上，且已開通也不附贈追問。

- **Story 7 — 受控模擬開通後權限仍在**  
  As a 講師／學員, I want 用受控後端（非正式 UI）把某帳號 `access_status` 改為已開通，且重新整理與重新登入後仍為已開通, So that 能驗收權限切換而不假裝付款成功。

---

## 2. 功能細節 (Functional Specs)

### For Story 1 — 訪客免費體驗 + 登入入口

- 無 session 時，單元 1 表單 → `POST /api/reports` → 畫面 A 流程不變：基本摘要可見，進階三槽鎖定。
- 頁首新增 `data-report-slot="slot-auth-entry"`：連結或按鈕「登入」「註冊」，分別到 `/login`、`/register`。訪客在表單頁與報告頁都要看得到入口。
- 高風險畫面（unit1 07）與生成失敗畫面（unit1 06）也要看得到登入入口，但**不得**因此顯示解鎖 CTA 或命盤結論。
- 訪客點 unit2 主 CTA／追問／訂閱：行為仍為「解鎖即將開放，本版不收費」；**不**因本單改成假登入成功或假開通。
- 本版**不**改成「必須先登入才能生成」。這點覆寫 `docs/architecture.md` 陷阱 5「會員單元起先登入再生成」與 `docs/spec.md` §3.6 同句；本單 Ticket 要求訪客仍可完成免費摘要。

### For Story 2a — Email 註冊

- 頁面：`/register`。欄位：Email、密碼。不蒐集性別／出生地。
- 使用 Supabase Auth Email（`signUp`）；不另建帳號表當驗證來源。
- 教學環境必須關閉「Confirm email」（Supabase Auth 設定）。未關閉則註冊後無 session，Story 2b／3 的重整 AC 無法過。本檔把此項當課堂前置，不在產品 UI 做驗證信流程。
- 成功：寫入 Auth user → trigger／ensure 建立 `profiles`（見 Story 3）→ 導向 `/` 且頁首為已登入。
- 失敗（皆繁中、留在 `/register`、不建立已開通權益）：

| 條件 | 提示 |
|---|---|
| Email 空白或非信箱格式 | 「請輸入有效的電子信箱。」 |
| 密碼空白或短於專案 Auth 下限（未定時沿用 Supabase 預設 6） | 「請輸入符合長度的密碼。」 |
| Email 已被註冊 | 「此信箱已註冊，請改登入。」 |

### For Story 2b — 登入／登出／重整

- 頁面：`/login`。`signInWithPassword`。成功導向 `/`。
- 錯誤密碼或找不到帳號：同一句「帳號或密碼不正確。」**禁止**回傳「此信箱不存在」或列出其他帳號。
- 登出：頁首 `data-report-slot="slot-auth-session"` 內「登出」呼叫 `signOut`，清 cookie session，頁首回到 `slot-auth-entry`，報告區若仍開著則進階三槽回到佔位（丟掉 GET 真文），整體視為訪客。
- Session 以 `@supabase/ssr` cookie 保存（`package.json` 已有 `@supabase/ssr`）。用 `createBrowserClient`／`createServerClient`；server／middleware（或 Next 16 `proxy.ts`）的 cookie adapter **必須** `getAll` + `setAll`。授權用 `getUser()`／`getClaims()`，**不要**用 `getSession()` 當唯一依據（見第 7 節問題 4）。matcher **排除**未來 webhook 路徑（本版尚無 webhook，先寫排除註解即可）。禁止做成「未登入就不能進 `/`」（見第 7 節問題 2）。
- 重新整理 `/`：仍能讀到同一使用者；頁首顯示該列 `display_name`。
- Next 16：`await cookies()`。`createServiceRoleClient` 繼續只走 service role；瀏覽器只使用 anon key + user session。

### For Story 3 — profiles 建立／讀取

- 首次有效 session 必須有自身一列。預設：
  - `access_status = locked`
  - `points_balance = 0`
  - `subscription_status = none`
  - `display_name` = Email `@` 前綴（可之後改）
- **建立路徑（兩層，缺一不可）**：
  1. `auth.users` INSERT trigger（`SECURITY DEFINER`）寫入預設列。
  2. 若 trigger 未觸發（既有 user），server `ensureProfile()` 只做 **insert-if-missing**（`INSERT … ON CONFLICT (user_id) DO NOTHING`）。**禁止**對已存在列 `UPSERT` 覆寫 `access_status`／`points_balance`／`subscription_status`／已改過的 `display_name`（見第 7 節問題 1）。新建列時忽略客戶端傳來的權益值，一律用上表預設。
- 使用者／Client SDK **不得** `INSERT` 任意 `access_status`。
- 讀取：已登入頁首與報告三態只讀**自己的**列；不得為了畫面去讀他人列。

### For Story 4 — 欄位分離

- 頁首已登入區提供顯示名稱編輯（單列輸入 + 儲存即可）。**不是**會員中心頁。
- 成功更新後，頁首立刻顯示新名稱；**不**覆寫報告 JSON 的 `nickname`（生辰表單暱稱與會員顯示名稱分開）。
- 更新走 **Client SDK**（anon + session）`update({ display_name })`，以便 Story 4／5 能用同一條路徑驗「權益欄寫入失敗」。
- Client SDK 對自身列執行下列寫入必須失敗（DB 拒絕，畫面維持原權益）：

| 嘗試 | 結果 |
|---|---|
| `access_status` → `unlocked` 或其他值 | 失敗；列值不變 |
| `points_balance` → 任意正整數 | 失敗；仍為 `0` |
| `subscription_status` → `active` 或其他 | 失敗；仍為 `none` |

- `display_name`：trim 後長度 ≥ 1；空白失敗並提示「請輸入顯示名稱。」最長長度 Ticket 未給 → 見第 6 節。

### For Story 5 — 隔離

- 帳號 A 的 session 對 `profiles`：`SELECT`／`UPDATE` 僅 `user_id = auth.uid()`。
- 帳號 A 用 Client SDK `select`／`update` 帳號 B 的 `user_id`：0 列或 RLS 錯誤；B 的 `display_name`／`access_status` 不變。
- `anon`（無 session）對 `profiles` 任何讀寫失敗。
- 本版隔離範圍是 **`profiles`**。`reports` 維持單元 1：RLS enabled、零 policy，只靠 service role 寫入；**不**加 `user_id`、不加 owner policy（Ticket Could Have／假設：不強制綁定）。

### For Story 6 — 三態（同一報告功能）

以「剛用示範輸入跑完、報告仍在同頁 state」為同一功能。`COMMERCIAL_PREVIEW` 必須為 `0`（正式驗收）。會員態覆蓋預覽態。

| 狀態 | 判斷 | 報告可見 | 下一步 |
|---|---|---|---|
| 訪客 | 無 session | 基本摘要；`slot-lock-*` 封條＋佔位；無進階真文 | `slot-auth-entry`；主 CTA 仍是 unit2「即將開放」 |
| 已登入未開通 | 有 session 且 `access_status=locked` | 同免費摘要；進階鎖定 | 沿用 `slot-unlock-cta`（**不要**另造 `slot-upgrade` selector），文案改「升級／開通」；點擊只顯示「開通由講師受控流程處理，本版不收費」；不呼叫金流、不改 `access_status` |
| 已開通 | 有 session 且 `access_status=unlocked` | 標題「{暱稱}的進階報告」；`slot-delivery` 填入**該份 report 的** `rationale`／`path_compare`／`action_plan` 真文 | 主 CTA 隱藏或改「已開通」；`slot-followup` 仍鎖定；不附贈點數、不啟用追問 API |

- 已開通進階真文**禁止**使用 unit2 `EXAMPLE_BLOCKS` 預覽假文。來源必須是 DB 該列：`rationale`／`path_compare`／`action_plan` 取 `advanced_json`；`action`／`overall`／`work`／`relationship` 取 `basic_json`（Mock 的 `advanced_json` 沒有 `action`，見第 7 節問題 6）。
- 取得真文的唯一新通道：`GET /api/reports/[persistId]`（見下）。訪客與未開通呼叫此 API 不得拿到進階三欄。這條 GET 是本單核准的 **unlocked 變體**，**只**放寬「已開通 + 有效 session」這一個端點；`POST /api/reports` 與 `buildReportResponse` 的禁止清單不變。`AGENTS.md`／`.cursor/rules/nextjs.mdc` 的「對外永不帶進階三欄」以本檔此段為準做範圍限縮（見第 7 節問題 2）。
- `POST /api/reports` **維持單元 1 遮罩**：任何人（含已開通）的 POST 200 仍只回 basic 淺層 + meta + `disclaimer` + 本單附加的 `persist_id`。**永不**在 POST body 帶 `advanced_json`／`rationale`／`path_compare`／`action_plan`。已開通者在 POST 成功後，用回傳的 `persist_id` 再 GET。
- **三態主驗收路徑＝先處於該身分，再生成**。`/login`、`/register` 會卸載 `HomeClient`，訪客當下的 `persist_id` 會消失（單元 1 刻意不寫 storage）。禁止把「訪客先生成 → 離頁註冊 → 回來看同一列」當 Happy Path（見第 7 節問題 3）。
- 登出時若報告頁仍開著：必須丟掉 GET 進階 payload，三槽回到佔位，頁首回到 `slot-auth-entry`。禁止只改 header、螢幕上仍留真文。
- `COMMERCIAL_PREVIEW=1` 時：`access_status=unlocked` **必須覆蓋**預覽態——仍可顯示預覽條，但不得把已開通鎖回 A，也不得用 `EXAMPLE_BLOCKS` 取代 GET 真文。`.env.production` 目前為 `1`（見第 7 節問題 5）。正式本單驗收仍建議 `=0`，避免與 unit2 預覽 AC 混用。
- `persist_id` = `reports.id`（uuid）。Mock 的 JSON `report_id` 仍可為 `rpt_demo_001`；**禁止**用 `rpt_demo_001` 當 GET 主鍵（多列同值）。`persistMaskedReport` 必須使用 `insertReport` 回傳的 `id`（現況回傳值被丟棄，見 `app/api/reports/route.ts`）。
- unit2 `COMMERCIAL_PREVIEW=1` 的 A／B／C／D 仍只切假文，**不算**本單已開通驗收。

**`POST /api/reports` 200 附加欄（其餘欄位同 unit1）**

```json
{
  "persist_id": "00000000-0000-4000-8000-000000000001",
  "report_id": "rpt_demo_001",
  "tier": "basic",
  "status": "basic"
}
```

**`GET /api/reports/[persistId]`**

- 認證：cookie session。無 session → 401 `{ "error_code": "UNAUTHENTICATED", "message": "請先登入。" }`
- 授權：讀自身 `profiles`；`access_status !== unlocked` → 403 `{ "error_code": "FORBIDDEN", "message": "尚未開通，無法讀取進階報告。" }`，body **不含**進階三欄
- `persistId` 必須是 uuid；`rpt_demo_001` 或非 uuid → **404**（不要讓 Postgres `22P02` 變 500）。
- 查詢：service role 依 `reports.id = persistId` 讀列。找不到或 `generation_status !== success` 或 `advanced_json` 為空 → 404 `{ "error_code": "NOT_FOUND", "message": "找不到這份報告。" }`
- 200 組裝：`basic_json` ∪ 進階三欄（見上）。不要只攤 `advanced_json`。
- 200（已開通）最低欄位：

```json
{
  "persist_id": "<uuid>",
  "report_id": "<string>",
  "tier": "advanced",
  "nickname": "小圓",
  "overall": "<string>",
  "work": "<string>",
  "relationship": "<string>",
  "action": "<string>",
  "rationale": "<string>",
  "path_compare": { "path_a": "<string>", "path_b": "<string>", "note": "<string>" },
  "action_plan": ["<d1>", "<d2>", "<d3>", "<d4>", "<d5>", "<d6>", "<d7>"],
  "disclaimer": "<娛樂用途句>",
  "locked_fields": [],
  "access_status": "unlocked"
}
```

- GET 200 仍**不要**把整包 `advanced_json` 原樣當頂層鍵丟出（避免多帶內部欄）；只組上述欄位。這是「已開通讀取」而非放寬 POST 遮罩。
- 本版不做列表 API、不做「我的歷史報告」。重整後報告 state 消失屬單元 1 既有行為；重整後要驗的是**登入態與 `access_status` 仍在**，不是同一 `persist_id` 自動重開。

### For Story 7 — 受控模擬開通

- **禁止**把開通按鈕做成正式產品 CTA，禁止寫死在前端把 `access_status` 設成 `unlocked`。
- 課堂可驗收預設：`POST /api/dev/grant-access`

**Request**

- Header：`Authorization: Bearer $MEMBERSHIP_GRANT_SECRET`（server-only，禁止 `NEXT_PUBLIC_*`）
- Body：`{ "email": "student@example.com" }` 或 `{ "user_id": "<uuid>" }`（擇一；兩個都給時以 `user_id` 為準）
- 開關：僅當 `MEMBERSHIP_GRANT_ENABLED=1` 時接受；否則 404（與不存在的產品路由無區別）。正式部署預設關閉。

**Response**

| HTTP | 條件 | body |
|---|---|---|
| 200 | 找到列並寫入 `unlocked`；**已是 `unlocked` 再打一次仍 200**，列不變 | `{ "user_id": "<uuid>", "access_status": "unlocked" }` |
| 400 | email／user_id 皆缺或格式錯 | `{ "error_code": "VALIDATION_ERROR", "message": "請提供 email 或 user_id。" }` |
| 401 | secret 錯或缺 | `{ "error_code": "UNAUTHENTICATED", "message": "未授權。" }` |
| 404 | 開關關閉，或找不到對應 profile | 開關關閉不洩漏原因；找不到：`{ "error_code": "NOT_FOUND", "message": "找不到這位會員。" }` |
| 503 | DB 更新失敗 | `{ "error_code": "PERSIST_FAILED", "message": "更新失敗，請再試一次。" }` |

- 等價替代（講師）：Dashboard SQL 以 service role／owner 更新同一欄。驗收可用 API 或 SQL，但**不可**用 Client SDK。
- 開通後：同一瀏覽器重新整理、或登出再登入，頁首與報告功能仍判為已開通。若報告仍在同頁 state，前端應再 GET 一次以填真文；若 state 已空，只需證明再生成 → POST（遮罩）→ GET（進階）走已開通路徑。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### For Story 1

- **Happy Path**: Given 無痕視窗、無 session When 用示範輸入（小圓／`1993-07-12`／時辰未填／聚焦工作）送出 Then 畫面為基本分析＋三鎖定槽，且表單頁與報告頁皆可見 `slot-auth-entry`。
- **錯誤 — 不強迫登入**: Given 訪客 When 送出合法生辰 Then `POST /api/reports` 仍 200（無 `error_code`），不回 401。
- **邊界 — 高風險無解鎖**: Given 訪客暱稱命中高風險 When 送出 Then 仍為 unit1 07 安全殼；可見登入入口；無進階、無開通。
- **邊界 — unit2 CTA 仍不收費**: Given 訪客報告頁 When 點 `slot-unlock-cta` Then 文案仍為即將開放／不收費；`profiles` 不存在、`reports.status` 仍 `basic`。

### For Story 2a

- **Happy Path**: Given 教學專案已關閉 Confirm email When 以未使用信箱與合法密碼在 `/register` 送出 Then Auth 有新 user、導向 `/`、頁首為已登入。
- **驗證錯誤**: Given Email 空白或 `not-an-email` When 送出 Then 顯示「請輸入有效的電子信箱。」；不建立 user。
- **邊界 — 重複信箱**: Given 信箱已註冊 When 再註冊 Then 顯示「此信箱已註冊，請改登入。」；不建立第二個 Auth user。
- **邊界 — 密碼過短**: Given 密碼短於 Auth 下限 When 送出 Then 顯示密碼長度提示；不建立 user。

### For Story 2b

- **Happy Path — 登入**: Given 已註冊帳號 When 在 `/login` 輸入正確 Email／密碼 Then 導向 `/`，頁首 `slot-auth-session` 顯示 `display_name`。
- **Happy Path — 重整**: Given 已登入 When 重新整理 `/` Then 仍為同一使用者，不必再登入。（此 AC 需先處理第 7 節問題 4 的 cookie `getAll`/`setAll`。）
- **登出**: Given 已開通且報告頁已顯示進階真文 When 點登出 Then session 消失，頁首回到 `slot-auth-entry`，進階三槽回到佔位（無 GET 真文）。
- **錯誤 — 密碼錯**: Given 已註冊信箱 When 輸入錯誤密碼 Then 顯示「帳號或密碼不正確。」；不透露信箱是否存在以外的資訊。
- **邊界 — Key 不外洩**: Given 前端 bundle 與 Network When 檢查 Then 無 `SUPABASE_SERVICE_ROLE_KEY`、`MEMBERSHIP_GRANT_SECRET`；anon key 可以是 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。

### For Story 3

- **Happy Path**: Given 新註冊成功 When 讀自身 `profiles` Then 恰有一列：`access_status=locked`、`points_balance=0`、`subscription_status=none`，`user_id` = `auth.users.id`。（`ensureProfile` 不得在後續重整覆寫此列權益，見第 7 節問題 1。）
- **邊界 — 不因登入開通**: Given 首次 session When 進入報告頁 Then 進階仍鎖定；`access_status` 仍 `locked`。
- **邊界 — 客戶端 INSERT 權益**: Given 已登入 When Client SDK `insert` 一列且 `access_status=unlocked` Then 失敗或該列未被接受為開通狀態；不得出現第二個可開通後門。

### For Story 4

- **Happy Path**: Given 已登入 When 把 `display_name` 改成「小園」並儲存 Then Client SDK update 成功，頁首顯示「小園」，報告 `nickname` 仍是生辰表單值。
- **錯誤 — 空白名稱**: Given 已登入 When 送出空白 `display_name` Then 提示「請輸入顯示名稱。」；DB 值不變。
- **權益寫入失敗**: Given 已登入（含已開通與未開通）When Client SDK `update` `access_status`／`points_balance`／`subscription_status` Then 請求失敗；重新 `select` 自身列，三個權益欄與更新前相同。（此 AC 需先處理第 7 節問題 7：先 REVOKE 表層 UPDATE。）

### For Story 5

- **Happy Path**: Given 帳號 A 已登入 When 用 A 的 Client SDK `select` `profiles` Then 只得到 A 的列。
- **隔離 — 讀**: Given 帳號 A 已登入 When 查詢 B 的 `user_id` Then 0 列或 RLS 錯誤。
- **隔離 — 改**: Given 帳號 A 已登入 When `update` B 的 `display_name` Then B 列不變。
- **邊界 — anon**: Given 無 session When 用 anon key 讀 `profiles` Then 失敗／0 列。

### For Story 6

- **訪客**: Given 無 session 且示範報告在頁面 When 檢視 Then 基本摘要＋鎖定槽＋`slot-auth-entry`；`GET /api/reports/{persist_id}` 回 401 且無進階三欄。
- **已登入未開通**: Given 已登入且 `locked` When 再送出示範輸入 Then 進階仍鎖定；可見 `slot-unlock-cta`（文案可為「升級／開通」）；點擊不改 `access_status`、不開金流。`GET` 該次 `persist_id` 回 403 且無進階三欄。（此 AC 需先處理第 7 節問題 3：不要用訪客離頁登入後的舊報告。）
- **已開通**: Given 已登入且 `unlocked` When 再送出示範輸入並 GET 該次 `persist_id` Then 標題為「小圓的進階報告」、三槽為該列進階真文（含 7 天 `action_plan`），不是「預覽用範例」；追問框仍鎖定。（此 AC 需先處理第 7 節問題 2、5、6。）
- **POST 仍遮罩**: Given 已開通會員 When 再 `POST /api/reports` Then 200 body **沒有** `rationale`／`path_compare`／`action_plan`／`advanced_json`，但有 `persist_id`；接著 GET 才出現進階。
- **邊界 — 預覽不算開通**: Given `NEXT_PUBLIC_COMMERCIAL_PREVIEW=1` 切到 B When 驗收「已開通」 Then 判定未通過；須 `access_status=unlocked` 且 GET 真文。
- **邊界 — 已開通無追問**: Given 已開通 When 檢視 Then 無可用追問送出；`points_balance` 仍 0。
- **邊界 — persist_id**: Given Mock `valid` 連續兩次成功 POST When 兩次 GET Then 各用不同 `persist_id`（uuid），不得都打 `rpt_demo_001`。

### For Story 7

- **Happy Path**: Given `MEMBERSHIP_GRANT_ENABLED=1` 且 secret 正確、該 Email 已有 profile When `POST /api/dev/grant-access` Then 200 且 DB `access_status=unlocked`。
- **重整仍開通**: Given 剛受控開通 When 重新整理再登出再登入 Then 仍為已開通三態。（此 AC 需先處理第 7 節問題 1。）
- **冪等**: Given 已是 `unlocked` When 再打一次 grant-access Then 仍 200，列維持 `unlocked`。
- **錯誤 — 無 secret**: Given 錯或缺 Bearer When 呼叫 grant-access Then 401；目標列仍 `locked`。
- **邊界 — 開關關閉**: Given `MEMBERSHIP_GRANT_ENABLED` 非 `1` When 呼叫 Then 404；不開通。
- **邊界 — 前端開通無效**: Given 未開通會員 When 只在前端把畫面切成進階或 Client SDK 改 `access_status` Then GET 仍 403；DB 仍 `locked`。
- **邊界 — 正式無入口**: Given 正式產品 UI（非 dev route、非 SQL）When 尋找「一鍵開通」 Then 不存在。

---

## 4. 技術邊界 (Technical Boundaries)

### DB Schema

本版**新增** `public.profiles`。**不**改 `reports` 欄位（不加 `user_id`）。`reports` RLS 維持 enabled、零 policy。

| 欄位 | 型態 | 誰可寫 | 說明 |
|---|---|---|---|
| `user_id` | uuid PK，`references auth.users(id) on delete cascade` | 系統（trigger／ensure） | 對應 Auth |
| `display_name` | text not null | 使用者（Client SDK） | 頁首顯示 |
| `access_status` | text not null default `locked` | 僅 service role／grant-access／講師 SQL | 允許值：`locked` \| `unlocked`（Ticket 假設；作本檔正式列舉） |
| `points_balance` | integer not null default 0 | 僅受控後端 | 本版不讀不寫商業邏輯 |
| `subscription_status` | text not null default `none` | 僅受控後端 | 本版不判斷週期；預留 `none` |
| `created_at` | timestamptz not null default now() | 系統 | |
| `updated_at` | timestamptz not null default now() | 系統（update trigger） | |

- RLS：`enable`。`authenticated`：`SELECT`／`UPDATE` 僅 `auth.uid() = user_id`。`anon`：無 policy。
- 欄位權限（順序不可省，見第 7 節問題 7）：先 `REVOKE UPDATE ON TABLE public.profiles FROM authenticated`（以及任何預設表層 UPDATE），再 `GRANT SELECT` + `GRANT UPDATE (display_name)`。只 GRANT 單一欄、不 REVOKE 表層 UPDATE，權益欄仍可被 Client 改寫。另加 trigger：若 `access_status`／`points_balance`／`subscription_status` 被非 service role 變更則 `RAISE`。
- INSERT：一般角色無 GRANT；只靠 `SECURITY DEFINER` trigger／ensure。
- 不建 `orders`、`entitlements`、`point_transactions`、`subscriptions`。

### API & Permissions

| 方法 | 路徑 | 誰可呼叫 | 作用 |
|---|---|---|---|
| POST | `/api/reports` | 任何人（同 unit1） | 生成＋遮罩；附加 `persist_id` |
| GET | `/api/reports/[persistId]` | cookie session 且 `unlocked` | 回進階真文 |
| POST | `/api/dev/grant-access` | Bearer `MEMBERSHIP_GRANT_SECRET` 且開關開啟 | 寫 `unlocked` |
| — | Supabase Auth `/auth/v1/*` | 瀏覽器 anon | 註冊／登入／登出 |
| — | `profiles` REST（Client SDK） | 已登入；RLS + 欄位 GRANT | 讀自身、改 `display_name` |

- 無 CSRF 以外的自建角色系統。不實作密碼重設 API。
- service role、grant secret、OpenRouter key：僅 server。

### External Services

- **Supabase Auth + Postgres**：Email／密碼、cookie session、`profiles` RLS。
- **不新增** OpenRouter 流程、不串 ECPay、無 Webhook。
- Session client 對齊 architecture：仿 `customer-lead-collector` 的 `lib/supabase/{client,server}` + 刷新層。Next 16 官方檔名是 `proxy.ts`，`middleware.ts` 仍會載入、功能等同；擇一即可，但 cookie 必須 `getAll`/`setAll`（`@supabase/ssr` 0.10）。現有 `createServiceRoleClient` 不得拿到瀏覽器；`lib/supabase/env.ts` 是 `server-only`，browser client 不可 import 它。
- grant-access 用 `{ email }` 時：service role 查 `auth.users` 對應 id，再更新 `profiles`（`profiles` 無 email 欄）。

### Performance / SLO

- Ticket **缺少效能指標**，不杜撰。Auth 與 GET 為短請求；生成仍受 unit1 `maxDuration=60` 約束。

### 環境變數

| 變數 | 位置 | 本單 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | 沿用；client 開始使用 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | 本單啟用（unit1 僅留位） |
| `SUPABASE_SERVICE_ROLE_KEY` | server | 沿用；ensure／GET／grant |
| `MEMBERSHIP_GRANT_SECRET` | server | 新增 |
| `MEMBERSHIP_GRANT_ENABLED` | server | 新增；`1` 才開 grant route |
| `NEXT_PUBLIC_COMMERCIAL_PREVIEW` | public | 沿用；本單驗收建議 `0`。現有 `.env.production` 為 `1`（unit2 對稿），已開通必須覆蓋預覽態 |

---

## 5. MVP 判定 (MVP vs Later)

- **Story 1 訪客免費摘要 + 登入入口**: MVP: true
- **Story 2a Email 註冊（關 Confirm email）**: MVP: true
- **Story 2b 登入／登出／cookie 重整**: MVP: true
- **Story 3 profiles 預設未開通 + trigger／ensure**: MVP: true
- **Story 4 display_name 可改、權益欄 Client 寫入失敗**: MVP: true
- **Story 5 雙帳號隔離 + anon 不可讀**: MVP: true
- **Story 6 三態畫面 + POST 附加 persist_id + GET 進階真文**: MVP: true（Ticket 成功標準：同一功能三態不同）
- **Story 7 受控 grant-access（或等價 SQL）+ 重整／重登仍開通**: MVP: true
- **預留 `points_balance`／`subscription_status` 欄（不啟用邏輯）**: MVP: true（Ticket Should Have；沒有這兩欄則「前端加點／改訂閱必須失敗」無法驗）
- **升級／開通占位文案（不串金流）**: MVP: true（Should Have）
- **三態對照表寫進本檔與頁首狀態可讀**: MVP: true（對照表以本檔第 2 節表為準；UI 用狀態文案表達即可，不另做後台表）
- **密碼重設**: MVP: false — Ticket Could Have
- **`reports.user_id` 綁定與 owner-only reports RLS**: MVP: false — Ticket Could Have；假設本版不強制
- **會員中心頁、社群登入**: MVP: false — Ticket Could Have／Won't Have
- **真實付款／訂單／Webhook／扣點／訂閱週期／追問主流程／以前端開通當正式開通**: MVP: false — Ticket Won't Have

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

### 一、開發實作時應注意 (Implementation-time Concerns)

- **與單元 1**：生成、ajv、高風險、POST 遮罩、`reports` 零 policy **保持**。只允許 POST 200 **加** `persist_id`。`insertReport` 回傳的 `id` 必須接到 HTTP。`MaskedReportView` 目前沒有 `persist_id`，不接則 Story 6 GET 無輸入。
- **與單元 2**：具名槽位與「即將開放」對訪客／未開通仍有效。已開通必須填**真文**，禁止 `lib/commercial/preview.ts` 的 `EXAMPLE_BLOCKS`。預覽 B ≠ 已開通。`slot-unlock-cta` 在未開通改「升級／開通」占位時，點擊仍不得改 DB。
- **編號衝突**：課程大綱／`docs/spec.md` §4 稱「單元 2 會員」；本 repo 單元 2 已是商業接點。實作跟**本檔**。`AGENTS.md`／`.cursor/rules/nextjs.mdc`／`supabase.mdc` 寫「本版不做會員／不讀 session／不建 membership 遷移」是指**單元 1 範圍**，本單明確做會員並讀 cookie session（見第 7 節問題 2）。
- **architecture 陷阱 5**（先登入再生成）本單不採用；訪客生成保留。仿 CLC 的 middleware／proxy **禁止**把 `/` 設成必登入。
- service role 進前端則 RLS 全廢。只開 RLS、沒 policy，連自己也讀不到。
- SQL Editor 以 owner 測 RLS 會誤判通過；驗收必須 anon + 兩組使用者 JWT。
- Email 驗證未關，課堂註冊會停在收信（hosted Supabase 預設 Confirm email＝開）。
- 只做「能不能用」；點數不足與訂閱到期本版不判斷。
- `lib/security/secrets-not-leaked.test.ts` 實作時把 `MEMBERSHIP_GRANT_SECRET` 列入守門名單。

### 二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)

- `display_name` 最長長度 Ticket 未給。
- 密碼最短長度 Ticket 未給；沿用 Supabase 專案設定。
- Ticket「待確認」已按原文假設收斂、供本檔 AC 使用：`access_status`=`locked`/`unlocked`；預留欄名如上；模擬開通以 grant-access 為可驗收預設、SQL 等價；**不**綁 `reports.user_id`；教學關 Confirm email。若產品改列舉值，本檔 AC 字串要同步改。
- 重整後是否自動重開上一份進階：Ticket 只要求三態／權限一致，不要求歷史報告。本檔明確不重開。

### 三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)

- 若 UAT 要求訪客生成改為必須登入：暫停，對齊本檔 Story 1，勿自行改成 architecture 陷阱 5。
- 若 UAT 用預覽 B 或前端切態主張已開通：暫停，以 `access_status` + GET 真文為準。
- 若課堂臨時要扣點、訂閱週期、追問、金流：暫停，屬後續單元與本單 Won't Have。
- 若要求把 GET 改成對未開通也回進階再由前端藏：暫停，違反單元 1 遮罩與本單 403 規則。

---

## 7. ⚠️ 需求前置阻塞問題 (Blocking Issues from Independent Review)

獨立審查（三視角，對照現有程式碼與單元 1／2 spec）發現下列不處理則對應 AC 無法通過的強相關問題。本文第 2～5 節已按本節收斂；本節保留問題、證據與擋住的 AC。

缺的 Auth 頁、`profiles` 遷移、GET、grant-access、`lib/supabase/client.ts` 屬**本次新建**，不列為缺陷。`insertReport` 已回 `id` 但 route 丟棄、`MaskedReportView` 無 `persist_id`，規格已列為必接線，不另開問題。

- **問題 1：`ensureProfile` 若做成覆寫型 upsert，開通會被重整洗回 `locked`**（視角 A＋C）
  - 證據：原句「第一次讀 session 時 upsert，寫死預設」。開通後 layout／middleware 再跑同一函式，會把 `access_status` 與已改的 `display_name` 蓋掉。
  - 影響：Story 7「重整仍開通」、Story 4 重整後名稱、Story 2b 重整顯示名。
  - 處理：第 2 節已改為 `INSERT … ON CONFLICT DO NOTHING`；禁止覆寫已存在列的權益欄與 `display_name`。
  - 擋住：Story 7 重整仍開通、Story 3 Happy（後續 session）。

- **問題 2：`AGENTS.md`／cursor rules 的全域禁令與本單衝突**（視角 B）
  - 證據：`AGENTS.md`「不主動實作會員」「對外永不帶出 advanced_json」；`.cursor/rules/nextjs.mdc`「本版不讀 session」「永不把 advanced_json 回給前端」；`lib/masking/buildReportResponse.test.ts` 的 `FORBIDDEN_BODY_KEYS`；`.cursor/rules/supabase.mdc`「單元 2／4 預留檔不建立」。
  - 影響：實作者跟規則會拒絕 cookie session、拒絕 GET 進階，或把 `/` 做成必登入。
  - 處理：本單 GET 是唯一核准的 unlocked 變體；POST／`buildReportResponse` 禁令不變。會員與 session 以本檔為準。禁止 middleware 強制登入 `/`。
  - 擋住：Story 1 不強迫登入、Story 2b 重整、Story 6 已開通 GET。

- **問題 3：離頁登入／註冊會丟掉同頁 `persist_id`**（視角 A＋C）
  - 證據：`components/home/HomeClient.tsx` 報告只在 `useState`；`/login`、`/register` 卸載元件。單元 1 刻意不寫 storage。
  - 影響：原 AC「同一份訪客報告」在註冊後無法從 UI 取得舊 uuid。
  - 處理：第 2／3 節已改為「先處於該身分，再生成」；訪客原列不當 Happy Path。
  - 擋住：改寫前的 Story 6「同一份報告」AC。

- **問題 4：`@supabase/ssr` 0.10 必須 `getAll`/`setAll`，規格原先只寫 `await cookies()`**（視角 B）
  - 證據：`@supabase/ssr` 型別與 README：middleware 沒 `setAll` 會隨機登出；不要只靠 `getSession()`。
  - 影響：Story 2b 重整後仍認得人。
  - 處理：第 2／4 節已補 cookie adapter 與 `getUser`／`getClaims`。
  - 擋住：Story 2b Happy Path — 重整。

- **問題 5：production 已開 `COMMERCIAL_PREVIEW=1`，預覽 A 會蓋過已開通**（視角 C）
  - 證據：`.env.production`；commit `eca1478`；`ReportCard.tsx` 預覽優先、`resolvePreviewView` 在 A 態鎖定；`EXAMPLE_BLOCKS` 為假文。
  - 影響：正式站驗 Story 6 已開通會看到封條或「預覽用範例」。
  - 處理：第 2 節已規定 `unlocked` 覆蓋預覽態；驗收本單時建議 `=0`。
  - 擋住：Story 6 已開通（若在現有 production 驗）。

- **問題 6：Mock `advanced_json` 沒有 `action`，GET 最低欄位卻列了 `action`**（視角 A）
  - 證據：`lib/generation/fixtures/advanced.valid.json` 無 `action`；`basic.valid.json` 才有；`route.ts` Mock 兩份分存。
  - 影響：只攤 `advanced_json` 則 GET 缺 `action`。
  - 處理：第 2 節已改為 basic ∪ 進階三欄。
  - 擋住：以 GET body 對契約驗收時的 Story 6。

- **問題 7：只 GRANT `display_name`、不先 REVOKE 表層 UPDATE，Client 仍改得到權益欄**（視角 B＋C）
  - 證據：Supabase Column Level Security：表層 UPDATE 仍在時，欄位 GRANT 不會拿掉其他欄。
  - 影響：Story 4「權益寫入失敗」、Story 7「前端開通無效」。
  - 處理：第 4 節已寫先 `REVOKE UPDATE ON TABLE` 再 GRANT 單一欄。
  - 擋住：Story 4 權益寫入失敗。

另見 `2026-09-13-ziwei-unit3-membership-issues.md`，盤點到的非阻塞問題。
