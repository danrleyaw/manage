-- ============================================================================
--  FUT MANAGER - ESQUEMA SUPABASE (VERSÃO V3 - APP VITE)
--  Obs.: este script assume um banco novo OU tabelas ainda não existentes.
--  Se já houver tabelas com estes nomes, revise antes de aplicar.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Jogos (games)
-- --------------------------------------------------------------------------
create table if not exists public.games (
  id text primary key,
  name text not null,
  join_code text not null unique,
  status text not null default 'configurando',
  admin_id uuid not null,
  settings jsonb not null default jsonb_build_object('matchTime', 10),
  timer_state jsonb not null default jsonb_build_object(
    'isRunning', false,
    'startTime', null,
    'remainingSeconds', 600
  ),
  score_a integer not null default 0,
  score_b integer not null default 0,
  created_at timestamptz not null default now()
);

-- Opcional: se quiser vincular ao auth.users
-- alter table public.games
--   add constraint games_admin_fk
--   foreign key (admin_id) references auth.users(id);

-- --------------------------------------------------------------------------
-- Jogadores (players)
-- --------------------------------------------------------------------------
create table if not exists public.players (
  id text primary key,
  name text not null,
  is_confirmed boolean not null default false,
  is_goalkeeper boolean not null default false,
  game_id text not null references public.games(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_players_game_id
  on public.players (game_id);

-- --------------------------------------------------------------------------
-- Estado da fila / rotação (queue_state)
-- --------------------------------------------------------------------------
create table if not exists public.queue_state (
  game_id text primary key references public.games(id) on delete cascade,
  team_a text[] not null default '{}'::text[],
  team_b text[] not null default '{}'::text[],
  next_block text[] not null default '{}'::text[],
  re_queue text[] not null default '{}'::text[],
  updated_at timestamptz not null default now()
);

create index if not exists idx_queue_state_game_id
  on public.queue_state (game_id);

-- --------------------------------------------------------------------------
-- RLS (exemplo SIMPLIFICADO - ajuste conforme necessidade)
--  Atenção: isto é apenas um ponto de partida. Em produção, refine as regras.
-- --------------------------------------------------------------------------

alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.queue_state enable row level security;

-- Permitir leitura pública
create policy if not exists "Games are viewable by everyone"
  on public.games
  for select
  using (true);

create policy if not exists "Players are viewable by everyone"
  on public.players
  for select
  using (true);

create policy if not exists "Queue is viewable by everyone"
  on public.queue_state
  for select
  using (true);

-- Permitir alteração para usuários autenticados (ajuste se quiser algo mais restrito)
create policy if not exists "Authenticated users can insert/update games"
  on public.games
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can manage players"
  on public.players
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy if not exists "Authenticated users can manage queue"
  on public.queue_state
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- FIM
-- ============================================================================

