import { describe, expect, it } from "vitest";
import { generateMerchantTradeNo } from "./merchant-trade-no";

describe("MerchantTradeNo generator", () => {
  it("emits alphanumeric ids no longer than 20", () => {
    const tradeNo = generateMerchantTradeNo();
    expect(tradeNo).toMatch(/^[A-Za-z0-9]{1,20}$/);
  });

  it("stays unique when two candidates collide after truncation", () => {
    const taken = new Set<string>();
    let calls = 0;
    const entropy = () => {
      calls += 1;
      if (calls <= 2) {
        return `${"A".repeat(20)}11111`;
      }
      return `${"B".repeat(20)}22222`;
    };

    const first = generateMerchantTradeNo({ taken, entropy });
    taken.add(first);
    const second = generateMerchantTradeNo({ taken, entropy });

    expect(first).toHaveLength(20);
    expect(second).toHaveLength(20);
    expect(first).toMatch(/^[A-Za-z0-9]+$/);
    expect(second).toMatch(/^[A-Za-z0-9]+$/);
    expect(second).not.toBe(first);
  });
});
