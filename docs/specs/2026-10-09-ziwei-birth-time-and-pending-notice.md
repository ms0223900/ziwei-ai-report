# 驗收修正：時辰帶入報告、建單不再發「付款已受理」通知

> 來源：2026-10-08 使用者實際驗收回報（第 1、3 點）。本單只修這兩點；OrderResultURL 自動回站、「密批封存」文案、付款後空白表單、未登入報告註冊後消失、寫入失敗時的 fallback 報告畫面（`components/report/overlay.ts`）皆不處理。

## 0. Context

- **Problem**
  - 時辰：選了時辰，報告內容不變。`AI_PROVIDER=mock`（預設）回傳固定 fixture，`overall` 永遠以「（未知時辰，準確度較低）」開頭，即使使用者選了時辰。OpenRouter 路徑把 `birth_time` 放進 user prompt，但 system prompt 沒有任何依時辰撰寫的規則。
  - 通知：`POST /api/payments/checkout` 建單成功就寫入 `order_pending`（「付款已受理，正在確認中」）。使用者到綠界放棄付款，通知仍在，客服與使用者都會誤以為已付款。
- **Goal**
  - Mock：選了時辰的報告全文不出現「未知時辰」，且不同時辰的 `overall` 文字不同。
  - Live：prompt 要求同上；伺服器只保證 `overall` 前綴正確，其他欄位依模型遵循度，不列為本單驗收。
  - 未選時辰維持現行「未知時辰」標示。
  - 建單時不寫任何通知；付款結果通知仍只由 webhook 寫入（現行行為不變）。
- **Impacted Areas**
  - `lib/generation/mock.ts`、`lib/generation/provider.ts`、`lib/generation/fixtures/*.json`
  - `lib/prompts/zwds-v1.ts`（`ZWDS_SYSTEM_PROMPT`、`PROMPT_VERSION`）
  - `lib/generation/openrouter.ts`（`userPrompt`）、`app/api/reports/route.ts`（mock 分支 `:221-240`、live 分支 `:184-217`）
  - `app/api/payments/checkout/route.ts:145-152`、其測試
  - `scripts/unit8-checkpoint/fixture-lifetime-pending.sql`、`scripts/unit8-checkpoint/README.md`
  - 文件：`docs/architecture.md:174`、`docs/specs/2026-09-28-ziwei-unit7-post-payment-delivery.md`（§通知表 `order_pending` 列、Scenario「建單成功 → 恰一則 order_pending」）
- **Stakeholders**：訪客／付費使用者、客服、後台管理員
- **Assumptions**
  - [已確認] 時辰修正範圍：Live prompt 新增依時辰撰寫規則＋Mock 依時辰帶入文案；**不**引入排盤引擎（使用者選擇）。
  - [已確認] 建單時不再寫 `order_pending`（使用者選擇）。
  - [由程式碼推得] `order_pending` 型別保留在 `NOTIFICATION_TYPES`、DB 約束與 `list-notifications` 的 href 對應，以相容既有資料列；本單不刪既有 `order_pending` 資料。
  - [由程式碼推得] `/orders/processing` 的 `accepted` 畫面（「付款已受理，正在確認」）是頁面狀態，不是通知，不在本單範圍。
  - [已確認] 寫入失敗時的 fallback 畫面（`overlayCannedReport` 直接讀 `basic.valid.json`）本單不處理（使用者決定）。
  - [由程式碼推得] prompt 內容變更需把 `PROMPT_VERSION` 改為 `zwds-v2`，讓 `reports.prompt_version` 可區分新舊報告。

## 1. 核心 User Story

- 能力圖
  - 時辰帶入報告 — 生成與寫入報告；無依賴；先寫。
  - 建單不發通知 — checkout route 與 checkpoint 腳本；無依賴；可並行。
- **Story A**：As a 訪客, I want 我選的時辰反映在報告內容裡, So that 我付費看到的是依我生辰寫的解讀，而不是通用文案。
  - Story A1（Mock）／Story A2（Live prompt）／Story A3（寫入前防呆）
- **FR-1（Story B）**：As a 付費使用者, I want 只有付款真的有結果時才收到通知, So that 中途放棄付款不會留下「付款已受理」的錯誤通知。
- **FR-2（Story C）**：As a 客服／管理員, I want 通知列表只反映真實付款事件, So that 我不會依錯誤通知回覆使用者。

## 2. 功能細節

- **Story A1 — Mock 依時辰帶入**
  - 簽名改為 `generateMockReport(mode?: MockAiMode, birth?: ValidatedBirth)`；既有單參數呼叫行為不變。
  - `app/api/reports/route.ts` mock 分支的 `generateMockReport()` 改傳入已驗證的 `birth`（`provider.ts` 的 mock 分支同步傳入，以保持一致）。
  - 新增 12 支時辰各一句的「時辰基調」對照表（放在 `lib/generation/mock.ts` 或同目錄常數）。內容由實作者撰寫，須符合 prompt 第 3、4 條（溫和、不涉醫療／法律／投資等）。
  - `birth.time_unknown === false` 時：
    - `basic.overall` 與 `advanced.overall` 各自以同一規則改寫：`（{支}時）` + 該支基調句 + 各自 fixture 原句去掉「（未知時辰，準確度較低）」後的部分。
    - `advanced.rationale` 同步改寫：「未知時辰時」改為以 `{支}時` 開頭的對應句，不得殘留「未知時辰」。
  - `birth` 未傳或 `time_unknown === true`：輸出與現行 fixture 完全相同。
  - `MOCK_AI_MODE=invalid-json`／`schema-missing-field` 行為不變。
