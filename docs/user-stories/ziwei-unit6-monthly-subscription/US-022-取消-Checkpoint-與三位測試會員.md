# US-022：取消 Checkpoint、三位測試會員與真機實跑

**作為** 講師  
**我想要** 一鍵把三位測試會員設成有效、扣款失敗、到期三種狀態，並能取消訂閱、重播六組事件  
**以便** 課堂上可以重現完整閉環

**輸入格式**：
- US-004 的 `cancel_subscription`；US-009 可建單；US-011、US-013 可接收 payload；US-015 的權益判斷已上線；US-021 的腳本
- `profiles_guard_entitlements` 只看 JWT 的 `auth.role()`，`security definer` 的 RPC 也會被它擋下（spec 第 7 節阻塞 2）

**輸出格式**：
- `scripts/` 下的 service role 腳本，或 SQL；SQL 版本沿用單元 5 `howto-points-pack.md:64-69` 的寫法：`begin;` + `set_config('request.jwt.claim.role','service_role',true)` + `set_config('request.jwt.claims','{"role":"service_role"}',true)`，整段包在同一個 transaction
- `howto-monthly-subscription.md`（放在本目錄）

**驗收條件**：
- [x] 三位會員的初始狀態：
- [x]   - A：`active`，期末 = now + 20 天
- [x]   - B：`past_due`，期末 = now − 1 天
- [x]   - C：`expired`，期末 = now − 1 天，且 `points_balance=1`
- [x]   - 三人都是 locked、沒有 `report_unlocks`；各有一筆 paid 的月繳訂單與固定 MTN；各有一份自己產生的成功報告
- [x] 重設腳本會先刪除該會員的 `subscription_events`，再重建訂閱列，讓取消可以重複演示
- [⚠️] S10-2／S5-4：三人登入後以 GET 讀自己的既有報告 → A 回 200，B、C 回 403
- [⚠️] S6-1：以 service role 執行 `cancel_subscription(A)` 後 → `current_period_end < now()`、新增 cancelled 事件、GET 回 403，三張表的列數都沒有減少；S6-3：再執行一次 → 回 `already_cancelled`，期末不變
- [⚠️] 真機實跑：用 US-021 腳本對真實路由（經 tunnel 或本機）依序送出以下事件，並貼上結果：
- [⚠️]   1. 首次成功（S3-1：先建單，再帶入該 MTN）
- [⚠️]   2. 續訂（S4-1）
- [⚠️]   3. 重複（S4-2）
- [⚠️]   4. 失敗（S5-1）
- [⚠️]   5. 取消（S6-1）
- [⚠️]   6. 到期（S6-2：期末設為過去，但 `status` 保留 `active`）

#### 驗收說明

**整體結論**：PARTIAL ⚠️

> 以下三項已完成，並在 PGlite 上依序套用全部 migration 後實跑，12 項檢查全數通過：
> - Checkpoint SQL（`scripts/subscription-checkpoint/{seed,cancel,expire}.sql`）
> - howto（`howto-monthly-subscription.md`）
> - 固定 Payload 腳本（US-021）
>
> 依使用者決定，需要登入真實 Supabase 並打真實路由的驗收留給人工回報。

---

**AC 群組：三位會員初始狀態與重設**

狀態：✅ 通過

- `seed.sql` 用同一個 transaction，並以 `set_config` 宣告 service_role。執行時先刪掉三人的事件、訂閱、`report_unlocks` 與固定 MTN 訂單，再重建：
  - A：active，期末 +20 天
  - B：past_due，期末 −1 天
  - C：expired，期末 −1 天，points=1
  - 三人都是 locked，各有一份成功報告
- PGlite 實跑：狀態、點數與報告數都符合；重跑 seed 後 A 回到 active，而且可以再取消一次
- 拿掉 `set_config` 且權益值確實有變時，會被 `profiles_guard_entitlements` 擋下

---

**AC：S10-2／S5-4 三人登入後 GET 自己的報告**

狀態：🔍 需人工確認

- 需要真實 Supabase 登入與 session cookie。howto §1 已寫好步驟與預期結果（A 200、B／C 403）
- 權限判斷本身已由 US-014／015 的 route 測試覆蓋

---

**AC：S6-1／S6-3 取消**

狀態：🔍 需人工確認（SQL 部分已驗證）

- PGlite 實跑 `cancel.sql`：
  - 第一次執行：status 變成 cancelled，`current_period_end < now()`，取消事件 1 筆
  - 第二次執行：期末不變，事件仍是 1 筆
  - 三張表的列數都沒有減少
- 「取消後 GET 回 403」要在真實環境確認

---

**AC：真機實跑六組事件**

狀態：🔍 需人工確認

- howto §2 已寫好完整指令：`payload()`／`post()` 兩個 shell 函式搭配 curl，依序是首次成功 → 續訂 → 重複 → 失敗 → 取消 → 到期，每步都附預期結果
- 需要 tunnel 或部署網址，以及 Supabase 已套用 migration

---

**後續建議**

- 使用者套用 #69 的 migration、建好四個測試帳號後，照 howto 跑一遍並貼回結果，再把 `[⚠️]` 改成 `[x]`

**測試策略**：Exploratory  
> 理由：需要真實 Supabase 與手動操作，以實跑紀錄驗收；腳本邏輯已由 US-020／US-021 覆蓋。

**優先級**：P0  
**相關功能**：Story 6／10  
**依賴關係**：US-004、US-009、US-011、US-013、US-015、US-021
