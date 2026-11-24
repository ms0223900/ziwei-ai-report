# 單元 8 帳號建置（在你自己的專案跑驗測）

單元 8 的 fixture 與 [`README.md`](./README.md) 綁定 `checkpoint.a～d@aaa.com` 四個測試帳號與固定 UUID。
`reset-checkpoint.sql` 和各支 fixture 只會改這些帳號的 `profiles`、訂閱、訂單等資料，**不會建立登入帳號本身**。
所以在自己的 Supabase 專案跑之前，先照這份建帳號。只想看影片、不跟做的話，可以跳過。

> 這份腳本只給**測試專案**。密碼固定為 `Test1234`，不要在正式環境跑。

## 步驟

1. **確認前置**：專案已套用 `supabase/migrations`（至少要有 `public.profiles`、`on_auth_user_created` 觸發器，以及單元 7 的 `20260928000000_notifications_admin_actions.sql`）。
2. **建帳號**：在 Supabase SQL Editor 整段執行 [`create-checkpoint-users.sql`](./create-checkpoint-users.sql)。結尾的檢查表五列（A～D 與 ADMIN）都應該是 `user_exists = true`、`email_used_by_other_uuid = false`、`profile_exists = true`。
3. **確認能登入**：用 `checkpoint.d@aaa.com`／`Test1234` 登入你的網站。能登入就好，不必先產生報告。
4. **還原資料**：執行 [`../subscription-checkpoint/reset-checkpoint.sql`](../subscription-checkpoint/reset-checkpoint.sql)。結尾的 SELECT 會列出 A～D 的訂閱狀態與 `report_id`。只有 A、B、C 會有報告，D 的 `report_id` 是 null；D 的報告由 `fixture-points-zero.sql` 結尾的 SELECT 取得，或在網站上自己產生。
5. **（選做）ADMIN**：要看 `/admin/orders` 才需要。腳本已建好 `admin_test.a@aaa.com`（UUID `a6583f5f-f0a5-4617-9bf8-e4b69355520f`）；另外要在伺服器環境變數設 `ADMIN_USER_IDS=a6583f5f-f0a5-4617-9bf8-e4b69355520f`（只放伺服器端，不要加 `NEXT_PUBLIC_`），部署平台改完環境變數要 Redeploy。
6. 回到 [`README.md`](./README.md) 的「開始前」，設定 `BASE`、`payload()`、`post()`，再照矩陣跑。

## 帳號與 UUID

| 帳號 | email | UUID |
| --- | --- | --- |
| A | `checkpoint.a@aaa.com` | `77ba05f6-21c3-41b4-8e84-e920aae1df44` |
| B | `checkpoint.b@aaa.com` | `84ca06c5-10fb-4478-a6d9-ab52973f7c2f` |
| C | `checkpoint.c@aaa.com` | `4dc205b3-b4a8-43ce-ba3c-8727fe027a03` |
| D | `checkpoint.d@aaa.com` | `fc5f35a3-8e99-416b-a422-cb645feb0031` |
| ADMIN | `admin_test.a@aaa.com` | `a6583f5f-f0a5-4617-9bf8-e4b69355520f` |

## 備案：用 Dashboard 自己建帳號，再把 UUID 換掉

`create-checkpoint-users.sql` 是依 Supabase auth 的資料表結構寫的，沒有在每個專案上驗證過。若它報欄位錯誤，或建完之後登入失敗：

1. 到 Supabase Dashboard → Authentication → Users → Add user，建出 A～D 四個帳號（email 照上表，密碼自訂；勾選 Auto Confirm User）。
2. 複製四個帳號各自的 UUID。
3. 在專案根目錄，把檔案裡的固定 UUID 換成你的。`unit8-checkpoint.test.ts` 與 `create-checkpoint-users.test.ts` 也寫死了固定 UUID，會一起換（換完測試仍然通過）：

```bash
A_ID=<你的 A uuid>; B_ID=<你的 B uuid>; C_ID=<你的 C uuid>; D_ID=<你的 D uuid>
files=$(grep -rlE '77ba05f6|84ca06c5|4dc205b3|fc5f35a3' scripts docs --include='*.sql' --include='*.md' --include='*.ts' --exclude='setup-accounts.md')
sed -i \
  -e "s/77ba05f6-21c3-41b4-8e84-e920aae1df44/$A_ID/g" \
  -e "s/84ca06c5-10fb-4478-a6d9-ab52973f7c2f/$B_ID/g" \
  -e "s/4dc205b3-b4a8-43ce-ba3c-8727fe027a03/$C_ID/g" \
  -e "s/fc5f35a3-8e99-416b-a422-cb645feb0031/$D_ID/g" \
  $files
```

4. 回到上面的步驟 4。這個備案不需要再跑 `create-checkpoint-users.sql`（它會用換掉後的 UUID 再建一次，已存在的會略過）。

## 清掉測試帳號

測試做完要移除時，在 Dashboard 的 Users 頁刪除這幾個帳號即可；`profiles` 等資料會跟著 `auth.users` 的外鍵一起被清掉（若遇到外鍵錯誤，先照 [`README.md`](./README.md) 的刪除順序清掉訂單、通知與 `admin_actions`）。
