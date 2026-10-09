# US-007：建單不寫 order_pending 實作

**作為** 付費使用者  
**我想要** 中途放棄付款時不收到「付款已受理」通知  
**以便** 通知只反映真實付款結果

**輸入格式**：
- US-006 的紅燈測試

**輸出格式**：
- `app/api/payments/checkout/route.ts`：刪除建單後 `insertNotification(... order_pending ...)` 與註解；移除不再使用的 import
- `scripts/unit8-checkpoint/fixture-lifetime-pending.sql`：`:24-32` 的 CTE（insert orders＋insert notifications）改為單純 `insert into public.orders … ;`
- `scripts/unit8-checkpoint/README.md` 同步

**驗收條件**：
- [ ] US-006 全部斷言轉綠；其他既有測試維持綠燈
- [ ] `NOTIFICATION_TYPES`、`NOTIFICATION_TEXT.order_pending`、`list-notifications` href、DB migration 未改動
- [ ] fixture SQL 執行後無 `order-pending:` key 的資料列，結尾 SELECT 仍可取得 `orders.id`
- [ ] `npm run lint`、`npm run typecheck`、`npm run build` 通過

**測試策略**：Test-First  
> 理由：對著 US-006 的失敗測試實作至轉綠。

**優先級**：P0  
**相關功能**：Story B／C  
**來源**：FR-1 / Scenario 1、2、6；FR-2 / Scenario 1、2  
**依賴關係**：US-006
