-- 單元 6：訂閱首次開通、週期事件、取消 RPC，並讓單點解鎖認得訂閱有效期間。
-- 冪等：先查或先寫事件，衝突即視為已處理，不得先改期間再讓事件 insert 失敗。
-- security definer 繞不過 profiles_guard_entitlements（看 JWT 角色）；呼叫方須為 service role。
-- 期間加一個月一律以 Asia/Taipei 日曆月計算；月底日期會截到當月最後一天。

create or replace function public.activate_subscription_from_order(p_order_id uuid)
returns table (ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
  v_sub public.subscriptions%rowtype;
  v_has_sub boolean;
  v_key text;
  v_start timestamptz;
  v_end timestamptz;
begin
  select * into v_order
  from public.orders o
  where o.id = p_order_id
  for update;

  if not found then
    return query select false, 'not_found'::text;
    return;
  end if;

  if v_order.plan_id is distinct from 'subscribe_report_monthly' then
    return query select false, 'wrong_plan'::text;
    return;
  end if;

  v_key := 'return:' || v_order.merchant_trade_no;

  if exists (
    select 1
    from public.subscription_events e
    where e.idempotency_key = v_key
  ) then
    return query select true, 'already_fulfilled'::text;
    return;
  end if;

  select * into v_sub
  from public.subscriptions s
  where s.user_id = v_order.user_id
  for update;
  v_has_sub := found;

  if v_has_sub
     and v_sub.current_period_end >= now()
     and v_sub.merchant_trade_no is distinct from v_order.merchant_trade_no then
    return query select false, 'conflict'::text;
    return;
  end if;

  v_start := coalesce(v_order.payment_date, now());
  v_end := ((v_start at time zone 'Asia/Taipei') + interval '1 month') at time zone 'Asia/Taipei';

  if v_has_sub then
    update public.subscriptions
    set plan_id = v_order.plan_id,
        order_id = v_order.id,
        merchant_trade_no = v_order.merchant_trade_no,
        status = 'active',
        current_period_start = v_start,
        current_period_end = v_end
    where public.subscriptions.id = v_sub.id
    returning * into v_sub;
  else
    insert into public.subscriptions (
      user_id,
      plan_id,
      order_id,
      merchant_trade_no,
      status,
      current_period_start,
      current_period_end
    )
    values (
      v_order.user_id,
      v_order.plan_id,
      v_order.id,
      v_order.merchant_trade_no,
      'active',
      v_start,
      v_end
    )
    returning * into v_sub;
  end if;

  insert into public.subscription_events (
    subscription_id,
    user_id,
    event_type,
    idempotency_key,
    processed_at
  )
  values (
    v_sub.id,
    v_order.user_id,
    'first_success',
    v_key,
    v_start
  );

  update public.profiles
  set subscription_status = 'active'
  where public.profiles.user_id = v_order.user_id;

  return query select true, 'activated'::text;
end;
$$;

create or replace function public.apply_subscription_period_event(
  p_merchant_trade_no text,
  p_idempotency_key text,
  p_event_type text,
  p_rtn_code text,
  p_total_success_times integer,
  p_gwsr text,
  p_processed_at timestamptz
)
returns table (ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
begin
  if p_event_type not in ('first_duplicate', 'renewal_success', 'payment_failed') then
    return query select false, 'invalid_event'::text;
    return;
  end if;

  select * into v_sub
  from public.subscriptions s
  where s.merchant_trade_no = p_merchant_trade_no
  for update;

  if not found then
    return query select false, 'not_found'::text;
    return;
  end if;

  begin
    insert into public.subscription_events (
      subscription_id,
      user_id,
      event_type,
      idempotency_key,
      gwsr,
      total_success_times,
      rtn_code,
      processed_at
    )
    values (
      v_sub.id,
      v_sub.user_id,
      p_event_type,
      p_idempotency_key,
      p_gwsr,
      p_total_success_times,
      p_rtn_code,
      coalesce(p_processed_at, now())
    );
  exception
    when unique_violation then
      return query select true, 'already_processed'::text;
      return;
  end;

  -- 取消／到期後綠界合約可能仍在扣款；只留事件，不讓權益復活。
  if v_sub.status in ('cancelled', 'expired') then
    return query select true, 'recorded_inactive'::text;
    return;
  end if;

  if p_event_type = 'first_duplicate' then
    return query select true, 'duplicate_first'::text;
    return;
  end if;

  if p_event_type = 'renewal_success' then
    update public.subscriptions
    set status = 'active',
        current_period_end =
          ((public.subscriptions.current_period_end at time zone 'Asia/Taipei')
            + interval '1 month') at time zone 'Asia/Taipei'
    where public.subscriptions.id = v_sub.id;

    update public.profiles
    set subscription_status = 'active'
    where public.profiles.user_id = v_sub.user_id;

    return query select true, 'renewed'::text;
    return;
  end if;

  update public.subscriptions
  set status = 'past_due'
  where public.subscriptions.id = v_sub.id;

  update public.profiles
  set subscription_status = 'past_due'
  where public.profiles.user_id = v_sub.user_id;

  return query select true, 'past_due'::text;
end;
$$;

create or replace function public.cancel_subscription(p_user_id uuid)
returns table (ok boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sub public.subscriptions%rowtype;
begin
  select * into v_sub
  from public.subscriptions s
  where s.user_id = p_user_id
  for update;

  if not found then
    return query select false, 'not_found'::text;
    return;
  end if;

  begin
    insert into public.subscription_events (
      subscription_id,
      user_id,
      event_type,
      idempotency_key,
      processed_at
    )
    values (
      v_sub.id,
      v_sub.user_id,
      'cancelled',
      'cancel:' || v_sub.id || ':' || v_sub.merchant_trade_no,
      now()
    );
  exception
    when unique_violation then
      return query select true, 'already_cancelled'::text;
      return;
  end;

  -- 減一秒避免與權限判斷的 current_period_end >= now() 在同一交易時間點相等。
  update public.subscriptions
  set status = 'cancelled',
      current_period_end = now() - interval '1 second'
  where public.subscriptions.id = v_sub.id;

  update public.profiles
  set subscription_status = 'cancelled'
  where public.profiles.user_id = v_sub.user_id;

  return query select true, 'cancelled'::text;
end;
$$;

create or replace function public.unlock_report_with_point(report_id uuid, p_user_id uuid)
returns table (ok boolean, reason text, points_balance integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
  v_access text;
  v_balance integer;
  v_tx_id uuid;
begin
  if p_user_id is null then
    return query select false, 'forbidden'::text, 0;
    return;
  end if;

  select r.user_id into v_owner
  from public.reports r
  where r.id = unlock_report_with_point.report_id
  for update;

  select p.access_status, p.points_balance
  into v_access, v_balance
  from public.profiles p
  where p.user_id = p_user_id
  for update;

  if v_owner is null or v_owner is distinct from p_user_id then
    return query select false, 'forbidden'::text, coalesce(v_balance, 0);
    return;
  end if;

  if v_access is null then
    return query select false, 'forbidden'::text, 0;
    return;
  end if;

  if v_access = 'unlocked' then
    return query select true, 'lifetime'::text, v_balance;
    return;
  end if;

  if exists (
    select 1
    from public.report_unlocks u
    where u.user_id = p_user_id
      and u.report_id = unlock_report_with_point.report_id
  ) then
    return query select true, 'already_unlocked'::text, v_balance;
    return;
  end if;

  if exists (
    select 1
    from public.subscriptions s
    where s.user_id = p_user_id
      and s.current_period_end >= now()
  ) then
    return query select true, 'subscription'::text, v_balance;
    return;
  end if;

  begin
    update public.profiles
    set points_balance = public.profiles.points_balance - 1
    where public.profiles.user_id = p_user_id
      and public.profiles.points_balance >= 1
    returning public.profiles.points_balance into v_balance;

    if not found then
      return query select false, 'insufficient'::text, (
        select p.points_balance from public.profiles p where p.user_id = p_user_id
      );
      return;
    end if;

    insert into public.point_transactions (
      user_id,
      delta,
      type,
      report_id
    )
    values (
      p_user_id,
      -1,
      'debit_unlock',
      unlock_report_with_point.report_id
    )
    returning id into v_tx_id;

    insert into public.report_unlocks (
      user_id,
      report_id,
      transaction_id
    )
    values (
      p_user_id,
      unlock_report_with_point.report_id,
      v_tx_id
    );
  exception
    when unique_violation then
      select p.points_balance into v_balance
      from public.profiles p
      where p.user_id = p_user_id;
      return query select true, 'already_unlocked'::text, coalesce(v_balance, 0);
      return;
  end;

  return query select true, 'unlocked'::text, v_balance;
end;
$$;

revoke all on function public.activate_subscription_from_order(uuid) from public;
revoke all on function public.activate_subscription_from_order(uuid) from anon;
revoke all on function public.activate_subscription_from_order(uuid) from authenticated;
grant execute on function public.activate_subscription_from_order(uuid) to service_role;

revoke all on function public.apply_subscription_period_event(text, text, text, text, integer, text, timestamptz) from public;
revoke all on function public.apply_subscription_period_event(text, text, text, text, integer, text, timestamptz) from anon;
revoke all on function public.apply_subscription_period_event(text, text, text, text, integer, text, timestamptz) from authenticated;
grant execute on function public.apply_subscription_period_event(text, text, text, text, integer, text, timestamptz) to service_role;

revoke all on function public.cancel_subscription(uuid) from public;
revoke all on function public.cancel_subscription(uuid) from anon;
revoke all on function public.cancel_subscription(uuid) from authenticated;
grant execute on function public.cancel_subscription(uuid) to service_role;

revoke all on function public.unlock_report_with_point(uuid, uuid) from public;
revoke all on function public.unlock_report_with_point(uuid, uuid) from anon;
revoke all on function public.unlock_report_with_point(uuid, uuid) from authenticated;
grant execute on function public.unlock_report_with_point(uuid, uuid) to service_role;
