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
- [ ] 表單、報告、高風險、失敗畫面皆可見對應 auth 槽位
- [ ] 重整後仍顯示同一 `display_name`，不必再登入
- [ ] 登出後頁首回到 `slot-auth-entry`
- [ ] 訪客送出合法生辰，POST 不因未登入失敗
- [ ] 首次登入進階仍鎖定（`access_status` 仍 `locked`）

**測試策略**：Test-After
> 理由：常駐頁首與多畫面可見性屬 UI，適合實作後補 DOM 斷言。

**優先級**：P0  
**相關功能**：Story 1／2b／3  
**依賴關係**：US-006、US-007、US-008
