"use client";

import { REPORT_SLOTS } from "../../lib/constants";
import { createBrowserSupabaseClient } from "../../lib/supabase/client";

// TODO(prototype): 顯示名稱暫不提供頁首隨時修改；恢復時見 US-010 與下方註解區塊。
// import { useState, type FormEvent } from "react";
// import { validateDisplayName } from "../../lib/auth/credentials";

export type AuthSessionBarProps = {
  accessStatus: "locked" | "unlocked";
  displayName: string;
  userId: string;
};

export function AuthSessionBar({
  accessStatus,
  displayName,
  userId: _userId,
}: AuthSessionBarProps) {
  async function handleLogout() {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    // HomeClient 報告 state 在 client；僅 refresh 會留下已登出仍見報告的畫面。
    window.location.reload();
  }

  /*
  async function handleSaveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = validateDisplayName(name);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const supabase = createBrowserSupabaseClient();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ display_name: parsed.value })
        .eq("user_id", userId);
      if (updateError) {
        setError("更新失敗，請再試一次。");
        return;
      }
      setShownName(parsed.value);
      setName(parsed.value);
    } finally {
      setBusy(false);
    }
  }
  */

  return (
    <header className="border-b border-line bg-sheet">
      <div
        className="mx-auto flex min-h-14 w-full max-w-[576px] flex-wrap items-center justify-between gap-3 px-5 py-2"
        data-access-status={accessStatus}
        data-report-slot={REPORT_SLOTS.authSession}
      >
        <p className="font-serif text-label text-ink">{displayName}</p>
        <div className="flex flex-wrap items-center gap-2">
          {/*
          <form className="flex flex-wrap items-center gap-2" onSubmit={handleSaveName}>
            <label className="sr-only" htmlFor="display-name">
              顯示名稱
            </label>
            <input
              className="min-h-9 w-28 rounded-control border border-line bg-sheet px-2 py-1 text-label text-ink"
              disabled={busy}
              id="display-name"
              name="display_name"
              onChange={(event) => {
                setName(event.target.value);
                if (error) {
                  setError(null);
                }
              }}
              value={name}
            />
            <button
              className="min-h-9 rounded-control border border-line px-3 text-label text-ink hover:border-seal"
              disabled={busy}
              type="submit"
            >
              儲存
            </button>
          </form>
          {error ? (
            <p className="w-full text-label text-warn" role="alert">
              {error}
            </p>
          ) : null}
          */}
          <button
            className="min-h-9 rounded-control px-3 text-label text-ink-soft hover:text-ink"
            onClick={() => {
              void handleLogout();
            }}
            type="button"
          >
            登出
          </button>
        </div>
      </div>
    </header>
  );
}
