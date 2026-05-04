import { Player, QueueState, GameSettings } from '../types';

export const TeamLogic = {
  shuffle<T>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  },

  /** Retorna quantos GK e linha são necessários para sortear */
  getRequirements(settings: GameSettings) {
    const playersPerTeam = settings.playersPerTeam ?? 5;
    const gkPerTeam      = settings.gkPerTeam ?? 1;
    const fieldPerTeam   = playersPerTeam - gkPerTeam;
    return {
      minGK:    gkPerTeam * 2,
      minField: fieldPerTeam * 2,
      playersPerTeam,
      gkPerTeam,
      fieldPerTeam,
    };
  },

  initialDraw(players: Player[], settings: GameSettings): QueueState | null {
    const { minGK, minField, gkPerTeam, fieldPerTeam } = this.getRequirements(settings);

    const confirmed    = players.filter(p => p.isConfirmed);
    const goalkeepers  = confirmed.filter(p => p.isGoalkeeper);
    const fieldPlayers = confirmed.filter(p => !p.isGoalkeeper);

    if (goalkeepers.length < minGK || fieldPlayers.length < minField) {
      return null;
    }

    const shuffledField = this.shuffle(fieldPlayers.map(p => p.id));
    const shuffledGK    = this.shuffle(goalkeepers.map(p => p.id));

    // Monta os times com a quantidade configurada
    const teamAGK    = shuffledGK.slice(0, gkPerTeam);
    const teamBGK    = shuffledGK.slice(gkPerTeam, gkPerTeam * 2);
    const teamAField = shuffledField.slice(0, fieldPerTeam);
    const teamBField = shuffledField.slice(fieldPerTeam, fieldPerTeam * 2);

    const teamA = [...teamAGK, ...teamAField];
    const teamB = [...teamBGK, ...teamBField];

    // Next block = próximos fieldPerTeam jogadores de linha
    const nextBlock = shuffledField.slice(fieldPerTeam * 2, fieldPerTeam * 3);

    // RE = restantes
    const reQueue = [
      ...shuffledGK.slice(gkPerTeam * 2),
      ...shuffledField.slice(fieldPerTeam * 3),
    ];

    return {
      gameId: players[0].gameId,
      teamA,
      teamB,
      nextBlock,
      reQueue,
    };
  },

  processMatchResult(
    currentState: QueueState,
    winner: 'A' | 'B' | 'Empate',
    settings: GameSettings
  ): QueueState {
    const { teamA, teamB, nextBlock, reQueue } = currentState;
    const { gkPerTeam, fieldPerTeam } = this.getRequirements(settings);

    let actualWinner: 'A' | 'B';
    if (winner === 'Empate') {
      actualWinner = Math.random() > 0.5 ? 'A' : 'B';
    } else {
      actualWinner = winner;
    }

    const winningTeam = actualWinner === 'A' ? teamA : teamB;
    const losingTeam  = actualWinner === 'A' ? teamB : teamA;

    // GKs do perdedor ficam no time desafiante
    const losingGKs   = losingTeam.slice(0, gkPerTeam);
    const losingField = losingTeam.slice(gkPerTeam);

    const newReQueue = [...reQueue, ...losingField];

    // Monta o novo desafiante: GKs do perdedor + fieldPerTeam do nextBlock
    let newChallengerField = [...nextBlock.slice(0, fieldPerTeam)];

    // Reciclagem se nextBlock não tiver jogadores suficientes
    if (newChallengerField.length < fieldPerTeam) {
      const needed   = fieldPerTeam - newChallengerField.length;
      const recycled = this.shuffle(losingField).slice(0, needed);
      newChallengerField = [...newChallengerField, ...recycled];
    }

    const nextNextBlock  = newReQueue.slice(0, fieldPerTeam);
    const updatedReQueue = newReQueue.slice(fieldPerTeam);

    const finalChallenger = [...losingGKs, ...newChallengerField];

    return {
      ...currentState,
      teamA: actualWinner === 'A' ? winningTeam : finalChallenger,
      teamB: actualWinner === 'A' ? finalChallenger : winningTeam,
      nextBlock: nextNextBlock,
      reQueue: updatedReQueue,
    };
  },
};
