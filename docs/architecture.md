# 紫微 AI 解讀 — 檔案架構參考

> 單元 1 MVP 的完整目標檔案樹與逐檔職責、後續單元(會員/金流)的預留位置、藍本對照與陷阱清單。**本檔是架構藍圖,不代表這些檔案已存在** — 實作尚未開始。

## 1. 技術選型(定案)

- **框架**:Next.js App Router(Next 16、React 19、TypeScript),build/dev 一律 `--webpack`(與藍本一致,避免 dev/CI 行為分歧)
- **樣式**:Tailwind CSS 4;紫微色彩沿用 stock-tracker-dashboard 的 M3 token 結構(紫 `#6a3fb5` / 深色 `#cfb9ff`、金 amber `#a05e03` / `#ffb959`)
- **資料庫 / Auth**:Supabase(Postgres + RLS);本版只用 service_role 後端寫入;單元 2 起接 Auth
- **AI**:自串 OpenRouter REST(`openrouter.ai/api/v1/chat/completions`),主模型 + 備援模型;`AI_PROVIDER=mock|openrouter` 讓課程可離線示範
- **部署**:Vercel(production);route handler 設 `maxDuration`
- **字型**:Noto Sans TC(`next/font/google`,`preload:false`)

## 2. 完整目標檔案樹(Phase A)

```
ziwei-ai-report/
├── README.md                       # 定位 + 規格來源連結 + 文件索引(已建立)
├── docs/
│   ├── spec.md                     # 規格書(已建立)
│   └── architecture.md             # 本檔
│
├── AGENTS.md                       # AI 工具鏈:模式(mock/live)切換指示(course 習慣)
├── .env.example                    # 分區環境變數(見 spec.md §6)
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
│   ├── layout.tsx                  # Noto Sans TC(preload:false)
│   ├── page.tsx                    # Server Component;單頁 wizard(表單→結果同頁切換)
│   ├── globals.css                 # 紫微 M3 token(紫 #6a3fb5 / 金 #a05e03 + 深色覆寫)
│   └── api/
│       └── reports/
│           └── route.ts            # POST + force-dynamic:驗證→高風險掃描→生成(重試/備援)
│                                   # →ajv 驗證(失敗=不寫 DB、可重試)→寫入→回 masked 回應
│
└── components/
    ├── birth-form/
    │   └── BirthForm.tsx           # client;暱稱/日期(上限今天)/時辰下拉(含「不確定」)
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
| `stock-tracker-dashboard` | `app/globals.css` | M3 token 結構;改紫微色(紫 `#6a3fb5`/金 `#a05e03`) |
| | `lib/telegram.ts` | 錯誤類別寫法 |
| | `lib/cron-auth.ts` + `app/api/cron/check-prices/route.ts` | 受控後端 route 模式;單元 4 簽章閘門藍本 |
| | AGENTS.md / agents/ | course 模式切換工具鏈 |
| `customer-lead-collector` | `lib/supabase/{env,server,client}.ts`、根 `middleware.ts` | 單元 2 逐字仿寫母檔(Next 16 `await cookies()`) |
| `order-essentials` | `supabase/migrations/20250109000000_create_order_with_inventory_deduction.sql` | 單元 4 交易型 SQL 母版 |

## 5. 陷阱清單(實作時遵守)

1. **`cookies()` 非同步**:Next 16 一律 `await cookies()`;server client 以 CLC 版為準
2. **RLS 驗證陷阱**:SQL Editor 以 owner 身分操作會繞過 RLS 造成誤判;驗證要走 anon / 雙帳號
3. **Vercel Hobby**:無 cron;route handler 設 `maxDuration`;常態 demo 選快速主模型,10 秒內完成
4. **ECPay 預警(單元 4)**:`MerchantTradeNo` ≤20 字元英數不可重用;webhook body 是 `x-www-form-urlencoded` 非 JSON,回應純文字 `1|OK`;middleware matcher 排除 webhook;瀏覽器回跳不得當成功依據;簽章/驗章共用同一函式
5. **訪客報告無法事後認領**:本版報告無 user_id,一次性示範;會員單元起「先登入再生成」

## 6. Checkpoint 規劃(A1–A7)

| CP | 內容 | 驗收 |
|---|---|---|
| A1 | scaffold + globals.css 紫微 token + layout + vercel.json + .env.example + AI 工具鏈 | `next build` 過 |
| A2 | 001 SQL 上 Supabase + lib/supabase + validation + high-risk | 表存在、RLS on |
| A3 | schema + ajv + prompt v1 + mock 三模式 + provider + errors | 三種 mock 皆可產出 |
| A4 | `POST /api/reports` 全流程 + store + masking | `MOCK_AI_MODE=invalid-json` 時 DB 無新列;輸入錯誤 4xx |
| A5 | 表單 + 結果卡 + 鎖定面板 + disclaimer | Mock「小圓」示範跑通;高風險→安全回覆、無 CTA、無 DB 列 |
| A6 | OpenRouter 實接 + 主/備援 | key 只在後端(front bundle grep 不到);主失敗→備援 |
| A7 | 無痕全流程 + Vercel deploy | 無痕:填→結果→鎖定 CTA→提示;Production env 完備 |

各 checkpoint 可獨立 build/typecheck,各一個 commit;mock 預設讓課程學員零 key 也能跑完主流程。
