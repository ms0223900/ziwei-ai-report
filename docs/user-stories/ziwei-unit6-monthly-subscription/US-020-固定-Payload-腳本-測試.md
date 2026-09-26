# US-020：固定 Payload 腳本 測試

**作為** 開發者  
**我想要** 先有會失敗的腳本 CheckMacValue 對照測試  
**以便** 確認腳本自行實作的演算法與正式版一致

**輸入格式**：
- `lib/ecpay/check-mac.ts` 有 `import "server-only"`，node 無法直接 import（spec 第 7 節阻塞 4）；vitest 已把它 alias 到 stub，測試端可以 import

**輸出格式**：
- `scripts/ecpay-subscription-payload.test.ts`（vitest）
- 被測檔案尚不存在時，先放一個空殼（例如 `.mjs` 只匯出會丟 not implemented 的具名函式），只為讓測試能載入（沿用單元 5 US-012／US-019 慣例）

**驗收條件**：
- [x] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [x] S10-3：使用同一組欄位（**含空白、`()!*-_.~` 與中文**）與同一組 HashKey／HashIV，腳本匯出的函式結果與 `computeCheckMacValue` 相同
- [x] 斷言可以產生 ReturnURL 與 PeriodReturnURL 兩種 payload（參數：`mtn` 必填、`totalSuccessTimes`、`rtnCode`、`gwsr`、`simulate`）
- [x] 測試只 import 具名 export，不觸發 CLI 主流程

#### 驗收說明

**整體結論**：PREPARED：預期紅燈測試已建立

> `npx vitest run scripts`：5 tests，5 failed。待 US-021 轉綠。

- 空殼：`scripts/ecpay-subscription-payload.mjs` 暫時只匯出三個具名函式，呼叫時一律丟 not implemented
- 測試 `scripts/ecpay-subscription-payload.test.ts`（vitest 的 `**/*.test.ts` 會收進來）：
  - S10-3：腳本的 CheckMacValue 與 `lib/ecpay/check-mac.ts` 算出的值一致，測試欄位含空白、`()!*-_.~`、`'`、`+` 與中文
  - ReturnURL 與 PeriodReturnURL 兩種 payload 都有簽章，且能通過 `verifyCheckMacValue`
  - SimulatePaid 的處理
  - 缺 mtn 時丟錯
  - 測試只 import 具名 export，不會觸發 CLI
- 紅燈原因：空殼一律丟 `not implemented`，缺 mtn 那支則是錯誤訊息不含「mtn」
- 不是語法、import 或環境錯誤；typecheck 與 lint 都通過

**測試策略**：Test-First（測試準備）  
> 理由：演算法一致性可以直接寫成斷言。

**優先級**：P0  
**相關功能**：Story 10；spec 第 7 節阻塞 4  
**依賴關係**：無
