# US-009：ReturnURL failed 終態 測試

**作為** 開發者  
**我想要** 先有會失敗的 ReturnURL failed 終態測試  
**以便** 晚到的成功通知不能把 failed 翻成 paid

**輸入格式**：
- spec §2 Story 4、§6 一（現況 `status !== "paid"` 會把 failed 改回 paid 並履約）
- `app/api/payments/ecpay/webhook/route.ts`、`route.test.ts`

**輸出格式**：
- `app/api/payments/ecpay/webhook/route.test.ts` 新增案例

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] S4-1：pending + 驗簽通過 + `RtnCode != 1` → `status=failed`、恰一則 `order_failed`、點數／`access_status`／訂閱列不變、回 `1|OK`
- [ ] S4-2：同一失敗 payload 再送 → 仍一則 `order_failed`、status 仍 failed
- [ ] S4-3：已 failed + 驗簽通過 + `RtnCode=1` → 回 `1|OK`、status 仍 failed、沒有 credit、沒有解鎖、沒有新訂閱（三種 plan 各一案）
- [ ] S6-5：單元 5「ReturnURL 已 paid 且無 credit」仍補加點並回 `1|OK`（回歸斷言，可先綠）
- [ ] `SimulatePaid=1` 與驗簽失敗的既有行為不變（回歸斷言，可先綠）

**測試策略**：Test-First 測試準備  
> 理由：修改既有邏輯，先以紅燈重現 failed 被翻盤的問題。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 1、Scenario 2、Scenario 3；Story 6 / Scenario 5  
**依賴關係**：US-002
