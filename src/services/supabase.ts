import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Game, Player, QueueState } from '../types';
import { Database } from '../types/database.types';

// -----------------------------------------------------------------------------
// Configuração do cliente Supabase (real, sem mocks)
// -----------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // Em desenvolvimento isso ajuda a detectar falta de configuração.
  // Em produção (Vercel) esses valores vêm das variáveis já configuradas.
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não definidas. ' +
    'Configure no .env.local (dev) e na Vercel (production).'
  );
}

const client = createClient<Database>(
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

type Tables = Database['public']['Tables'];
type GameRow = Tables['games']['Row'];
type GameInsert = Tables['games']['Insert'];
type PlayerRow = Tables['players']['Row'];
type PlayerInsert = Tables['players']['Insert'];
type QueueRow = Tables['queue_state']['Row'];
type QueueInsert = Tables['queue_state']['Insert'];

const mapGameRowToGame = (row: GameRow): Game => {
  const settings = (row.settings as any as Game['settings']) || { matchTime: 10 };
  const timerState =
    (row.timer_state as any as Game['timerState']) ||
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

const mapGameToInsert = (game: Game): GameInsert => {
  return {
    id: game.id,
    name: game.name,
    join_code: game.joinCode,
    status: game.status,
    admin_id: game.adminId,
    settings: game.settings as any,
    timer_state: game.timerState as any,
    score_a: game.scoreA,
    score_b: game.scoreB,
  };
};

const mapPlayerRowToPlayer = (row: PlayerRow): Player => ({
  id: row.id,
  name: row.name,
  isConfirmed: row.is_confirmed,
  isGoalkeeper: row.is_goalkeeper,
  gameId: row.game_id,
});

const mapPlayerToInsert = (player: Player): PlayerInsert => ({
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

const mapQueueStateToInsert = (state: QueueState): QueueInsert => ({
  game_id: state.gameId,
  team_a: state.teamA,
  team_b: state.teamB,
  next_block: state.nextBlock,
  re_queue: state.reQueue,
});

const mapGameToUpdate = (game: Partial<Game>): Database['public']['Tables']['games']['Update'] => {
  const out: Database['public']['Tables']['games']['Update'] = {};
  if (game.id !== undefined) out.id = game.id;
  if (game.name !== undefined) out.name = game.name;
  if (game.joinCode !== undefined) out.join_code = game.joinCode;
  if (game.status !== undefined) out.status = game.status;
  if (game.adminId !== undefined) out.admin_id = game.adminId;
  if (game.settings !== undefined) out.settings = game.settings as any;
  if (game.timerState !== undefined) out.timer_state = game.timerState as any;
  if (game.scoreA !== undefined) out.score_a = game.scoreA;
  if (game.scoreB !== undefined) out.score_b = game.scoreB;
  return out;
};

// -----------------------------------------------------------------------------
// API que o App consome (mesma interface anterior, porém apontando para Supabase)
// -----------------------------------------------------------------------------

const SESSION_KEY = 'football_manager_session';

export const supabase = {
  auth: {
    async signUp(email: string, pass: string) {
      const { data, error } = await client.auth.signUp({
        email: String(email),
        password: String(pass),
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
        email: String(email),
        password: String(pass),
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
      const row = mapGameToInsert(game);
      const { data, error } = await client
        .from('games')
        .insert(row as any)
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
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data as GameRow[] | null)?.map(mapGameRowToGame) ?? [];
    },

    async update(id: string, updates: Partial<Game>) {
      const rowUpdates = mapGameToUpdate(updates);
      const { error } = await client
        .from('games')
        .update(rowUpdates as any)
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
      const row = mapPlayerToInsert(player);
      const { error } = await client.from('players').upsert(row as any);
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
      const row = mapQueueStateToInsert(state);
      const { error } = await client.from('queue_state').upsert(row as any, {
        onConflict: 'game_id',
      } as any);

      if (error) {
        throw new Error(error.message);
      }
    },
  },
};
