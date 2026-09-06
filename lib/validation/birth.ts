export const EARTHLY_BRANCHES = [
  "子",
  "丑",
  "寅",
  "卯",
  "辰",
  "巳",
  "午",
  "未",
  "申",
  "酉",
  "戌",
  "亥",
] as const;

export const FOCUS_VALUES = ["整體", "工作", "關係"] as const;

export type FocusValue = (typeof FOCUS_VALUES)[number];

export type BirthInput = {
  nickname: string;
  birth_date: string;
  birth_time?: string | null;
  focus?: string | null;
};

export type ValidatedBirth = {
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  time_unknown: boolean;
  focus: FocusValue;
};

export type BirthValidationError = {
  error_code: "VALIDATION_ERROR";
  message: string;
};

export type BirthValidationResult =
  | { ok: true; value: ValidatedBirth }
  | { ok: false; error: BirthValidationError };

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function fail(message: string): BirthValidationResult {
  return { ok: false, error: { error_code: "VALIDATION_ERROR", message } };
}

function taipeiTodayYmd(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  const utc = new Date(Date.UTC(year, month - 1, day));
  return (
    utc.getUTCFullYear() === year &&
    utc.getUTCMonth() === month - 1 &&
    utc.getUTCDate() === day
  );
}

export function validateBirth(input: BirthInput): BirthValidationResult {
  const nickname = input.nickname.trim();
  if (!nickname) {
    return fail("請填寫暱稱。");
  }

  const birthDate = input.birth_date.trim();
  if (!birthDate) {
    return fail("請填寫生日。");
  }

  const dateMatch = DATE_RE.exec(birthDate);
  if (!dateMatch) {
    return fail("生日請用 YYYY-MM-DD，例如 1993-07-12。");
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  if (!isRealCalendarDate(year, month, day)) {
    return fail("生日請用 YYYY-MM-DD，例如 1993-07-12。");
  }

  if (birthDate > taipeiTodayYmd()) {
    return fail("生日不能是未來日期。");
  }

  const rawTime = input.birth_time;
  let birthTime: string | null;
  if (rawTime === undefined || rawTime === null || rawTime.trim() === "") {
    birthTime = null;
  } else {
    const trimmedTime = rawTime.trim();
    if (!(EARTHLY_BRANCHES as readonly string[]).includes(trimmedTime)) {
      return fail("時辰請選十二支，或留空。");
    }
    birthTime = trimmedTime;
  }

  const rawFocus = input.focus?.trim() ?? "";
  let focus: FocusValue;
  if (rawFocus === "") {
    focus = "整體";
  } else if ((FOCUS_VALUES as readonly string[]).includes(rawFocus)) {
    focus = rawFocus as FocusValue;
  } else {
    return fail("聚焦請選整體、工作或關係。");
  }

  return {
    ok: true,
    value: {
      nickname,
      birth_date: birthDate,
      birth_time: birthTime,
      time_unknown: birthTime === null,
      focus,
    },
  };
}
