import { DISCLAIMER } from "../../lib/constants";

const FAIL_TITLE = "這次沒有寫成報告，你可以再試一次。";

export function FailSheet({
  message,
  onRetry,
  onBack,
}: {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <article className="animate-report-enter w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-[24px] font-bold leading-[1.25] text-ink">
          {FAIL_TITLE}
        </h1>
        <p className="text-body text-ink-soft">{message}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="min-h-11 rounded-control bg-seal px-5 py-3 text-button text-sheet transition-colors duration-[var(--primitive-duration-hover)] hover:bg-seal-deep"
            onClick={onRetry}
            type="button"
          >
            再試一次
          </button>
          <button
            className="min-h-11 rounded-control border border-line bg-sheet px-5 py-3 text-button text-ink"
            onClick={onBack}
            type="button"
          >
            回表單
          </button>
        </div>
        <p className="text-disclaimer text-ink-soft">{DISCLAIMER}</p>
      </div>
    </article>
  );
}
