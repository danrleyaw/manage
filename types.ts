
export type GameStatus = 'configurando' | 'aguardando_sorteio' | 'em_jogo' | 'finalizado';

export interface GameSettings {
  matchTime: number; // minutos
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
