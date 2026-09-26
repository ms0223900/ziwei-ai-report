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
- [x] US-020 測試轉綠
- [x] CLI 主流程要放在 `import.meta.url === pathToFileURL(process.argv[1]).href` 守衛內；被 import 時不解析 argv、不呼叫 `process.exit`
- [x] HashKey／HashIV 用 `node --env-file=.env.local` 載入後從 `process.env` 讀取；輸出到 stdout，不寫入任何會入庫的檔案
- [x] 缺 `--mtn` 或缺 env 時，以繁中訊息結束並回傳非零 exit code

#### 驗收說明

**整體結論**：PASS ✅

> `scripts/ecpay-subscription-payload.mjs` 已完成：CheckMacValue 由腳本自行實作，另有兩個 payload builder 與 CLI。全套 vitest 通過，lint、typecheck 也通過。

---

**AC-1：US-020 測試轉綠**

狀態：✅ 通過

- `npx vitest run scripts`：5 passed（原本 5 failed）

---

**AC-2：CLI 放在 `import.meta.url` 守衛內**

狀態：✅ 通過

- `main()` 只在 `import.meta.url === pathToFileURL(process.argv[1]).href` 時執行；vitest import 時不會解析 argv，也不會 `process.exit`

---

**AC-3：HashKey 從 env 讀取，只輸出到 stdout**

狀態：✅ 通過

- 檔頭註明用法 `node --env-file=.env.local …`；只讀 `ECPAY_HASH_KEY`／`ECPAY_HASH_IV`，輸出是 `URLSearchParams` 格式，可直接 `curl -d`，不會寫檔
- 測試使用假的 fixture key，沒有真實金鑰入庫

---

**AC-4：缺 `--mtn` 或 env 時以繁中訊息結束，並回非零 exit code**

狀態：✅ 通過

- 實跑兩種情況都回 exit 1：
  - 缺 env：「缺少 ECPAY_HASH_KEY／ECPAY_HASH_IV，請用 node --env-file=.env.local 執行。」
  - 缺 mtn：「缺少 --mtn（MerchantTradeNo）」

**測試策略**：Test-First  
> 理由：對 US-020 的紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 10  
**依賴關係**：US-020
