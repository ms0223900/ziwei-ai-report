# US-019：已單次解鎖選單 API 測試

**作為** 開發者  
**我想要** 先有會失敗的選單 API 測試  
**以便** 清單只來自自己的 `report_unlocks`，且鍵是 `persist_id`

**輸入格式**：
- `GET /api/report-unlocks`（需 session；路徑可同義）
- 200：目前使用者的 `{ report_id, nickname, created_at }[]`；`report_id` = `reports.id`
- 無 session：401
- 來源 JOIN 自己的 `reports`；不要讀 `access_status`、不要把全部 `reports` 倒入
- `user_id` null 的舊列不出現
- 終身開通且另有許多報告時，選單仍只列 `report_unlocks`
- fake 用 US-005

**輸出格式**：
- 對應 `*.test.ts`

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈
- [ ] 斷言 401；200 只含自己的解鎖列
- [ ] 斷言鍵為 uuid `persist_id`，不是 `basic_json.report_id`
- [ ] 斷言終身帳號不會把未解鎖報告灌進選單
- [ ] 斷言 null `user_id` 舊列不出現

**測試策略**：Test-First（測試準備）  
> 理由：選單 payload 是明確 API 契約。

**優先級**：P0  
**相關功能**：Story 10；spec 第 7 節問題 2  
**依賴關係**：US-005
