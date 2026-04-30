
export type GameStatus = 'configurando' | 'aguardando_sorteio' | 'em_jogo' | 'finalizado';

export interface GameSettings {
  matchTime: number; // minutos
  pixKey?: string;       // chave pix do admin
  pixName?: string;      // nome do recebedor
  pixAmount?: number;    // valor da pelada
  locationName?: string; // nome do local
  locationUrl?: string;  // link google maps
}

export interface TimerState {
  isRunning: boolean;
  startTime: number | null; // Timestamp
  remainingSeconds: number;
}

export interface Player {
  id: string;
  name: string;
  isConfirmed: boolean;
  isGoalkeeper: boolean;
  isPaid: boolean;
  gameId: string;
}

export interface Game {
  id: string;
  name: string;
  joinCode: string;
  status: GameStatus;
  adminId: string;
  settings: GameSettings;
  timerState: TimerState;
  scoreA: number;
  scoreB: number;
}

export interface QueueState {
  gameId: string;
  teamA: string[]; // IDs de jogadores
  teamB: string[]; // IDs de jogadores
  nextBlock: string[]; // Próximos 4 (NEXT4)
  reQueue: string[]; // Fila de espera (RE)
}

export interface MatchHistory {
  id?: string;
  gameId: string;
  scoreA: number;
  scoreB: number;
  winner: 'A' | 'B' | 'Empate';
  playersA: string[];
  playersB: string[];
  createdAt?: string;
}
