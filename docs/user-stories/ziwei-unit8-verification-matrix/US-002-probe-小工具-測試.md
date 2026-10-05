# US-002：probe 小工具 測試

**作為** 講師  
**我想要** 先鎖住 `probe.mjs` 的參數驗證與輸出遮罩  
**以便** 實作時對著失敗測試轉綠

**輸入格式**：
- spec §2 FR-2；既有 `scripts/ecpay-subscription-payload.test.ts` 的測試層級

**輸出格式**：
- `scripts/unit8-checkpoint/probe.test.ts`

**驗收條件**：
- [ ] 斷言：子命令只接受 `advanced`、`unlock`；`advanced` 組出 `GET {base}/api/reports/{id}`，`unlock` 組出 `POST {base}/api/reports/unlock-with-point`、body `{"report_id": id}`
- [ ] 斷言：缺 `--cookie` 時以繁中錯誤結束、exit code ≠ 0、fetch 未被呼叫
- [ ] 斷言：`report_id` 不是 UUID 時以繁中錯誤結束、exit code ≠ 0、fetch 未被呼叫
- [ ] 斷言：200 回應只印狀態碼與 `ok`／`reason`／`unlock_mode`，不含 `rationale`／`action_plan`／`path_compare` 的內容
- [ ] 斷言：403 回應印出狀態碼與 `error_code`
- [ ] 斷言：任何輸出都不含 Cookie 值；不呼叫任何寫檔 API
- [ ] 聚焦測試因功能尚未實作而預期紅燈

**測試策略**：Test-First 測試準備  
> 理由：參數驗證與輸出遮罩是明確的 input/output，先寫失敗測試再實作。

**優先級**：P0  
**相關功能**：C2 探測小工具  
**來源**：FR-2 / Scenario 1、2、3、4  
**依賴關係**：無
