# US-021：固定 Payload 腳本 實作

**作為** 講師  
**我想要** 用一行指令產生可 `curl` 的固定 Payload  
**以便** 課堂不必等真實扣款就能重播事件

**輸入格式**：
- US-020 紅燈測試

**輸出格式**：
- `scripts/ecpay-subscription-payload.mjs`
- `package.json` script（可選）

**驗收條件**：
- [ ] US-020 測試轉綠
- [ ] HashKey／HashIV 只從環境變數讀取；輸出到 stdout，不寫入任何入庫的檔案
- [ ] 缺 `--mtn` 或 env 時以繁中訊息結束並回非零 exit code

**測試策略**：Test-First  
> 理由：對 US-020 紅燈實作至綠。

**優先級**：P1  
**相關功能**：Story 10  
**依賴關係**：US-020
