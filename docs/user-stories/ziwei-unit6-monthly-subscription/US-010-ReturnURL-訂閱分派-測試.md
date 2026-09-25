# US-010：ReturnURL 訂閱分派 測試

**作為** 開發者  
**我想要** 先有會失敗的首次授權分派測試  
**以便** 首次開通、重送與補償語意被鎖住

**輸入格式**：
- `app/api/payments/ecpay/webhook/route.ts`、`route.test.ts`
- AC S3-1～S3-9

**輸出格式**：
- 擴充 `app/api/payments/ecpay/webhook/route.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法／import 錯誤）
- [ ] S3-1：月繳訂單 paid，並以 `p_order_id` 呼叫 `activate_subscription_from_order`，回 `1|OK`
- [ ] S3-2／S3-8：重送或已取消時 RPC 回 `already_fulfilled`，仍回 `1|OK`，且期末不變
- [ ] S3-3：不改 `access_status`／`points_balance`
- [ ] S3-4 `SimulatePaid=1`、S3-5 驗簽失敗、S3-6 `RtnCode≠1` 行為同單元 4
- [ ] S3-7：RPC 錯誤回 `0|Error`；訂單已 paid 時重送會再呼叫 RPC
- [ ] RPC 回 `conflict` → 記 log，回 `1|OK`
- [ ] S3-9：終身／點數包分派不變

**測試策略**：Test-First  
> 理由：分派控制流明確，可用 fake 驗證。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-005
