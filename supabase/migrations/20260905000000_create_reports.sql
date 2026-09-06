-- 單元 1 MVP：只建 reports。RLS enabled、零 policy。
-- anon／authenticated 讀寫皆擋下；唯一管道是 service_role（BYPASSRLS）。
-- 本檔只交付可套用 SQL；未套用成功前不得把 US-016／US-018 勾成完成。

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  nickname text not null,
  birth_date date not null,
  birth_time text,
  time_unknown boolean not null default false,
  focus text not null,
  basic_json jsonb not null,
  advanced_json jsonb,
  -- 本版固定 basic（未解鎖）；日後 unlocked 不在本遷移實作
  status text not null default 'basic',
  generation_status text not null,
  model text,
  provider text,
  prompt_version text,
  schema_version text,
  request_id text,
  generated_at timestamptz,
  created_at timestamptz not null default now(),
  constraint reports_generation_status_check
    check (generation_status in ('success', 'failed', 'pending'))
);

comment on table public.reports is '訪客一次性示範報告；本版無 user_id';
comment on column public.reports.status is '本版固定 basic（未解鎖）';
comment on column public.reports.generation_status is '允許 success／failed／pending';
comment on column public.reports.focus is '整體／工作／關係';

alter table public.reports enable row level security;

-- 刻意不建立任何 POLICY（零 policy）。
-- 刻意不建立 users／orders／credits／subscriptions／follow_ups。
