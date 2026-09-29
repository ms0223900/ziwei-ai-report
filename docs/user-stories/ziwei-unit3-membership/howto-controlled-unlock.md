# 單元 3 受控開通流程（教學／自測）

How to unlock a member in Unit 3 (classroom / self-test).  
這份寫「你自己或講師怎麼開通」；不是產品金流。規格原文見 [`docs/specs/2026-09-13-ziwei-unit3-membership.md`](../../specs/2026-09-13-ziwei-unit3-membership.md) Story 7。

---

## 1. 先建立正確預期 / What this is

**開通 = 後端把該帳號的 `profiles.access_status` 改成 `unlocked`。**  
Unlock means a **server** write of `profiles.access_status = unlocked`.

本版**沒有**真正的產品解鎖：

| 畫面上你會看到 | 實際會做什麼 |
| --- | --- |
| 訪客「解鎖完整報告」＋「即將開放」 | 只顯示「解鎖即將開放，本版不收費。」**不改 DB** |
| 已登入未開通「升級／開通」 | 只顯示「開通由講師受控流程處理，本版不收費」**不改 DB、不打 grant** |
| 開發預覽條切到 B | unit2 預覽假文（含「預覽用範例」）**不算已開通** |

要看進階真文，必須：**已登入 + `unlocked` + POST 生成 + GET 該次 `persist_id`**。  
To see real advanced fields you need: **logged in + unlocked + generate (POST) + GET that `persist_id`**.

---

## 2. 前置條件 / Checklist before you try

少一項就會覺得「解鎖壞了」。Skip one item and unlock looks broken.

1. **程式已含 Phase 3／4**（`POST /api/dev/grant-access`、`GET /api/reports/[persistId]`、三態畫面）。只合到舊 `main`、沒有這些 route，不能測。
2. **已把 profiles 遷移套到目標專案**  
   檔案：`supabase/migrations/20260913000000_create_profiles.sql`  
   你說「已遷移 db」指的就是這步。沒有 `profiles` 表，grant 找不到會員可更新。
3. **Supabase Auth 關閉 Confirm email**  
   否則註冊成功也沒有 session，重整／登入 AC 會失敗。
4. **環境變數（server-only，不要 `NEXT_PUBLIC_`）**

本機 `.env.local` 或 Vercel Project Env：

```bash
MEMBERSHIP_GRANT_ENABLED=1
MEMBERSHIP_GRANT_SECRET=請自己填一串夠長的密文
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

- 開關**必須剛好是** `1`。`0`、空、`true` 都當關閉，grant 回 **404**（看起來像路由不存在）。
- `MEMBERSHIP_GRANT_SECRET` 只給伺服器；禁止 `NEXT_PUBLIC_MEMBERSHIP_GRANT_SECRET`。
- 改 Vercel env 後要**重新部署**才生效。
- 課堂展示建議 `NEXT_PUBLIC_COMMERCIAL_PREVIEW=0`，避免跟預覽 B 搞混。`.env.production` 目前是 `1`（unit2 對稿）。

---

## 3. 建議操作順序 / Steps that actually unlock

### 步驟 A — 先註冊一個帳號

1. 開 `/register`，用沒用過的 Email + 合法密碼（至少 6 碼）。
2. 成功後應導向 `/`，頁首變成已登入（`slot-auth-session`），不是「登入／註冊」。
3. 此時 `profiles` 應有一列：`access_status=locked`。  
   **登入本身不會開通。** Signing in does not unlock.

### 步驟 B — 講師／你自己打 grant（正式開通手段）

把下面的 `BASE`、`SECRET`、`EMAIL` 換成你的值。本機預設：

```bash
BASE=http://localhost:3000
SECRET='你的 MEMBERSHIP_GRANT_SECRET'
EMAIL='student@example.com'

