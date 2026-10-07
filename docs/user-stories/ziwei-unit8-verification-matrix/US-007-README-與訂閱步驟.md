# US-007：README 與訂閱步驟

**作為** 講師  
**我想要** 一份寫明帳號分配、送出方式與各案例步驟的 README  
**以便** 錄製時照表操作，3 分鐘內切 Checkpoint

**輸入格式**：
- spec §2 帳號分配、FR-3／FR-4 步驟、FR-5、共通；單元 6 howto 的 `payload()`／`post()`
- US-003～US-006 的檔案

**輸出格式**：
- `scripts/unit8-checkpoint/README.md`

**驗收條件**：
- [x] 表格列出每支檔案的用途、對應案例 ID、使用帳號、需替換的佔位符
- [x] 開頭沿用單元 6 的 `payload()`／`post()`；return 一律送 `/api/payments/ecpay/webhook`，period 一律送 `/api/payments/ecpay/period-webhook`
- [x] 帳號分配與 spec §2 一致，含 A 先 F3、reset 後再 F2 取消，以及點數模式順序
- [x] U8-L-S／D：重跑 fixture → `--kind return --mtn TESTU8LIFE0001 --amount 99` 送兩次 → 重跑 fixture 還原
- [x] U8-P-S／D：`--kind return --mtn TESTU8PTS0001 --amount 49` 送兩次；註明重跑後餘額再 +5，以本筆 credit 筆數與餘額差判讀
- [x] U8-P-F：跑 zero 後先重新整理首頁再產生報告；`probe.mjs unlock R` 只對 0 點帳號使用
- [x] U8-S-S：D 先產生報告 Rd，在鎖定區按「月繳訂閱（每月 TWD 19）」一次（遇 409 先重跑 reset）→ SQL 查 MTN → `--kind return --amount 19`
- [x] U8-S-D：return 重送，或 period `--total-success-times 1`；註明不用預設的 `--total-success-times 2`
- [x] U8-S-F1：B 以 `--rtn-code 10100058 --gwsr GU8B1` 送兩次；註明對期末未過的帳號送失敗事件時 GET 仍 200
- [x] U8-S-F2：到期用 C、取消用 A 跑 `cancel.sql`，以 `sub:{本次 cancelled 事件 id}` 查通知
- [x] U8-S-F3、U8-S-F4 步驟照 spec FR-5
- [x] U7-C：用 D 補點後，先跑 `fixture-paid-no-credit.sql` 第 1 段再跑 reset
- [x] 通知筆數一律以 `idempotency_key` 或 `source_id` 查，不看面板總數；id 以結尾 SELECT 為準
- [x] U8-N-F：註明換帳號前要先依外鍵順序（notifications → admin_actions → point_transactions → orders）手動刪除舊的 `TESTU8NTF0001`（承接 US-006 AC-7）
- [x] 若實作時 D 無法靠「reset＋fixture」還原，改獨立帳號並記錄原因
- [x] 不寫入 HashKey/HashIV 或 Cookie 值


#### 驗收說明

**整體結論**：PASS ✅

> `scripts/unit8-checkpoint/README.md` 已建立，內容分為：檔案表、帳號表、開始前、帳號分配、單次、點數、訂閱、U7-C、常見卡關。指令與預期值逐項對照了 spec §2、矩陣與現有腳本參數（`ecpay-subscription-payload.mjs` 的 `--amount`／`--rtn-code`／`--gwsr`／`--total-success-times`）。

---

**AC-1：檔案表**

狀態：✅ 通過

- 「檔案」表列出用途、案例 ID、使用帳號、需替換的佔位符；另附 A～D 的 email 與 UUID

**AC-2：`payload()`／`post()` 與送出端點**

狀態：✅ 通過

- 「開始前」照抄單元 6 howto 的兩個函式；return 送 `/api/payments/ecpay/webhook`，period 送 `/period-webhook`

**AC-3：帳號分配**

狀態：✅ 通過

- 含「A 先 F3、reset 後再 F2 取消」與點數模式的順序

**AC-4～6：單次與點數步驟**

狀態：✅ 通過

- 單次：fixture → `--amount 99` 送兩次 → 重跑 fixture 還原
- 點數：`--amount 49` 送兩次，並註明重跑 fixture 後再加 5 點不算異常
- U8-P-F：先重新整理首頁；`probe.mjs unlock` 只用在 0 點帳號

**AC-7～11：訂閱步驟**

狀態：✅ 通過

- U8-S-S 先產生 Rd、只按一次月繳（遇 409 先 reset），附查 MTN 的 SQL
- U8-S-D 註明不用預設的 `--total-success-times 2`
- U8-S-F1 帶 `--rtn-code 10100058 --gwsr GU8B1`
- U8-S-F2 到期用 C、取消用 A，通知以 `sub:{本次 cancelled 事件 id}` 判讀
- U8-S-F3、U8-S-F4 照 spec FR-5

**AC-12：U7-C**

狀態：✅ 通過

- 寫明補點後要先跑 `fixture-paid-no-credit.sql` 第 1 段，再跑 reset

**AC-13：通知筆數與 id 的判讀方式**

狀態：✅ 通過

- 「開始前」第 3、4 點

**AC-14：U8-N-F 換帳號前先刪舊單（承接 US-006 AC-7）**

狀態：✅ 通過

- 「點數」第 4 點寫出外鍵刪除順序

**AC-15：D 用不了時改獨立帳號**

狀態：✅ 通過

- 「帳號分配」最後一點

**AC-16：不寫入 Hash 或 Cookie 實際值**

狀態：✅ 通過

- 只有 `.env.local` 與 `<剛複製的值>` 佔位，並提醒 Cookie 不要入檔或截圖

---

**後續建議**

- 「取得 Cookie」與「`probe.mjs` 回 3xx」兩段是依程式碼推斷寫的，等 US-009 真機實跑時確認

**測試策略**：Test-After  
> 理由：操作文件，正確性由 US-009 照本文件真機實跑驗證。

**優先級**：P0  
**相關功能**：C5 訂閱補驗步驟；共通 README  
**來源**：FR-5 / Scenario 1～6（步驟）；FR-3、FR-4 步驟段落；§2 共通  
**依賴關係**：US-003、US-004、US-005、US-006
