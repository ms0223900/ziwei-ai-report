# US-003：probe 小工具 實作

**作為** 講師  
**我想要** 一支只讀的 API 探測小工具  
**以便** 403／insufficient 這類畫面看不到的結果也能留下證據

**輸入格式**：
- US-002 的失敗測試；spec §2 FR-2

**輸出格式**：
- `scripts/unit8-checkpoint/probe.mjs`

**驗收條件**：
- [x] US-002 測試全部轉綠
- [x] 用法：`node scripts/unit8-checkpoint/probe.mjs <advanced|unlock> <report_id> --base $BASE --cookie "<Cookie 標頭>"`
- [x] 缺 `--cookie` 或 `report_id` 非 UUID：繁中錯誤、exit code ≠ 0、不送請求
- [x] 只印 HTTP 狀態碼與 `ok`／`reason`／`unlock_mode`／`error_code`；不印進階內容本文、不印 Cookie、不寫檔
- [x] 不讀 `.env.local`、不使用 service role


#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run scripts`：4 個檔案、26 個測試全過，含 US-002 的 10 個斷言。`npm run lint`、`npm run typecheck` 通過。CLI 實跑時傳入非 UUID，會印出繁中錯誤並以 exit=1 結束。

---

**AC-1：US-002 測試轉綠**

狀態：✅ 通過

- `scripts/unit8-checkpoint/probe.test.ts` 10/10 通過

**AC-2：用法**

狀態：✅ 通過

- `scripts/unit8-checkpoint/probe.mjs` 的 `parseArgs()` 讀取子命令、`report_id`、`--base`、`--cookie`；檔頭註解寫明用法

**AC-3：缺 Cookie 或非 UUID 不送請求**

狀態：✅ 通過

- `validate()` 先於 `fetch` 執行，回傳繁中訊息、exit 1；缺 `--base` 也比照處理

**AC-4：只印判讀欄位**

狀態：✅ 通過

- `runProbe()` 只輸出 `status` 與 `PRINTED_FIELDS`（`ok`／`reason`／`unlock_mode`／`error_code`），不碰 Cookie，也不 import 任何 fs 相關模組

**AC-5：不讀 `.env.local`、不用 service role**

狀態：✅ 通過

- 原始碼沒有 `process.env`，也沒有 Supabase client；權限完全來自會員自己的 Cookie

**測試策略**：Test-First  
> 理由：對著 US-002 的失敗測試實作至轉綠。

**優先級**：P0  
**相關功能**：C2 探測小工具  
**來源**：FR-2 / Scenario 1、2、3、4  
**依賴關係**：US-002
