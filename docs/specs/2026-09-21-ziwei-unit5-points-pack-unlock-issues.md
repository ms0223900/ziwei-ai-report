# 2026-09-21-ziwei-unit5-points-pack-unlock 盤點問題與疑慮（非本次需求阻塞項）

> 由 independent-review 對本次 spec 進行獨立審查時額外盤點到、但與本次需求驗收無直接依賴的問題。可視情況另開 ticket 處理，不阻塞本次驗收。

> 原「問題 1：終身開通後 GET 進階仍不查 reports.user_id」已於 2026-09-21 升格為主 spec Story 9 Must Have（終身與單點 GET 都要 `reports.user_id = session`），此檔不再列為非阻塞項。

## 問題 1：grant-access 與點數制課堂語意

- **來源視角**：C
- **問題描述**：grant 只改 `access_status`，不算點數履約（本單正確）。單元 4 SOP／Story 14 仍是「grant 後 checkout 一律 409」。講師可能用 grant 冒充加點；grant 後 RPC 回 `lifetime`、選單仍空，學員會以為「解鎖沒扣點」。
- **證據**：`app/api/dev/grant-access/route.ts`；單元 4 US-021／US-022。
- **建議後續**：單元 5 howto 加一句：grant ≠ 加點，也 ≠ 任意 uuid 通行證（進階仍要 `reports.user_id`）；點數包驗收禁用 grant。

## 問題 2：單元測試 fake 沒有 RPC／交易，CI 證不了加點回滾

- **來源視角**：B／C
- **問題描述**：`test/fakes/supabase.ts` 無 `.rpc()`、unique 對 null 跳過、無 `points_balance >= 1` 條件更新。加點／扣點正確性綁真實 Postgres。
- **證據**：`test/fakes/supabase.ts`；單元 3／4 測試以 fake 為主。
- **建議後續**：實作時擴充 fake 或加 live SQL 測試；未套 migration 不得勾 Story 4／5／8 AC（比照單元 3／4 遷移紀律）。

## 問題 3：credit 列缺少「type=credit_purchase ⇒ source_order_id NOT NULL」CHECK

- **來源視角**：C
- **問題描述**：`source_order_id` unique 但 nullable。可插入無訂單的 credit，補償路徑再插一筆有 FK 的 credit，unique 抓不到雙重 +5。
- **證據**：規格 §8.3／本檔 DB 草案；Postgres unique 允許多個 NULL。
- **建議後續**：Could Have／實作時加 CHECK 或 partial unique index `WHERE source_order_id IS NOT NULL`（本單 unique 已要求加點必填，實作應順便加 CHECK，但不另開產品範圍）。

## 問題 4：殘餘文案與 AGENTS.md 禁區句

- **來源視角**：B／C
- **問題描述**：主路徑除 `MODE_CREDIT_LINE`／`FOLLOWUP_HINT` 外，`ERROR_MESSAGES.ADVANCED_LOCKED`（「尚未開通，無法讀取進階報告。」）、`MODE_UNLOCK_LINE`、`AGENTS.md`「真正解鎖或扣點」Won't Have 仍可能誤導。
- **證據**：`lib/constants.ts`、`AGENTS.md`。
- **建議後續**：單點 403 文案改成「尚未解鎖此報告」類；`AGENTS.md` 在單元 5 實作時比照單元 4 覆寫禁區句。

## 問題 5：方案表 `server-only` 與 client CTA

- **來源視角**：B
- **問題描述**：`lib/payments/plans.ts` 有 `import "server-only"`，買點 CTA 不能 import 方案常數，容易再寫死錯 id。
- **證據**：`lib/payments/plans.ts`、`UnlockCheckoutCta.tsx` 寫死 `UNLOCK_PLAN_ID`。
- **建議後續**：抽一層無 secret 的 `plan-ids.ts` 給 client，或在 CTA 旁加測試鎖死 `points_pack_5` 字串。
