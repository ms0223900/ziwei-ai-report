# 2026-09-17-ziwei-unit4-ecpay-sandbox-unlock 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對本次 spec 進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。  
> 主規格已依強相關項改寫 Webhook 順序、字串正規化、`paid`+`locked` 補償，以及解鎖後報告畫面可再 POST 生辰（不綁 `reports.user_id`）。下列項目不擋本檔 AC。

## 問題 1：工作參照文件仍把單元 4 當 Won't Have

- **來源視角**：視角 B／跨檔案一致性
- **問題描述**：`AGENTS.md` 共通底線、`docs/spec.md` §2／§5 標題、`.cursor/rules/supabase.mdc` 仍寫本版不建 `orders`、不實作 ECPay。實作者若只讀那些檔會拒做本單。主規格第 6 節已聲明本檔覆寫該禁令。
- **證據**：`AGENTS.md`；`docs/spec.md` §2、§5；`.cursor/rules/supabase.mdc`
- **建議後續**：單元 4 開工時把 `docs/spec.md` §5「本版不實作」改成「見本 AI spec」；Prototype 切 Production 或加一句「單元 4 spec 優先」。

## 問題 2：architecture 佔位路徑／欄位與本單不一致

- **來源視角**：視角 B
- **問題描述**：`docs/architecture.md` 仍寫 `app/api/webhooks/ecpay/route.ts`、`orders.order_number`、狀態只有 `pending|paid`。本單以 `/api/payments/ecpay/webhook` 與 `merchant_trade_no`、可 `failed` 為準。
- **證據**：`docs/architecture.md`（後續單元預留與陷阱清單）
- **建議後續**：實作合併後改 architecture 佔位，避免下一輪 Agent 建錯檔。

## 問題 3：帳號級解鎖可 GET 任意 persist_id

- **來源視角**：視角 C
- **問題描述**：`reports` 刻意無 `user_id`。`access_status=unlocked` 後，知道 UUID 即可 GET 進階。單元 3 已接受。本單不修。
- **證據**：`supabase/migrations/20260905000000_create_reports.sql`；`app/api/reports/[persistId]/route.ts`
- **建議後續**：若要「只能看自己的報告」，另開 ticket 加 owner 綁定（屬單元 3 Could Have／Won't）。

## 已關閉（已寫進主規格，不再另開單）

### 原問題 4：正式環境預覽條可能與真實解鎖並列

- **狀態**：關閉 — 併入主 spec **Story 13**（Functional Specs + AC：正式 Happy、誤設警告、locked／unlocked、本機 overlay）。
- **不再建議**：另開 ticket 只關 `.env.production`。關預設值與誤設警告都是本單 MVP。

### 原問題 5：grant 與付款搶同一欄

- **狀態**：關閉 — 併入主 spec **Story 14** 與 Story 10 SOP（課堂繞過 vs 官方付款；grant→409 checkout；pay→grant 200；pending 再 grant）。
- **不再建議**：只當 SOP 備註／下個 sprint。`POST /api/dev/grant-access` 必須保留。
