# US-006：建單不寫 order_pending 測試

**作為** 開發者  
**我想要** 先有會失敗的「建單後 0 則通知」測試  
**以便** 鎖住「只有付款結果才發通知」

**輸入格式**：
- spec §2 Story B／C、§3 FR-1／FR-2
- `app/api/payments/checkout/route.test.ts`（`:481` 恰一則 `order_pending`；約 `:495-523` S1-2 通知失敗與同 key 冪等兩個 case）
- `scripts/unit8-checkpoint/unit8-checkpoint.test.ts`（`:67-72` 比對 route 內 `` `order-pending:${orderId}` `` 字串）

**輸出格式**：
- 上述兩個測試檔的案例改寫

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] checkout：建單成功 → `notifications` 0 筆；回應、綠界欄位與 `ClientBackURL` 與現行相同
- [ ] checkout：建單後無 webhook → 該訂單 0 則通知
- [ ] checkout：刪除 S1-2「通知寫入失敗仍回成功」與「同 key 再寫 skipped」兩個 case（前提已不存在）
- [ ] unit8-checkpoint：`fixture-lifetime-pending.sql` 不含 `order_pending`；移除對 checkout route 字串的比對
- [ ] 回歸（可先綠）：webhook `RtnCode=1` 單次解鎖 → 恰一則 `unlock_completed`；`RtnCode≠1` → 恰一則 `order_failed`
- [ ] 回歸（可先綠）：既有 `order_pending` 資料列 → `GET /api/notifications` 文案與 `/orders/processing?order={id}` 連結不變

**測試策略**：Test-First 測試準備  
> 理由：修改既有行為，先改斷言鎖住新預期。

**優先級**：P0  
**相關功能**：Story B／C 建單不寫通知  
**來源**：FR-1 / Scenario 1、2、3、4、5、6；FR-2 / Scenario 1、2  
**依賴關係**：無
