# US-010：ReturnURL 訂閱分派 測試

**作為** 開發者  
**我想要** 先有會失敗的首次授權分派測試  
**以便** 首次開通、重送與補償的語意被鎖住

**輸入格式**：
- `app/api/payments/ecpay/webhook/route.ts`、`route.test.ts`
- AC S3-1～S3-9

**輸出格式**：
- 擴充 `app/api/payments/ecpay/webhook/route.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] S3-1：月繳訂單改為 paid；fake 內有 active 訂閱，期末 = 起始 + 1 個月；有一筆 `first_success` 事件；`profiles.subscription_status='active'`；回 `1|OK`
- [ ] S3-2：先完成首次成功與一次續訂，再重送首次成功通知 → 期末不變，`first_success` 仍只有一筆
- [ ] S3-3：`access_status`／`points_balance` 不變，`report_unlocks`、`point_transactions` 沒有新列
- [ ] S3-4：`SimulatePaid=1` 時訂單仍為 pending，沒有訂閱列；S3-5：驗簽失敗回 400；S3-6：`RtnCode≠1` 時訂單改為 failed，沒有訂閱
- [ ] S3-7：RPC 錯誤回 `0|Error`；訂單已 paid 時重送會再呼叫 RPC 並補建
- [ ] S3-8：訂閱已取消時重播首次成功 → 狀態與期末不變
- [ ] RPC 回 `conflict` 時記 log，並回 `1|OK`
- [ ] S3-9：終身與點數包的分派不變
- [ ] 備註：S3-3／S3-9 在現況下可能已經是綠的，屬回歸斷言

**測試策略**：Test-First（測試準備）  
> 理由：分派控制流明確，可用 fake 驗證。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-002、US-005
