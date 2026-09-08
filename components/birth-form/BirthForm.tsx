"use client";

import { useId, useState, type FormEvent } from "react";
import { DISCLAIMER } from "../../lib/constants";
import type { FocusValue } from "../../lib/validation/birth";
import {
  FOCUS_OPTIONS,
  TIME_OPTIONS,
  UNKNOWN_TIME_VALUE,
  buildBirthRequest,
  collectBirthFormFieldErrors,
  type BirthRequestBody,
} from "./payload";

const DEMO_NICKNAME = "小圓";
const DEMO_BIRTH_DATE = "1993-07-12";
const TIME_HINT =
  "未填時辰走未知時辰盤，準確度較低；知曉生時請選十二時辰（如卯時 05-07）。";

export type BirthFormProps = {
  onValidSubmit?: (body: BirthRequestBody) => void;
};

export function BirthForm({ onValidSubmit }: BirthFormProps) {
  const nicknameId = useId();
  const dateId = useId();
  const timeId = useId();
  const nicknameErrorId = useId();
  const dateErrorId = useId();
  const timeHintId = useId();

  const [nickname, setNickname] = useState(DEMO_NICKNAME);
  const [birthDate, setBirthDate] = useState(DEMO_BIRTH_DATE);
  const [birthTime, setBirthTime] = useState(UNKNOWN_TIME_VALUE);
  const [focus, setFocus] = useState<FocusValue>("工作");
  const [errors, setErrors] = useState<{
    nickname?: string;
    birth_date?: string;
  }>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = collectBirthFormFieldErrors({
      nickname,
      birth_date: birthDate,
      birth_time: birthTime === UNKNOWN_TIME_VALUE ? null : birthTime,
      focus,
    });
    setErrors(fieldErrors);
    if (fieldErrors.nickname || fieldErrors.birth_date) {
      return;
    }

    const body = buildBirthRequest({
      nickname,
      birth_date: birthDate,
      birth_time: birthTime,
      focus,
    });
    onValidSubmit?.(body);
  }

  return (
    <article className="w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-8 md:max-w-[576px] md:px-8 md:py-10">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-serif text-display text-ink">紫微解讀</h1>
          <p className="mt-3 text-body text-ink">
            依生辰起紫微原局，先批基本命理。進階詳批封存。
          </p>
        </div>
        <span
          aria-hidden="true"
          className="shrink-0 bg-seal px-2 py-1 text-label font-medium text-sheet"
        >
          起盤
        </span>
      </header>

      <form className="flex flex-col gap-6" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <label className="text-label font-medium text-ink" htmlFor={nicknameId}>
              命主暱稱
            </label>
            <span className="text-label text-seal">必填</span>
          </div>
          <input
            aria-describedby={errors.nickname ? nicknameErrorId : undefined}
            aria-invalid={Boolean(errors.nickname)}
            autoComplete="nickname"
            className={`min-h-11 rounded-control border bg-sheet px-3 py-2 text-body text-ink ${
              errors.nickname ? "border-warn" : "border-line"
            }`}
            id={nicknameId}
            name="nickname"
            onChange={(event) => {
              setNickname(event.target.value);
              if (errors.nickname) {
                setErrors((current) => ({ ...current, nickname: undefined }));
              }
            }}
            type="text"
            value={nickname}
          />
          {errors.nickname ? (
            <p className="text-label text-warn" id={nicknameErrorId} role="alert">
              {errors.nickname}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <label className="text-label font-medium text-ink" htmlFor={dateId}>
              生辰公曆（國曆）
            </label>
            <span className="text-label text-seal">必填</span>
          </div>
          <input
            aria-describedby={errors.birth_date ? dateErrorId : undefined}
            aria-invalid={Boolean(errors.birth_date)}
            className={`min-h-11 rounded-control border bg-sheet px-3 py-2 font-mono text-body text-ink ${
              errors.birth_date ? "border-warn" : "border-line"
            }`}
            id={dateId}
            inputMode="numeric"
            name="birth_date"
            onChange={(event) => {
              setBirthDate(event.target.value);
              if (errors.birth_date) {
                setErrors((current) => ({ ...current, birth_date: undefined }));
              }
            }}
            type="text"
            value={birthDate}
          />
          {errors.birth_date ? (
            <p className="text-label text-warn" id={dateErrorId} role="alert">
              {errors.birth_date}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-label font-medium text-ink" htmlFor={timeId}>
            出生時辰（選填）
          </label>
          <select
            aria-describedby={timeHintId}
            className="min-h-11 rounded-control border border-line bg-sheet px-3 py-2 text-body text-ink"
            id={timeId}
            name="birth_time"
            onChange={(event) => setBirthTime(event.target.value)}
            value={birthTime}
          >
            {TIME_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-label text-ink-soft" id={timeHintId}>
            {TIME_HINT}
          </p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-label font-medium text-ink">
            問事宮位（排盤焦點）
          </legend>
          <div className="grid grid-cols-3 gap-2">
            {FOCUS_OPTIONS.map((option) => {
              const selected = focus === option.value;
              return (
                <button
                  aria-pressed={selected}
                  className={`min-h-11 rounded-control border px-1 py-2 text-center text-label leading-tight ${
                    selected
                      ? "border-seal bg-seal text-sheet"
                      : "border-line bg-sheet text-ink"
                  }`}
                  key={option.value}
                  onClick={() => setFocus(option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          className="min-h-11 w-full rounded-control bg-seal px-5 py-3 text-button text-sheet transition-colors duration-[var(--primitive-duration-hover)] hover:bg-seal-deep"
          type="submit"
        >
          看基本分析
        </button>
      </form>

      <p className="mt-6 text-disclaimer text-ink-soft">{DISCLAIMER}</p>
    </article>
  );
}
