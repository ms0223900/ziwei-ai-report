# 單元 8 驗測與 Checkpoint Playbook

> 取材自：`docs/user-stories/ziwei-unit8-verification-matrix/` US-001～US-011 的驗收說明、`docs/unit8/live-acceptance-2026-10-07.md`、spec 三輪獨立審查（2026-10-05～10-07，PR #94～#97）。
> 下次蒸餾從 US-012 或單元 9 開始。

本檔記錄寫 Checkpoint 素材與跑真機驗收時「不查就會踩到」的事。操作步驟以 [`scripts/unit8-checkpoint/README.md`](../../scripts/unit8-checkpoint/README.md) 為準，預期值以 [`docs/unit8/verification-matrix.md`](../unit8/verification-matrix.md) 為準，本檔不重複。

## 一、綠界 payload 腳本的預設值會讓驗收失敗

`scripts/ecpay-subscription-payload.mjs` 的預設值是為單元 6 月繳設計的，拿來測其他方案時一定要覆蓋：

| 預設 | 後果 | 正確做法 |
| --- | --- | --- |
| `TradeAmt=19` | webhook 先比對金額才看 `SimulatePaid`，單次 99、點數包 49 會直接回 `0\|Error`，連 `--simulate` 也不例外 | 單次帶 `--amount 99`，點數包帶 `--amount 49` |
| `RtnCode=1` | period payload 會被當成**續期成功**，期末延長一個月 | 扣款失敗一律帶 `--rtn-code 10100058` |
| `TotalSuccessTimes=2` | 會真的續期一次並建 `sub:` 通知 | 驗重送時用 `--total-success-times 1`（`first_duplicate`，第 1 次仍會新增 `period:{mtn}:1` 事件，第 2 次起才不變） |
| `gwsr=G${Date.now()}` | 失敗事件 key 是 `failed:{mtn}:{gwsr}`，每送一次就多一筆 | 重送失敗事件時固定 `--gwsr` |

腳本只輸出到 stdout，送出要沿用單元 6 的 `payload()`／`post()` 兩個 shell 函式。ReturnURL 送 `/api/payments/ecpay/webhook`，PeriodReturnURL 送 `/api/payments/ecpay/period-webhook`。

## 二、權益與畫面的判讀陷阱

- **訂閱權益只看 `current_period_end`**：`cancel_subscription` 會把期末切到 now − 1 秒，所以「取消」與「到期」的判讀方式相同。
  - `past_due` 但期末未過時，進階內容仍可看，這是單元 6 的定案，不算失敗。
  - `expire.sql` 只改期末、不寫 `expired` 事件，所以不會建失效通知，這是定稿行為。
- **reset 的 A／B／C 沒有 `first_success` 事件**：它們的訂單在結果頁會落在 `needs_manual`，管理原因顯示「需要補償」。驗訂閱成功要用 D 真實建單，再送 return payload。
- **0 點時首頁不渲染「用 1 點解鎖此報告」按鈕**（單元 5 的設計）：「按下去被擋」做不到，`insufficient` 只能直接打 API 觀察（`probe.mjs unlock`）。
- **首頁多數情況不發進階 GET**：沒有有效訂閱、也沒有永久解鎖時，`loadAdvanced` 直接 return，畫面上看不到 403。403 一律用 `probe.mjs advanced` 打 API 驗證。
  - 唯一例外是「頁面開著時到期」：產生新報告會觸發 GET，回 403 後退回鎖定並顯示「訂閱已失效，請重新整理」。
- **點數解鎖要在訂閱失效時做**：訂閱有效期間，`unlock_report_with_point` 回 `subscription`，不扣點、不寫 `report_unlocks`。所以「點解鎖報告在訂閱失效後仍可看」必須先讓訂閱失效再解鎖。
- **舊報告無法從首頁重開**：只有點數解鎖過的報告會出現在「已解鎖報告」選單。需要畫面驗證時，要產生新報告。
- **永久解鎖是帳號層級**（`profiles.access_status`）：同帳號跑完單次成功後，點數與訂閱案例都會被 `lifetime` 蓋過，換模式前要重跑 reset 或 fixture。
- **首頁餘額是伺服器渲染時讀的**：跑完 SQL 要先重新整理首頁，再產生報告。

