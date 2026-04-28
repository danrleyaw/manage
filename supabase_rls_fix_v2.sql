-- ============================================================================
-- FUT MANAGER - RLS FIX v2
-- Corrige políticas para permitir que convidados (anon) confirmem presença.
-- Execute no SQL Editor do Supabase após o supabase_security_patch.sql
-- ============================================================================

-- --------------------------------------------------------------------------
-- PLAYERS: convidados anônimos precisam fazer upsert (insert + update)
-- --------------------------------------------------------------------------

-- Remove políticas conflitantes anteriores
drop policy if exists "Public can join games" on public.players;
drop policy if exists "Admins can manage players in their games" on public.players;

-- Qualquer um (incluindo anon) pode inserir/atualizar jogadores
-- (o controle de quem é dono é feito pelo ID gerado no localStorage)
create policy "Anyone can upsert players"
  on public.players for insert
  with check (true);

create policy "Anyone can update players"
  on public.players for update
  using (true)
  with check (true);

-- Apenas o admin da arena pode deletar jogadores
create policy "Admins can delete players in their games"
  on public.players for delete
  using (
    exists (
      select 1 from public.games
      where games.id = players.game_id
        and games.admin_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- QUEUE_STATE: convidados precisam ler; apenas admin escreve
-- (já coberto pelo patch anterior, mas garantindo)
-- --------------------------------------------------------------------------

-- Garante que anon pode ler queue
drop policy if exists "Queue is viewable by everyone" on public.queue_state;
create policy "Queue is viewable by everyone"
  on public.queue_state for select using (true);

-- --------------------------------------------------------------------------
-- MATCH_HISTORY: leitura pública, escrita apenas para admin autenticado
-- (já coberto pelo supabase_history_v1.sql)
-- --------------------------------------------------------------------------

-- ============================================================================
-- FIM
-- ============================================================================