curl -sS -D - -X POST "$BASE/api/dev/grant-access" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\"}"
```

**成功（200）**

```json
{ "user_id": "<uuid>", "access_status": "unlocked" }
```

再打一次仍是 200，列維持 `unlocked`（冪等）。兩個欄位都給時以 `user_id` 為準：

```bash
curl -sS -X POST "$BASE/api/dev/grant-access" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":\"<uuid>\",\"email\":\"ignored@example.com\"}"
```

**等價 SQL（講師 Dashboard，owner／service role；不要用 Client SDK）**

```sql
update public.profiles
set access_status = 'unlocked'
where user_id = '<auth user uuid>';
```

### 步驟 C — 用「同一個已開通帳號」看進階

主驗收路徑是 **先處於該身分，再生成**（不要：訪客先出報告 → 離頁去註冊 → 指望同一份還在）。

1. 若 grant 當下已登入：重整一次（讓 server 再讀 `access_status`）。
2. 用示範輸入送出（小圓／`1993-07-12`／時辰未填／聚焦工作）。
3. `POST /api/reports` **仍然只有基本摘要**，沒有 `rationale`／`path_compare`／`action_plan`／`advanced_json`，但會有 `persist_id`。
4. 前端再用這個 `persist_id` 打 `GET /api/reports/{persist_id}`。  
   已開通 200：標題「小圓的進階報告」，三槽是該列真文（含 7 天計畫），**不是**「預覽用範例」。
5. 重整、登出再登入：帳號仍是 `unlocked`。若報告 state 已空，再走一次「生成 → GET」即可。

### 步驟 D — 登出應清真文

已開通且畫面上已有進階真文時點登出：session 消失、頁首回「登入／註冊」、三槽回到佔位，螢幕上不該再留 GET 真文。

---

## 4. 三態對照（方便對畫面） / Three states

| 身分 | 怎麼造成 | 報告頁預期 |
| --- | --- | --- |
| 訪客 | 無痕／未登入 | 「{暱稱}的基本分析」；鎖定槽；即將開放；不收費 |
| 已登入未開通 | 有註冊，**還沒** grant | 同免費摘要；CTA「升級／開通」；點了不改 DB；GET 該 `persist_id` → 403 |
| 已開通 | grant 或 SQL 已寫 `unlocked` | 「{暱稱}的進階報告」；GET 真文；追問框仍鎖定；不贈點數 |

---

## 5. grant HTTP 速查 / Status cheat sheet

| HTTP | 何時 | body 重點 |
| --- | --- | --- |
| 200 | secret 對、找到會員、寫入或已是 unlocked | `{ user_id, access_status: "unlocked" }` |
| 400 | email 與 user_id 都缺 | `請提供 email 或 user_id。` |
| 401 | Bearer 錯或缺 | `未授權。` 目標列仍 `locked` |
| 404 | 開關不是 `1`（空 body，不洩漏） | 或找不到會員：`找不到這位會員。` |
| 503 | DB 更新失敗（不是「已是 unlocked」） | `更新失敗，請再試一次。` |

查 DB 是否真的開通（SQL Editor）：

```sql
select user_id, display_name, access_status, points_balance, subscription_status
from public.profiles
order by updated_at desc
limit 20;
```

開通後 `access_status` 應為 `unlocked`，`points_balance` 仍為 `0`（本版不因開通送點）。

---

## 6. 常見卡關 / If it still looks locked

| 現象 | 先查 |
| --- | --- |
| grant 404、空 body | `MEMBERSHIP_GRANT_ENABLED` 不是剛好 `1`，或部署還沒吃到新 env |
| grant 401 | `Authorization: Bearer …` 與 server 的 `MEMBERSHIP_GRANT_SECRET` 不一致 |
| grant 503 但 DB 已 unlocked | 舊版把 update 空回傳列當失敗；修過後應 200 |
| grant 404「找不到這位會員」 | Email 還沒註冊，或大小寫／空白不符；或 `profiles` 列不存在 |
| 已 grant 畫面仍鎖定 | 不是同一個帳號；或沒重整；或走了訪客離頁那條舊報告 |
| 看到「預覽用範例」 | 那是預覽 B，不是 GET 真文。請確認 `access_status=unlocked` 且標題是「進階報告」 |
| 註冊後立刻沒登入態 | Confirm email 還開著 |
| Client SDK `update access_status` | 應失敗。本版禁止用前端／anon 當正式開通 |

---

## 7. 不要做的事 / Do not

- 不要在產品 UI 加「一鍵開通」當正式功能。
- 不要把 `MEMBERSHIP_GRANT_SECRET` 或 service role 放到 `NEXT_PUBLIC_*`。
- 不要用 unit2 預覽 B／C／D 宣稱「已開通驗收通過」。
- 本版不做金流、扣點、訂閱週期、追問 API。
