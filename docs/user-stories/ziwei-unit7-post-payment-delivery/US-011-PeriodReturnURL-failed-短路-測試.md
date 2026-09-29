# US-011：PeriodReturnURL failed 短路 測試

**作為** 開發者  
**我想要** 先有會失敗的週期通知 failed 短路測試  
**以便** 關聯訂單已 failed 時不寫週期事件

**輸入格式**：
- spec §2 Story 4（PeriodReturnURL 段）
- `app/api/payments/ecpay/period-webhook/route.ts`、`route.test.ts`

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.test.ts` 新增案例

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] S4-4：訂閱列 `order_id` 指向 failed 訂單 + 驗簽通過 + `RtnCode=1` → 回 `1|OK`、`subscription_events` 列數不變、`current_period_end` 不變
- [ ] `RtnCode != 1` 時同樣短路：回 `1|OK`、`subscriptions.status` 不變、`subscription_events` 列數不變
- [ ] 對不到訂閱 → 仍是既有 `0|Error`（回歸斷言，可先綠）
- [ ] `order_id` 為 null → 不短路，照既有流程寫事件（回歸斷言，可先綠）

**測試策略**：Test-First 測試準備  
> 理由：修改既有分支，條件明確。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 4  
**依賴關係**：US-002
