# US-009：頁首登入入口與 session 區

**作為** 訪客或會員  
**我想要** 在頁首看到登入入口或自己的名稱與登出  
**以便** 不登入也能跑完免費摘要，登入後重整仍認得我

**輸入格式**：
- 訪客：`data-report-slot="slot-auth-entry"` → `/login`、`/register`
- 已登入：`data-report-slot="slot-auth-session"` 顯示 `display_name` +「登出」
- 入口必須在 `layout`（或同等常駐層），高風險／失敗畫面也看得到
- 有 session 時呼叫 `ensureProfile`（只補列）
- 訪客 `POST /api/reports` 仍 200，不回 401

**輸出格式**：
- 頁首元件掛在 `app/layout.tsx`
- 槽位常數可加在 `lib/constants.ts`（`slot-auth-entry`／`slot-auth-session`）

**驗收條件**：
- [x] 表單、報告、高風險、失敗畫面皆可見對應 auth 槽位
- [x] 重整後仍顯示同一 `display_name`，不必再登入
- [x] 登出後頁首回到 `slot-auth-entry`
- [x] 訪客送出合法生辰，POST 不因未登入失敗
- [x] 首次登入進階仍鎖定（`access_status` 仍 `locked`）

#### 驗收說明

**整體結論**：PASS ✅

> 頁首掛在 `app/layout.tsx`，高風險／失敗／表單／報告皆看得到。`npx vitest run components/auth/AuthEntry.test.tsx components/auth/AuthSessionBar.test.tsx components/home/HomeClient.test.tsx` 通過。

---

**AC-1：各畫面可見 auth 槽位**

狀態：✅ 通過

- `AppHeader` 在 layout，不隨 `HomeClient` 提早 return 消失
- 訪客 `slot-auth-entry`；已登入 `slot-auth-session`

**AC-2：重整仍認得人**

狀態：✅ 通過

- cookie session + `getUser`；有 session 時 `ensureProfile` 只補列

**AC-3：登出回入口**

狀態：✅ 通過

- `AuthSessionBar` 呼叫 `signOut` 後 `window.location.reload()`，頁首回 `AuthEntry` 且首頁 client 報告 state 清空

**AC-4：訪客 POST 不 401**

狀態：✅ 通過

- 未改 `POST /api/reports` 訪客可呼；`HomeClient` 測試仍綠

**AC-5：首次登入進階仍鎖定**

狀態：✅ 通過

- `ensureProfile` 預設 `locked`；本包未改 ReportCard 鎖定區

**測試策略**：Test-After
> 理由：常駐頁首與多畫面可見性屬 UI，適合實作後補 DOM 斷言。

**優先級**：P0  
**相關功能**：Story 1／2b／3  
**依賴關係**：US-006、US-007、US-008
