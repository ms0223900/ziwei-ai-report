# 單元 4 綠界沙盒驗測（教學／自測）

How to run ECPay sandbox unlock in Unit 4 (classroom / self-test).  
這份由 **US-020** 寫完整步驟；本檔先佔位。規格原文見 [`docs/specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md`](../../specs/2026-09-17-ziwei-unit4-ecpay-sandbox-unlock.md) Story 10。

**未完成 US-020 前不要把五類驗測勾成通過。**

占位清單（US-020 必須寫成逐步操作，不可只留本段）：

1. 已有公開 HTTPS → 設 `ECPAY_RETURN_URL`／`ECPAY_CLIENT_BACK_URL`，可跳過 Tunnel。
2. 本機才用 `cloudflared`；**禁止 ngrok**。
3. 五類：成功、回跳等待、取消／失敗、簽章錯誤、事件重送。
4. 測試後台「模擬付款」→ `SimulatePaid=1` → `1|OK` → **不解鎖**。
5. grant ≠ 官方付款；不可用 grant 勾 Story 5～9。
6. `.env.production` 的 `NEXT_PUBLIC_COMMERCIAL_PREVIEW` 應為 `0`。
