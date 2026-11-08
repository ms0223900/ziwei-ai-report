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
- [ ] 表格列出每支檔案的用途、對應案例 ID、使用帳號、需替換的佔位符
- [ ] 開頭沿用單元 6 的 `payload()`／`post()`；return 一律送 `/api/payments/ecpay/webhook`，period 一律送 `/api/payments/ecpay/period-webhook`
- [ ] 帳號分配與 spec §2 一致，含 A 先 F3、reset 後再 F2 取消，以及點數模式順序
- [ ] U8-L-S／D：重跑 fixture → `--kind return --mtn TESTU8LIFE0001 --amount 99` 送兩次 → 重跑 fixture 還原
- [ ] U8-P-S／D：`--kind return --mtn TESTU8PTS0001 --amount 49` 送兩次；註明重跑後餘額再 +5，以本筆 credit 筆數與餘額差判讀
- [ ] U8-P-F：跑 zero 後先重新整理首頁再產生報告；`probe.mjs unlock R` 只對 0 點帳號使用
- [ ] U8-S-S：D 先產生報告 Rd，在鎖定區按「月繳訂閱（每月 TWD 19）」一次（遇 409 先重跑 reset）→ SQL 查 MTN → `--kind return --amount 19`
- [ ] U8-S-D：return 重送，或 period `--total-success-times 1`；註明不用預設的 `--total-success-times 2`
- [ ] U8-S-F1：B 以 `--rtn-code 10100058 --gwsr GU8B1` 送兩次；註明對期末未過的帳號送失敗事件時 GET 仍 200
- [ ] U8-S-F2：到期用 C、取消用 A 跑 `cancel.sql`，以 `sub:{本次 cancelled 事件 id}` 查通知
- [ ] U8-S-F3、U8-S-F4 步驟照 spec FR-5
- [ ] U7-C：用 D 補點後，先跑 `fixture-paid-no-credit.sql` 第 1 段再跑 reset
- [ ] 通知筆數一律以 `idempotency_key` 或 `source_id` 查，不看面板總數；id 以結尾 SELECT 為準
- [ ] U8-N-F：註明換帳號前要先依外鍵順序（notifications → admin_actions → point_transactions → orders）手動刪除舊的 `TESTU8NTF0001`（承接 US-006 AC-7）
- [ ] 若實作時 D 無法靠「reset＋fixture」還原，改獨立帳號並記錄原因
- [ ] 不寫入 HashKey/HashIV 或 Cookie 值

**測試策略**：Test-After  
> 理由：操作文件，正確性由 US-009 照本文件真機實跑驗證。

**優先級**：P0  
**相關功能**：C5 訂閱補驗步驟；共通 README  
**來源**：FR-5 / Scenario 1～6（步驟）；FR-3、FR-4 步驟段落；§2 共通  
**依賴關係**：US-003、US-004、US-005、US-006
