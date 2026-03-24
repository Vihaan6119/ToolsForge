-- Run this script in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.user_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  tool_slug text not null,
  uses_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create unique index if not exists user_usage_user_tool_unique
  on public.user_usage (user_id, tool_slug);

alter table public.user_usage enable row level security;

drop policy if exists "Users can view own usage" on public.user_usage;
create policy "Users can view own usage"
  on public.user_usage
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own usage" on public.user_usage;
create policy "Users can insert own usage"
  on public.user_usage
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own usage" on public.user_usage;
create policy "Users can update own usage"
  on public.user_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_usage_updated_at on public.user_usage;
create trigger set_user_usage_updated_at
before update on public.user_usage
for each row execute function public.set_updated_at_timestamp();