## 三、寫 Checkpoint fixture SQL

- **角色宣告**：同一個 transaction 內先 `set_config('request.jwt.claim.role','service_role',true)` 加 `request.jwt.claims`，否則 `orders_guard_status` 與 entitlement guard 會擋。
  - `orders_guard_status` 只擋 UPDATE；INSERT 一筆 paid 或 pending 訂單不受影響。
- **刪除順序**：notifications → admin_actions → report_unlocks → point_transactions → subscription_events → subscriptions → orders → reports。
  - notifications 沒有 MTN 欄位，要用 `source_id in (select id::text from orders where merchant_trade_no = …)` 刪。
- **`reset-checkpoint.sql` 不刪 `notifications` 與 `admin_actions`**：
  - 通知筆數一律以 `idempotency_key` 或 `source_id` 查。
  - 管理者在 reset 帳號的訂單按過補點（含 rejected）後，reset 一定會撞 `admin_actions_source_order_id` 外鍵，要先清掉 `admin_actions` 再 reset。
- **`fulfill_points_pack_order` 是冪等的，但只冪等在 credit 這一層**：對已 credit 的單回 `already_fulfilled`；每次產生新 credit 都會讓 `points_balance` +5，刪掉 credit 也不會退回。需要重跑的 fixture 只能用「`on conflict (merchant_trade_no) do nothing` + 以 MTN 查 id 再呼叫 RPC」，不能先清後建。
  - 函式內不檢查角色，EXECUTE 只授權給 service_role；SQL Editor 以 owner 執行時可以呼叫。
- **`insert … on conflict do nothing` 衝突時 `returning` 拿不到 id**：一律另外用 MTN select id。
- **離線驗證 migration 與 fixture**：用 PGlite 建 `auth.users`、`auth.uid()`、`auth.role()` 的替身，再補 `anon`／`authenticated`／`service_role` 三個角色，就能套用全部 migration 並實跑 fixture。
  - `profiles.display_name` 是 NOT NULL，替身帳號要自己補。
  - repo 不裝 PGlite，實跑腳本放 scratchpad；repo 內只留文字斷言測試（`scripts/*-checkpoint/*.test.ts`）。

## 四、真機驗收（演示站）

- **雲端 Claude Code 環境連不到演示站**（agent proxy 回 `connect_rejected`），也沒有 Supabase 權限。真機項目要由人實跑，或在有連線的環境跑。
- **Cookie 取得**：2026-10-07 實跑時，用 `@supabase/ssr` 的 `createBrowserClient` 加記憶體 cookie jar，`signInWithPassword` 後把 cookie 寫成權限 600 的暫存檔，probe 與 curl 只讀那個檔。比從 DevTools 複製穩定，也不會把 cookie 貼進筆記。
  - Session 會過期：中途 probe 回 401 時，重新登入即可。
- **403 的 `error_code` 是大寫的 `FORBIDDEN`**。
- **帳號順序**：
  - A 要先做「頁面開著時到期」，重跑 reset 之後再做取消。
  - 點數固定 P-F → P-S／P-D → N-F。
  - 需要留下單次成功證據時，要在 reset 之前補送。

## 五、交付流程

- **PR 合併後才推的 commit 不會進 `main`**：#94、#95 都是在整包做完前就被 merge，後續 commit 只能另開 PR。
  - 整包做完再 merge。
  - 若已 merge：已推送的分支不能 force-push（權限會擋），改用 `git merge origin/main` 後一般 push，再開新 PR；分支只剩已合併的歷史時，`git merge --ff-only origin/main` 即可。
- **spec 的獨立審查要對照程式碼跑**：三輪審查抓到的阻塞，都是「照 spec 字面做，AC 就驗不過」的參數或前提問題，例如漏 `--amount`、漏 `--rtn-code`、0 點時沒有按鈕、reset 帳號沒有 `first_success`。只做文字檢查抓不到這類問題。
