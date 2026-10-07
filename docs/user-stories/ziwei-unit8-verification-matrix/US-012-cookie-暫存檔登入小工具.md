# US-012：Cookie 暫存檔登入小工具

**作為** 講師／學員  
**我想要** 用一支指令以測試帳號登入，並把 session cookie 寫成只有自己可讀的暫存檔  
**以便** `probe.mjs` 與 curl 直接讀檔，不必從 DevTools 複製，也不會把 cookie 貼進筆記或終端機歷史

---

**輸入格式**：
- `.env.local` 的 `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`；環境變數 `CHECKPOINT_PASSWORD`
- 參數：`--email <測試帳號>`、`--out <暫存檔路徑>`
- 依據：`docs/unit8/live-acceptance-2026-10-07.md`「共用指令」、`docs/playbooks/ziwei-unit8-verification-playbook.md` §四

**輸出格式**：
- `scripts/unit8-checkpoint/login-cookie.mjs`、`login-cookie.test.ts`
- `scripts/unit8-checkpoint/README.md`「取得 Cookie」一節改以本工具為主，DevTools 複製法降為備案

**驗收條件**：
- [x] 以 `@supabase/ssr` 的 `createBrowserClient`（`isSingleton: false`、記憶體 cookie jar）呼叫 `signInWithPassword`
- [x] 登入成功後，把 jar 內所有 cookie 以 `name=value; …` 寫入 `--out`，檔案權限 `0o600`
- [x] stdout 只印檔案路徑與 cookie 數量，不印 cookie 值或密碼
- [x] 缺 `--email`、`--out`、`CHECKPOINT_PASSWORD` 或 Supabase 環境變數時：繁中錯誤、exit code ≠ 0、不呼叫登入
- [x] 登入失敗時：繁中錯誤（含 Supabase 回傳訊息）、exit code ≠ 0、不寫檔
- [x] 不使用 service role key
- [x] README「取得 Cookie」以本工具為主：登入指令、`probe.mjs --cookie "$(cat <檔>)"` 用法、過期回 401 就重跑登入；DevTools 複製法保留為備案


#### 驗收說明

**整體結論**：PASS ✅

> 先寫 `login-cookie.test.ts`，確認因 `./login-cookie.mjs` 不存在而紅燈，再實作至轉綠。`npx vitest run scripts`：56 個測試通過，`npm run lint`、`npm run typecheck` 通過。沒有對演示站實際登入，因為雲端環境連不到演示站。

---

**AC-1：非 singleton 的 browser client 加記憶體 jar**

狀態：✅ 通過

- `runLogin()` 傳 `isSingleton: false`，並帶 `cookies.getAll`／`setAll`（Map）；測試檢查傳入 `createClient` 的參數

**AC-2：寫檔格式與權限**

狀態：✅ 通過

- 以 `name=value; …` 呼叫 `writeFile(out, header, { mode: 0o600 })`；`setAll` 收到空值時會從 jar 移除該 cookie

**AC-3：輸出遮罩**

狀態：✅ 通過

- 只印「已寫入 {路徑}（N 個 cookie）」；測試確認輸出不含 cookie 值與密碼

**AC-4：缺參數或缺環境變數**

狀態：✅ 通過

- 5 種缺漏都回繁中錯誤、exit 1，且不呼叫 `createClient`、不寫檔；CLI 實跑缺 `--email` 時 exit=1

**AC-5：登入失敗**

狀態：✅ 通過

- 錯誤訊息帶出 Supabase 的 `error.message`，不寫檔

**AC-6：不使用 service role**

狀態：✅ 通過

- 測試用 Proxy 監看：讀到 `SUPABASE_SERVICE_ROLE_KEY` 就丟錯；實際執行沒有讀取

**AC-7：README 改以本工具為主**

狀態：✅ 通過

- 「取得 Cookie」改為登入指令、`--cookie "$(cat …)"`、curl 讀檔、遇到 401 就重跑登入；DevTools 複製法降為「備案」
- 檔案表新增 `login-cookie.mjs`；常見卡關的 401 列改成重跑登入
- 同步修改 howto 課前準備第 4 步與 playbook §四，三份文件說法一致

---

**後續建議**

- 下次真機實跑時，順手用本工具跑一次，確認 `@supabase/ssr` 在 Node 上寫出的 cookie 能讓演示站認得

**測試策略**：Test-First  
> 理由：參數驗證、cookie 序列化、檔案權限與輸出遮罩都是明確的 input/output，以注入的假 client 與假 writeFile 先寫失敗測試。

**依賴關係**：US-003、US-007

**優先級**：P1  
**相關功能**：C2 探測小工具；共通 README  
**來源**：使用者追加需求（2026-10-07，依真機實跑經驗）
