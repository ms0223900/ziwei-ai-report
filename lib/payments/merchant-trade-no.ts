/**
 * 綠界 MerchantTradeNo：英數字、最長 20；截斷後仍須對已占用集合唯一。
 */
import "server-only";

const MAX_TRADE_NO_LENGTH = 20;
const MAX_ATTEMPTS = 32;

export type MerchantTradeNoOptions = {
  taken?: ReadonlySet<string>;
  entropy?: () => string;
};

function defaultEntropy(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 12);
  return `${time}${rand}`;
}

function toAlphanumeric(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "");
}

export function generateMerchantTradeNo(
  options: MerchantTradeNoOptions = {},
): string {
  const taken = options.taken;
  const entropy = options.entropy ?? defaultEntropy;
  const seenFull = new Set<string>();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const full = toAlphanumeric(entropy());
    if (!full || seenFull.has(full)) {
      continue;
    }
    seenFull.add(full);
    const tradeNo = full.slice(0, MAX_TRADE_NO_LENGTH);
    if (!tradeNo) {
      continue;
    }
    if (taken?.has(tradeNo)) {
      continue;
    }
    return tradeNo;
  }

  throw new Error("無法產生唯一交易編號。");
}
