# US-007：CheckMacValue 實作

**作為** 系統  
**我想要** 建單與 Webhook 共用簽／驗函式  
**以便** 驗簽失敗時不回 `1|OK`

**輸入格式**：
- US-006 紅燈測試
- Hash 只從 server env 讀

**輸出格式**：
- `lib/ecpay/` 共用模組（server-only）

**驗收條件**：
- [x] US-006 測試轉綠
- [x] 建單與 Webhook 將引用同一函式（本任務先交付函式）
- [x] 實作不進 client bundle、不把實值寫進 git

#### 驗收說明

**整體結論**：PASS ✅

> `npx vitest run lib/ecpay/check-mac.test.ts` 3 passed；`tsc --noEmit` 通過。Mutation：拿掉空白→`+` 後 encode 斷言變紅，已還原。

---

**AC-1：US-006 測試轉綠**

狀態：✅ 通過

- `lib/ecpay/check-mac.test.ts` 3 passed

---

**AC-2：建單與 Webhook 將引用同一函式**

狀態：✅ 通過

- `lib/ecpay/check-mac.ts` 的 `computeCheckMacValue()`／`verifyCheckMacValue()` 為共用匯出；checkout／webhook 尚未接入（後續 US-011／US-013）

---

**AC-3：不進 client bundle、不把實值寫進 git**

狀態：✅ 通過

- 檔案 `import "server-only"`；Hash 由呼叫端／`readEcpayHashFromEnv()` 讀 `process.env`，無硬編碼實值

**測試策略**：Test-First  
> 理由：對 US-006 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 3／9  
**依賴關係**：US-006
