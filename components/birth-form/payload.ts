import {
  validateBirth,
  type BirthInput,
  type FocusValue,
} from "../../lib/validation/birth";

export const UNKNOWN_TIME_VALUE = "";

export const TIME_OPTIONS = [
  { value: UNKNOWN_TIME_VALUE, label: "不確定時辰（走未知時辰盤）" },
  { value: "子", label: "子時 23-01" },
  { value: "丑", label: "丑時 01-03" },
  { value: "寅", label: "寅時 03-05" },
  { value: "卯", label: "卯時 05-07" },
  { value: "辰", label: "辰時 07-09" },
  { value: "巳", label: "巳時 09-11" },
  { value: "午", label: "午時 11-13" },
  { value: "未", label: "未時 13-15" },
  { value: "申", label: "申時 15-17" },
  { value: "酉", label: "酉時 17-19" },
  { value: "戌", label: "戌時 19-21" },
  { value: "亥", label: "亥時 21-23" },
] as const;

export const FOCUS_OPTIONS = [
  { value: "整體" as const, label: "整體・命身" },
  { value: "工作" as const, label: "工作・官祿" },
  { value: "關係" as const, label: "關係・夫妻" },
] as const;

export type BirthRequestBody = {
  nickname: string;
  birth_date: string;
  birth_time: string | null;
  focus?: FocusValue;
};

export type BirthFormFieldErrors = {
  nickname?: string;
  birth_date?: string;
};

export function buildBirthRequest(input: {
  nickname: string;
  birth_date: string;
  birth_time: string;
  focus: FocusValue | "";
}): BirthRequestBody {
  const body: BirthRequestBody = {
    nickname: input.nickname.trim(),
    birth_date: input.birth_date.trim(),
    birth_time:
      input.birth_time === UNKNOWN_TIME_VALUE || input.birth_time.trim() === ""
        ? null
        : input.birth_time.trim(),
  };

  if (input.focus !== "") {
    body.focus = input.focus;
  }

  return body;
}

export function collectBirthFormFieldErrors(
  input: BirthInput,
): BirthFormFieldErrors {
  const errors: BirthFormFieldErrors = {};

  if (!input.nickname.trim()) {
    errors.nickname = "請填寫暱稱。";
  }

  const dateResult = validateBirth({
    nickname: "占位",
    birth_date: input.birth_date,
    birth_time: input.birth_time,
    focus: input.focus ?? "工作",
  });
  if (!dateResult.ok) {
    errors.birth_date = dateResult.error.message;
  }

  return errors;
}
