# 2026-09-25-ziwei-unit6-monthly-subscription 盤點問題與疑慮（非本次需求阻塞項）

> 以下是 `/independent-review` 審查本次 spec 時順帶盤點到的問題，都與本次需求的驗收沒有直接依賴，不阻塞本次驗收，可視情況另開 ticket 處理。

## 問題 1：`PeriodReturnURL` 每期只通知一次，漏收時沒有補單路徑

- **來源視角**：B（外部事實）
- **問題描述**：綠界官方 SDK 與 ECPay-API-Skill guides/01 都寫明：PeriodReturnURL 每期只通知一次，漏收要改用定期定額訂單查詢。本版遇到 RPC 或 DB 失敗時回 `0|Error`，但綠界不一定會重送，該期就不會延展。另外，首次 ReturnURL 若遺失，`TotalSuccessTimes=1` 也只會回 400，同樣沒有補償路徑。
- **證據**：https://github.com/ECPay/ECPay-API-Skill（guides/01 §PeriodReturnURL）；spec §2 Story 4
- **建議後續**：把 Should Have「定期定額訂單查詢補單」排進單元 8 或下一個 sprint。

## 問題 2：`formatMerchantTradeDate` 使用伺服器本地時區

- **來源視角**：A
- **問題描述**：Vercel 的伺服器時區是 UTC，送給綠界的 `MerchantTradeDate` 會比台北時間少 8 小時。
- **證據**：`app/api/payments/checkout/route.ts:26-28`
- **建議後續**：另開 ticket，改用 Asia/Taipei 格式化。

## 問題 3：訂單已 paid 時，webhook 完全不看 `RtnCode`

- **來源視角**：A
- **問題描述**：訂單已是 `paid` 時，重送的通知一律直接進入履約分派，不檢查 `RtnCode`。月繳靠事件冪等所以不受影響，但這個語意不嚴謹。
- **證據**：`app/api/payments/ecpay/webhook/route.ts:219-229`
- **建議後續**：列入技術債。

## 問題 4：tunnel 環境下 `PeriodReturnURL` 可能靜默指向 localhost

- **來源視角**：C
- **問題描述**：若 `APP_BASE_URL` 設成 localhost、`ECPAY_RETURN_URL` 設成 tunnel 網址，自動組出的 `PeriodReturnURL` 會指向 localhost，而且不會報錯。
- **證據**：`lib/payments/checkout-env.ts` 的 `composeFromAppBase`
- **建議後續**：在單元 6 的 howto 補一句：用 tunnel 時要同時設定 `ECPAY_PERIOD_RETURN_URL`。

## 問題 5：`AGENTS.md` 共通底線仍把訂單／ECPay／Webhook／扣點列為 Won't Have

- **來源視角**：C
- **問題描述**：`AGENTS.md:17` 與 `docs/spec.md:35,60,94` 的舊範圍敘述，和單元 4～6 的實際範圍衝突。只讀 AGENTS.md 的 Agent 可能因此拒絕實作。單元 4 issues 問題 1、單元 5 issues 問題 4 都已提過，至今未修。
- **證據**：`AGENTS.md:17`、`docs/spec.md:35,60,94`
- **建議後續**：本單 Story 12 只會更新 `docs/spec.md`。`AGENTS.md` 是由 `npm run ai:*` 產生的，要改 `rules-switch/modes/*` 的來源檔，建議另開 ticket 一次處理。

## 問題 6：同一人已有有效訂閱時又完成第二筆付款（`conflict`）沒有自動處理

- **來源視角**：A、B、C 共同指向（閘門已處理大部分情境；剩下的是殘餘風險）
- **問題描述**：閘門失效，或 pending 訂單超過 5 分鐘後才付款時，綠界端會出現第二個定期定額合約。本版 RPC 只回 `conflict` 並記 log，舊合約仍會繼續扣款。
- **證據**：spec §2 Story 3 步驟 3、§6 I11
- **建議後續**：單元 8 驗測矩陣加入這個情境；正式上線前需要自動呼叫 `CreditCardPeriodAction` Cancel，或加上人工退款流程。
