# US-011：ReturnURL 訂閱分派 實作

**作為** 綠界 ReturnURL  
**我想要** 月繳首次授權成功後建立有效訂閱  
**以便** 首次付款只開通有期限的權益

**輸入格式**：
- US-010 的紅燈測試
- US-004 的 RPC 已套用

**輸出格式**：
- `app/api/payments/ecpay/webhook/route.ts`

**驗收條件**：
- [x] US-010 測試轉綠
- [x] 驗簽 → 對單 → 對金額 → 排除模擬付款 → 看 RtnCode，這個順序不變
- [x] 真機實跑由 US-022 統一承接，本 US 不要求

#### 驗收說明

**整體結論**：PASS ✅

> webhook 新增月繳分支，呼叫 `activate_subscription_from_order(p_order_id)`。全套 vitest 378 passed／1 skipped，lint、typecheck 都通過。

---

**AC-1：US-010 測試轉綠**

狀態：✅ 通過

- `npx vitest run app/api/payments/ecpay/webhook/route.test.ts`：30 passed（原本 5 failed）
- `app/api/payments/ecpay/webhook/route.ts` 的 `activateSubscription()`：
  - RPC 回錯誤或 `ok=false` 時回 false，route 回 `0|Error`（400），讓綠界重送並補償
  - 回 `conflict` 時記 log，仍回 true，route 回 `1|OK`

---

**AC-2：驗簽 → 對單 → 對金額 → 排除模擬付款 → 看 RtnCode 的順序不變**

狀態：✅ 通過

- 月繳分支接在既有的「未 paid 才 markOrderPaid」之後，和點數包、終身方案同一層，前段驗證流程沒有改動
- 參數名稱 `p_order_id` 與 `20260925000001_subscriptions_rpc.sql` 的簽名一致

---

**AC-3：真機實跑由 US-022 統一承接**

狀態：✅ 通過（依 AC 本身定義，本 US 不要求實跑）

**測試策略**：Test-First  
> 理由：對 US-010 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3  
**依賴關係**：US-004、US-010
