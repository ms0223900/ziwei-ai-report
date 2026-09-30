export type OrderReasonInput = {
  status: string;
  // 本筆的完成證據：點數 credit、終身 unlocked、或本筆訂閱的 first_success
  hasCompletionEvidence: boolean;
  hasAdminOk: boolean;
  hasSuccessNotification: boolean;
};

// spec §2 Story 6 的衍生原因；不建 tickets 表，每次依證據即時推導。
export function deriveOrderReason(input: OrderReasonInput): string {
  if (input.hasAdminOk) {
    return "人工補償完成";
  }
  if (input.status === "pending") {
    return "等待 Webhook";
  }
  if (input.hasCompletionEvidence) {
    return input.hasSuccessNotification ? "已履約" : "已履約但無通知";
  }
  if (input.status === "failed") {
    return "無法處理";
  }
  return "需要補償";
}
