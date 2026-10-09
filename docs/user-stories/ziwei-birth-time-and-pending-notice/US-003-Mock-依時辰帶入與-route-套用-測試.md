# US-003：Mock 依時辰帶入與 route 套用 測試

**作為** 開發者  
**我想要** 先有會失敗的 mock 生成與 `POST /api/reports` 測試  
**以便** 鎖住「選了時辰，mock 報告就依時辰改寫並寫入 DB」

**輸入格式**：
- spec §2 Story A1、A3；§3 Story A1、A3 Scenario 5
- `lib/generation/mock.ts`、`lib/generation/fixtures/*.json`、`app/api/reports/route.ts`、`app/api/reports/route.test.ts`（`:39` 目前 `vi.mock` 整個 `lib/generation/mock`）

**輸出格式**：
- `lib/generation/mock.test.ts` 新增案例
- 新的 route 測試檔（不 mock `lib/generation/mock`，DB 用既有 fake store），例如 `app/api/reports/route.birth-time.test.ts`
- `app/api/reports/route.test.ts` live 路徑新增防呆案例（沿用既有 provider mock）

**驗收條件**：
- [ ] 聚焦測試因功能尚未實作而預期紅燈（失敗原因是功能缺失，不是語法或 import 錯誤）
- [ ] mock 單元：`generateMockReport("valid", birth子)` → `basic.overall`、`advanced.overall` 皆以「（子時）」開頭，`advanced.rationale` 不含「未知時辰」
- [ ] mock 單元：12 支時辰逐一輸入 → 12 份 `basic.overall` 互不相同、12 份 `advanced.overall` 互不相同
- [ ] mock 單元：每支時辰的 `basic`、`advanced` 各自通過 basic／advanced schema，`{...basic, ...advanced}` 通過 `report.complete.v1`
- [ ] mock 單元（回歸，可先綠）：`generateMockReport("valid")` 不傳 `birth` → 與現行 fixture 完全相同
- [ ] route（mock）：`birth_time="子"` → 回應 `overall` 以「（子時）」開頭；fake store 的 `basic_json`、`advanced_json` 不含「未知時辰」
- [ ] route（mock）：`birth_time="子"` 與 `"午"` 的回應 `overall` 不同
- [ ] route（mock，回歸可先綠）：`birth_time=null` → `overall` 以「（未知時辰，準確度較低）」開頭
- [ ] route（mock，回歸可先綠）：`MOCK_AI_MODE=invalid-json` → schema 錯誤、不寫 DB、繁中錯誤訊息
- [ ] route（live，provider mock）：回傳 `overall="（未知時辰，準確度較低）今天…"`、`birth_time="寅"` → 回應與 `basic_json`、`advanced_json` 的 `overall` 為「（寅時）今天…」
- [ ] route（live，回歸可先綠）：provider 回傳缺 `rationale` 的 `complete`、`birth_time="寅"` → schema 錯誤、不寫 DB

**測試策略**：Test-First 測試準備  
> 理由：輸入生辰、輸出報告文字與 DB 內容皆可斷言。

**優先級**：P0  
**相關功能**：Story A1 Mock 依時辰帶入、Story A3 套用位置  
**來源**：Story A1 / Scenario 1、2、3、4、5；Story A3 / Scenario 1、5  
**依賴關係**：無
