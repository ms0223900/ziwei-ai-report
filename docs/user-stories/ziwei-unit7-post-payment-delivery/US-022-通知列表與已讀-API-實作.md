# US-022：通知列表與已讀 API 實作

**作為** 已登入會員  
**我想要** 讀取自己的通知並標記已讀  
**以便** 回看付款與權益變更

**輸入格式**：
- US-021 的紅燈測試；US-004 的 text 常數

**輸出格式**：
- `app/api/notifications/route.ts`（GET）
- `app/api/notifications/[id]/read/route.ts`（POST；service role 寫入前先確認 session 擁有者，`read_at` 為 null 才更新）

**驗收條件**：
- [x] US-021 測試轉綠
- [x] 讀取用 session client（受 RLS）；已讀更新用 service role，條件含 `user_id=session user` 與 `read_at is null`
- [x] 兩支都設 `dynamic = "force-dynamic"`

#### 驗收說明

**整體結論**：PASS ✅

> US-021 的 13 項紅燈轉綠；全專案 565 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-021 測試轉綠**

狀態：✅ 通過

- `lib/notifications/list-notifications.ts` 的 `listNotifications()`：依 type 取 `NOTIFICATION_TEXT`；`subscription_active` 由事件找訂閱期末組日期；`subscription_inactive`／`admin_compensated` 補查訂單 id 組 href
- `app/api/notifications/route.ts`（`GET`）回 `{ notifications: [...] }`；`app/api/notifications/[id]/read/route.ts`（`POST`）回 `{ id, readAt }`
- 順帶把 Asia/Taipei 日期格式抽到 `lib/time/taipei-date.ts`，結果頁 API 共用

**AC-2：讀取用 session client；已讀用 service role 且條件含 `user_id` 與 `read_at is null`**

狀態：✅ 通過

- 列表查 `notifications` 用 `createSessionClient()`（受 RLS），另加 `user_id` 條件；補查訂閱／`admin_actions` 用 service role（authenticated 讀不到 `admin_actions`）
- 已讀先以 `id`＋`user_id` 確認擁有者，UPDATE 帶 `.eq("user_id")` 與 `.is("read_at", null)`；fake 新增 `is()` 以支援此條件

**AC-3：兩支都設 `dynamic = "force-dynamic"`**

狀態：✅ 通過

- 兩支 route 皆匯出 `dynamic = "force-dynamic"`；`proxy.ts` 未排除 `/api/notifications`

**測試策略**：Test-First  
> 理由：對 US-021 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 5 / Scenario 6  
**依賴關係**：US-021
