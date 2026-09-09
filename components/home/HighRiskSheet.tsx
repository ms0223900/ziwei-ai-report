const HIGH_RISK_TITLE = "這題我不能用命盤作答";

export function HighRiskSheet({
  message,
  disclaimer,
  onBack,
}: {
  message: string;
  disclaimer: string;
  onBack: () => void;
}) {
  return (
    <article className="animate-report-enter w-full max-w-[350px] rounded-sheet border border-line bg-sheet px-6 py-6 md:max-w-[576px] md:p-6">
      <div className="flex flex-col gap-6">
        <h1 className="font-serif text-[24px] font-bold leading-[1.25] text-ink">
          {HIGH_RISK_TITLE}
        </h1>
        <p className="text-body text-ink">{message}</p>
        <p className="text-disclaimer text-ink-soft">{disclaimer}</p>
        <button
          className="min-h-11 w-fit rounded-control border border-line bg-sheet px-5 py-3 text-button text-ink"
          onClick={onBack}
          type="button"
        >
          回表單
        </button>
      </div>
    </article>
  );
}
