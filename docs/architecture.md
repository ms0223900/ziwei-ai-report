# 紫微 AI 解讀 — 檔案架構參考

> 單元 1 MVP 的完整目標檔案樹與逐檔職責、後續單元(會員/金流)的預留位置、藍本對照與陷阱清單。**本檔是架構藍圖,不代表這些檔案已存在** — 實作尚未開始。

## 1. 技術選型(定案)

- **框架**:Next.js App Router(Next 16、React 19、TypeScript),build/dev 一律 `--webpack`(與藍本一致,避免 dev/CI 行為分歧)
- **樣式**:Tailwind CSS 4；畫面主稿 [`designs/ziwei-unit1.pen`](../designs/ziwei-unit1.pen)，文字／禁用清單以 [`docs/design-brief.md`](design-brief.md) 與 [`docs/brand-guidelines.md`](brand-guidelines.md) 為準（墨箋夜讀）。Token：[`assets/design-tokens.json`](../assets/design-tokens.json)。本版不做暗色模式。scaffold 時期的紫 M3（`#6a3fb5`）已廢棄。
- **資料庫 / Auth**:Supabase(Postgres + RLS);本版只用 service_role 後端寫入;單元 2 起接 Auth
- **AI**:自串 OpenRouter REST(`openrouter.ai/api/v1/chat/completions`),主模型 + 備援模型;`AI_PROVIDER=mock|openrouter` 讓課程可離線示範
- **部署**:Vercel(production);route handler 設 `maxDuration`
- **字型**:Noto Serif TC（Display）／Noto Sans TC（Body）／IBM Plex Mono（僅日期與 `report_id`）；`next/font/google`，`preload:false`

## 2. 完整目標檔案樹(Phase A)

```
ziwei-ai-report/
├── README.md                       # 定位 + 規格來源連結 + 文件索引(已建立)
├── docs/
│   ├── spec.md                     # 規格書(已建立)
│   ├── architecture.md             # 本檔
│   ├── design-brief.md             # 單元 1 畫面規範（視覺／交互）
│   └── brand-guidelines.md         # 墨箋夜讀 guideline
│
├── AGENTS.md                       # AI 工具鏈:模式(mock/live)切換指示(course 習慣)
├── .env.example                    # 分區環境變數(見 spec.md §6)
├── assets/
│   ├── design-tokens.json          # 三層 token（primitive → semantic → component）
│   └── design-tokens.css           # 由 JSON 生成；勿手改
│
├── vercel.json                     # 無 crons(Vercel Hobby 限制)
├── package.json                    # scripts 覆寫為 next dev/build --webpack
│
├── supabase/migrations/
│   ├── 20260905000000_create_reports.sql   # 本版唯一遷移(見 spec.md §2 資料模型)
│   ├── 002_membership.sql          # 預留,不建立:單元 2
│   └── 003_payments.sql            # 預留,不建立:單元 4
│
├── lib/
│   ├── constants.ts                # disclaimer、locked_fields 等文案/常數單一來源
│   ├── errors.ts                   # 自訂錯誤類別(手法仿 stock lib/telegram.ts)
│   │
│   ├── supabase/
│   │   ├── env.ts                  # env 讀取/型別安全(仿 customer-lead-collector)
│   │   └── server.ts               # service-role client(Next 16:await cookies();本版不讀 session)
│   │
│   ├── validation/
│   │   └── birth.ts                # 暱稱 trim/長度;生日 YYYY-MM-DD + 拒未來日;
│   │                               # 時辰白名單 12 支;錯誤訊息常數同檔
│   │
│   ├── policy/
│   │   └── high-risk.ts            # 五類關鍵字(健康/法律/財務投資/孕產/自傷)→ 固定安全回覆
│   │                               # 命中即短路:不呼叫 LLM、不寫 DB
│   │
│   ├── schemas/
│   │   ├── report.v1.json          # JSON Schema(draft-07,SCHEMA_VERSION=1);放 lib 非 schemas/
│   │   └── loader.ts               # ajv 編譯單例(server-only;tsconfig 開 resolveJsonModule)
│   │
│   ├── prompts/
│   │   └── zwds-v1.ts              # 繁中命理師系統提示 + 娛樂聲明 + 逐欄輸出規則;
│   │                               # export PROMPT_VERSION;改 prompt 必升版號
│   │
│   ├── generation/
│   │   ├── mock.ts                 # MOCK_AI_MODE:valid / invalid-json / schema-missing-field
│   │   ├── openrouter.ts           # REST 呼叫;Bearer;fetch timeout;不依賴 response_format 保證
│   │   └── provider.ts             # 依 AI_PROVIDER 選 provider;主模型失敗→同模型重試一次
│   │                               # →才切備援;回 typed union {ok:true,...}|{ok:false,...}
│   │
│   ├── reports/
│   │   └── store.ts                # ajv 通過後 service-role 寫入 basic_json+advanced_json
│   │
│   └── masking/
│       └── buildReportResponse.ts  # 唯一對外組裝處:只取 basic 淺層 + meta + disclaimer
│                                   # 永不帶出 advanced_json
│
├── app/
│   ├── layout.tsx                  # Noto Serif TC + Noto Sans TC + IBM Plex Mono
│   ├── page.tsx                    # Server Component;單頁 wizard(表單→結果同頁切換)
│   ├── globals.css                 # 墨箋夜讀 @theme（import assets/design-tokens.css）
│   └── api/
│       └── reports/
│           └── route.ts            # POST + force-dynamic:驗證→高風險掃描→生成(重試/備援)
│                                   # →ajv 驗證(失敗=不寫 DB、可重試)→寫入→回 masked 回應
│
└── components/
    ├── birth-form/
    │   └── BirthForm.tsx           # client;命主暱稱/公曆日期(上限今天)/時辰下拉(不確定→null；十二支 JSON 單字)
    │                               # /聚焦三選一;結果放 state 不依賴 localStorage(無痕可跑);
    │                               # POST /api/reports;依 {error_code} 顯示繁中文案
    ├── report/
    │   ├── ReportCard.tsx          # overall/work/relationship/action;time_unknown 提示
    │   ├── AdvancedLockedPanel.tsx # 鎖定區 + 將解鎖欄位 + CTA(click 只提示,不假裝成功)
    │   └── Disclaimer.tsx          # 娛樂用途免責(頁首 + 結果底部)
    └── agents/                     # course AI 工具鏈(switch-ai-mode 等)
```

