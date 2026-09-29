# US-004：通知寫入 helper 實作

**作為** 開發者  
**我想要** 一支所有寫入點共用的通知 INSERT helper  
**以便** 重送不複製通知，通知失敗也不影響履約

**輸入格式**：
- US-003 的紅燈測試

**輸出格式**：
- `lib/notifications/insert-notification.ts`；type／text 常數放 `lib/notifications/types.ts`（text 依 spec §2 Story 5 表）

**驗收條件**：
- [x] US-003 測試轉綠
- [x] 八個 type 的 text 常數與 spec §2 Story 5 表逐字一致（`subscription_active` 的日期由 US-022 組）
- [x] 不在任何 SQL 函式或履約同一交易內呼叫

#### 驗收說明

**整體結論**：PASS ✅

> US-003 的 5 項紅燈測試轉綠；全專案 450 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-003 測試轉綠**

狀態：✅ 通過

- `lib/notifications/insert-notification.ts` 的 `insertNotification()`：成功回 `inserted`；`23505` 回 `skipped`（不記 log）；其他錯誤與 client throw 回 `failed` 並 `console.error`；含 `import "server-only"`

**AC-2：八個 type 的 text 與 spec 逐字一致**

狀態：✅ 通過

- `lib/notifications/types.ts` 的 `NOTIFICATION_TEXT`；`subscription_active` 保留 `{日期}` 佔位，由 US-022 組
- `lib/notifications/types.test.ts` 以 spec §2 Story 5 表逐字斷言

**AC-3：不在 SQL 函式或履約同一交易內呼叫**

狀態：✅ 通過

- helper 是獨立的應用層 INSERT，沒有任何 SQL 函式或 migration 引用；呼叫端須在履約提交後呼叫（檔內註解已標明），呼叫點由 US-006 起的任務落實

**測試策略**：Test-First  
> 理由：對 US-003 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 1 / Scenario 2；Story 5 / Scenario 5  
**依賴關係**：US-003
