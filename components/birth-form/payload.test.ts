import { describe, expect, it } from "vitest";
import {
  FOCUS_OPTIONS,
  TIME_OPTIONS,
  UNKNOWN_TIME_VALUE,
  buildBirthRequest,
  collectBirthFormFieldErrors,
} from "./payload";

describe("buildBirthRequest", () => {
  it("sends null birth_time for the unknown-time option", () => {
    const body = buildBirthRequest({
      nickname: "小圓",
      birth_date: "1993-07-12",
      birth_time: UNKNOWN_TIME_VALUE,
      focus: "工作",
    });

    expect(body.birth_time).toBeNull();
    expect(body).not.toHaveProperty("time_unknown");
  });

  it("sends a single earthly branch, not the display label", () => {
    const mao = TIME_OPTIONS.find((option) => option.value === "卯");
    expect(mao?.label).toBe("卯時 05-07");

    const body = buildBirthRequest({
      nickname: "小圓",
      birth_date: "1993-07-12",
      birth_time: "卯",
      focus: "工作",
    });

    expect(body.birth_time).toBe("卯");
    expect(JSON.stringify(body)).not.toContain("卯時 05-07");
  });

  it("maps the three focus chips to API values and never 感情", () => {
    expect(FOCUS_OPTIONS.map((option) => option.value)).toEqual([
      "整體",
      "工作",
      "關係",
    ]);

    const body = buildBirthRequest({
      nickname: "小圓",
      birth_date: "1993-07-12",
      birth_time: UNKNOWN_TIME_VALUE,
      focus: "工作",
    });

    expect(body.focus).toBe("工作");
    expect(JSON.stringify(body)).not.toContain("感情");
    expect(JSON.stringify(body)).not.toContain("官祿");
  });

  it("omits focus when the chip is cleared", () => {
    const body = buildBirthRequest({
      nickname: "小圓",
      birth_date: "1993-07-12",
      birth_time: UNKNOWN_TIME_VALUE,
      focus: "",
    });

    expect(body).not.toHaveProperty("focus");
  });
});

describe("collectBirthFormFieldErrors", () => {
  it("shows both 02 messages when nickname and birthday are blank", () => {
    const errors = collectBirthFormFieldErrors({
      nickname: "  ",
      birth_date: "",
    });

    expect(errors.nickname).toBe("請填寫暱稱。");
    expect(errors.birth_date).toBe("請填寫生日。");
  });

  it("uses the shared format message for illegal dates", () => {
    const errors = collectBirthFormFieldErrors({
      nickname: "小圓",
      birth_date: "1993-13-40",
    });

    expect(errors.nickname).toBeUndefined();
    expect(errors.birth_date).toBe("生日請用 YYYY-MM-DD，例如 1993-07-12。");
  });
});
