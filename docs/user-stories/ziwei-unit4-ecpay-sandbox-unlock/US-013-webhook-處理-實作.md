# US-013：webhook 處理 實作

**作為** 已完成沙盒真實付款的會員  
**我想要** 只在 ReturnURL 驗簽通過後被解鎖  
**以便** 重整後仍能看完整解讀

**輸入格式**：
- US-012 紅燈測試
- 同一 CheckMacValue 函式（US-007）
- service role 更新 orders 與 `profiles.access_status`；不改 points／subscription
- 無使用者 session；matcher 已排除（US-003）

**輸出格式**：
- `app/api/payments/ecpay/webhook/route.ts`
- 寫入成功後才回 `1|OK`

**驗收條件**：
- [x] US-012 測試轉綠
- [x] 已 unlocked＋pending 的成功通知仍將訂單標 paid 再回 `1|OK`
- [x] Client SDK 仍不能改 `access_status`
- [x] 不實作 QueryTradeInfo
- [x] 不把 grant 當本路徑

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run app/api/payments/ecpay/webhook/route.test.ts` 12 passed；`tsc --noEmit` 通過。Mutation：`SimulatePaid === "1"` 改 `"2"` 後履約斷言變紅，已還原。

---

**AC-1：US-012 測試轉綠**

狀態：✅ 通過

- `app/api/payments/ecpay/webhook/route.test.ts` 全綠

---

**AC-2：unlocked＋pending 成功通知仍標 paid**

狀態：✅ 通過

- `app/api/payments/ecpay/webhook/route.ts` 的 `POST()` 在 `access_status === unlocked` 時仍 `markOrderPaid()`，不重寫 points／subscription

---

**AC-3：Client SDK 仍不能改 access_status**

狀態：✅ 通過

- 本任務未改 `supabase/migrations/20260913000000_create_profiles.sql`：`grant update (display_name)` + `profiles_guard_entitlements` 仍擋非 service_role 改權益欄

---

**AC-4：不實作 QueryTradeInfo**

狀態：✅ 通過

- `route.ts` 無 QueryTradeInfo

---

**AC-5：不把 grant 當本路徑**

狀態：✅ 通過

- `route.ts` 未 import `/api/dev/grant-access`；解鎖只走 service role 更新 `profiles.access_status`

**測試策略**：Test-First  
> 理由：對 US-012 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 5／6／7／8／9  
**依賴關係**：US-001、US-003、US-004、US-007、US-012
