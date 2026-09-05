# 2026-09-05-ziwei-unit1-mvp 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對本次 spec 進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

## 問題 1：結果頁重新整理會再生成一列

- **來源視角**：A／C
- **問題描述**：本版無 `GET /api/reports/:id`、結果只在 client state、不寫 localStorage。重新整理等於新的 POST。主規格已改寫「遮罩而非重算」為同一次請求內不重打模型，但 UAT 若用「再開同一份報告」來驗，會誤判。
- **證據**：主規格 Story 2b；`docs/architecture.md` 陷阱「訪客報告無法事後認領」
- **建議後續**：單元 2 登入後再做可重開的 GET；本版驗收文案避免「下次進來還是同一份」。

## 問題 2：未來日驗證的時區

- **來源視角**：C
- **問題描述**：date input 用瀏覽器本地「今天」；Vercel 預設常為 UTC。UTC+8 清晨可能前端允許今天、後端當未來日 400。示範生日 `1993-07-12` 不受影響。
- **證據**：主規格 Story 1「不得為未來日期」未指定時區
- **建議後續**：實作時統一以 `Asia/Taipei` 的日曆日比較，或前後端都用 date-only 字串、不轉 UTC midnight。

## 問題 3：重複送出可寫入多筆 success

- **來源視角**：C
- **問題描述**：雙擊送出沒有冪等鍵，可插入兩列 `generation_status=success`。Ticket 未禁止。
- **證據**：主規格無重複提交 AC
- **建議後續**：前端送出期間 disable 按鈕即可；不必本單做 DB 唯一約束。

## 問題 4：高風險詞庫未定，可能誤殺／漏殺

- **來源視角**：A／C
- **問題描述**：Ticket 只給五類與固定回覆。AC 例句來自子筆記**追問** Mock，單元 1 只能塞進 `nickname`。詞庫過寬會誤殺一般暱稱，過窄會漏掉 Story 4。
- **證據**：主規格 §6 灰區已列
- **建議後續**：第一版用明確詞表（投資、自殺、懷孕、律師、病症等）並在課程說明「暱稱測高風險」；不要掃單字「金」。

## 問題 5：layout metadata 與子筆記 disclaimer 不完全同句

- **來源視角**：B
- **問題描述**：`app/layout.tsx` description 少「投資」二字；子筆記 disclaimer 有「財務、投資」。Story 3 要求結果卡用完整 disclaimer，metadata 不計結果卡。
- **證據**：`app/layout.tsx` 約 L15–16
- **建議後續**：做 Disclaimer 元件時順便對齊 layout metadata，非驗收阻塞。

## 問題 6：`generation_status=pending` 無對應流程

- **來源視角**：A／B
- **問題描述**：資料模型有 `pending`，本版 POST 同步完成，沒有 job queue。
- **證據**：主規格資料模型表
- **建議後續**：本版可只寫 `success`／`failed`；`pending` 留欄位即可。

## 問題 7：Notion「不做 RLS」與 repo「RLS on、零 policy」用詞不同

- **來源視角**：C
- **問題描述**：Ticket Won't Have 寫 RLS；architecture／`docs/spec.md` 刻意 RLS enabled、零 policy（anon 讀不到）。UAT 若照 Notion 字面勾「沒開 RLS」會誤判。
- **證據**：`docs/architecture.md` 關鍵設計；git 既有決策
- **建議後續**：驗收用「anon 讀不到 reports、只靠 service_role 寫入」，不要用「資料庫關閉 RLS」。

## 問題 8：Story 5「改回 MOCK_AI_MODE=valid」在 Vercel 不是使用者操作

- **來源視角**：C
- **問題描述**：無 Mock／Live 控制台（Could Have = false）。改 env 要重啟或重佈。該 AC 應在本機切 env 驗證。
- **證據**：主規格第 5 節 MVP false「開發控制台」
- **建議後續**：驗收清單註明 schema 失敗可重試在本機進行。
