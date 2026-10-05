# US-003：probe 小工具 實作

**作為** 講師  
**我想要** 一支只讀的 API 探測小工具  
**以便** 403／insufficient 這類畫面看不到的結果也能留下證據

**輸入格式**：
- US-002 的失敗測試；spec §2 FR-2

**輸出格式**：
- `scripts/unit8-checkpoint/probe.mjs`

**驗收條件**：
- [ ] US-002 測試全部轉綠
- [ ] 用法：`node scripts/unit8-checkpoint/probe.mjs <advanced|unlock> <report_id> --base $BASE --cookie "<Cookie 標頭>"`
- [ ] 缺 `--cookie` 或 `report_id` 非 UUID：繁中錯誤、exit code ≠ 0、不送請求
- [ ] 只印 HTTP 狀態碼與 `ok`／`reason`／`unlock_mode`／`error_code`；不印進階內容本文、不印 Cookie、不寫檔
- [ ] 不讀 `.env.local`、不使用 service role

**測試策略**：Test-First  
> 理由：對著 US-002 的失敗測試實作至轉綠。

**優先級**：P0  
**相關功能**：C2 探測小工具  
**來源**：FR-2 / Scenario 1、2、3、4  
**依賴關係**：US-002
