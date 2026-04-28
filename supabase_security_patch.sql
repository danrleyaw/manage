-- ============================================================================
-- FUT MANAGER - PATCH DE SEGURANÇA (RLS REFINADO)
-- Execute este script no SQL Editor do Supabase para proteger seus dados.
-- ============================================================================

-- 1. Limpar políticas antigas (para evitar duplicatas)
drop policy if exists "Authenticated users can insert/update games" on public.games;
drop policy if exists "Authenticated users can manage players" on public.players;
drop policy if exists "Authenticated users can manage queue" on public.queue_state;
drop policy if exists "Games are viewable by everyone" on public.games;
drop policy if exists "Players are viewable by everyone" on public.players;
drop policy if exists "Queue is viewable by everyone" on public.queue_state;

-- 2. Garantir que RLS está ativado
alter table public.games enable row level security;
alter table public.players enable row level security;
alter table public.queue_state enable row level security;

-- 3. Políticas para GAMES
-- Leitura: Qualquer um com o código pode ler (mantemos simplificado por agora)
create policy "Games are viewable by everyone"
  on public.games for select using (true);

-- Escrita: Apenas o ADMIN criador pode alterar o jogo
create policy "Admins can manage their own games"
  on public.games for all
  using (auth.uid() = admin_id)
  with check (auth.uid() = admin_id);

-- 4. Políticas para PLAYERS
-- Leitura: Pública
create policy "Players are viewable by everyone"
  on public.players for select using (true);

-- Inserção: Qualquer um pode se inserir em um jogo (convidados)
-- Nota: Para maior segurança, poderíamos validar o join_code, mas aqui permitimos inserção livre.
create policy "Public can join games"
  on public.players for insert
  with check (true);

-- Update/Delete: Apenas o Admin daquela arena OU o próprio jogador (se autenticado, o que não é o caso de convidados)
-- Para convidados, usamos o ID gerado localmente. Como não há Auth para eles, o Admin tem controle total.
create policy "Admins can manage players in their games"
  on public.players for all
  using (
    exists (
      select 1 from public.games
      where games.id = players.game_id
      and games.admin_id = auth.uid()
    )
  );

-- 5. Políticas para QUEUE_STATE
-- Leitura: Pública
create policy "Queue is viewable by everyone"
  on public.queue_state for select using (true);

-- Escrita: Apenas o Admin da arena
create policy "Admins can manage queue in their games"
  on public.queue_state for all
  using (
    exists (
      select 1 from public.games
      where games.id = queue_state.game_id
      and games.admin_id = auth.uid()
    )
  );

-- ============================================================================
-- FIM DO PATCH
-- ============================================================================
