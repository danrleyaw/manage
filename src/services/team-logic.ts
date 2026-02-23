
import { Player, QueueState } from '../types';

export const TeamLogic = {
  shuffle<T,>(array: T[]): T[] {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  },

  initialDraw(players: Player[]): QueueState | null {
    const confirmed = players.filter(p => p.isConfirmed);
    const goalkeepers = confirmed.filter(p => p.isGoalkeeper);
    const fieldPlayers = confirmed.filter(p => !p.isGoalkeeper);

    if (goalkeepers.length < 2 || fieldPlayers.length < 8) {
      return null; // Mínimo 2 goleiros e 8 de linha (10 jogadores totais para 2 times de 5)
    }

    const shuffledField = this.shuffle(fieldPlayers.map(p => p.id));
    const shuffledGK = this.shuffle(goalkeepers.map(p => p.id));

    const teamA = [shuffledGK[0], ...shuffledField.slice(0, 4)];
    const teamB = [shuffledGK[1], ...shuffledField.slice(4, 8)];
    const nextBlock = shuffledField.slice(8, 12);
    const reQueue = [...shuffledGK.slice(2), ...shuffledField.slice(12)];

    return {
      gameId: players[0].gameId,
      teamA,
      teamB,
      nextBlock,
      reQueue
    };
  },

  processMatchResult(
    currentState: QueueState, 
    winner: 'A' | 'B' | 'Empate'
  ): QueueState {
    const { teamA, teamB, nextBlock, reQueue } = currentState;
    
    let actualWinner: 'A' | 'B';
    if (winner === 'Empate') {
      actualWinner = Math.random() > 0.5 ? 'A' : 'B';
    } else {
      actualWinner = winner;
    }

    const winningTeam = actualWinner === 'A' ? teamA : teamB;
    const losingTeam = actualWinner === 'A' ? teamB : teamA;

    // O Goleiro perdedor permanece no time desafiante (conforme regra do prompt: "O Goleiro do perdedor permanece no time")
    // O Perdedor (linha) vai para o final da re_queue
    const losingGK = losingTeam[0];
    const losingField = losingTeam.slice(1);

    const newReQueue = [...reQueue, ...losingField];
    
    // Entrada do Desafiante: Goleiro que ficou + 4 do next_block
    let newChallengerField = [...nextBlock];
    let remainingFromNextBlock: string[] = [];

    // Lógica de Reciclagem (Crítico)
    if (newChallengerField.length < 4) {
      const needed = 4 - newChallengerField.length;
      const recycled = this.shuffle(losingField).slice(0, needed);
      newChallengerField = [...newChallengerField, ...recycled];
    }

    // Preparar o próximo next_block pegando os 4 primeiros da re_queue
    const nextNextBlock = newReQueue.slice(0, 4);
    const updatedReQueue = newReQueue.slice(4);

    const finalWinnerTeam = winningTeam;
    const finalChallengerTeam = [losingGK, ...newChallengerField];

    return {
      ...currentState,
      teamA: actualWinner === 'A' ? finalWinnerTeam : finalChallengerTeam,
      teamB: actualWinner === 'A' ? finalChallengerTeam : finalWinnerTeam,
      nextBlock: nextNextBlock,
      reQueue: updatedReQueue
    };
  }
};
