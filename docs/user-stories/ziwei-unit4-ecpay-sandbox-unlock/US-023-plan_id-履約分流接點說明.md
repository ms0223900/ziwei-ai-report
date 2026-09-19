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
- [x] 文件寫明來源真相是 DB `plan_id`，不是綠界 CustomField
- [x] 文件寫明本單元不加點、無 PeriodReturnURL 實作
- [x] 無任何 US 要求 mutation `points_balance`／`subscription_status`
- [x] 不實作 QueryTradeInfo

#### 驗收說明

**整體結論**：PASS ✅

> Exploratory／文件型。SOP 新增 §9；webhook 只加掛點註解、不改履約。靜態對照 Story 12 與單元 4 US 清單。

---

**AC-1：來源真相是 DB plan_id，不是 CustomField**

狀態：✅ 通過

- `howto-ecpay-sandbox.md` §9：驗簽→找單→對金額→讀 `orders.plan_id`；CustomField 不可當依據
- 掛點註解在 `app/api/payments/ecpay/webhook/route.ts` 對金額之後

---

**AC-2：本單元不加點、無 PeriodReturnURL**

狀態：✅ 通過

- §9 表列不做 `points_balance`／`subscription_status`／`PeriodReturnURL`
- 連結官方定期定額四頁，標明不當成本單元實作

---

**AC-3：無 US 要求 mutation points_balance／subscription_status**

狀態：✅ 通過

- 單元 4 `US-*.md` 無「寫入／加值」AC；US-012／US-022 斷言不加點

---

**AC-4：不實作 QueryTradeInfo**

狀態：✅ 通過

- §9 指向 §3：`ECPAY_QUERY_URL` 只留槽位；`app/` 產品碼無 QueryTradeInfo 呼叫（處理中頁測試仍斷言）

**測試策略**：Exploratory  
> 理由：Later 接點只要文件對齊 spec，無產品邏輯可先紅。

**優先級**：P1  
**相關功能**：Story 12（文件接點）  
**依賴關係**：US-020
