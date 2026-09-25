# US-020：固定 Payload 腳本 測試

**作為** 開發者  
**我想要** 先有會失敗的腳本 CheckMacValue 對照測試  
**以便** 腳本自行實作的演算法與正式版一致

**輸入格式**：
- `lib/ecpay/check-mac.ts` 有 `import "server-only"`，node 無法直接 import（spec 第 7 節阻塞 4）

**輸出格式**：
- `scripts/ecpay-subscription-payload.test.ts`（vitest）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法／import 錯誤）
- [ ] S10-3：同一組欄位與 HashKey／HashIV，腳本匯出的函式與 `computeCheckMacValue` 結果相同
- [ ] 斷言腳本可產生 ReturnURL 與 PeriodReturnURL 兩種 payload（參數：`--mtn` 必填、`--total-success-times`、`--rtn-code`、`--gwsr`、`--simulate`）

**測試策略**：Test-First  
> 理由：演算法一致性可以直接轉成斷言。

**優先級**：P1  
**相關功能**：Story 10；spec 第 7 節阻塞 4  
**依賴關係**：無
