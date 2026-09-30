// TODO(US-025)：實作。此為 US-024 測試用空殼，只為讓測試能載入。

export type OrderReasonInput = {
  status: string;
  // 本筆的完成證據：點數 credit、終身 unlocked、或本筆訂閱的 first_success
  hasCompletionEvidence: boolean;
  hasAdminOk: boolean;
  hasSuccessNotification: boolean;
};

export function deriveOrderReason(input: OrderReasonInput): string {
  void input;
  throw new Error("not implemented");
}