- **Story A2 — Live prompt**
  - `ZWDS_SYSTEM_PROMPT` 硬性規則第 5 條改為兩句：
    - 時辰未知：維持「overall 開頭須帶（未知時辰，準確度較低）」。
    - 時辰已知：overall 須以「（{birth_time}時）」開頭、至少一句內容須依該時辰寫出與其他時辰不同的敘述；全文不得出現「未知時辰」。
  - `PROMPT_VERSION` 改為 `"zwds-v2"`。
  - `userPrompt` 不變（已傳 `birth_time`、`time_unknown`）。
- **Story A3 — 寫入前防呆（mock 與 live 共用同一個前綴規則）**
  - 防呆實作為純函式 `applyBirthTimePrefix(overall: unknown, birth: ValidatedBirth): unknown`，放在 `lib/generation/birth-time-prefix.ts` 並 export。
  - 套用位置：
    - Live：在 `validateComplete(complete)` 之後、`splitCompleteForPersist` 之前，對 `complete` 防呆。
    - Mock：對 `basic` 與 `advanced` 各自防呆，再進既有三項驗證。
  - 防呆只在 `typeof overall === "string"` 時執行；非字串時原樣交給 ajv。
  - 若 `birth.time_unknown === false`：
    - `overall` 開頭若為「（未知時辰，準確度較低）」→ 改成「（{支}時）」。
    - `overall` 未以「（{支}時）」開頭 → 在前面補上「（{支}時）」。
  - 若 `birth.time_unknown === true` 且 `overall` 未以「（未知時辰，準確度較低）」開頭 → 補上（現行 prompt 規則的伺服器端保證）。
  - 防呆後的物件仍須通過既有 ajv 驗證；失敗處理不變。
- **Story B／C — 建單不寫通知**
  - 刪除 `app/api/payments/checkout/route.ts` 中建單後的 `insertNotification(... type: "order_pending" ...)` 呼叫與其註解；若 `insertNotification` import 不再使用則一併移除。
  - 結帳回應（綠界表單欄位、`ClientBackURL`）不變。
  - `scripts/unit8-checkpoint/fixture-lifetime-pending.sql` 移除 INSERT `order_pending` 那段；`README.md` 與 `unit8-checkpoint.test.ts` 同步。
  - `NOTIFICATION_TYPES`、`NOTIFICATION_TEXT.order_pending`、`list-notifications` href 對應、DB migration 不變。
  - 文件：`docs/architecture.md:174` 刪去「並寫一則 `order_pending`」；unit7 spec 通知表 `order_pending` 列與對應 Scenario 標註「2026-10-09 起建單不再寫入，見本 spec」。

## 3. 驗收標準

- **Story A1（Mock）**
  - Scenario 1：Given `AI_PROVIDER=mock`、`birth_time="子"` When `POST /api/reports` Then 回應 `overall` 以「（子時）」開頭，且回應與 DB `basic_json`、`advanced_json` 皆不含「未知時辰」。
  - Scenario 2：Given `AI_PROVIDER=mock` When 分別以 `birth_time="子"` 與 `"午"` 產生報告 Then 兩份 `overall` 字串不同。
  - Scenario 3：Given `AI_PROVIDER=mock`、`birth_time=null` When `POST /api/reports` Then `overall` 以「（未知時辰，準確度較低）」開頭，與現行 fixture 相同。
  - Scenario 4（邊界）：Given 12 支時辰逐一輸入 When 呼叫 `generateMockReport` Then 12 份 `overall` 互不相同，且全部通過 `report.complete.v1` 驗證。
  - Scenario 5（錯誤）：Given `MOCK_AI_MODE=invalid-json` When `POST /api/reports` Then 行為與現行相同（schema 失敗、不寫 DB、繁中可讀錯誤）。
- **Story A2（Live prompt）**
  - Scenario 1：Given `ZWDS_SYSTEM_PROMPT` When 讀取字串 Then 同時包含時辰未知與時辰已知兩條規則，且已知規則要求以「（{birth_time}時）」開頭、禁止出現「未知時辰」。
  - Scenario 2：Given 新報告寫入 When 查 `reports.prompt_version` Then 為 `zwds-v2`。
