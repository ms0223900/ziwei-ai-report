# US-023：plan_id 履約分流接點說明

**作為** 課程學員  
**我想要** 文件寫清同一 ReturnURL 依訂單 `plan_id` 分支  
**以便** 單元 5／6 可接，且本單元不加點

**輸入格式**：
- spec Story 12：驗簽 → 找單 → 對金額 → **讀 DB `plan_id`** → 分支履約
- 本單元只實作 `unlock_report_lifetime` 解鎖
- 官方文件連結：信用卡定期定額、定期定額付款結果通知、訂單查詢、訂單作業（spec 所列 URL）
- **禁止**把 `points_balance` 寫入列為本單實作 AC

**輸出格式**：
- howto／SOP 一節（可附在 [howto-ecpay-sandbox.md](./howto-ecpay-sandbox.md)）；可另加程式註解位置說明，但本任務不改產品行為

**驗收條件**：
- [ ] 文件寫明來源真相是 DB `plan_id`，不是綠界 CustomField
- [ ] 文件寫明本單元不加點、無 PeriodReturnURL 實作
- [ ] 無任何 US 要求 mutation `points_balance`／`subscription_status`
- [ ] 不實作 QueryTradeInfo

**測試策略**：Exploratory  
> 理由：Later 接點只要文件對齊 spec，無產品邏輯可先紅。

**優先級**：P1  
**相關功能**：Story 12（文件接點）  
**依賴關係**：US-020
