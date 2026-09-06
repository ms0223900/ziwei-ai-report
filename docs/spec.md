# 紫微 AI 解讀 — 規格書

> 濃縮自 Notion 三份規格(MVP Spec / 單元 2 會員 / 單元 4 金流)。正式對外文件以 Notion 為單一事實來源,本檔是實作時的工作參照。規範用語:本版 = 單元 1 MVP(會員與金流不實作,只預留接點)。

## 1. 產品定位

把「可計費的 AI 解讀」推進成單次解鎖、點數追問、訂閱三種收費模式,第一步先有訪客能跑完的解讀 MVP。基本與進階是**同一份 JSON 的兩個深度**,不是兩次互不參考的生成。介面與報告一律標示娛樂用途,不作為醫療、法律、財務、投資或重大人生決策依據。單元 1 畫面主稿為 [`designs/ziwei-unit1.pen`](../designs/ziwei-unit1.pen)，文字規範見 [`docs/design-brief.md`](design-brief.md)。

## 2. 本版範圍(單元 1 MVP)

### 核心流程

訪客打開公開測試網址 → 填暱稱/生日(必填)、時辰/聚焦(選填)→ 前端呼叫**自己的後端 API** → 依環境變數走 Mock 或 OpenRouter(主模型失敗才切備援)→ **JSON Schema 驗證**(失敗 = 不算交付、不寫入、可重試)→ 寫入 `reports` → 伺服器遮罩後回傳基本摘要 → `action_plan / path_compare / rationale` 鎖定並顯示「解鎖完整報告」入口(本版不串金流、不假裝成功)。

### 輸入

| 欄位 | 必填 | 格式 | 邊界 |
|---|---|---|---|
| `nickname` | 是 | 文字 | 空白提示重填 |
| `birth_date` | 是 | `YYYY-MM-DD` | 格式錯誤或未來日期提示重填 |
| `birth_time` | 否 | 12 支時辰 | 未填 → `time_unknown=true`,標示準確度較低 |
| `focus` | 否 | `整體`／`工作`／`關係` | 空值視為 `整體` |

示範輸入:暱稱「小圓」/ `1993-07-12` / 時辰未填 / 聚焦「工作」。

### 共用輸出 JSON

- **basic**:`report_id`、`tier=basic`、暱稱/生辰/時辰、`disclaimer`、`overall`(2~3 句)、`work`/`relationship`(各 1 句)、`action`(1 句方向,無 7 天步驟)、`locked_fields: [action_plan, path_compare, rationale]`
- **advanced**(可先生成存檔、畫面不展示):延續基本結論、只加深不推翻;新增 `rationale`、`path_compare{path_a, path_b, note}`、`action_plan`(7 天)

### Must Have / Won't Have

**Must**:生辰表單與後端驗證;Mock 與 OpenRouter 共用同一 JSON schema;Schema 驗證成功且寫入才算交付;訪客只看基本摘要(伺服器遮罩);解鎖 CTA 只是接點標記;OpenRouter key 只放後端;娛樂用途聲明與高風險固定安全回覆;公開測試網址,無痕視窗可跑完。

**Won't Have(本版)**:註冊/登入/會員資料/RLS;訂單/付款/Webhook/金流沙盒;真正解鎖/扣點/訂閱;追問主流程;前端直接呼叫 OpenRouter;自動換模型;塔羅/合盤/月報/主題加購/補時辰重出。

### 高風險輸入

健康、法律、財務投資、孕產、自傷/傷害他人 → **固定安全回覆**,不呼叫 LLM、不寫 DB、不編造命盤結論。

### 資料模型(只建 `reports`)

| 欄位 | 型態 | 說明 |
|---|---|---|
| id / report_id | uuid pk | 報告 ID |
| nickname | text | 暱稱 |
| birth_date | date | YYYY-MM-DD |
| birth_time | text / null | 12 支;null = 未提供 |
| time_unknown | boolean | 未填時辰為 true |
| focus | text | `整體`／`工作`／`關係` |
| basic_json | jsonb | 驗證過的基本結果 |
| advanced_json | jsonb / null | 可同次生成存檔,畫面仍遮罩 |
| status | text | `basic`(本版固定)/ 日後 `unlocked` |
| generation_status | text | success / failed / pending |
| model / provider | text / null | 例:mock / openrouter |
| prompt_version / schema_version | text / int | 版本追蹤 |
| request_id | text / null | 供追蹤 |
| generated_at / created_at | timestamptz | |

本版**不建** users、orders、credits、subscriptions。

### 驗收標準(單元 1)

