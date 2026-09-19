# US-022：grant 與付款互動 實作

**作為** 講師／學員  
**我想要** 繼續用 grant 開通，且與 checkout／Webhook 規則清楚  
**以便** 不走綠界也能驗三態，但不冒充金流

**輸入格式**：
- US-021 回歸測試（grant route 已存在，非預期紅燈）
- **保留** `POST /api/dev/grant-access`；禁止刪 route、禁止接到解鎖 CTA
- 已 unlocked（grant 或付款）再成功 Webhook：`1|OK`、不重複解鎖

**輸出格式**：
- grant route 維持單元 3 契約；必要時忽略 orders
- CTA 不打 grant（對齊 US-016）

**驗收條件**：
- [x] US-021 回歸測試通過
- [x] 產品解鎖 CTA 不呼叫 grant
- [x] checkout 對已開通仍 409
- [x] 付款後 grant 仍 200、不改訂單、不加點

#### 驗收說明

**整體結論**：PASS ✅

> Test-After。grant route 維持單元 3 契約，不寫 `orders`、不 fetch 綠界；產品碼無需再改。`npx vitest run app/api/dev/grant-access/route.test.ts app/api/payments/checkout/route.test.ts components/report/AdvancedLockedPanel.test.tsx` 17 passed。

---

**AC-1：US-021 回歸測試通過**

狀態：✅ 通過

- `app/api/dev/grant-access/route.test.ts` 8 passed（含 pending 列數不變、開關 404、不呼叫 ECPay）

---

**AC-2：產品解鎖 CTA 不呼叫 grant**

狀態：✅ 通過

- `UnlockCheckoutCta.tsx` 只 `fetch("/api/payments/checkout")`
- `AdvancedLockedPanel.test.tsx` 斷言 URL 不含 `/api/dev/grant-access`

---

**AC-3：checkout 對已開通仍 409**

狀態：✅ 通過

- `app/api/payments/checkout/route.test.ts` 的 `returns 409 when already unlocked and does not insert pending`

---

**AC-4：付款後 grant 仍 200、不改訂單、不加點**

狀態：✅ 通過

- `route.test.ts` 的 `stays 200 after a paid order and does not change points`：paid 單 snapshot 不變、`points_balance` 仍 5

**測試策略**：Test-After  
> 理由：保留既有 grant route 與 CTA 不接線，對齊 US-021 回歸測試即可，無新的先紅契約。

**優先級**：P0  
**相關功能**：Story 14  
**依賴關係**：US-011、US-013、US-021
