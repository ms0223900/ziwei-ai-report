# US-011：POST reports.user_id 實作

**作為** 已登入會員  
**我想要** 新產生的報告寫入我的 `user_id`  
**以便** 之後只能解鎖自己的報告

**輸入格式**：
- US-010 紅燈測試
- US-003 已加 `reports.user_id` 欄位
- 不重做單元 1 生成／ajv／遮罩 schema

**輸出格式**：
- `lib/reports/store.ts`（`buildSuccessReportInsert`／`insertReport`）
- 如需：`app/api/reports/route.ts` 把 session user id 傳入 store

**驗收條件**：
- [x] US-010 測試轉綠
- [x] 訪客列維持 null；不做回填後台
- [x] 不把 `reports.status` 改成解鎖標記

#### 驗收說明

**整體結論**：PASS ✅

> 新報告的 insert 帶 `user_id`。有 session 寫目前使用者；沒有 session 寫 null。`status` 仍由 store 固定為 `basic`。

---

**AC-1：US-010 測試轉綠**

狀態：✅ 通過

- `npx vitest run lib/reports/store.test.ts app/api/reports/route.test.ts`：21 passed
- 測試裡 `objectContaining({ status: undefined })` 會把「沒傳 status」判失敗，已改成斷言 payload 沒有 `status`。期望的 `user_id` 沒有放寬

---

**AC-2：訪客列維持 null；不做回填後台**

狀態：✅ 通過

- `app/api/reports/route.ts` 的 `persistMaskedReport()` 傳 `user_id: user?.id ?? null`
- `lib/reports/store.ts` 的 `buildSuccessReportInsert()` 省略時也寫 null。沒有回填作業

---

**AC-3：不把 reports.status 改成解鎖標記**

狀態：✅ 通過

- insert 仍寫 `status: "basic"`。Route 不把 status 傳進 store

**測試策略**：Test-First  
> 理由：對 US-010 紅燈實作至綠。

**優先級**：P0  
**相關功能**：Story 7  
**依賴關係**：US-010
