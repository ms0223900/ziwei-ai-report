# US-011：課堂操作 howto

**作為** 學員／講師  
**我想要** 一份照課堂節次（8-1／8-2／8-3）一步步帶的操作手冊  
**以便** 不必先讀 spec，也能在 45 分鐘內跑完矩陣、驗收與處置

**輸入格式**：
- Notion §5.1 課堂主流程（8-1 建立矩陣 7 分、8-2 驗收 22～23 分、8-3 處置 14～15 分）
- US-001 矩陣、US-007 README、US-008 處置卡；單元 7 `howto-post-payment-delivery.md` 的寫法

**輸出格式**：
- `docs/user-stories/ziwei-unit8-verification-matrix/howto-verification-matrix.md`

**驗收條件**：
- [ ] 開頭「課前準備」：要跑的 SQL（`reset-checkpoint.sql` 與各 fixture）、`.env.local` 的 ECPay Hash、`export BASE=…`、`payload()`／`post()` 函式、從瀏覽器複製 Cookie 給 `probe.mjs` 的方法
- [ ] 依序分成「8-1 建立矩陣」「8-2 驗收」「8-3 處置」三節，每節標出 Notion §5.1 的建議分鐘數
- [ ] 8-1：說明矩陣 13 欄怎麼讀、如何選定實跑模式、另兩種模式改用 Checkpoint 判讀
- [ ] 8-2：三種模式各一小節（單次／點數／訂閱），加上共用 U8-N-F；每小節依「成功 → 關鍵失敗 → 重複事件」排序
- [ ] 8-2 每一步寫「做什麼」＋「預期看到什麼」＋「證據填到矩陣哪一格」；指令與預期值直接引用 README 與矩陣，不另寫一套
- [ ] 8-2 寫明三條執行規則：等待超過 3 分鐘切 Checkpoint、回跳參數不算證據、禁止手動 UPDATE 權益過關
- [ ] 8-3：依 Notion §5.1 的風險順序排序未通過列，示範用 `disposition-cards.md` 的預填卡填一張，並選上線狀態
- [ ] 結尾「常見卡關」表：409 先重跑 reset、reset 撞 `admin_actions` 外鍵、payload 回 `0|Error`（漏 `--amount`）、B 被續期（漏 `--rtn-code`）、餘額沒更新（未重新整理首頁）、`probe.mjs` 回 404（Cookie 與報告不是同一帳號）
- [ ] 文件內沒有 HashKey/HashIV 或 Cookie 實際值
- [ ] 結尾附「交棒單元 9」一段：交出填好的矩陣與 1～3 張處置卡

**測試策略**：Test-After  
> 理由：操作文件，正確性由 US-009 照本文件真機實跑驗證。

**優先級**：P0  
**相關功能**：課堂操作手冊（使用者追加）  
**來源**：Notion §5.1 課堂主流程；使用者追加需求（2026-10-05）  
**依賴關係**：US-001、US-007、US-008