## 3. 後續單元預留(不建立,只標位置)

- `supabase/migrations/002_membership.sql`:profiles(user_id references auth.users、display_name、access_status、created/updated);`reports` 加 `user_id` + owner-only RLS policies;點數/訂閱狀態**只由受控後端更新**的接點註記
- `supabase/migrations/003_payments.sql`:orders(order_number/member/plan/amount/currency/status pending|paid)
- `lib/payments/plans.ts`:可信金額/方案唯一來源(前端只傳 plan 識別)
- `lib/ecpay/`:簽章/驗章共用同一函式;HashKey/HashIV 只存在 server env
- `app/api/payments/*`(建單/導向)、`app/api/webhooks/ecpay/route.ts`(回 `1|OK` 純文字)
- `app/api/reports/[report_id]/route.ts`:GET(登入後取已解鎖報告)
- `app/(auth)/login|register`:Email 註冊/登入
- 根 `middleware.ts` + `lib/supabase/client.ts`:單元 2 起接 cookie session;matcher 需排除 webhook 路徑
- 三態 UI(訪客 / 已登入未取得 / 已取得)在 CTA 元件預留 props 切換點

## 4. 藍本參考對照(實作時翻閱對應檔案)

| 藍本專案 | 參考檔 | 用途 |
|---|---|---|
| `stock-tracker-dashboard` | `app/globals.css` | 僅參考 Tailwind `@theme` 寫法；**色票改走墨箋夜讀，不要抄紫／金 M3** |
| | `lib/telegram.ts` | 錯誤類別寫法 |
| | `lib/cron-auth.ts` + `app/api/cron/check-prices/route.ts` | 受控後端 route 模式;單元 4 簽章閘門藍本 |
| | AGENTS.md / agents/ | course 模式切換工具鏈 |
| `customer-lead-collector` | `lib/supabase/{env,server,client}.ts`、根 `middleware.ts` | 單元 2 逐字仿寫母檔(Next 16 `await cookies()`) |
| `order-essentials` | `supabase/migrations/20250109000000_create_order_with_inventory_deduction.sql` | 單元 4 交易型 SQL 母版 |

## 5. 陷阱清單(實作時遵守)

1. **`cookies()` 非同步**:Next 16 一律 `await cookies()`;server client 以 CLC 版為準
2. **RLS 驗證陷阱**:SQL Editor 以 owner 身分操作會繞過 RLS 造成誤判;驗證要走 anon / 雙帳號
3. **Vercel Hobby**:無 cron;route handler 設 `maxDuration` ≥ 60。常態 demo 選快速主模型。備援路徑（主失敗→重試→備援）允許本機／預覽驗證，不以 Hobby 10 秒為硬 SLA。
4. **ECPay 預警(單元 4)**:`MerchantTradeNo` ≤20 字元英數不可重用;webhook body 是 `x-www-form-urlencoded` 非 JSON,回應純文字 `1|OK`;middleware matcher 排除 webhook;瀏覽器回跳不得當成功依據;簽章/驗章共用同一函式
5. **訪客報告無法事後認領**:本版報告無 user_id,一次性示範;會員單元起「先登入再生成」

## 6. Checkpoint 規劃(A1–A7)

