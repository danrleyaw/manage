import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Game, Player, QueueState, MatchHistory } from '../types';
import { Database } from '../types/database.types';

// -----------------------------------------------------------------------------
// Configuração do cliente Supabase
// -----------------------------------------------------------------------------

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '[supabase] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY não definidas. ' +
    'Configure no .env.local (dev) e na Vercel (production).'
  );
}

export const supabaseClient = createClient<Database>(
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
  isPaid: row.is_paid ?? false,
  gameId: row.game_id,
});

const mapPlayerToInsert = (player: Player): PlayerInsert => ({
  id: player.id,
  name: player.name,
  is_confirmed: player.isConfirmed,
  is_goalkeeper: player.isGoalkeeper,
  is_paid: player.isPaid ?? false,
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
// API que o App consome
// -----------------------------------------------------------------------------

export const supabase = {
  auth: {
    async signUp(email: string, pass: string) {
      const { data, error } = await supabaseClient.auth.signUp({
        email: String(email),
        password: String(pass),
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Falha ao registrar usuário');
      }
      return { user: { id: data.user.id, email: data.user.email || email } };
    },

    async signIn(email: string, pass: string) {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: String(email),
        password: String(pass),
      });
      if (error || !data.user) {
        throw new Error(error?.message || 'Credenciais inválidas');
      }
      return { user: { id: data.user.id, email: data.user.email || email } };
    },

    async signOut() {
      await supabaseClient.auth.signOut();
    },

    // Retorna a sessão atual de forma assíncrona (fonte de verdade: Supabase)
    async getSession(): Promise<{ id: string; email?: string } | null> {
      const { data } = await supabaseClient.auth.getSession();
      if (!data.session?.user) return null;
      return {
        id: data.session.user.id,
        email: data.session.user.email,
      };
    },
  },

  games: {
    async create(game: Game): Promise<Game> {
      const row = mapGameToInsert(game);
      const { data, error } = await supabaseClient
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
      let { data, error } = await supabaseClient
        .from('games')
        .select('*')
        .eq('join_code', idOrCode)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw new Error(error.message);
      }

      if (!data) {
        const res = await supabaseClient
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
      const { data, error } = await supabaseClient
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
      const { error } = await supabaseClient
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
      const { data, error } = await supabaseClient
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
      const { error } = await supabaseClient.from('players').upsert(row as any);
      if (error) {
        throw new Error(error.message);
      }
    },

    async delete(id: string) {
      const { error } = await supabaseClient.from('players').delete().eq('id', id);
      if (error) {
        throw new Error(error.message);
      }
      return true;
    },
  },

  queue: {
    async get(gameId: string): Promise<QueueState | null> {
      const { data, error } = await supabaseClient
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
      const { error } = await supabaseClient.from('queue_state').upsert(row as any, {
        onConflict: 'game_id',
      } as any);

      if (error) {
        throw new Error(error.message);
      }
    },
  },

  history: {
    async create(entry: MatchHistory) {
      const { error } = await supabaseClient.from('match_history').insert({
        game_id: entry.gameId,
        score_a: entry.scoreA,
        score_b: entry.scoreB,
        winner: entry.winner,
        team_a_players: entry.playersA,
        team_b_players: entry.playersB,
      } as any);

      if (error) throw new Error(error.message);
    },

    async getByGame(gameId: string): Promise<MatchHistory[]> {
      const { data, error } = await supabaseClient
        .from('match_history')
        .select('*')
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

      if (error) throw new Error(error.message);

      return (data || []).map((row: any) => ({
        id: row.id,
        gameId: row.game_id,
        scoreA: row.score_a,
        scoreB: row.score_b,
        winner: row.winner,
        playersA: row.team_a_players,
        playersB: row.team_b_players,
        createdAt: row.created_at,
      }));
    },
  },
};
