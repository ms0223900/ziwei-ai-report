import { buildChartMatrixCopy, type ChartMatrixInput } from "./chart-matrix";

export function ChartMatrix(input: ChartMatrixInput) {
  const copy = buildChartMatrixCopy(input);

  return (
    <section
      aria-label="紫微原局排盤總目"
      className="rounded-control border border-line bg-paper px-4 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-[13px] font-bold text-ink">{copy.title}</p>
        <p className="font-serif text-[12px] font-bold text-seal">{copy.bureau}</p>
      </div>
      <div className="my-2.5 h-px bg-line" />
      <div className="flex flex-col gap-1 font-mono text-[12px] leading-snug text-ink-soft">
        <div className="flex items-center justify-between gap-3">
          <span>{copy.subject}</span>
          <span>{copy.birth}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span>{copy.year}</span>
          <span className="font-medium text-ink">{copy.focus}</span>
        </div>
      </div>
    </section>
  );
}
