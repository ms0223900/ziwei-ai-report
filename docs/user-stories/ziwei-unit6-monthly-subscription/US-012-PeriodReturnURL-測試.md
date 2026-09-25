# US-012：PeriodReturnURL 測試

**作為** 開發者  
**我想要** 先有會失敗的週期通知路由測試  
**以便** 續訂、失敗、重送、取消後不復活等規則都被鎖住

**輸入格式**：
- spec §2 Story 4／5；AC S4-1～S5-3
- 路徑：`app/api/payments/ecpay/period-webhook/route.ts`（新建）

**輸出格式**：
- `app/api/payments/ecpay/period-webhook/route.test.ts`
- 被測檔案尚不存在時，先放一個空殼（例如 route 回 501、函式回 `none`／丟 not implemented），只為讓測試能載入（沿用單元 5 US-012／US-019 慣例）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] S4-1：`TotalSuccessTimes=2` 成功 → 期末 +1 個月、`status=active`、新增 `renewal_success`（`period:{MTN}:2`），回純文字 `1|OK`（`Content-Type: text/plain`）
- [ ] S4-2：重送不延展，事件數不變；S4-3：`TotalSuccessTimes=1` 寫入 `first_duplicate`，不延展
- [ ] S4-4：驗簽失敗回 400，事件數不變；S4-5：對不到 MTN 回 400；S4-6：`Amount≠19` 回 400；S4-7：`SimulatePaid=1` 回 `1|OK` 且沒有事件
- [ ] S4-8：已取消的訂閱收到成功通知 → **新增一筆事件**，狀態與期末不變
- [ ] S4-9：`gwsr` 或 `Gwsr` 兩種大小寫都能寫入
- [ ] S5-1：失敗 → `past_due`、期末不變、新增 `payment_failed`，回 `1|OK`
- [ ] S5-2：失敗通知重送不重複寫入（冪等鍵 `failed:{mtn}:{gwsr}`；沒有 gwsr 時用 `failed:{mtn}:{ProcessDate 原字串}`，**不可**用解析後可能回退為 now 的值）
- [ ] S5-3：已取消的訂閱收到失敗通知，狀態仍為 cancelled
- [ ] `ProcessDate` 無法解析時仍能寫入（`processed_at` 回退為 now）

**測試策略**：Test-First（測試準備）  
> 理由：新路由的輸入輸出與狀態轉換都很明確。

**優先級**：P0  
**相關功能**：Story 4／5  
**依賴關係**：US-002、US-005
