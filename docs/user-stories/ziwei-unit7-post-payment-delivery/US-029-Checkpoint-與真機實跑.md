# US-029：Checkpoint 與真機實跑

**作為** 講師  
**我想要** 一份可重跑的 Checkpoint 與 howto  
**以便** 課堂上能重現七態結果頁、failed 終態與一次補償

**輸入格式**：
- US-006、US-010、US-012、US-014、US-016、US-017、US-020、US-023、US-026 的成果；單元 6 的 `scripts/subscription-checkpoint/` 與 `scripts/ecpay-subscription-payload.mjs`

**輸出格式**：
- `scripts/post-payment-checkpoint/`：fixture SQL（一筆 `points_pack_5`、`status=paid`、`trade_no` 與 `payment_date` 有值、無 credit）；呼叫 `markOrderFailed` 的 service role 腳本
- `howto-post-payment-delivery.md`（本目錄）

**驗收條件**：
- [x] fixture 只在 Checkpoint 使用；不改單元 5「ReturnURL 已 paid 且無 credit 必須補加點」分支
- [x] fixture SQL 用 transaction 內 `set_config` 宣告 service_role（沿用單元 6 寫法），可重跑
- [⚠️] 真機：建單後綠界回跳到 `/orders/processing?order={id}`，並有一則 `order_pending`
- [⚠️] 真機：依序取得 `accepted`、`unlock_completed`、`points_credited`、`subscription_active`、`needs_manual`（fixture）、`incomplete`（腳本 mark failed）的畫面截圖或文字紀錄
- [⚠️] 真機：管理者對 fixture 補償一次 → 餘額 +5；再送一次 → `skipped_already_fulfilled`
- [⚠️] 真機：`/notifications` 看得到上述各事件的通知並可標已讀
- [x] howto 列出 `ADMIN_USER_IDS` 設定方式與每步預期結果

#### 驗收說明

**整體結論**：PARTIAL ⚠️

> Checkpoint 腳本與 howto 已完成，並以 PGlite 依序套用全部 migration 後實跑兩支 SQL。四條「真機」AC 需要真實 Supabase、綠界 sandbox 與瀏覽器操作，本環境無法執行，待使用者依 howto §6 回填紀錄。

---

**AC-1：fixture 只在 Checkpoint 使用；不改單元 5 分支**

狀態：✅ 通過

- `scripts/post-payment-checkpoint/fixture-paid-no-credit.sql` 直接 INSERT 固定 MTN `TESTFIXPTS0001` 的訂單，不寫 `point_transactions`、不呼叫加點；`app/api/payments/ecpay/webhook/route.ts` 本任務未動（單元 5「已 paid 無 credit 補加點」測試仍通過）

**AC-2：fixture 用 transaction 內 `set_config` 宣告 service_role，可重跑**

狀態：✅ 通過

- PGlite 實跑：重跑時先依外鍵順序清掉上一輪的通知、`admin_actions`、加點與訂單，再重建（模擬補償後重跑，殘留 0 列）；少了 `set_config` 時被 `orders_guard_status` 擋下
- `scripts/post-payment-checkpoint/post-payment-checkpoint.test.ts` 靜態檢查角色宣告位置、清理順序與 fixture 內容

**AC-3：真機回跳帶 `?order=` 並有一則 `order_pending`**

狀態：🔍 需人工確認

- 步驟見 howto §1；程式邏輯已由 US-005／006 測試覆蓋

**AC-4：真機依序取得六個 screen 的畫面紀錄**

狀態：🔍 需人工確認

- 步驟見 howto §2～§4。`incomplete` 用 `scripts/post-payment-checkpoint/mark-failed.sql`
- **差異說明**：US 寫「呼叫 `markOrderFailed` 的 service role 腳本」，但 `lib/payments/mark-order-failed.ts` 含 `import "server-only"` 與無副檔名 import，node 無法直接執行（單元 6 的 payload 腳本也因此自行重寫演算法）。改以 SQL 重現同樣兩步：帶 `status=pending` 條件更新，commit 後另一次交易寫 `order-failed:{id}`（`on conflict do nothing`）；測試對照 TS 版的條件與 key。PGlite 實跑：pending → failed、通知 1 則，重跑仍 1 則；paid 不動、通知 0。howto 另附走正式路徑的做法（送 `--rtn-code 10100058` 的失敗通知）

**AC-5：真機補償一次 +5，再送 `skipped_already_fulfilled`**

狀態：🔍 需人工確認

- 步驟見 howto §3；邏輯由 US-024／025 測試覆蓋（含重放 Webhook 不再 +5）

**AC-6：真機 `/notifications` 看得到各則通知並可標已讀**

狀態：🔍 需人工確認

- 步驟見 howto §5

**AC-7：howto 列出 `ADMIN_USER_IDS` 設定方式與每步預期結果**

狀態：✅ 通過

- `howto-post-payment-delivery.md` §0.2 列出 `APP_BASE_URL`、`ADMIN_USER_IDS`（查 uuid 的 SQL、Vercel 需 Redeploy）；各步附預期結果與查詢 SQL；§6 為實跑紀錄表；§7 常見狀況

---

**後續建議**

- 依 howto 實跑後把 §6 表格貼回此處，AC-3～AC-6 改為 `[x]`
- 實跑時一併確認：非白名單 `/admin/orders` 的 HTTP 403（US-026）與 375px 無橫向捲動（US-020 AC-8）

**測試策略**：Exploratory  
> 理由：需要真實 Supabase、綠界 sandbox 與手動操作，以實跑紀錄驗收；邏輯已由前面的測試覆蓋。

**優先級**：P0  
**相關功能**：Story 1～6  
**來源**：Story 6（§2 測試 fixture）；Story 4 / Scenario 6  
**依賴關係**：US-006、US-010、US-012、US-014、US-016、US-017、US-020、US-023、US-026
