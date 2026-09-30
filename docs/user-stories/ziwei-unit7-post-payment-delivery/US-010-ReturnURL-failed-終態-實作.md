# US-010：ReturnURL failed 終態 實作

**作為** 綠界 ReturnURL  
**我想要** 失敗改走 `mark_order_failed`，已 failed 的訂單直接回 `1|OK`  
**以便** failed 之後不再更新、不再履約

**輸入格式**：
- US-009 的紅燈測試；US-008 的 `markOrderFailed`

**輸出格式**：
- `app/api/payments/ecpay/webhook/route.ts`：移除本地 `markOrderFailed`，改呼叫 `lib/payments/mark-order-failed.ts`；對單後、`markOrderPaid` 前加 failed 短路

**驗收條件**：
- [x] US-009 測試轉綠
- [x] 驗簽順序、對單、對金額、`SimulatePaid=1` 排除都不變
- [x] 應用層拒絕 `failed → paid`；不要求改 `orders_guard_status` trigger

#### 驗收說明

**整體結論**：PASS ✅

> US-009 的 5 項紅燈轉綠；全專案 474 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-009 測試轉綠**

狀態：✅ 通過

- `app/api/payments/ecpay/webhook/route.ts` 的 `POST()`：移除本地 `markOrderFailed`，改呼叫 `lib/payments/mark-order-failed.ts`；在 `SimulatePaid` 排除之後、`markOrderPaid` 之前加 `order.status === "failed"` 短路回 `1|OK`
- **行為差異**：`markOrderFailed()` 回 `error`（狀態寫入失敗）時改回 `0|Error` 讓綠界重送；原本無論成敗都回 `1|OK`

**AC-2：驗簽順序、對單、對金額、`SimulatePaid=1` 排除都不變**

狀態：✅ 通過

- 這四段程式碼未動；failed 短路放在其後。驗簽失敗與 `SimulatePaid=1` 的既有測試和 US-009 回歸案例皆通過

**AC-3：應用層拒絕 `failed → paid`；不改 trigger**

狀態：✅ 通過

- 短路在 `markOrderPaid` 與所有履約分支之前；未修改任何 migration 或 `orders_guard_status`

**測試策略**：Test-First  
> 理由：對 US-009 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 4  
**來源**：Story 4 / Scenario 1、Scenario 2、Scenario 3  
**依賴關係**：US-008、US-009
