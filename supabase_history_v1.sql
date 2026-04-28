-- ============================================================================
-- FUT MANAGER - TABELA DE HISTÓRICO DE PARTIDAS
-- Execute este script no SQL Editor do Supabase para ativar a memória do app.
-- ============================================================================

create table if not exists public.match_history (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games(id) on delete cascade,
  score_a integer not null default 0,
  score_b integer not null default 0,
  winner text not null, -- 'A', 'B', 'Empate'
  team_a_players text[] not null default '{}'::text[],
  team_b_players text[] not null default '{}'::text[],
  created_at timestamptz not null default now()
);

-- Habilitar RLS
alter table public.match_history enable row level security;

-- Políticas de acesso
create policy "Match history is viewable by everyone"
  on public.match_history for select using (true);

create policy "Admins can insert history for their games"
  on public.match_history for insert
  with check (
    exists (
      select 1 from public.games
      where games.id = match_history.game_id
      and games.admin_id = auth.uid()
    )
  );

-- Index para performance
create index if not exists idx_match_history_game_id
  on public.match_history (game_id);

-- ============================================================================
-- FIM
-- ============================================================================
