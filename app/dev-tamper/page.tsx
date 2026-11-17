"use client";
// 2-3 錄影示範用的暫時頁面（只存在於 cp-02-dev-tamper 分支，不進 main）。
// 示範：用登入者自己的 session，從瀏覽器直接改 profiles.access_status → 被資料庫擋下。
import { useState } from "react";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

type Outcome = {
  status: number;
  code: string | null;
  message: string | null;
  rows: unknown;
};

function format(outcome: Outcome) {
  return JSON.stringify(outcome, null, 2);
}

export default function DevTamperPage() {
  const [result, setResult] = useState("尚未送出");
  const [otherUserId, setOtherUserId] = useState("");

  // 主示範：用自己的 session，從瀏覽器把自己改成 unlocked
  // 預期：403 / 42501 / permission denied for table profiles / rows: null
  async function tryUnlockMyself() {
    const supabase = createBrowserSupabaseClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      setResult("沒有登入：請先登入再試");
      return;
    }
    const { data, error, status } = await supabase
      .from("profiles")
      .update({ access_status: "unlocked" })
      .eq("user_id", userId)
      .select();
    setResult(
      format({
        status,
        code: error?.code ?? null,
        message: error?.message ?? null,
        rows: data,
      }),
    );
  }

  // 選用對照：改「別人」的 display_name（有欄位權限，但被 RLS 過濾）
  // 預期：200 / code null / rows []（沒報錯，但改到 0 列）
  async function tryRenameOther() {
    const id = otherUserId.trim();
    if (!id) {
      setResult("請先貼上另一個帳號的 user_id");
      return;
    }
    const supabase = createBrowserSupabaseClient();
    const { data, error, status } = await supabase
      .from("profiles")
      .update({ display_name: "被別人改了" })
      .eq("user_id", id)
      .select();
    setResult(
      format({
        status,
        code: error?.code ?? null,
        message: error?.message ?? null,
        rows: data,
      }),
    );
  }

  return (
    <main className="mx-auto max-w-[576px] px-5 py-10">
      <h1 className="font-serif text-display text-ink">前端直接改權益欄位</h1>
      <button
        className="mt-6 min-h-11 w-full rounded-control bg-seal px-5 py-3 text-button text-sheet"
        onClick={() => void tryUnlockMyself()}
        type="button"
      >
        從瀏覽器把自己改成 unlocked
      </button>
      <div className="mt-6 flex flex-col gap-2">
        <input
          aria-label="另一個帳號的 user_id"
          className="min-h-11 rounded-control border border-line bg-sheet px-3 py-2 text-body text-ink"
          onChange={(event) => setOtherUserId(event.target.value)}
          placeholder="（選用）另一個帳號的 user_id"
          value={otherUserId}
        />
        <button
          className="min-h-11 rounded-control border border-line px-5 py-3 text-button text-ink"
          onClick={() => void tryRenameOther()}
          type="button"
        >
          （選用）改別人的顯示名稱
        </button>
      </div>
      <pre className="mt-6 whitespace-pre-wrap text-label text-ink">{result}</pre>
    </main>
  );
}
