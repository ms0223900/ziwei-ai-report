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
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] S4-4：訂閱列 `order_id` 指向 failed 訂單 + 驗簽通過 + `RtnCode=1` → 回 `1|OK`、`subscription_events` 列數不變、`current_period_end` 不變
- [x] `RtnCode != 1` 時同樣短路：回 `1|OK`、`subscriptions.status` 不變、`subscription_events` 列數不變
- [x] 對不到訂閱 → 仍是既有 `0|Error`（回歸斷言，可先綠）
- [x] `order_id` 為 null → 不短路，照既有流程寫事件（回歸斷言，可先綠）

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `app/api/payments/ecpay/period-webhook/route.test.ts` 新增 describe「linked order failed」共 5 項：2 項因功能未實作而紅燈，3 項回歸斷言先綠。失敗都是斷言不成立（仍寫入事件、狀態被改為 `past_due`），不是語法或 import 錯誤。待 US-012 轉綠。lint、typecheck 乾淨。

- 紅燈：S4-4 關聯訂單 failed + `RtnCode=1` 仍寫了事件；`RtnCode != 1` 仍把訂閱改成 `past_due`
- 先綠（回歸）：對不到訂閱仍 `0|Error`；`order_id` 為 null 照常寫事件並延長；關聯訂單 paid 不短路

**測試策略**：Test-First 測試準備  
> 理由：修改既有分支，條件明確。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 4  
**依賴關係**：US-002
