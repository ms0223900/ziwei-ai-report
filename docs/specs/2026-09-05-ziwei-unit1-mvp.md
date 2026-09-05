# 單元 1 MVP — 紫微基本／進階解讀（AI 開發規格）

> 來源 Ticket：[🧾 【Spec】紫微基本／進階解讀 MVP](https://app.notion.com/p/b8ad5428d1394685a90d0d59d761b4c8)（Notion，2026-09-05 擷取）  
> 子筆記事實來源：[第一版 Prompt、Mock JSON 與四種權限走查](https://app.notion.com/p/befe709738cc4da8b9318b61b950827e)、[OpenRouter 串接評估與 MVP 實作建議](https://app.notion.com/p/d29f36a539824a3985db258bba619825)  
> 本檔為開發類規格（第 0～6 節 + 獨立審查後第 7 節）。現況：Checkpoint A1 已完成（scaffold）；A2–A7 尚未實作。

---

## 0. Context

- **Problem**: 沒有訪客可跑完的解讀起點，後續單次解鎖／點數／訂閱沒有可計費產品；基本與進階若分開生成，付費後詳批可能與免費摘要矛盾。
- **Goal**: 無痕訪客填生辰後看到紫微基本分析；進階欄位鎖定並顯示解鎖入口；後端以 Mock 或 OpenRouter 產出同一 schema 的 JSON，驗證通過後寫入 `reports`，伺服器依未付款狀態遮罩後回傳。
- **Impacted Areas**:
  - 新建：`app/page.tsx`（目前僅 A1 佔位）、`app/api/reports/route.ts`、`components/birth-form/`、`components/report/`、`lib/`（validation、high-risk、schema、prompt、generation、store、masking）、`supabase/migrations/`（`reports`）
  - 既有參照：`docs/spec.md`（`focus` 英文枚舉須對齊本檔，見第 7 節問題 1）、`docs/architecture.md`、`.env.example`、`app/layout.tsx`
  - 明確不做：`users`／`orders`／`credits`／`subscriptions`、Auth、ECPay、追問 API
- **Stakeholders**: 訪客／求測者（無登入）；課程學員（Mock 零 key 可跑）；後續單元的會員／金流接棒（本版只留畫面接點）

---

## 1. 核心 User Story (Core User Stories)

- **Story 1 — 訪客送出生辰**  
  As a 訪客, I want 填寫暱稱與生日（時辰、聚焦可空）並送出, So that 系統只在資料合法時開始生成解讀。

- **Story 2a — 系統生成並驗證 JSON**  
  As a 系統, I want 依 `AI_PROVIDER` 以 Mock 或 OpenRouter 產出可通過對應 schema 的 JSON（Mock 分層驗證、Live 完整物件）, So that 未通過驗證的內容不算交付。

- **Story 2b — 寫入報告並遮罩回傳**  
  As a 系統, I want 驗證通過後把基本層與進階層同時寫入 `reports`，對外只回未付款遮罩, So that 畫面永遠看不到 `advanced_json`，且日後解鎖不必重跑模型。

- **Story 3 — 訪客看基本分析與鎖定接點**  
  As a 訪客, I want 看到基本摘要、鎖定的進階區，以及「解鎖完整報告」入口, So that 我能分辨免費／付費切線，且本版不會被假裝成已付款。

- **Story 4 — 高風險短路**  
  As a 訪客, I want 當輸入觸及健康／法律／財務投資／孕產／自傷或傷害他人時看到固定安全回覆, So that 系統不編造命盤結論、不呼叫 LLM、不寫入成功報告。

- **Story 5 — 失敗可重試**  
  As a 訪客, I want 生成、schema 驗證或寫入失敗時看到繁中說明並可再送出, So that 失敗不會被標成已解鎖，畫面也不會整頁崩潰。

---

## 2. 功能細節 (Functional Specs)

### For Story 1 — 訪客送出生辰

- 單頁：表單與結果同頁切換（`app/page.tsx`）；結果放元件 state，不依賴 `localStorage`（無痕可跑）。
- 前端先檢查、後端再檢查同一組規則；無效請求不得呼叫 LLM、不得 insert `reports`。
- 不追問性別、出生地。

**輸入欄位**

| 欄位 | 必填 | 允許值／格式 | 失敗時 |
|---|---|---|---|
| `nickname` | 是 | 非空白文字（trim 後長度 ≥ 1） | 提示重填；HTTP 400 |
| `birth_date` | 是 | `YYYY-MM-DD`；不得為未來日期 | 提示修正；HTTP 400；不呼叫模型 |
| `birth_time` | 否 | `null`／省略，或 12 支時辰白名單（子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥）。未填或 UI「不確定」→ 請求必須送 `null`（禁止送字串「不確定」）→ `time_unknown=true` | 非白名單（含「不確定」字串）→ HTTP 400 |
| `focus` | 否 | 僅 `整體`／`工作`／`關係`；空值視為 `整體` | 其他字串 → HTTP 400 |

> `focus` 允許值以 Prompt／Mock 子筆記為準（中文），與 `docs/spec.md` 目前寫的 `overall`／`work`／`relationship` 不同；實作以本檔與子筆記為準。  
> 時辰填寫格式 Notion 未寫死；本 repo `docs/architecture.md` 已定 12 支下拉（含「不確定」）。

**示範輸入（Mock `valid` 必須可重現）**: 暱稱「小圓」／`1993-07-12`／時辰未填／聚焦「工作」。

**`POST /api/reports` Request**

```json
{
  "nickname": "小圓",
  "birth_date": "1993-07-12",
  "birth_time": null,
  "focus": "工作"
}
```

- 本版無登入、無 token、無 CSRF 以外的角色檢查；任何人可呼叫。
- Content-Type: `application/json`。

### For Story 2a — 生成並驗證

- `AI_PROVIDER=mock`（預設）或 `openrouter`。前端不得直連 OpenRouter。
- **一次生成、兩層同寫**：Live 呼叫一次模型，產出同時含基本欄位與進階欄位的完整 JSON（對齊 Ticket「同一份 JSON 兩個深度」與「先生成完整進階再遮罩」；不先做一次 basic 再另一次 advanced）。
- Prompt 正文與欄位規則以子筆記「基本分析 Prompt」+「進階分析 Prompt」合併進單一系統提示：進階只加深、不推翻基本結論；只輸出 JSON。**合併後的輸出清單必須同時要求** basic 的 `action`、`locked_fields` **以及** 進階的 `rationale`／`path_compare`／`action_plan`（子筆記進階 Prompt 原文沒列 `action`，合併時要補上，否則 Live 會缺欄而 ajv 失敗）。
- 改 prompt 必須遞增 `PROMPT_VERSION`；`SCHEMA_VERSION` 與報告列一併寫入。
- **驗證層 vs HTTP 層（禁止混用）**：ajv 只打**遮罩前、尚未組 HTTP body** 的物件。HTTP 200 永遠是 basic 子集，**不必**通過完整 schema。驗收不得拿 HTTP body 去跑完整 schema。
- **兩套 schema（draft-07）**：
  - `report.basic.v1`：子筆記基本 JSON 的必要欄（含 `action`、`locked_fields`；**不含** `rationale`／`path_compare`／`action_plan`）。
  - `report.advanced.v1`：子筆記進階 JSON 的必要欄（含 `rationale`／`path_compare`／`action_plan`；**不含** `action`／`locked_fields`）。
  - `report.complete.v1`：Live 用；basic 必要欄 ∪ advanced 必要欄（同一物件必須同時有 `action` 與進階三欄）。
- `report_id` 在 schema 中為 **string，禁止 `format: uuid`**（Mock canned 為 `rpt_demo_001`）。DB 主鍵 `reports.id` 仍是 uuid，與 JSON `report_id` 分開：Live 可把 uuid 字串寫進 JSON `report_id`；Mock HTTP／canned 維持 `rpt_demo_001`，insert 時 `id` 另產 uuid。
- **Mock 三模式**（`MOCK_AI_MODE`）：
  - `valid`：取子筆記**兩份** canned。`basic_json` 過 `report.basic.v1`，`advanced_json` 過 `report.advanced.v1`。HTTP 200 用基本件（短 overall，對齊畫面 A），**不要**從進階件剝欄位當畫面文案。
  - `invalid-json`：回傳非 JSON → **422** `SCHEMA_INVALID`（視為產出無法通過驗證，不是上游 HTTP 失敗）。
  - `schema-missing-field`：basic canned **拿掉 `overall`** 再跑 `report.basic.v1` → 422。
- **Live**：`POST https://openrouter.ai/api/v1/chat/completions`；`Authorization: Bearer $OPENROUTER_API_KEY`。產出必須通過 `report.complete.v1`。通過後拆成 `basic_json`（basic 欄位）與 `advanced_json`（完整物件）。主模型 = `OPENROUTER_PRIMARY_MODEL`；僅當主模型**請求**失敗（timeout／非 2xx）或**驗證**失敗時：同模型再試 1 次，仍失敗才切 `OPENROUTER_FALLBACK_MODEL`。禁止依請求自動選模型。HTTP 200 仍只回 basic 子集。
- 追問 Prompt、畫面 B/C/D、follow-up JSON：**本版不實作**。

**Live `report.complete.v1` 欄位（Mock 兩份 canned 不要求單物件同時具備全部）**

| 欄位 | 型別 | 規則 |
|---|---|---|
| `report_id` | string | 非 uuid format。Mock canned／畫面示範 = `rpt_demo_001`；Live 建議用 `reports.id` 的 uuid 字串 |
| `tier` | string | 生成物為完整深度時 `advanced`；遮罩後對外 `basic` |
| `nickname`, `birth_date` | string | 回填輸入 |
| `birth_time` | string \| null | 未填為 `null` |
| `time_unknown` | boolean | 未填時辰為 `true` |
| `focus` | string | `整體` \| `工作` \| `關係` |
| `disclaimer` | string | 固定娛樂用途句（見 Story 3） |
| `overall` | string | 2～3 句；`time_unknown=true` 時必須標示準確度較低 |
| `work`, `relationship` | string | 各 1 句 |
| `action` | string | 1 句方向；禁止 7 天步驟、禁止兩條路徑 |
| `rationale` | string | 進階層 |
| `path_compare` | object | `{ path_a, path_b, note }` 皆為 string |
| `action_plan` | string[] | 長度 7（第 1～7 天） |
| `locked_fields` | string[] | 對外 basic 必須為 `["action_plan","path_compare","rationale"]` |

### For Story 2b — 寫入與遮罩

- 成功條件（任一失敗即停，且不得把該次標成解鎖）：  
  `AI 回傳 → JSON Schema 驗證成功 → reports insert 成功 → 遮罩後回前端`
- `status` 本版固定 `'basic'`（代表未解鎖，不是「沒存 advanced」）。
- `generation_status`：`success`｜`failed`｜`pending`。成功列必須 `success`。
- 同時寫入 `basic_json` 與 `advanced_json`。未解鎖時**不要**為了隱藏進階而重跑模型。
- **即使 `AI_PROVIDER=mock` 仍要有 Supabase**：`SUPABASE_SERVICE_ROLE_KEY` + 已套用的 `reports` 表。「課程零 key」只指零 OpenRouter key，不是零資料庫。
- **遮罩（唯一對外組裝）**：Response 只含 basic 淺層 + meta + `disclaimer`。**永不**把 `advanced_json`、`rationale`、`path_compare`、`action_plan` 放進 HTTP body。
- 「已存報告再檢視不得重跑模型」：本版無 `GET /api/reports/:id`、結果只在同頁 state。此條驗的是**同一次 POST 處理中不要為遮罩再打模型**，不是「重新整理後仍看同一份」。重新整理會再 POST、新列（訪客一次性示範）。
- 正式訪客永遠走未付款遮罩。開發對稿以 Mock canned JSON 檔為準；「環境變數預覽遮罩前全文」列為 Later（見第 5 節）。

**`POST /api/reports` 成功 Response（200）** — 形狀對齊畫面 A／basic JSON：

```json
{
  "report_id": "rpt_demo_001",
  "tier": "basic",
  "nickname": "小圓",
  "birth_date": "1993-07-12",
  "birth_time": null,
  "time_unknown": true,
  "focus": "工作",
  "disclaimer": "本結果僅供娛樂與自我反思，不作為醫療、法律、財務、投資或重大人生決策依據。",
  "overall": "（未知時辰，準確度較低）這段時間適合先整理已有能力與成果，而不是一次做大變動。",
  "work": "工作上較需要『可被看見的小成果』，而不是更多靈感。",
  "relationship": "合作時把範圍講清楚，會比加更多承諾更有幫助。",
  "action": "先完成一件能展示的小交付。",
  "locked_fields": ["action_plan", "path_compare", "rationale"],
  "status": "basic",
  "generation_status": "success"
}
```

**錯誤 Response**

| HTTP | 條件 | body（最低欄位） |
|---|---|---|
| 400 | 輸入驗證失敗 | `{ "error_code": "VALIDATION_ERROR", "message": "<繁中>" }` |
| 422 | schema／parse 失敗（含 `invalid-json`、`schema-missing-field`、Live 產出缺欄） | `{ "error_code": "SCHEMA_INVALID", "message": "報告格式驗證失敗，請再試一次。" }` |
| 502 | **僅** OpenRouter 傳輸失敗（timeout、非 2xx）。不含「模型有回但不是合法 JSON」 | `{ "error_code": "GENERATION_FAILED", "message": "生成失敗，請再試一次。" }` |
| 503 | DB 寫入失敗 | `{ "error_code": "PERSIST_FAILED", "message": "儲存失敗，請再試一次。" }` |
| 200 | 高風險短路（Story 4） | `{ "error_code": "HIGH_RISK", "category": "<health\|legal\|financial_risk\|pregnancy\|self_harm>", "message": "<該類固定文案>", "disclaimer": "<通用娛樂標註>" }`；**不** insert |

### For Story 3 — 畫面 A（未付款）

對齊子筆記「畫面 A｜未付款」：

- 標題：`{暱稱}的基本分析`；`time_unknown=true` 時標題或 overall 須可見「未知時辰，準確度較低」。
- 顯示 `overall`／`work`／`relationship`（可另顯示 basic `action` 一句；進階 7 天與路徑必須鎖定）。
- 行動建議區鎖定文案：**「解鎖進階報告後可見 7 天行動方針與兩條路徑比較」**。
- 底部 disclaimer + CTA **「解鎖完整報告」**。
- 點擊 CTA：不呼叫付款、不改 `status`、不把畫面切成進階。可 disabled 或提示「即將開放」；**禁止**假裝付款成功。
- 追問輸入框：本版不出現（Could Have 才以鎖定態出現）。
- 頁首與結果底部都要有娛樂用途聲明。layout metadata 已有一句；結果卡仍須顯示 `disclaimer`。

**本版只標記、不實作的商業接點（畫面必須找得到同一組位置）**

| 接點 | 本版 | 後續單元才做 |
|---|---|---|
| 方案／升級入口 | 「解鎖完整報告」；點了不變已解鎖 | 單次解鎖可看進階 |
| 鎖定區 | 行動／依據／兩條路徑鎖定 | 展示 `rationale`／`path_compare`／`action_plan` |
| 交付位置 | 同一報告頁，進階欄位位置預留 | 不重算，只打開已存欄位 |
| 追問 | 不出現 | 已解鎖且有點數／訂閱才可問 |

三種收費模式只寫在產品說明／註解，本版不更新對應欄位：單次解鎖看進階不附贈追問；點數只買 1 次追問；訂閱看進階 + 本月追問 10 次。

### For Story 4 — 高風險短路

- 掃描對象：請求內所有字串（至少 `nickname`；`focus` 為枚舉，仍一併掃）。
- 五類：健康、法律、財務投資、孕產、自傷／傷害他人。
- 命中：不呼叫 LLM、不 insert `reports`、不顯示解鎖 CTA、不展示命盤結論。
- 前端分流：HTTP 200 **且** `error_code === "HIGH_RISK"` → 安全文案畫面（只有 `message` + `disclaimer`）。HTTP 200 **且無** `error_code` → 畫面 A。禁止只靠 `res.ok` 渲染報告卡。
- 畫面直接使用子筆記固定文案（擇一對應類別；多類命中用更嚴重者或第一個命中類即可，本票未規定合併規則時採「第一個命中類」）：
  - 健康：這題涉及健康與醫療判斷，我不能用命盤作答。請尋求合格醫療專業人員協助。
  - 法律：這題涉及法律諮詢，我不能用運勢作答。請尋求合格律師或法律援助。
  - 財務／投資：這題涉及財務與投資決策，我不能用命盤或運勢給判斷。請尋求合格的金融／專業意見。
  - 孕產：這題涉及孕產與身體安全，我不能用命盤作答。請尋求合格醫療專業人員協助。
  - 自傷／傷害他人：若你正處於危險中，請立即尋求現場專業協助。命盤解讀不能處理這類情況。
- 仍顯示通用娛樂標註。

### For Story 5 — 失敗可重試

- 前端依 `error_code` 顯示繁中 `message`，表單保留已填值，可再次送出。
- 失敗列若曾寫入，僅允許 `generation_status=failed`；**不得**寫成功 basic、**不得**把 `status` 當已解鎖。預設路徑是驗證失敗則完全不 insert（對齊既有 `docs/spec.md` 與 architecture A4：`MOCK_AI_MODE=invalid-json` 時 DB 無新列）。
- 避免 uncaught 導致整頁白屏。

---

## 3. 驗收標準 (Acceptance Criteria, AC)

### For Story 1

- **Happy Path**: Given 無痕視窗打開公開頁 When 填暱稱「小圓」、生日 `1993-07-12`、時辰選「不確定」或留空、聚焦「工作」並送出 Then `POST /api/reports` 的 JSON body 含 `nickname`／`birth_date`／`focus`，`birth_time` 為 `null`（**不含** `time_unknown`）；後端將 `time_unknown` 標為 `true`。（此 AC 需先處理第 7 節阻塞問題 1，否則 `focus` 枚舉會跟錯檔。）
- **驗證錯誤**: Given 生日空白或非 `YYYY-MM-DD` 或為未來日 When 送出 Then 畫面提示修正、不呼叫 LLM、不 insert；HTTP 400 `VALIDATION_ERROR`。
- **邊界 — 空白暱稱**: Given `nickname` 為空白或僅空白字元 When 送出 Then 提示重填；不呼叫模型。
- **邊界 — 非法 focus**: Given `focus` 為「感情」或其他非允許值 When 送出 Then HTTP 400；不寫 DB。
- **邊界 — 非法時辰**: Given `birth_time` 為 `14:00` 或非 12 支 When 送出 Then HTTP 400。
- **邊界 — 空 focus**: Given 未選聚焦 When 送出成功 Then 後端視同 `focus=整體`。

### For Story 2a

- **Happy Path — Mock**: Given `AI_PROVIDER=mock` 且 `MOCK_AI_MODE=valid` When 使用示範輸入送出 Then HTTP 200 body 對齊子筆記**基本** canned（短 overall），且**不含**進階三欄；DB `basic_json`／`advanced_json` 分別通過 `report.basic.v1`／`report.advanced.v1` 並對齊兩份 canned。
- **Happy Path — Live**: Given `AI_PROVIDER=openrouter` 且金鑰／主模型已設 When 送出合法輸入 Then 後端呼叫 OpenRouter 主模型；**遮罩前**物件通過 `report.complete.v1` 後才 insert；HTTP 200 仍為 basic 子集。
- **Schema 失敗**: Given `MOCK_AI_MODE=invalid-json` 或 `schema-missing-field` When 送出 Then HTTP 422 `SCHEMA_INVALID`；DB 無新成功列；畫面可重試。
- **邊界 — 主模型失敗切備援**: Given Live 主模型第一次**請求**失敗 When 同模型重試仍失敗 Then 才改呼 `OPENROUTER_FALLBACK_MODEL`；禁止每次請求換模型。（此 AC 需先處理第 7 節阻塞問題 2 才能在 Production 穩定驗證。）
- **邊界 — Key 不外洩**: Given 建置後的前端 bundle 與瀏覽器 Network When 檢查 Then 找不到 `OPENROUTER_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`；無 `NEXT_PUBLIC_` 帶這些值。

### For Story 2b

- **Happy Path**: Given 遮罩前 ajv 通過 When insert 成功 Then `reports` 同時有 `basic_json` 與 `advanced_json`，`status='basic'`，`generation_status='success'`；HTTP 200 body **不含** `rationale`／`path_compare`／`action_plan`／`advanced_json`。不得以「HTTP 通過完整 schema」為驗收方式。
- **寫入失敗**: Given schema 已通過但 DB insert 失敗 When 回前端 Then HTTP 503 `PERSIST_FAILED`；不把該次標成已解鎖；畫面可重試。
- **邊界 — 遮罩而非重算**: Given 已存 `advanced_json` 的報告 When 訪客檢視 Then 不得為了隱藏進階再呼叫一次模型。

### For Story 3

- **Happy Path**: Given HTTP 200 且 **沒有** `error_code` When 畫面渲染 Then 標題為「小圓的基本分析」（示範資料）、overall／work／relationship 對齊子筆記**基本** canned（非進階長文案）、行動區為鎖定文案、可見「解鎖完整報告」。
- **CTA 不假裝成功**: Given 點擊「解鎖完整報告」 When 互動結束 Then `status` 仍為未解鎖；無金流導轉；畫面仍為基本分析。
- **未知時辰標示**: Given `time_unknown=true` When 顯示結果 Then 可見準確度較低／未知時辰。
- **Disclaimer**: Given 表單頁與結果頁 When 檢視 Then 介面與報告皆有娛樂用途聲明（文案對齊子筆記 disclaimer）。
- **邊界 — 接點可指出**: Given 結果頁 When 驗收 Then 能指出方案入口、鎖定區、付款後交付位置（同一頁預留進階欄位）。
- **邊界 — 無追問主流程**: Given 未付款結果頁 When 檢視 Then 沒有可送出的追問輸入。

### For Story 4

- **Happy Path**: Given `nickname` 含財務投資語意（單元 1 無追問欄，例句只能放暱稱，例如「這筆投資會不會賺」） When 送出 Then HTTP 200、`error_code=HIGH_RISK`、`category=financial_risk`、畫面只顯示財務固定文案 + disclaimer；不呼叫 LLM；DB 無新列；無解鎖 CTA；不渲染畫面 A。
- **錯誤／誤判邊界**: Given 一般暱稱「小圓」無高風險字 When 送出 Then 不走安全短路，走正常生成。
- **邊界 — 自傷**: Given 輸入含自傷／傷害他人 When 送出 Then 顯示子筆記自傷文案；不寫 DB。

### For Story 5

- **生成失敗**: Given OpenRouter timeout 或非 2xx When 流程結束 Then HTTP 502；畫面繁中「生成失敗，請再試一次」；可再送出；不標記已解鎖。
- **Schema 失敗可重試**: Given 422 When 本機將 `MOCK_AI_MODE` 改回 `valid` 後再次送出 Then 可得到 200 基本摘要（無 `error_code`）。
- **邊界 — 不崩潰**: Given API 回 4xx／5xx 或 200 `HIGH_RISK` When UI 處理 Then 無 uncaught crash／白屏。

---

## 4. 技術邊界 (Technical Boundaries)

### DB Schema

本版只建 `reports`。不建 `users`、`orders`、`credits`、`subscriptions`、`follow_ups`。不新增 `user_id`。

| 欄位 | 型態 | 說明 |
|---|---|---|
| `id` | uuid PK（建議 `gen_random_uuid()`） | DB 主鍵；Live 的 `report_id` 用此值。Mock `valid` 可在 JSON 內用 `rpt_demo_001`，DB `id` 仍可為 uuid，另存 JSON 內的 `report_id` |
| `nickname` | text | |
| `birth_date` | date | `YYYY-MM-DD` |
| `birth_time` | text / null | 12 支或 null |
| `time_unknown` | boolean | 未填時辰 true |
| `focus` | text | `整體`／`工作`／`關係` |
| `basic_json` | jsonb | 通過驗證的基本層 |
| `advanced_json` | jsonb / null | 可同次存完整進階；畫面仍遮罩 |
| `status` | text | 本版固定 `basic` |
| `generation_status` | text | `success`／`failed`／`pending` |
| `model` | text / null | Mock 為 `mock` |
| `provider` | text / null | `openrouter`／`mock` |
| `prompt_version` | text | |
| `schema_version` | text 或 int | 與 loader 常數一致 |
| `request_id` | text / null | |
| `generated_at` | timestamptz / null | |
| `created_at` | timestamptz | |

- RLS：**enabled、零 policy**。anon 讀不到；唯一讀寫是 server `SUPABASE_SERVICE_ROLE_KEY`（BYPASSRLS）。
- 遷移放 `supabase/migrations/`（architecture 檔名 `20260905000000_create_reports.sql`）。單元 2／4 預留檔不建立。

### API & Permissions

- 本版唯一 API：`POST /api/reports`（Next.js App Router Route Handler，`force-dynamic`；Ticket 寫「API／Edge Function」，本 repo 已定 Route Handler，**不**用 `runtime = 'edge'`）。
- 無 session、無會員角色。不實作 `GET /api/reports/:id`（單元 2）。
- 機密僅 server：`SUPABASE_SERVICE_ROLE_KEY`、`OPENROUTER_API_KEY`。禁止 `NEXT_PUBLIC_*` 帶這些值。
- 驗證函式庫：ajv v8（`package.json` 目前尚未列入，實作時新增；勿誤用 ESLint 間接的 ajv@6）。Schema 檔放 `lib/schemas/`：`report.basic.v1.json`、`report.advanced.v1.json`、`report.complete.v1.json`。

### External Services

- **Supabase Postgres**：寫 `reports`。
- **OpenRouter**：僅 `AI_PROVIDER=openrouter` 時。主模型／備援名稱 Ticket 未定死 → 用環境變數，不寫死在程式。缺少效能指標；architecture 課堂約束為常態 demo 選快速主模型、約 10 秒內完成（非 Ticket SLO）。
- **Vercel**：公開測試網址（architecture 已定）。`vercel.json` 已存在；Hobby 無 cron。Route Handler 設 `maxDuration`。
- 無 ECPay、無 Webhook、無 Auth provider。

### Performance / SLO

- Ticket **缺少效能指標**，不杜撰 SLA。
- 有限次重試：主模型最多再 1 次，然後備援 1 次（來自 architecture 與串接子筆記，非無限重試）。
- Route Handler 設 `maxDuration`（建議 ≥ 60 秒）。備援路徑最多三次串列 OpenRouter；Vercel Hobby／課堂「約 10 秒完成」可能不夠，見第 7 節問題 2。

### 環境變數（已於 `.env.example` 留位）

`AI_PROVIDER`、`MOCK_AI_MODE`、`OPENROUTER_API_KEY`、`OPENROUTER_PRIMARY_MODEL`、`OPENROUTER_FALLBACK_MODEL`、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`（本版留位）、`SUPABASE_SERVICE_ROLE_KEY`。

---

## 5. MVP 判定 (MVP vs Later)

- **Story 1 生辰表單與雙邊驗證**: MVP: true
- **Story 2a Mock + 共用 schema + ajv**: MVP: true
- **Story 2a Live OpenRouter + 主模型失敗才切備援**: MVP: true（Ticket Should Have；與 AC「Mock 與 Live 同一 schema」及 Checkpoint A6 對齊）
- **Story 2a timeout／有限重試／生成 metadata 寫入**: MVP: true（Ticket Should Have：`model`／`provider`／`prompt_version`／`schema_version`／`generation_status`／`request_id`／`generated_at`）
- **Story 2b 一次寫入 basic+advanced、伺服器遮罩**: MVP: true
- **Story 3 畫面 A + 解鎖 CTA 接點（不串金流）**: MVP: true
- **Story 4 高風險固定回覆**: MVP: true
- **Story 5 失敗繁中可重試**: MVP: true
- **公開測試網址、無痕跑完**: MVP: true（Checkpoint A7）
- **開發環境變數預覽「遮罩前全文」**: MVP: false — 正式訪客必須永遠未付款；對稿用 canned JSON 即可
- **追問輸入框以鎖定態出現**: MVP: false — Ticket Could Have；本版不出現追問
- **Token／費用紀錄**: MVP: false — Ticket Could Have
- **切換 Mock／Live 的開發控制台 UI**: MVP: false — Ticket Could Have；用環境變數即可
- **會員／登入／RLS owner policy／訂單／ECPay／Webhook／真正解鎖／扣點／訂閱／補時辰重出／塔羅合盤月報**: MVP: false — Ticket Won't Have；禁止本單實作

---

## 6. 資訊缺失與風險 / 注意事項 (Missing Info / Risks / Notes)

### 一、開發實作時應注意 (Implementation-time Concerns)

- Prompt／Mock 子筆記是 schema 與畫面 A 文案的單一事實來源；不要自行改欄位名或另造一份命盤邏輯。
- 基本與進階是同一份 JSON 的兩層深度，不是兩次互不參考的生成；未解鎖用遮罩，不重跑模型藏欄位。
- 解鎖按鈕不可假裝付款成功、不可把 `status` 改成已解鎖。
- API Key 禁止進前端或公開 repo。
- 高風險題走固定文案，不讓模型現場編命盤。
- `docs/spec.md` 的 `focus` 英文枚舉與 `status` 日後值（`unlocked`）和 Notion（中文 focus、`advanced`）不一致；實作跟本檔 + 子筆記，必要時再回寫 `docs/spec.md`。
- 現況僅 A1：`app/page.tsx` 仍是佔位；`lib/`、`components/birth-form`、`app/api/reports`、`supabase/migrations`、`ajv` 皆尚未存在。這些是**本次新建**，不是既有缺陷。
- 訪客報告無 `user_id`，單元 2 起無法認領（architecture 陷阱清單）；本版接受。

### 二、規格與需求灰區 (Spec-level Gaps / Pre-dev Questions)

- 主要／備援**確切模型名稱** Ticket 未定 → 以環境變數填入，程式不寫死。
- 高風險關鍵字表 Ticket 只給類別與固定回覆，未給完整詞庫 → 實作需自建可維護的關鍵字表；誤殺／漏殺規則未定。
- `nickname` 最長長度 Ticket 未給。
- 高風險回傳要用 HTTP 200 安全 payload 或 4xx：Ticket 未定；本檔採 200 + 安全畫面且不寫 DB（避免被前端當「生成失敗可重試命盤」）。若產品改要 4xx，AC Story 4 需同步改。
- Live 是否必須產出與 Mock 示範**逐字相同**的 overall：Ticket 只要求同一 schema，不要求逐字相同。

### 三、動態詢問與邊界調整 (Runtime/Dynamic Clarifications)

- 模型回傳通過 schema 但明顯推翻 basic 語氣／自相矛盾：本版只靠 prompt 約束 + schema，沒有語意一致性檢查；若 UAT 大量出現，再決定要不要加規則。
- 未知時辰是否允許之後「補時辰重出」：本版明確不做；若課堂臨時要加，暫停並對齊 Won't Have。
- 若驗收要求「點解鎖要看到即將開放 toast」vs「按鈕 disabled」：Ticket 兩者都允許；UAT 指定一種即可，不影響「不可假裝成功」。

---

## 7. ⚠️ 需求前置阻塞問題 (Blocking Issues from Independent Review)

獨立審查（三視角）對照現有程式碼與 `docs/spec.md`／`architecture.md`／`AGENTS.md`。缺的 `lib/`、`POST /api/reports`、ajv、`reports` 表屬本次新建，不列為缺陷。下列兩項不處理則對應 AC 無法穩定通過。

### 問題 1：雙份權威的 `focus` 枚舉（中文 vs 英文）

- **證據**：本檔與 Notion Prompt／Mock 使用 `整體`／`工作`／`關係`。`docs/spec.md` 第 2 節輸入表寫 `overall`／`work`／`relationship`；`AGENTS.md` 寫產品行為以 `docs/spec.md` 為準；`.cursor/rules/supabase.mdc` 亦指向該檔。
- **影響**：實作者若跟 AGENTS／`docs/spec.md`，Story 1 Happy Path（`"focus":"工作"`）、空值→`整體`、非法「感情」全部對不上。
- **處理**：本單實作**以本檔與 Prompt 子筆記的中文枚舉為準**。開工前應把 `docs/spec.md`（及任何「以 spec.md 為準」的規則）改成同一組允許值，避免 Agent 跟錯檔。
- **擋住**：Story 1 Happy Path、空 focus、非法 focus。

### 問題 2：Live 備援 AC 可能超過 Vercel Hobby 時長

- **證據**：`docs/architecture.md` 陷阱清單寫課堂 demo 約 10 秒內完成；現有 `vercel.json` 未設 functions duration。本檔備援路徑最多三次串列 OpenRouter。
- **影響**：本機備援 AC 可能通過，Production 回 504，Story 2a 備援邊界與 A7 公開網址 Live 不穩定。
- **處理**：Route Handler 設足夠 `maxDuration`；Production 的「主失敗→重試→備援」允許改在本機或預覽環境驗證，不以 Hobby 10 秒為硬 SLA（Ticket 本就缺少效能指標）。
- **擋住**：Story 2a「主模型失敗切備援」（Production）。

另見 `docs/specs/2026-09-05-ziwei-unit1-mvp-issues.md`，盤點到的非阻塞問題。
