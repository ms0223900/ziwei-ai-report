# US-012：PeriodReturnURL 測試

**作為** 開發者  
**我想要** 先有會失敗的週期通知路由測試  
**以便** 續訂、失敗、重送、取消後不復活等規則都被鎖住

**輸入格式**：
- spec §2 Story 4／5；AC S4-1～S5-4
- 路徑：`app/api/payments/ecpay/period-webhook/route.ts`（新建）

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法／import 錯誤）
- [ ] S4-1：`TotalSuccessTimes=2` 成功時期末加 1 個月，回純文字 `1|OK`（`Content-Type: text/plain`）
- [ ] S4-2 重送不延展；S4-3 `TotalSuccessTimes=1` 寫 `first_duplicate` 不延展
- [ ] S4-4 驗簽失敗 400；S4-5 對不到 MTN 400；S4-6 `Amount≠19` 400；S4-7 `SimulatePaid=1` 回 `1|OK` 且無事件
- [ ] S4-8 cancelled 收到成功通知：狀態與期末都不變
- [ ] S4-9 `gwsr`／`Gwsr` 兩種大小寫都寫入
- [ ] S5-1 失敗時設 `past_due` 且期末不變；S5-2 失敗重送冪等（`failed:{mtn}:{gwsr}`）；S5-3 cancelled 收到失敗通知仍是 cancelled
- [ ] `ProcessDate` 無法解析時仍能寫入（`processed_at` 回退為 now）

**測試策略**：Test-First  
> 理由：新路由的輸入輸出與狀態轉換明確。

**優先級**：P0  
**相關功能**：Story 4／5  
**依賴關係**：US-005
