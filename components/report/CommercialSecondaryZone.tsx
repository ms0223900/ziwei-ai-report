import {
  MODE_CREDIT_LINE,
  MODE_SUBSCRIBE_LINE,
  MODE_UNLOCK_LINE,
} from "../../lib/constants";

// Three paid modes all deliver the same advanced report; there is no follow-up chat.
export function CommercialSecondaryZone() {
  return (
    <aside className="flex flex-col gap-3 border-t border-line pt-5">
      <p className="text-[12px] font-medium leading-snug text-ink-soft">
        {MODE_UNLOCK_LINE}
      </p>
      <p className="text-[12px] font-medium leading-snug text-ink-soft">
        {MODE_CREDIT_LINE}
      </p>
      <p className="text-[12px] font-medium leading-snug text-ink-soft">
        {MODE_SUBSCRIBE_LINE}
      </p>
    </aside>
  );
}
