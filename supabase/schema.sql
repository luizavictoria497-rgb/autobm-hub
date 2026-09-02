-- ============================================================================
-- SCHEMA: SaaS de Automação Facebook Business Manager + WhatsApp Business
-- Idempotente: pode ser executado múltiplas vezes sem erro.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. PROFILES (dados de plano do usuário, estende auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  plan text not null default 'free' check (plan in ('free', 'pro', 'enterprise')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- Cria automaticamente um profile ao registrar um novo usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, plan)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. SEGREDOS DE CRIPTOGRAFIA (não exposto via RLS a usuários autenticados)
-- ----------------------------------------------------------------------------
create table if not exists public.app_secrets (
  id int primary key default 1,
  encryption_key text not null,
  constraint app_secrets_single_row check (id = 1)
);

insert into public.app_secrets (id, encryption_key)
values (1, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

alter table public.app_secrets enable row level security;
-- Nenhuma policy criada de propósito: bloqueia leitura/escrita para authenticated/anon.
-- Só funções SECURITY DEFINER (abaixo) e o service_role conseguem acessar.

create or replace function public.encrypt_secret(plain text)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when plain is null or plain = '' then null
    else encode(pgp_sym_encrypt(plain, (select encryption_key from public.app_secrets where id = 1)), 'base64')
  end;
$$;

create or replace function public.decrypt_secret(enc text)
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when enc is null or enc = '' then null
    else pgp_sym_decrypt(decode(enc, 'base64'), (select encryption_key from public.app_secrets where id = 1))
  end;
$$;

revoke all on function public.encrypt_secret(text) from public;
revoke all on function public.decrypt_secret(text) from public;
grant execute on function public.encrypt_secret(text) to authenticated;
grant execute on function public.decrypt_secret(text) to authenticated;

-- ----------------------------------------------------------------------------
-- 3. PERFIS ADSPOWER (referência local, cadastrados/associados manualmente)
-- ----------------------------------------------------------------------------
create table if not exists public.adspower_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  adspower_user_id text,
  name text not null,
  status text not null default 'ATIVO' check (status in ('ATIVO', 'INATIVO')),
  created_at timestamptz not null default now()
);

alter table public.adspower_profiles enable row level security;

drop policy if exists "adspower_profiles_all_own" on public.adspower_profiles;
create policy "adspower_profiles_all_own" on public.adspower_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. BUSINESS MANAGERS (BMs)
-- ----------------------------------------------------------------------------
create table if not exists public.business_managers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  bm_id text not null,
  name text not null,
  adspower_profile_id uuid references public.adspower_profiles(id) on delete set null,
  profile_name text,
  status text not null default 'ANALISE' check (status in ('ANALISE', 'CRIADA', 'VERIFICADA', 'BLOQUEADA')),
  whatsapp_tier text check (whatsapp_tier in ('250', '2k', '10k', '100k')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_managers_user_id_idx on public.business_managers(user_id);
create index if not exists business_managers_status_idx on public.business_managers(status);

alter table public.business_managers enable row level security;

drop policy if exists "business_managers_all_own" on public.business_managers;
create policy "business_managers_all_own" on public.business_managers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. CONTAS FACEBOOK (senha armazenada criptografada via pgcrypto)
-- ----------------------------------------------------------------------------
create table if not exists public.facebook_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact text not null, -- email ou telefone
  password_encrypted text, -- gerado via public.encrypt_secret()
  adspower_profile_id uuid references public.adspower_profiles(id) on delete set null,
  profile_name text,
  status text not null default 'ATIVO' check (status in ('ATIVO', 'BLOQUEADO', 'VERIFICACAO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists facebook_accounts_user_id_idx on public.facebook_accounts(user_id);
create index if not exists facebook_accounts_status_idx on public.facebook_accounts(status);

alter table public.facebook_accounts enable row level security;

drop policy if exists "facebook_accounts_all_own" on public.facebook_accounts;
create policy "facebook_accounts_all_own" on public.facebook_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. CONFIGURAÇÕES DE API (uma linha por usuário)
-- ----------------------------------------------------------------------------
create table if not exists public.api_configs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  number_api_url text,
  number_api_method text default 'POST' check (number_api_method in ('GET', 'POST')),
  number_api_headers jsonb default '{}'::jsonb,
  number_api_body jsonb default '{}'::jsonb,
  site_api_url text,
  site_api_method text default 'POST' check (site_api_method in ('GET', 'POST')),
  site_api_headers jsonb default '{}'::jsonb,
  site_api_body jsonb default '{}'::jsonb,
  pdf_api_path text,
  ai_api_key_encrypted text, -- gerado via public.encrypt_secret()
  adspower_api_url text default 'http://local.adspower.net:50325/api/v1/',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.api_configs enable row level security;

drop policy if exists "api_configs_all_own" on public.api_configs;
create policy "api_configs_all_own" on public.api_configs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. EXECUÇÕES (histórico sincronizado do App Nativo)
-- ----------------------------------------------------------------------------
create table if not exists public.executions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  flow_name text not null,
  profile_ids jsonb default '[]'::jsonb,
  status text not null default 'EM_ANDAMENTO' check (status in ('SUCESSO', 'ERRO', 'EM_ANDAMENTO')),
  bms_created jsonb default '[]'::jsonb,
  accounts_created jsonb default '[]'::jsonb,
  logs_url text,
  duration numeric,
  created_at timestamptz not null default now()
);

create index if not exists executions_user_id_idx on public.executions(user_id);
create index if not exists executions_created_at_idx on public.executions(created_at desc);

alter table public.executions enable row level security;

drop policy if exists "executions_all_own" on public.executions;
create policy "executions_all_own" on public.executions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- Triggers genéricos de updated_at
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_business_managers on public.business_managers;
create trigger set_updated_at_business_managers
  before update on public.business_managers
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_facebook_accounts on public.facebook_accounts;
create trigger set_updated_at_facebook_accounts
  before update on public.facebook_accounts
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_api_configs on public.api_configs;
create trigger set_updated_at_api_configs
  before update on public.api_configs
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. LISTA DE ESPERA DO APP NATIVO (aviso por e-mail quando disponível)
-- ----------------------------------------------------------------------------
create table if not exists public.native_app_waitlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.native_app_waitlist enable row level security;

drop policy if exists "native_app_waitlist_all_own" on public.native_app_waitlist;
create policy "native_app_waitlist_all_own" on public.native_app_waitlist
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
