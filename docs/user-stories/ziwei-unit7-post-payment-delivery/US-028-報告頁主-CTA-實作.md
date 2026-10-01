# US-028：報告頁主 CTA 實作

**作為** 會員  
**我想要** 報告頁只依伺服器重讀的權益決定進階與主 CTA  
**以便** 回跳參數不能打開進階內容

**輸入格式**：
- US-027 的紅燈測試

**輸出格式**：
- `components/home/HomeClient.tsx`、`components/report/*`（視測試需要）

**驗收條件**：
- [x] US-027 測試轉綠
- [x] 進階讀取順序維持永久 → 單點 → 訂閱有效期間 → 鎖定；不讀 URL query
- [x] 不新增帳戶中心或訂單歷史頁

#### 驗收說明

**整體結論**：PASS ✅（不需改程式碼）

> 既有實作已符合 Story 7：US-027 的 5 項回歸斷言全數通過，本任務沒有改動任何程式碼。全專案 620 項測試通過（1 項原本就 skip），lint、typecheck 乾淨。

---

**AC-1：US-027 測試轉綠**

狀態：✅ 通過

- US-027 的測試一開始即為綠（回歸斷言）；另以暫時改壞 `resolveMembershipView()` 確認測試能抓到退化

**AC-2：進階讀取順序維持永久 → 單點 → 訂閱有效期間 → 鎖定；不讀 URL query**

狀態：✅ 通過

- 伺服器端 `lib/entitlements/resolve.ts` 的 `resolveReportEntitlement()` 依序查 `profiles.access_status`、`report_unlocks`、`subscriptions.current_period_end`，都不符合則為 `none`；`app/api/reports/[persistId]/route.ts` 依此回傳
- 前端 `lib/membership/view.ts` 的 `resolveMembershipView()` 同順序；永久與訂閱分支 `showUnlockWithPoint: false`
- 報告頁模組不讀 URL query（US-027 原始碼斷言覆蓋）

**AC-3：不新增帳戶中心或訂單歷史頁**

狀態：✅ 通過

- 本任務沒有新增任何路由；US-027 斷言 `app/` 下沒有 `account`／`me`／`my-orders`／`orders/page.tsx`

**測試策略**：Test-First  
> 理由：對 US-027 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7  
**來源**：Story 7 / Scenario 1～3  
**依賴關係**：US-027
