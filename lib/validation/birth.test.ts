import { describe, expect, it } from "vitest";
import { validateBirth } from "./birth";

const demoInput = {
  nickname: "小圓",
  birth_date: "1993-07-12",
  birth_time: null,
  focus: "工作",
};

describe("validateBirth", () => {
  it("accepts the demo input and marks unknown time", () => {
    const result = validateBirth(demoInput);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.nickname).toBe("小圓");
    expect(result.value.birth_date).toBe("1993-07-12");
    expect(result.value.birth_time).toBeNull();
    expect(result.value.time_unknown).toBe(true);
    expect(result.value.focus).toBe("工作");
  });

  it("rejects a blank nickname", () => {
    const result = validateBirth({ ...demoInput, nickname: "   " });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toBe("請填寫暱稱。");
  });

  it("rejects a blank birth date", () => {
    const result = validateBirth({ ...demoInput, birth_date: "" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toBe("請填寫生日。");
  });

  it("rejects a birth date that is not YYYY-MM-DD", () => {
    const result = validateBirth({ ...demoInput, birth_date: "1993/07/12" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toBe(
      "生日請用 YYYY-MM-DD，例如 1993-07-12。",
    );
  });

  it("rejects a future birth date in Asia/Taipei", () => {
    const result = validateBirth({ ...demoInput, birth_date: "2099-12-31" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
    expect(result.error.message).toBe("生日不能是未來日期。");
  });

  it("rejects birth_time 不確定 as a string", () => {
    const result = validateBirth({ ...demoInput, birth_time: "不確定" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
  });

  it("rejects birth_time 14:00", () => {
    const result = validateBirth({ ...demoInput, birth_time: "14:00" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
  });

  it("rejects an illegal focus 感情", () => {
    const result = validateBirth({ ...demoInput, focus: "感情" });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.error.error_code).toBe("VALIDATION_ERROR");
  });

  it("treats an empty focus as 整體", () => {
    const result = validateBirth({ ...demoInput, focus: "" });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.value.focus).toBe("整體");
  });
});
