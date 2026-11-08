# US-004：通知寫入 helper 實作

**作為** 開發者  
**我想要** 一支所有寫入點共用的通知 INSERT helper  
**以便** 重送不複製通知，通知失敗也不影響履約

**輸入格式**：
- US-003 的紅燈測試

**輸出格式**：
- `lib/notifications/insert-notification.ts`；type／text 常數放 `lib/notifications/types.ts`（text 依 spec §2 Story 5 表）

**驗收條件**：
- [ ] US-003 測試轉綠
- [ ] 八個 type 的 text 常數與 spec §2 Story 5 表逐字一致（`subscription_active` 的日期由 US-022 組）
- [ ] 不在任何 SQL 函式或履約同一交易內呼叫

**測試策略**：Test-First  
> 理由：對 US-003 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5  
**來源**：Story 1 / Scenario 2；Story 5 / Scenario 5  
**依賴關係**：US-003