| CP | 內容 | 驗收 |
|---|---|---|
| A1 | scaffold + 墨箋夜讀 token + layout 三字型 + vercel.json + .env.example + AI 工具鏈 | `next build` 過 |
| A2 | 001 SQL 上 Supabase + lib/supabase + validation + high-risk | 表存在、RLS on |
| A3 | schema + ajv + prompt v1 + mock 三模式 + provider + errors | 三種 mock 皆可產出 |
| A4 | `POST /api/reports` 全流程 + store + masking | `MOCK_AI_MODE=invalid-json` 時 DB 無新列;輸入錯誤 4xx |
| A5 | 表單 + 結果卡 + 鎖定面板 + disclaimer | Mock「小圓」示範跑通;高風險→安全回覆、無 CTA、無 DB 列 |
| A6 | OpenRouter 實接 + 主/備援 | key 只在後端(front bundle grep 不到);主失敗→備援 |
| A7 | 無痕全流程 + Vercel deploy | 無痕:填→結果→鎖定 CTA→提示;Production env 完備 |

各 checkpoint 可獨立 build/typecheck,各一個 commit;mock 預設讓課程學員零 key 也能跑完主流程。

## 7. 單元 7 付款後交付（已實作）

> 規格：[`docs/specs/2026-09-28-ziwei-unit7-post-payment-delivery.md`](specs/2026-09-28-ziwei-unit7-post-payment-delivery.md)；任務與驗收：[`docs/user-stories/ziwei-unit7-post-payment-delivery/`](user-stories/ziwei-unit7-post-payment-delivery/README.md)；課堂 Checkpoint：[`howto-post-payment-delivery.md`](user-stories/ziwei-unit7-post-payment-delivery/howto-post-payment-delivery.md)。

### 7.1 資料表（`supabase/migrations/20260928000000_notifications_admin_actions.sql`）

| 表 | 重點欄位 | 權限 |
| --- | --- | --- |
| `notifications` | `user_id`、`type`（8 值）、`source_type`（`order`／`report`／`subscription_event`／`admin_action`）、`source_id`、`idempotency_key` unique、`created_at`、`read_at` | RLS on；authenticated 只能 SELECT 自己的列；INSERT 與已讀只經 service role |
| `admin_actions` | `admin_user_id`、`action`（本版只有 `credit_points`）、`reason`、`source_order_id` → `orders`、`idempotency_key` unique、`before_state`／`after_state`、`result`（`ok`／`skipped_already_fulfilled`／`rejected`） | RLS on；authenticated、anon 無任何權限 |

不新增 `orders` 欄位或 `orders.status` 值；`point_transactions` 不新增 type。

### 7.2 路由

| 路由 | 檔案 | 說明 |
| --- | --- | --- |
| `GET /api/orders/processing?order={id}` | `app/api/orders/processing/route.ts` | 需 session；只讀；回七個互斥 screen 之一（`lib/orders/resolve-processing-screen.ts`） |
| `/orders/processing?order={id}` | `app/orders/processing/page.tsx` | 結果頁（RSC），與 API 共用 `lib/orders/read-processing-result.ts`；忽略 `RtnCode`／`SimulatePaid` 等 query |
| `GET /api/notifications` | `app/api/notifications/route.ts` | 需 session；自己的通知、新到舊（`lib/notifications/list-notifications.ts`） |
| `POST /api/notifications/{id}/read` | `app/api/notifications/[id]/read/route.ts` | 需 session；service role 確認擁有者且 `read_at is null` 才寫 |
| `/notifications` | `app/notifications/page.tsx` | 通知頁；頁首入口只在登入時出現（`components/auth/AuthSessionBar.tsx`） |
| `POST /api/admin/compensations` | `app/api/admin/compensations/route.ts` | 白名單管理者補點；只呼叫 `fulfill_points_pack_order` |
| `/admin/orders?order={id}` | `app/admin/orders/page.tsx` | 管理者查詢頁；非白名單以 `forbidden()` 回 403（`next.config.mjs` 啟用 `experimental.authInterrupts`，畫面在 `app/forbidden.tsx`） |

新 API 都需要 session，不在 `proxy.ts` 的排除清單內（排除清單仍只有綠界 Webhook）。

### 7.3 寫入規則

- **`pending → failed` 唯一入口**：`lib/payments/mark-order-failed.ts` 的 `markOrderFailed()`。帶 `status=pending` 條件更新，再另一次寫 `order_failed`；生產呼叫端只有 ReturnURL（`RtnCode != 1`），Checkpoint 用 `scripts/post-payment-checkpoint/mark-failed.sql`（同步驟）。沒有逾時呼叫端。
- **failed 是終態**：ReturnURL 對已 `failed` 的訂單回 `1|OK` 不履約；PeriodReturnURL 在 `subscriptions.order_id` 指向的訂單已 `failed` 時回 `1|OK`、不寫週期事件。
- **通知**：一律經 `lib/notifications/insert-notification.ts` 的 `insertNotification()`，在履約提交之後另寫；同一 `idempotency_key` 跳過、其他錯誤只記 log 不 throw，不回滾履約。各 type 的寫入點與 key 見規格 §2 Story 5；`cancel.sql` 在取消 commit 後另一次交易補 `subscription_inactive`。
- **回跳**：建單時 `ClientBackURL` = `{APP_BASE_URL}/orders/processing?order={orders.id}`（`lib/payments/checkout-env.ts` 只提供 `appBaseUrl`），並寫一則 `order_pending`。
