# US-004：Mock 依時辰帶入與 route 套用 實作

**作為** 訪客  
**我想要** 選了時辰後，報告內容點名該時辰且因時辰而不同  
**以便** 我付費看到的是依我生辰寫的解讀

**輸入格式**：
- US-003 的紅燈測試、US-002 的 `applyBirthTimePrefix`

**輸出格式**：
- `lib/generation/mock.ts`：簽名 `generateMockReport(mode?: MockAiMode, birth?: ValidatedBirth)`；12 支時辰基調句對照表
- `app/api/reports/route.ts`：mock 分支傳入 `birth`；兩條分支套用防呆
- `lib/generation/provider.ts`：mock 分支同步傳入 `birth`

**驗收條件**：
- [ ] US-003 全部斷言轉綠；既有 `mock.test.ts`、`provider.test.ts`、`route.test.ts` 維持綠燈
- [ ] 時辰已知：`basic.overall`、`advanced.overall` = `（{支}時）` + 該支基調句 + 各自原句去掉未知前綴；`advanced.rationale` 的「未知時辰時」改為 `{支}時` 開頭的句子
- [ ] 12 句基調溫和、不涉醫療／法律／財務投資／孕產／自傷
- [ ] Live 分支：在 `validateComplete(complete)` 之後、`splitCompleteForPersist` 之前對 `complete.overall` 套用 `applyBirthTimePrefix`
- [ ] Mock 分支：對 `basic.overall`、`advanced.overall` 各自套用 `applyBirthTimePrefix`，再進既有三項驗證
- [ ] `MOCK_AI_MODE=invalid-json`／`schema-missing-field` 行為不變
- [ ] 對外回應仍不帶 `advanced_json`
- [ ] `npm run lint`、`npm run typecheck`、`npm run build` 通過

**測試策略**：Test-First  
> 理由：對著 US-003 的失敗測試實作至轉綠。

**優先級**：P0  
**相關功能**：Story A1、Story A3  
**來源**：Story A1 / Scenario 1、2、3、4、5；Story A3 / Scenario 1、5  
**依賴關係**：US-002、US-003
