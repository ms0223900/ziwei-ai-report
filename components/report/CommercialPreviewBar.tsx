"use client";

import { PREVIEW_BANNER } from "../../lib/constants";
import type { PreviewState } from "../../lib/commercial/preview";

const STATES: PreviewState[] = ["A", "B", "C", "D"];

export function CommercialPreviewBar({
  state,
  onChange,
}: {
  state: PreviewState;
  onChange: (next: PreviewState) => void;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-control border border-seal/40 bg-paper px-3 py-2">
      <p className="font-serif text-[13px] font-bold text-seal">{PREVIEW_BANNER}</p>
      <label className="flex items-center gap-2 text-[12px] font-medium text-ink-soft">
        預覽態
        <select
          className="min-h-9 rounded-control border border-line bg-sheet px-2 text-ink"
          onChange={(event) => onChange(event.target.value as PreviewState)}
          value={state}
        >
          {STATES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