- [ ] 無痕視窗可填暱稱/生日並送出;生日錯誤時提示且不呼叫模型
- [ ] 送出後顯示基本摘要(overall 2~3 句、work/relationship 各 1 句);行動/依據/兩條路徑鎖定
- [ ] 看得到「解鎖完整報告」入口;點擊不會變已解鎖、不串金流
- [ ] 未填時辰標示準確度較低;介面與報告都有娛樂用途聲明
- [ ] Mock 與 Live 回傳符合同一 schema;Schema 驗證失敗不寫入成功報告、可重試
- [ ] OpenRouter key 不出現在前端程式或網路面板
- [ ] 高風險題目顯示固定安全回覆,不展示命盤結論

## 3. 關鍵設計決策

1. **同一 JSON 兩層,一次生成、拆分同寫**:LLM 一次生成含 basic+advanced 的單一 JSON → ajv 對**完整 schema** 驗證 → 同時寫入 `basic_json`/`advanced_json`。付款後不需重新生成即可解鎖(LLM 非確定性)。`status='basic'` 只代表未解鎖,不是沒存 advanced。
2. **遮罩在伺服器,不在前端、不改 DB**:組回應時只選 basic 淺層 + meta,**永不帶出 advanced_json**;付費版只是多一支 unlocked 變體。
3. **RLS enabled 但零 policy(本版)**:reports 無 user 欄位,anon key 完全讀不到;唯一讀寫管道是 service_role 後端(具 BYPASSRLS)。單元 2 遷移:加 `user_id` + owner-only policies。
4. **驗證一律靠 ajv,不信任模型端保證**(不依賴 response_format);主模型失敗或驗證失敗 → 同模型重試一次 → 才切備援。
5. **改 prompt 必升 `PROMPT_VERSION`**;Mock/Live 共用 schema 與 prompt 版號,reports 可比對。
6. **單元 1 訪客報告為一次性示範**(無 user_id,日後無法認領);會員單元起生成都在登入後。

## 4. 單元 2 會員(範圍與要求,本版不實作)

- **Auth**:Supabase Auth Email 註冊/登入/登出/登入狀態辨識(只回答「你是誰」)
- **profiles 最小表**:`user_id`(references auth.users)、`display_name`、`access_status`、created/updated;預留日後由**受控後端**更新的點數/訂閱狀態接點
- **RLS**:會員只能讀寫自己的資料;產品狀態(access_status/點數/訂閱)不可由前端竄改
- **三態 UI**:訪客 / 已登入未取得權限 / 已取得權限,各自看到正確功能範圍與下一步
- **驗收**:雙帳號隔離(A 的資料用 B 登入讀不到);前端無權限欄位可竄改面

## 5. 單元 4 金流(範圍與要求,本版不實作)

- 綠界 ECPay 導轉式**沙盒**,主線 = 單次付費解鎖;點數/訂閱共用同一套可信付款基礎
- **可信金額永遠在後端決定**:前端只傳方案識別;金額/幣別/訂單項目由受控資料取得
- 流程:登入會員選方案 → 建立待付款訂單(order_number/會員/方案/金額/幣別/狀態)→ 後端以 HashKey/HashIV(只放 env)簽 CheckMacValue、導向付款頁 → **瀏覽器回跳只顯示處理中,不得當成功依據** → Webhook 驗證來源/簽章/訂單編號/金額 → 冪等更新 `pending→paid` → 才翻 `access_status` 解鎖
- **不做**:退款、取消、訂閱週期事件、多家金流、正式電子發票;不以前端回跳參數作為解鎖依據

## 6. 環境變數清單(未來 .env.example 依此分區)

| 變數 | 位置 | 用途 | 階段 |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase 專案 | 本版留位 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | 單元 2 起使用 | 本版留位 |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only | route handler 寫 reports | 本版 |
| `AI_PROVIDER` | server-only | `mock`(預設)/ `openrouter` | 本版 |
| `MOCK_AI_MODE` | server-only | `valid` / `invalid-json` / `schema-missing-field`(示範驗證失敗) | 本版 |
| `OPENROUTER_API_KEY` | server-only | 只放後端 | 本版 |
| `OPENROUTER_PRIMARY_MODEL` | server-only | 主模型(選快速模型) | 本版 |
| `OPENROUTER_FALLBACK_MODEL` | server-only | 備援(不同 provider 更佳) | 本版 |
| `ECPAY_MERCHANT_ID` / `ECPAY_HASH_KEY` / `ECPAY_HASH_IV` | server-only | 金流簽章 | 單元 4 |
| `ECPAY_ENV` | server-only | `stage` / `prod` | 單元 4 |
| `APP_BASE_URL` | server-only | 回跳/Webhook 網址根 | 單元 4 |

前端一律不載入 server-only 變數;secret 不用 `NEXT_PUBLIC_` 前綴。
