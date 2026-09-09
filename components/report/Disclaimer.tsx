import { DISCLAIMER } from "../../lib/constants";

export function Disclaimer({ text = DISCLAIMER }: { text?: string }) {
  return <p className="text-disclaimer text-ink-soft">{text}</p>;
}
