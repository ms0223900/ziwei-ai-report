"use client";

import { useState, type FormEvent } from "react";

const RESULT_TEXT: Record<string, string> = {
  ok: "ok：已補 5 點",
  skipped_already_fulfilled: "skipped_already_fulfilled：這筆已有加點，未重複補",
};

export function CompensationForm({ orderId }: { orderId: string }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reason.trim()) {
      setMessage("請填寫處置原因。");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/compensations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "credit_points", sourceOrderId: orderId, reason: reason.trim() }),
      });
      const body = (await response.json().catch(() => ({}))) as { result?: string; error?: string };
      if (response.ok && body.result) {
        setMessage(RESULT_TEXT[body.result] ?? body.result);
      } else {
        setMessage(body.error ?? "補點失敗，請稍後再試。");
      }
    } catch {
      setMessage("補點失敗，請檢查網路後再試。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-6 flex flex-col gap-2" onSubmit={handleSubmit}>
      <label className="text-label text-ink" htmlFor="compensation-reason">
        處置原因（必填）
      </label>
      <textarea
        className="min-h-20 rounded-control border border-line bg-sheet px-2 py-1 text-[13px] text-ink"
        disabled={busy}
        id="compensation-reason"
        onChange={(event) => setReason(event.target.value)}
        value={reason}
      />
      <button
        className="min-h-11 self-start rounded-control border border-line px-4 text-label text-ink hover:border-seal"
        disabled={busy}
        type="submit"
      >
        補 5 點
      </button>
      {message ? (
        <p className="text-[13px] text-ink" role="status">
          {message}
        </p>
      ) : null}
    </form>
  );
}
