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
- [ ] US-021 測試轉綠
- [ ] 讀取用 session client（受 RLS）；已讀更新用 service role，條件含 `user_id=session user` 與 `read_at is null`
- [ ] 兩支都設 `dynamic = "force-dynamic"`

**測試策略**：Test-First  
> 理由：對 US-021 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 5 / Scenario 6  
**依賴關係**：US-021
