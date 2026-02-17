import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Game, Player, QueueState } from '../types';

// -----------------------------------------------------------------------------
// Configuração do cliente Supabase (real, sem mocks)
// -----------------------------------------------------------------------------

const SUPABASE_URL = "https://venybvftwkitaugutkvl.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlbnlidmZ0d2tpdGF1Z3V0a3ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA4MDE3NjksImV4cCI6MjA4NjM3Nzc2OX0.gKKyvpMm9AsQadUdb7dXQtHrps9ryxOGS3iw5gOiEK0";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Em desenvolvimento isso ajuda a detectar falta de configuração.
  // Em produção (Vercel) esses valores vêm das variáveis já configuradas.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Variáveis NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY não definidas. ' +
    'Configure no .env.local (dev) e na Vercel (production).'
  );
}

const client: SupabaseClient = createClient(
  SUPABASE_URL || '',
  SUPABASE_ANON_KEY || '',
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

// -----------------------------------------------------------------------------
// Mapeamento entre modelo TypeScript e esquema SQL (snake_case)
// -----------------------------------------------------------------------------

type GameRow = {
  id: string;
  name: string;
  join_code: string;
  status: string;
  admin_id: string;
  settings: Game['settings'] | null;
  timer_state: Game['timerState'] | null;
  score_a: number | null;
  score_b: number | null;
};

type PlayerRow = {
  id: string;
  name: string;
  is_confirmed: boolean;
  is_goalkeeper: boolean;
  game_id: string;
};

type QueueRow = {
  game_id: string;
  team_a: string[] | null;
  team_b: string[] | null;
  next_block: string[] | null;
  re_queue: string[] | null;
};

const mapGameRowToGame = (row: GameRow): Game => {
  const settings = row.settings || { matchTime: 10 };
  const timerState =
    row.timer_state ||
    {
      isRunning: false,
      startTime: null,
      remainingSeconds: (settings.matchTime ?? 10) * 60,
    };

  return {
    id: row.id,
    name: row.name,
    joinCode: row.join_code,
    status: row.status as Game['status'],
    adminId: row.admin_id,
    settings,
    timerState,
    scoreA: row.score_a ?? 0,
    scoreB: row.score_b ?? 0,
  };
};

const mapGameToRow = (game: Partial<Game>): Partial<GameRow> => {
  const out: Partial<GameRow> = {};
  if (game.id !== undefined) out.id = game.id;
  if (game.name !== undefined) out.name = game.name;
  if (game.joinCode !== undefined) out.join_code = game.joinCode;
  if (game.status !== undefined) out.status = game.status;
  if (game.adminId !== undefined) out.admin_id = game.adminId;
  if (game.settings !== undefined) out.settings = game.settings;
  if (game.timerState !== undefined) out.timer_state = game.timerState;
  if (game.scoreA !== undefined) out.score_a = game.scoreA;
  if (game.scoreB !== undefined) out.score_b = game.scoreB;
  return out;
};

const mapPlayerRowToPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  name: row.name,
  isConfirmed: row.is_confirmed,
  isGoalkeeper: row.is_goalkeeper,
  gameId: row.game_id,
});

const mapPlayerToRow = (player: Player): PlayerRow => ({
  id: player.id,
  name: player.name,
  is_confirmed: player.isConfirmed,
  is_goalkeeper: player.isGoalkeeper,
  game_id: player.gameId,
});

const mapQueueRowToQueueState = (row: QueueRow): QueueState => ({
  gameId: row.game_id,
  teamA: row.team_a || [],
  teamB: row.team_b || [],
  nextBlock: row.next_block || [],
  reQueue: row.re_queue || [],
});

const mapQueueStateToRow = (state: QueueState): QueueRow => ({
  game_id: state.gameId,
  team_a: state.teamA,
  team_b: state.teamB,
  next_block: state.nextBlock,
  re_queue: state.reQueue,
});

// -----------------------------------------------------------------------------
// API que o App consome (mesma interface anterior, porém apontando para Supabase)
// -----------------------------------------------------------------------------

const SESSION_KEY = 'football_manager_session';

export const supabase = {
  auth: {
    async signUp(email: string, pass: string) {
      const { data, error } = await client.auth.signUp({
        email,
        password: pass,
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao registrar usuário');
      }

      const sessionUser = { id: data.user.id, email: data.user.email || email };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return { user: sessionUser };
    },

    async signIn(email: string, pass: string) {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Credenciais inválidas');
      }

      const sessionUser = { id: data.user.id, email: data.user.email || email };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      return { user: sessionUser };
    },

    async signOut() {
      await client.auth.signOut();
      window.localStorage.removeItem(SESSION_KEY);
    },

    getUser() {
      const raw = window.localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    },
  },

  games: {
    async create(game: Game): Promise<Game> {
      const row = mapGameToRow(game);
      const { data, error } = await client
        .from('games')
        .insert(row)
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'Erro ao criar jogo');
      }

      return mapGameRowToGame(data as GameRow);
    },

    async get(idOrCode: string): Promise<Game | null> {
      // Primeiro tenta por joinCode, depois por id
      let { data, error } = await client
        .from('games')
        .select('*')
        .eq('join_code', idOrCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      if (!data) {
        const res = await client
          .from('games')
          .select('*')
          .eq('id', idOrCode)
          .maybeSingle();
        data = res.data;
        error = res.error;
        if (error && error.code !== 'PGRST116') {
          throw new Error(error.message);
        }
      }

      return data ? mapGameRowToGame(data as GameRow) : null;
    },

    async getByAdmin(adminId: string): Promise<Game[]> {
      const { data, error } = await client
        .from('games')
        .select('*')
        .eq('admin_id', adminId)
        .order('created_at', { ascending: false } as any);

      if (error) {
        throw new Error(error.message);
      }

      return (data as GameRow[] | null)?.map(mapGameRowToGame) ?? [];
    },

    async update(id: string, updates: Partial<Game>) {
      const rowUpdates = mapGameToRow(updates);
      const { error } = await client
        .from('games')
        .update(rowUpdates)
        .eq('id', id);

      if (error) {
        throw new Error(error.message);
      }
    },
  },

  players: {
    async getByGame(gameId: string): Promise<Player[]> {
      const { data, error } = await client
        .from('players')
        .select('*')
        .eq('game_id', gameId)
        .order('name', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return (data as PlayerRow[] | null)?.map(mapPlayerRowToPlayer) ?? [];
    },

    async upsert(player: Player) {
      const row = mapPlayerToRow(player);
      const { error } = await client.from('players').upsert(row);
      if (error) {
        throw new Error(error.message);
      }
    },

    async delete(id: string) {
      const { error } = await client.from('players').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
      return true;
    },
  },

  queue: {
    async get(gameId: string): Promise<QueueState | null> {
      const { data, error } = await client
        .from('queue_state')
        .select('*')
        .eq('game_id', gameId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      return data ? mapQueueRowToQueueState(data as QueueRow) : null;
    },

    async update(gameId: string, state: QueueState) {
      const row = mapQueueStateToRow(state);
      const { error } = await client.from('queue_state').upsert(row, {
        onConflict: 'game_id',
      } as any);

      if (error) {
        throw new Error(error.message);
      }
    },
  },
};
