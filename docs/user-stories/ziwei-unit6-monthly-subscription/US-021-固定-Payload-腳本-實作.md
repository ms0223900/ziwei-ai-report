# US-021：固定 Payload 腳本 實作

**作為** 講師  
**我想要** 用一行指令產生可以直接 `curl` 的固定 Payload  
**以便** 課堂上不必等真實扣款就能重播事件

**輸入格式**：
- US-020 的紅燈測試

**輸出格式**：
- `scripts/ecpay-subscription-payload.mjs`
- `package.json` script（可選）

**驗收條件**：
- [ ] US-020 測試轉綠
- [ ] CLI 主流程要放在 `import.meta.url === pathToFileURL(process.argv[1]).href` 守衛內；被 import 時不解析 argv、不呼叫 `process.exit`
- [ ] HashKey／HashIV 用 `node --env-file=.env.local` 載入後從 `process.env` 讀取；輸出到 stdout，不寫入任何會入庫的檔案
- [ ] 缺 `--mtn` 或缺 env 時，以繁中訊息結束並回傳非零 exit code

**測試策略**：Test-First  
> 理由：對 US-020 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 10  
**依賴關係**：US-020
