# US-027：報告頁主 CTA 測試

**作為** 開發者  
**我想要** 先有會失敗的報告頁主 CTA 測試  
**以便** 已有永久或訂閱權益時不再把「用 1 點解鎖」當主 CTA，且回跳參數打不開進階

**輸入格式**：
- spec §2 Story 7
- `components/home/HomeClient.tsx`、`components/report/AdvancedLockedPanel.tsx`、`components/report/UnlockWithPointCta.tsx`、`HomeClient.test.tsx`

**輸出格式**：
- `components/home/HomeClient.test.tsx`（或 `components/report/*.test.tsx`）新增案例

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）；若既有行為已符合，該斷言標為回歸斷言，可先綠
- [ ] S7-2：`access_status=unlocked` 打開自己的報告 → 顯示進階，畫面沒有以 `UNLOCK_WITH_POINT_CTA` 為主 CTA 的按鈕
- [ ] S7-2：訂閱在有效期間打開自己的報告 → 顯示進階，同上
- [ ] S7-1：報告鎖定、網址帶 `RtnCode=1` → 進階仍鎖定
- [ ] S7-3：已有單點解鎖報告 → 選單仍可進該報告；沒有新的帳戶中心路由

**測試策略**：Test-First 測試準備  
> 理由：顯示條件是明確的權益分支，可用 RTL 斷言。

**優先級**：P0  
**相關功能**：Story 7  
**來源**：Story 7 / Scenario 1～3  
**依賴關係**：無