- **Story A3（防呆）**
  - Scenario 1：Given 模型回傳 `overall="（未知時辰，準確度較低）今天…"`、`birth_time="寅"` When 寫入 Then 儲存與回應的 `overall` 為「（寅時）今天…」。
  - Scenario 2：Given 模型回傳 `overall="今天…"`（無前綴）、`birth_time="寅"` When 寫入 Then `overall` 為「（寅時）今天…」。
  - Scenario 3：Given 模型回傳 `overall="（寅時）今天…"` When 寫入 Then `overall` 不重複加前綴。
  - Scenario 4：Given `birth_time=null`、模型回傳無前綴 `overall` When 寫入 Then `overall` 以「（未知時辰，準確度較低）」開頭。
  - Scenario 5（邊界，回歸測試：確認防呆不改變既有 schema 失敗流程）：Given 以 mock 掉 provider 的方式讓 live 回傳缺 `rationale` 的 `complete`、`birth_time="寅"` When 寫入 Then 依既有流程回 schema 錯誤、不寫 DB。
  - Scenario 6（邊界，單元測試直接呼叫 `applyBirthTimePrefix`）：Given `overall` 非字串、`birth_time="寅"` When 防呆 Then `overall` 原樣不變（不產生「（寅時）undefined」），交由 ajv 判定失敗。
- **FR-1／FR-2（Story B／C）**
  - Scenario 1：Given 已登入使用者 When `POST /api/payments/checkout` 建單成功 Then `notifications` 新增 0 筆，回應與綠界欄位與現行相同。
  - Scenario 2：Given 建單後使用者在綠界放棄付款（無 webhook） When 查 `GET /api/notifications` Then 該訂單沒有任何通知。
  - Scenario 3：Given 單次解鎖訂單 webhook `RtnCode=1` When 處理完成 Then 恰一則 `unlock_completed`（現行行為不變）。
  - Scenario 4：Given webhook `RtnCode≠1` When 處理完成 Then 恰一則 `order_failed`（現行行為不變）。
  - Scenario 5（邊界）：Given DB 已有舊的 `order_pending` 通知列 When `GET /api/notifications` Then 仍正常顯示文案與 `/orders/processing?order={id}` 連結。
  - Scenario 6（邊界）：Given 跑 `fixture-lifetime-pending.sql` When 查通知 Then 無 `order-pending:` key 的資料列。

## 4. 技術邊界

- **DB Schema**：本次無 schema 變動。理由：時辰已有 `reports.birth_time`／`time_unknown`；`order_pending` 型別保留以相容既有資料，只是不再寫入。
- **API & Permissions**
  - `POST /api/reports`：Request／Response 欄位不變；只有 `overall` 等內容文字改變。對外仍只回 basic＋meta＋disclaimer，不帶 `advanced_json`。
  - `POST /api/payments/checkout`：Request／Response 不變；只移除副作用（通知 INSERT）。
  - 高風險關鍵字短路、輸入驗證、ajv 驗證流程位置皆不變。
- **External Services**：OpenRouter 只改 system prompt；綠界無變動。
- **Performance / SLO**：缺少效能指標（ticket 未提）；本單不新增外部呼叫。
- **狀態與權威來源**（FR-1／FR-2）
  - 訂單狀態權威來源仍為 `orders.status`，只由 webhook 從 `pending` 轉 `paid`／`failed`。
  - 付款相關通知只在 webhook 狀態轉換後寫入；checkout 不再寫任何通知。

## 5. MVP 判定

- Story A1：MVP: true — 預設 provider 為 mock，驗收問題直接來自此路徑。
- Story A2：MVP: true — 正式環境走 live 時的同一問題。
- Story A3：MVP: true — LLM 不保證遵守 prompt，伺服器端保證 `overall` 前綴與所選時辰一致。
- FR-1／FR-2：MVP: true。
- 真實排盤引擎（命宮主星計算）：MVP: false — 使用者決定本單不做。
- 把既有 `order_pending` 通知清除或改標已讀：MVP: false — 本單不動歷史資料。

## 6. 資訊缺失與風險

- **一、開發實作時應注意**
  - 防呆字串處理須以全形括號「（」「）」比對，與 prompt、fixture 一致。
  - `generateMockReport` 現有呼叫端（多支測試）不傳 `birth` 時須維持原輸出，避免大量測試快照變動。`overlay.ts` 直接 import fixture，不是呼叫端；本單不改它。
  - Mock 12 句基調文案須避開高風險主題字詞，避免觸發或混淆安全短路。
  - `unit8-checkpoint.test.ts`、`checkout/route.test.ts`、unit7 US-005 測試目前斷言「恰一則 `order_pending`」，需改為斷言 0 筆。
- **二、規格與需求灰區**
  - Mock 的 12 句時辰基調內容沒有產品提供的文案來源，由實作者撰寫；若需品牌口吻審稿，需另行確認。
  - 未選時辰的報告仍與現行一樣全員相同（mock）；本單只處理「選了時辰卻被忽略」。
- **三、動態詢問與邊界調整**
  - Live 驗收時若模型常常不遵守「依時辰寫出不同敘述」，或在 `overall` 以外欄位寫出「未知時辰」，防呆只能保證 `overall` 前綴；是否需加重試或改模型，屆時再議。
  - 舊報告（`prompt_version=zwds-v1`）不重新生成。
  - 另見 `2026-10-09-ziwei-birth-time-and-pending-notice-issues.md`，盤點到的非阻塞問題。

