# 2026-09-13 unit3 盤點問題與疑慮（非本次需求阻塞項）

> 由 `/independent-review` 對本次 spec（`2026-09-13-ziwei-unit3-membership.md`）進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

## 問題 1：Next 16 官方慣例是 `proxy.ts`，規格仍允許 `middleware.ts`

- **來源視角**：B／跨檔案一致性
- **問題描述**：Next 16.2 文件將 `middleware.ts` 標為 deprecated，改 `proxy.ts`。兩者目前功能等同，用舊檔名建置多半仍過。
- **證據**：`node_modules/next/dist/docs` 的 middleware／proxy／version-16；`docs/architecture.md` 仍寫根 `middleware.ts`
- **建議後續**：實作擇一能刷新 session 的檔即可；下一次改 architecture 時對齊官方檔名。

## 問題 2：官方公開金鑰變數已偏向 `PUBLISHABLE_KEY`

- **來源視角**：B
- **問題描述**：本 repo 與本 spec 沿用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`；2026 官方 SSR 範例常用 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。anon key 多半仍可用。
- **證據**：`.env.example`；本 spec 第 4 節環境變數表
- **建議後續**：新專案若 Dashboard 只發 publishable，再加別名或回寫 `.env.example`。

## 問題 3：`docs/spec.md`／architecture 仍寫會員單元加 `reports.user_id`

- **來源視角**：B
- **問題描述**：本單刻意不加 `user_id`。濃縮 spec 與 architecture 未改，後續單元容易抄回 owner RLS 或用 JSON `report_id` 當 GET 鍵。
- **證據**：`docs/spec.md` §3.3、§3.6；`docs/architecture.md` 後續單元預留
- **建議後續**：另開文件同步單，回寫「單元 3 不加 reports.user_id；GET 用 persist_id」。

## 問題 4：`PERSIST_FAILED` overlay 沒有 `persist_id`

- **來源視角**：C
- **問題描述**：單元 1 寫入失敗仍渲染畫面 A canned，無 DB 列。已開通者也不能 GET。
- **證據**：`components/home/HomeClient.tsx`；`overlay.ts` 的 `overlayCannedReport`
- **建議後續**：`persist_id` 作 optional；失敗 overlay 不打 GET。屬單元 1 舊行為。

## 問題 5：GET 非 uuid 可能變 500

- **來源視角**：C
- **問題描述**：主 spec 已補「非 uuid → 404」。若實作直接拿字串查 `reports.id`，Postgres `22P02` 可能變 500。
- **證據**：`reports.id` 為 uuid；Mock `report_id=rpt_demo_001`
- **建議後續**：實作先驗 uuid；主 spec 已寫。

## 問題 6：`signUp` 重複信箱文案不一定穩定

- **來源視角**：C
- **問題描述**：Confirm email 關閉時較常回「已註冊」；部分專案為防枚舉不區分。AC「此信箱已註冊」可能對不上 SDK 錯誤字串。
- **證據**：本 spec Story 2a 錯誤表
- **建議後續**：UAT 接受「已註冊或請改登入」同類提示；不要鎖死英文 error code。

## 問題 7：已開通 GET 後的 `overall` 可能是 advanced 長文

- **來源視角**：C
- **問題描述**：主 spec 已改 GET 的 `overall` 取 `basic_json`。若實作誤用 advanced fixture 覆寫免費區，畫面會變長句，與單元 1 畫面 A 短 overall 不同。
- **證據**：`lib/generation/fixtures/advanced.valid.json` vs `basic.valid.json`
- **建議後續**：跟主 spec 組裝規則；不另開產品決策。

## 問題 8：grant-access 在有 Auth user、尚無 profile 時回 404

- **來源視角**：A／C
- **問題描述**：規格未要求 grant 內呼叫 `ensureProfile`。講師若只建 Auth、trigger 失敗，會 404。
- **證據**：本 spec Story 7 回應表
- **建議後續**：實作可在 grant 內 ensure 再更新；不阻塞已有 profile 的 Happy Path。

## 問題 9：任何已開通者知 `persist_id` 就能讀該列進階

- **來源視角**：C
- **問題描述**：本版刻意不加 `reports.user_id`，隔離只限 `profiles`。課堂可接受；正式個資模型不夠。
- **證據**：本 spec 第 5 節 MVP false；`reports` 零 policy
- **建議後續**：單元 4 或之後再做 owner policy；不要在本單偷加。

## 問題 10：頁首若只做在 form／report 分支，高風險殼看不到登入入口

- **來源視角**：B／C
- **問題描述**：主 spec 已要求 `layout.tsx`。`HomeClient` 在 fail／high-risk 提早 return，入口不在 layout 就看不到。
- **證據**：`HomeClient.tsx`；`app/layout.tsx` 目前無頁首
- **建議後續**：實作把 `slot-auth-entry`／`slot-auth-session` 放 layout；主 spec 已寫。
