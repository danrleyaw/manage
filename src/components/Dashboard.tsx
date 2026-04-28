// Fut Manager - Dashboard
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Users, ChevronRight, User,
  ShieldCheck, LogOut, Share2,
  Shield, UserCheck,
  Sparkles, Zap, Settings, UserCircle, ShieldAlert,
  ChevronLeft,
  ArrowRight, Trash2, Clock, Minus, Copy, MessageCircle, X,
  Layers, CheckCircle2, AlertCircle
} from 'lucide-react';
import { Game, Player, QueueState, MatchHistory } from '../types';
import { supabase, supabaseClient } from '../services/supabase';
import { TeamLogic } from '../services/team-logic';
import { MatchTimer } from './MatchTimer';
import { BrandLogo } from './Layout/BrandLogo';
import { TeamCard } from './Teams/TeamCard';


const Dashboard: React.FC = () => {
  const [view, setView] = useState<'auth' | 'dashboard' | 'admin' | 'player' | 'join' | 'create_game'>('auth');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [adminGames, setAdminGames] = useState<Game[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showGoalAnim, setShowGoalAnim] = useState<'A' | 'B' | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [adminAddPlayerName, setAdminAddPlayerName] = useState('');
  const [gameNameInput, setGameNameInput] = useState('');
  const [selectedPosition, setSelectedPosition] = useState<'linha' | 'goleiro'>('linha');

  const isCurrentGameAdmin = useMemo(() => user?.id === currentGame?.adminId, [user?.id, currentGame?.adminId]);

  const guestPlayerId = useMemo(() => {
    if (!currentGame) return null;
    let id = localStorage.getItem(`player_id_${currentGame.id}`);
    if (!id) {
      id = Math.random().toString(36).substring(7);
      localStorage.setItem(`player_id_${currentGame.id}`, id);
    }
    return id;
  }, [currentGame]);

  const guestPlayer = useMemo(() => {
    return players.find(p => p.id === guestPlayerId);
  }, [players, guestPlayerId]);

  const confirmedPlayers = useMemo(() => players.filter(p => p.isConfirmed), [players]);
  const confirmedGK = useMemo(() => players.filter(p => p.isConfirmed && p.isGoalkeeper), [players]);
  const confirmedField = useMemo(() => players.filter(p => p.isConfirmed && !p.isGoalkeeper), [players]);

  useEffect(() => {
    const init = async () => {
      const sessionUser = await supabase.auth.getSession();
      const code = new URLSearchParams(window.location.search).get('code');
      if (sessionUser) {
        setUser(sessionUser);
        await loadAdminGames(sessionUser.id);
        if (code) await joinGame(code);
        else setView('dashboard');
      } else {
        if (code) await joinGame(code);
      }
      setIsInitializing(false);
    };
    init();
  }, []);

  // --- REALTIME SYNC (ESTADO VIVO) ---
  useEffect(() => {
    if (!currentGame?.id) return;

    const channel = supabaseClient
      .channel(`game_sync_${currentGame.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'games', filter: `id=eq.${currentGame.id}` }, 
        async (payload: any) => {
          // Re-busca os dados para garantir consistência com o mapeamento
          const updated = await supabase.games.get(currentGame.joinCode);
          if (updated) setCurrentGame(updated);
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'players', filter: `game_id=eq.${currentGame.id}` }, 
        async () => {
          const fresh = await supabase.players.getByGame(currentGame.id);
          setPlayers(fresh);
        }
      )
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'queue_state', filter: `game_id=eq.${currentGame.id}` }, 
        async () => {
          const fresh = await supabase.queue.get(currentGame.id);
          setQueue(fresh);
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [currentGame?.id, currentGame?.joinCode]);

  // --- GOAL ANIMATION TRIGGER ---
  const prevScores = useRef({ a: currentGame?.scoreA || 0, b: currentGame?.scoreB || 0 });
  useEffect(() => {
    if (!currentGame) return;
    
    if (currentGame.scoreA > prevScores.current.a) {
      setShowGoalAnim('A');
      setTimeout(() => setShowGoalAnim(null), 2500);
    } else if (currentGame.scoreB > prevScores.current.b) {
      setShowGoalAnim('B');
      setTimeout(() => setShowGoalAnim(null), 2500);
    }
    
    prevScores.current = { a: currentGame.scoreA, b: currentGame.scoreB };
  }, [currentGame?.scoreA, currentGame?.scoreB]);

  const loadAdminGames = async (uid: string) => setAdminGames(await supabase.games.getByAdmin(uid));

  const [authError, setAuthError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      const response = authMode === 'login'
        ? await supabase.auth.signIn(email, password)
        : await supabase.auth.signUp(email, password);

      if (response && response.user) {
        setUser(response.user);
        await loadAdminGames(response.user.id);
        setView('dashboard');
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      if (err.status === 429) {
        setAuthError("Muitas tentativas. Aguarde um momento.");
      } else if (err.message.includes("Invalid login")) {
        setAuthError("Email ou senha inválidos.");
      } else if (err.message.includes("User already registered")) {
        setAuthError("Este email já está cadastrado.");
      } else {
        setAuthError(err.message || "Erro ao conectar.");
      }
    }
  };

  const joinGame = async (code: string) => {
    const game = await supabase.games.get(code.toUpperCase());
    if (!game) return alert("Código Inválido.");
    setCurrentGame(game);
    const playerList = await supabase.players.getByGame(game.id);
    setPlayers(playerList);
    setQueue(await supabase.queue.get(game.id));

    const sessionUser = await supabase.auth.getSession();
    setView(sessionUser?.id === game.adminId ? 'admin' : 'player');

    const localName = localStorage.getItem(`player_name_${game.id}`);
    if (localName) setNewPlayerName(localName);
  };

  const finalizeCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gameNameInput.trim()) return;
    const newGame: Game = {
      id: Math.random().toString(36).substring(7),
      name: gameNameInput.toUpperCase(),
      joinCode: Math.random().toString(36).substring(2, 7).toUpperCase(),
      status: 'configurando',
      adminId: user.id,
      settings: { matchTime: 10 },
      timerState: { isRunning: false, startTime: null, remainingSeconds: 600 },
      scoreA: 0, scoreB: 0
    };
    await supabase.games.create(newGame);
    await loadAdminGames(user.id);
    await joinGame(newGame.joinCode);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setCurrentGame(null);
    setView('auth');
  };

  const updateScore = async (team: 'A' | 'B', delta: number) => {
    if (!currentGame) return;
    const field = team === 'A' ? 'scoreA' : 'scoreB';
    const currentVal = (currentGame[field as keyof Game] as number) || 0;
    const newVal = Math.max(0, currentVal + delta);
    const updated = { ...currentGame, [field]: newVal };
    setCurrentGame(updated);
    await supabase.games.update(currentGame.id, { [field]: newVal });
  };

  const updateMatchTime = async (minutes: number) => {
    if (!currentGame) return;
    const safeMinutes = Math.max(1, minutes);
    const updated = {
      ...currentGame,
      settings: { ...currentGame.settings, matchTime: safeMinutes },
      timerState: { ...currentGame.timerState, remainingSeconds: safeMinutes * 60 }
    };
    setCurrentGame(updated);
    await supabase.games.update(currentGame.id, {
      settings: updated.settings,
      timerState: updated.timerState
    });
  };

  const handleEndMatch = async (winner: 'A' | 'B' | 'Empate') => {
    if (!queue || !currentGame) return;
    const nextState = TeamLogic.processMatchResult(queue, winner);
    const resetTime = currentGame.settings.matchTime * 60;
    const updates: Partial<Game> = {
      scoreA: 0,
      scoreB: 0,
      timerState: { isRunning: false, startTime: null, remainingSeconds: resetTime }
    };
    
    // Salvar histórico de forma assíncrona
    supabase.history.create({
      gameId: currentGame.id,
      scoreA: currentGame.scoreA,
      scoreB: currentGame.scoreB,
      winner,
      playersA: queue.teamA,
      playersB: queue.teamB
    }).catch(console.error);

    await Promise.all([
      supabase.queue.update(currentGame.id, nextState),
      supabase.games.update(currentGame.id, updates)
    ]);
    setQueue(nextState);
    setCurrentGame(prev => prev ? { ...prev, ...updates } : null);
  };

  const startDraw = async () => {
    if (!currentGame) return;
    const initial = TeamLogic.initialDraw(players);
    if (!initial) return alert("Requisitos: 2 Goleiros e 8 Linha Confirmados.");
    await supabase.queue.update(currentGame.id, initial);
    await supabase.games.update(currentGame.id, { status: 'em_jogo' });
    setQueue(initial);
    setCurrentGame({ ...currentGame, status: 'em_jogo' });
  };

  const togglePresence = async () => {
    if (!currentGame || !newPlayerName.trim() || !guestPlayerId) return;

    localStorage.setItem(`player_name_${currentGame.id}`, newPlayerName.toUpperCase());

    if (guestPlayer?.isConfirmed) {
      await supabase.players.delete(guestPlayerId);
    } else {
      await supabase.players.upsert({
        id: guestPlayerId,
        name: newPlayerName.toUpperCase(),
        isConfirmed: true,
        isGoalkeeper: selectedPosition === 'goleiro',
        gameId: currentGame.id
      });
    }

    setPlayers(await supabase.players.getByGame(currentGame.id));
  };

  const adminAddPlayer = async () => {
    if (!currentGame || !adminAddPlayerName.trim()) return;
    const pId = Math.random().toString(36).substring(7);
    await supabase.players.upsert({
      id: pId,
      name: adminAddPlayerName.toUpperCase(),
      isConfirmed: true,
      isGoalkeeper: false,
      gameId: currentGame.id
    });
    setAdminAddPlayerName('');
    setPlayers(await supabase.players.getByGame(currentGame.id));
  };

  const toggleConfirm = async (p: Player) => {
    if (!currentGame) return;
    await supabase.players.upsert({ ...p, isConfirmed: !p.isConfirmed });
    setPlayers(await supabase.players.getByGame(currentGame.id));
  };

  const toggleGK = async (p: Player) => {
    if (!currentGame) return;
    await supabase.players.upsert({ ...p, isGoalkeeper: !p.isGoalkeeper });
    setPlayers(await supabase.players.getByGame(currentGame.id));
  };

  const removePlayer = async (id: string) => {
    const gid = currentGame?.id;
    if (!gid) return;

    if (!window.confirm("Excluir definitivamente este atleta?")) return;

    try {
      await supabase.players.delete(id);

      if (queue) {
        const cleanQueue = {
          ...queue,
          teamA: queue.teamA.filter(pid => pid !== id),
          teamB: queue.teamB.filter(pid => pid !== id),
          nextBlock: queue.nextBlock.filter(pid => pid !== id),
          reQueue: queue.reQueue.filter(pid => pid !== id)
        };
        await supabase.queue.update(gid, cleanQueue);
        setQueue(cleanQueue);
      }

      const fresh = await supabase.players.getByGame(gid);
      setPlayers([...fresh]);
    } catch (e) {
      console.error(e);
      alert("Falha na exclusão.");
    }
  };

  // --- LÓGICA DE COMPARTILHAMENTO ---
  const shareLink = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}?code=${currentGame?.joinCode}`;
  }, [currentGame?.joinCode]);

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Fala atleta! Participe da pelada na arena ${currentGame?.name}. Entre no link e coloque seu nome na lista: ${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    setShowShareModal(false);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareLink);
    alert("Link copiado para a área de transferência!");
    setShowShareModal(false);
  };

  // Helper para atualizar cronômetro
  const handleUpdateGame = useCallback((updates: Partial<Game>) => {
    if (!currentGame) return;
    setCurrentGame(prev => prev ? { ...prev, ...updates } : null);
    supabase.games.update(currentGame.id, updates);
  }, [currentGame]);

  // Função para agrupar RE em blocos de 4
  const groupedReQueue = useMemo(() => {
    if (!queue?.reQueue) return [];
    const chunks = [];
    for (let i = 0; i < queue.reQueue.length; i += 4) {
      chunks.push(queue.reQueue.slice(i, i + 4));
    }
    return chunks;
  }, [queue?.reQueue]);

  // --- RENDERS ---

  if (isInitializing) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Carregando...</p>
      </div>
    </div>
  );

  if (view === 'auth') return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6 relative">
      <div className="absolute top-0 left-0 w-full h-[35vh] bg-slate-100 border-b-2 border-slate-200 flex items-center justify-center">
        <div className="opacity-[0.05] select-none text-[22vw] font-heading font-black italic absolute tracking-tighter text-slate-900">ELITE</div>
      </div>

      <div className="w-full max-w-[360px] relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <BrandLogo size={130} className="mb-14" />

        <div className="space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-heading italic font-black text-slate-900 uppercase tracking-tight">{authMode === 'login' ? 'The Game Awaits' : 'Join the Ranks'}</h2>
            <p className="text-[12px] text-slate-500 font-black uppercase tracking-[0.2em]">Controle Profissional</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-6 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-sm"
              placeholder="E-MAIL"
              required
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 border-2 border-slate-200 py-4 px-6 rounded-2xl text-sm font-bold focus:bg-white focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-sm"
              placeholder="SENHA"
              required
            />
            {authError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} />
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-slate-900 text-white font-black italic uppercase tracking-wider py-4 rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? 'Autenticar' : 'Registrar'} <ChevronRight size={16} />
            </button>
          </form>

          <div className="flex flex-col gap-4 pt-4">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-slate-600 font-black text-[11px] uppercase tracking-widest hover:text-blue-600 transition-colors"
            >
              {authMode === 'login' ? 'Ainda não possui conta?' : 'Já possui conta?'}
            </button>
            <button
              onClick={() => setView('join')}
              className="flex items-center justify-center gap-3 text-blue-700 font-black uppercase text-[11px] tracking-[0.2em] transition-opacity hover:opacity-70 bg-blue-50 py-3 rounded-xl border border-blue-100"
            >
              <Zap size={16} className="fill-current" /> Entrar como convidado
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'dashboard') return (
    <div className="min-h-screen p-6 bg-white">
      <div className="max-w-xl mx-auto space-y-10 animate-in fade-in duration-1000">
        <div className="flex items-center justify-between border-b-2 border-slate-100 pb-6">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 border-2 border-slate-200 shadow-sm"><User size={22} /></div>
            <div>
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-[0.3em] mb-1 italic">COMANDANTE</p>
              <h2 className="text-xl font-heading italic text-slate-900 leading-none tracking-tighter uppercase">{user?.email?.split('@')[0]}</h2>
            </div>
          </div>
          <button onClick={handleLogout} className="p-3 text-slate-400 hover:text-red-500 transition-colors bg-slate-50 rounded-xl hover:bg-red-50"><LogOut size={20} /></button>
        </div>

        <div className="space-y-6">
          <button onClick={() => setView('create_game')} className="w-full group bg-slate-900 hover:bg-blue-600 py-5 px-8 rounded-2xl flex items-center justify-between text-white transition-all duration-500 active:scale-[0.98] shadow-2xl shadow-slate-900/20 border-2 border-slate-800">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform"><Plus size={20} strokeWidth={4} /></div>
              <span className="text-xs font-heading italic uppercase tracking-widest">Nova Arena</span>
            </div>
            <ArrowRight size={20} className="opacity-60 group-hover:translate-x-2 transition-transform" />
          </button>

          <div className="bg-white rounded-3xl p-8 border-2 border-slate-100 flex flex-col space-y-6 shadow-sm">
            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] italic">Minhas Arenas</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar pr-2">
              {adminGames.length === 0 ? (
                <div className="py-14 text-center text-slate-400 italic font-black text-[11px] uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-2xl">Nenhuma Arena Encontrada</div>
              ) : (
                adminGames.map(g => (
                  <button key={g.id} onClick={() => joinGame(g.joinCode)} className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 rounded-2xl border-2 border-slate-200 transition-all group shadow-sm">
                    <div className="text-left">
                      <p className="font-heading italic text-slate-900 uppercase text-sm tracking-tight mb-1">{g.name}</p>
                      <span className="text-[10px] font-mono text-blue-700 font-black tracking-widest bg-blue-100 px-3 py-1 rounded-full">{g.joinCode}</span>
                    </div>
                    <ChevronRight size={20} className="text-slate-400 group-hover:text-blue-600 transition-all" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'join') return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 text-slate-900 relative">
      <div className="w-full max-w-[340px] space-y-12 animate-in fade-in duration-700">
        <button onClick={() => setView('auth')} className="flex items-center gap-3 text-slate-600 hover:text-slate-900 transition-all font-black uppercase text-[10px] tracking-[0.3em] bg-slate-100 px-4 py-2 rounded-full"><ChevronLeft size={18} /> VOLTAR</button>
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-heading italic uppercase tracking-tighter leading-none">CÓDIGO DA <span className="text-blue-600">ARENA</span></h2>
        </div>
        <input type="text" value={joinCodeInput} onChange={e => setJoinCodeInput(e.target.value.toUpperCase())} placeholder="XXXXX" className="w-full bg-slate-50 border-4 border-slate-200 p-8 rounded-3xl text-5xl font-heading italic text-center tracking-[0.2em] outline-none focus:border-blue-600 focus:bg-white transition-all uppercase placeholder:text-slate-200 shadow-inner text-slate-900" />
        <button onClick={() => joinGame(joinCodeInput)} className="w-full bg-slate-900 hover:bg-blue-600 py-5 rounded-2xl font-heading italic uppercase tracking-widest text-white active:scale-95 transition-all text-base shadow-2xl">CONECTAR</button>
      </div>
    </div>
  );

  if (view === 'create_game') return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-[360px] space-y-10 animate-in fade-in duration-700">
        <div className="flex items-center gap-3 text-blue-700 font-black uppercase text-[10px] tracking-[0.4em] italic bg-blue-50 px-5 py-2 rounded-full border border-blue-100 w-fit"><Settings size={18} /> Configuração</div>
        <form onSubmit={finalizeCreateGame} className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2">Título da Arena</label>
            <input type="text" value={gameNameInput} onChange={e => setGameNameInput(e.target.value)} placeholder="EX: ARENA ELITE" className="w-full bg-slate-50 border-2 border-slate-200 p-5 rounded-2xl font-heading italic text-base outline-none focus:border-blue-600 focus:bg-white transition-all uppercase text-slate-900 shadow-sm" required />
          </div>
          <div className="flex gap-4">
            <button type="button" onClick={() => setView('dashboard')} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 border border-slate-200 shadow-sm">CANCELAR</button>
            <button type="submit" className="flex-[2] py-4 bg-slate-900 rounded-2xl font-heading italic text-sm uppercase tracking-widest text-white shadow-xl">CRIAR AGORA</button>
          </div>
        </form>
      </div>
    </div>
  );

  // --- GAMEPLAY VIEW ---
  return (
    <div className="min-h-screen bg-white pb-24">
      {isCurrentGameAdmin && view === 'admin' && (
        <div className="bg-slate-900 text-white py-2 px-6 flex items-center justify-center gap-4 sticky top-0 z-[100] border-b-2 border-white/10 shadow-xl">
          <ShieldAlert size={14} className="text-blue-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] italic">ADMIN MODE ACTIVE</span>
        </div>
      )}

      {/* MODAL DE COMPARTILHAMENTO */}
      {showShareModal && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowShareModal(false)}></div>
          <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] animate-in slide-in-from-bottom-12 duration-500 border-2 border-slate-100">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-base font-heading italic font-black text-slate-900 uppercase tracking-widest">Compartilhar Arena</h3>
              <button onClick={() => setShowShareModal(false)} className="p-3 hover:bg-slate-100 rounded-full transition-colors text-slate-400 bg-slate-50"><X size={24} /></button>
            </div>

            <div className="space-y-5">
              <button
                onClick={handleShareWhatsApp}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-6 rounded-[1.5rem] flex items-center justify-center gap-5 transition-all active:scale-[0.98] group shadow-xl"
              >
                <MessageCircle size={28} className="group-hover:scale-110 transition-transform" />
                <span className="font-heading italic uppercase text-sm tracking-widest">Enviar WhatsApp</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="w-full bg-slate-900 hover:bg-blue-600 text-white py-6 rounded-[1.5rem] flex items-center justify-center gap-5 transition-all active:scale-[0.98] group shadow-xl"
              >
                <Copy size={24} className="group-hover:scale-110 transition-transform" />
                <span className="font-heading italic uppercase text-sm tracking-widest">Copiar Link</span>
              </button>
            </div>

            <p className="mt-10 text-center text-[12px] text-slate-500 font-black uppercase tracking-[0.2em] italic">
              O link enviará o convidado para esta página.
            </p>
          </div>
        </div>
      )}

      {/* ANIMAÇÃO DE GOL */}
      {showGoalAnim && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none p-4">
          <div className={`animate-goal ${showGoalAnim === 'A' ? 'bg-blue-600' : 'bg-orange-600'} text-white px-10 py-8 md:px-20 md:py-12 rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.3)] text-center border-4 border-white/20 backdrop-blur-sm`}>
            <div className="text-7xl md:text-9xl font-heading italic font-black tracking-tighter leading-none mb-4">GOOOOOL!</div>
            <div className="text-sm md:text-2xl font-black uppercase tracking-[0.5em] opacity-80">
              TIME {showGoalAnim === 'A' ? 'ALPHA' : 'BETA'} MARCOU!
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-5 space-y-8 pt-8 animate-in fade-in duration-1000">
        <div className="flex items-center justify-between bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
          <button onClick={() => { setView(user ? 'dashboard' : 'auth'); setCurrentGame(null); }} className="flex items-center gap-3 text-slate-500 hover:text-slate-900 transition-all font-black group px-3">
            <ChevronLeft size={20} />
            <span className="text-[10px] uppercase tracking-[0.3em] italic">SAIR DA ARENA</span>
          </button>
          <div className="flex gap-3">
            <button onClick={() => setShowShareModal(true)} className="p-3 bg-white rounded-xl border-2 border-slate-200 text-slate-600 hover:text-blue-700 transition-all active:scale-90 shadow-sm"><Share2 size={20} /></button>
            {isCurrentGameAdmin && (
              <button onClick={() => setView(view === 'admin' ? 'player' : 'admin')} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.3em] shadow-lg hover:bg-blue-700 transition-all">
                {view === 'admin' ? 'PLAYER VIEW' : 'ADMIN PANEL'}
              </button>
            )}
          </div>
        </div>

        <div className="text-center space-y-4 py-4">
          <h2 className="text-3xl font-heading italic text-slate-900 uppercase tracking-tighter leading-none">{currentGame?.name}</h2>
          <div className="flex items-center justify-center gap-5">
            <div className="h-[2px] w-12 bg-slate-200"></div>
            <span className="text-lg text-blue-700 font-mono font-black tracking-[0.5em] bg-blue-50 px-5 py-1.5 rounded-full border border-blue-100 shadow-sm">{currentGame?.joinCode}</span>
            <div className="h-[2px] w-12 bg-slate-200"></div>
          </div>
          <div className="flex justify-center">
            <span className={`text-[10px] px-5 py-2 rounded-full font-black uppercase tracking-[0.3em] border-2 shadow-sm ${currentGame?.status === 'em_jogo' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
              {currentGame?.status === 'em_jogo' ? 'MATCH IN PROGRESS' : 'PRE-MATCH READY'}
            </span>
          </div>
        </div>

        {/* VISÃO DO CONVIDADO (PLAYER) - MINIMALISTA */}
        {view === 'player' && (
          <div className="space-y-16 py-14 animate-in slide-in-from-bottom-10 duration-700 flex flex-col items-center">
            <div className="w-full max-w-[340px] space-y-12">
              <div className="space-y-5">
                <div className="flex flex-col gap-2 px-3">
                  <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em] italic">Identificação</span>
                  <p className="text-[12px] text-slate-400 font-black uppercase tracking-widest">NOME NA LISTA</p>
                </div>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  placeholder="EX: RONALDO"
                  className="w-full p-8 rounded-[2rem] border-4 border-slate-200 bg-slate-50 font-heading italic text-center text-4xl uppercase focus:border-blue-600 focus:bg-white outline-none transition-all text-slate-900 shadow-xl placeholder:text-slate-200"
                />
              </div>

              <div className="flex flex-col items-center gap-12 pt-6">
                <div className="flex gap-4 p-2 bg-slate-100 rounded-full border-2 border-slate-200 shadow-inner">
                  <button onClick={() => setSelectedPosition('linha')} className={`px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all ${selectedPosition === 'linha' ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>LINHA</button>
                  <button onClick={() => setSelectedPosition('goleiro')} className={`px-8 py-3 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all ${selectedPosition === 'goleiro' ? 'bg-orange-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-800'}`}>GOLEIRO</button>
                </div>

                <div className="relative group">
                  <div className={`absolute inset-0 blur-[100px] opacity-40 transition-all duration-700 ${guestPlayer?.isConfirmed ? 'bg-emerald-400 scale-110' : 'bg-slate-300'}`}></div>
                  <button
                    onClick={togglePresence}
                    disabled={!newPlayerName.trim()}
                    className={`relative z-10 w-56 h-56 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.1)] active:scale-90 border-[10px] ${guestPlayer?.isConfirmed ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-300 border-slate-200 text-slate-500'} ${!newPlayerName.trim() ? 'opacity-40 grayscale cursor-not-allowed shadow-none' : 'cursor-pointer hover:scale-105'}`}
                  >
                    <span className="text-7xl font-heading italic font-black tracking-tighter">{guestPlayer?.isConfirmed ? 'ON' : 'OFF'}</span>
                    <span className="text-[12px] font-black uppercase tracking-[0.4em] mt-3 bg-black/10 px-4 py-1 rounded-full">
                      {guestPlayer?.isConfirmed ? 'CONFIRMADO' : 'PENDENTE'}
                    </span>
                  </button>
                </div>

                <p className="text-[13px] text-slate-500 font-black uppercase tracking-[0.1em] italic text-center max-w-[280px] leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                  {guestPlayer?.isConfirmed
                    ? 'VOCÊ JÁ ESTÁ NA ARENA! BOA SORTE ATLETA.'
                    : 'ATIVE O BOTÃO PARA CONFIRMAR SUA PRESENÇA.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VISÃO DO ADMINISTRADOR */}
        {view === 'admin' && currentGame?.status === 'em_jogo' && (
          <div className="space-y-12 pb-10">
            {currentGame && (
              <MatchTimer
                game={currentGame}
                isAdmin={true}
                onUpdate={handleUpdateGame}
              />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <TeamCard title="EQUIPE ALPHA" playerIds={queue?.teamA || []} color="border-blue-600" allPlayers={players} isMandante />
              <TeamCard title="EQUIPE BETA" playerIds={queue?.teamB || []} color="border-orange-600" allPlayers={players} />
            </div>

            <div className="bg-white p-10 rounded-[2.5rem] border-4 border-slate-100 shadow-2xl flex items-center justify-center gap-12">
              <div className="flex flex-col items-center gap-4">
                <span className="text-[11px] font-black uppercase text-blue-700 tracking-[0.4em] italic bg-blue-50 px-4 py-1 rounded-full">ALPHA</span>
                <span className="text-8xl font-heading italic text-slate-900 select-none tabular-nums font-black">{currentGame.scoreA}</span>
                <div className="flex gap-2">
                  <button onClick={() => updateScore('A', -1)} className="bg-slate-100 text-slate-900 w-12 h-10 rounded-xl font-black hover:bg-slate-200 transition-all border-2 border-slate-200 shadow-sm">-</button>
                  <button onClick={() => updateScore('A', 1)} className="bg-blue-600 text-white w-16 h-10 rounded-xl font-black shadow-xl active:scale-90 transition-all border-b-4 border-blue-800 text-lg">+</button>
                </div>
              </div>
              <div className="text-4xl font-heading italic text-slate-200 select-none font-black">X</div>
              <div className="flex flex-col items-center gap-4">
                <span className="text-[11px] font-black uppercase text-orange-700 tracking-[0.4em] italic bg-orange-50 px-4 py-1 rounded-full">BETA</span>
                <span className="text-8xl font-heading italic text-slate-900 select-none tabular-nums font-black">{currentGame.scoreB}</span>
                <div className="flex gap-2">
                  <button onClick={() => updateScore('B', -1)} className="bg-slate-100 text-slate-900 w-12 h-10 rounded-xl font-black hover:bg-slate-200 transition-all border-2 border-slate-200 shadow-sm">-</button>
                  <button onClick={() => updateScore('B', 1)} className="bg-orange-600 text-white w-16 h-10 rounded-xl font-black shadow-xl active:scale-90 transition-all border-b-4 border-orange-800 text-lg">+</button>
                </div>
              </div>
            </div>

            {/* SEÇÃO NEXT 4 (TIME C) */}
            <div className="bg-slate-900 rounded-[2rem] p-8 border-2 border-slate-800 shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Zap size={100} className="text-white" /></div>
              <div className="flex items-center gap-3 mb-6 relative z-10">
                <Sparkles size={20} className="text-blue-500" />
                <div className="flex flex-col">
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.5em] italic">Next 4 Lineup</span>
                  <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">TIME C - PRÓXIMO COMBATE</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 relative z-10">
                {(queue?.nextBlock || []).map((id, i) => (
                  <div key={i} className="bg-white/5 p-4 rounded-2xl text-center border border-white/10 backdrop-blur-sm">
                    <span className="text-[11px] font-black text-blue-400 block mb-2 shadow-sm">#{i + 1}</span>
                    <span className="text-[13px] font-heading italic text-white uppercase truncate block font-black">{players.find(p => p.id === id)?.name || '?'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* SEÇÃO: FILA DE ESPERA (RE) - AGRUPADA POR EQUIPES */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 px-4">
                <Layers size={22} className="text-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[12px] font-black uppercase text-slate-900 tracking-[0.4em] italic">Fila de Espera (RE)</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">VISÃO COMPLETA DO ROSTER EM ESPERA</span>
                </div>
              </div>

              <div className="space-y-4">
                {groupedReQueue.length > 0 ? (
                  groupedReQueue.map((teamChunk, teamIdx) => {
                    const isFull = teamChunk.length === 4;
                    const teamLetter = String.fromCharCode(68 + teamIdx); // Inicia do D (68)

                    return (
                      <div key={teamIdx} className={`bg-white rounded-[2rem] p-8 border-2 shadow-xl transition-all ${isFull ? 'border-blue-600' : 'border-slate-100'}`}>
                        <div className="flex items-center justify-between mb-8 border-b-2 border-slate-50 pb-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isFull ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Users size={20} />
                            </div>
                            <div>
                              <h4 className="text-base font-heading italic font-black text-slate-900 uppercase">TIME {teamLetter}</h4>
                              <p className={`text-[10px] font-black uppercase tracking-widest ${isFull ? 'text-blue-600' : 'text-slate-400'}`}>
                                {isFull ? 'EQUIPE COMPLETA' : 'EQUIPE EM FORMAÇÃO'}
                              </p>
                            </div>
                          </div>
                          {isFull ? <CheckCircle2 size={24} className="text-blue-600" /> : <AlertCircle size={24} className="text-slate-200" />}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {teamChunk.map((id, i) => {
                            const p = players.find(x => x.id === id);
                            return (
                              <div key={i} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                <div className={`w-10 h-10 flex items-center justify-center rounded-xl ${p?.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900'} text-white shadow-md`}>
                                  {p?.isGoalkeeper ? <Shield size={18} /> : <User size={18} />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[13px] font-black text-slate-900 uppercase leading-none mb-1 truncate">{p?.name || 'Vazio'}</p>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">#{(teamIdx * 4) + i + 1}</span>
                                </div>
                              </div>
                            );
                          })}
                          {!isFull && Array.from({ length: 4 - teamChunk.length }).map((_, i) => (
                            <div key={`empty-${i}`} className="flex items-center gap-3 p-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-100 opacity-50">
                              <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-200 border border-slate-200">
                                <Plus size={18} />
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-300 uppercase leading-none mb-1">AGUARDANDO...</p>
                                <span className="text-[9px] font-black text-slate-200 uppercase tracking-widest">PERDEDOR</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="mx-4 py-16 text-center border-4 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/50 shadow-inner">
                    <p className="text-[12px] font-black text-slate-300 uppercase tracking-[0.3em] italic">Nenhum atleta reserva na espera</p>
                    <p className="text-[10px] text-slate-200 font-bold uppercase mt-2">A FILA RE SERÁ PREENCHIDA PELOS PERDEDORES</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 sticky bottom-8 pb-4 px-4 z-[110]">
              <button onClick={() => handleEndMatch('A')} className="bg-blue-600 text-white py-6 rounded-2xl font-heading italic text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-blue-800 font-black">WIN ALPHA</button>
              <button onClick={() => handleEndMatch('Empate')} className="bg-slate-200 text-slate-800 py-6 rounded-2xl font-heading italic text-[11px] uppercase tracking-[0.3em] active:scale-95 transition-all border-2 border-slate-300 font-black shadow-xl">DRAW</button>
              <button onClick={() => handleEndMatch('B')} className="bg-orange-600 text-white py-6 rounded-2xl font-heading italic text-[11px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all border-b-4 border-orange-800 font-black">WIN BETA</button>
            </div>
          </div>
        )}

        {view === 'admin' && currentGame?.status === 'configurando' && (
          <div className="space-y-10 animate-in slide-in-from-bottom-6 duration-1000">
            <div className="space-y-6">
              <div className="bg-slate-50 p-8 rounded-3xl border-2 border-dashed border-slate-300 space-y-6 shadow-inner">
                <div className="flex items-center gap-3">
                  <UserCircle size={22} className="text-slate-700" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] italic">Comando de Escalação</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={adminAddPlayerName}
                    onChange={e => setAdminAddPlayerName(e.target.value)}
                    placeholder="NOME DO ATLETA"
                    className="flex-1 bg-white border-2 border-slate-200 p-5 rounded-2xl text-[13px] font-black uppercase focus:border-blue-600 outline-none shadow-md placeholder:text-slate-300 text-slate-900"
                    onKeyDown={e => e.key === 'Enter' && adminAddPlayer()}
                  />
                  <button
                    onClick={adminAddPlayer}
                    className="bg-slate-900 text-white px-8 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
                  >
                    ADD
                  </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl space-y-6">
                <div className="flex items-center gap-3">
                  <Clock size={22} className="text-blue-700" />
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-[0.4em] italic">Tempo da Partida</span>
                </div>
                <div className="flex items-center justify-center gap-10 py-4">
                  <button onClick={() => updateMatchTime(currentGame.settings.matchTime - 1)} className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-100 border-2 border-slate-200 text-slate-900 hover:bg-slate-200 transition-all active:scale-90 shadow-md"><Minus size={28} strokeWidth={3} /></button>
                  <div className="text-center">
                    <span className="text-7xl font-heading italic text-slate-900 leading-none tabular-nums font-black">{currentGame.settings.matchTime}</span>
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] mt-3 italic bg-slate-50 px-4 py-1 rounded-full">MINUTOS</p>
                  </div>
                  <button onClick={() => updateMatchTime(currentGame.settings.matchTime + 1)} className="w-16 h-16 flex items-center justify-center rounded-full bg-slate-900 text-white hover:bg-blue-700 transition-all active:scale-90 shadow-xl"><Plus size={28} strokeWidth={3} /></button>
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-xl">
              <div className="flex justify-between items-center mb-10 border-b-2 border-slate-50 pb-6">
                <h3 className="text-[11px] font-black uppercase text-blue-700 tracking-[0.5em] italic">ROSTER ATLETA ({confirmedPlayers.length})</h3>
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">GK</p>
                    <p className="text-2xl font-heading italic text-slate-900 font-black">{confirmedGK.length}<span className="text-slate-300 text-base">/2</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-1">LINHA</p>
                    <p className="text-2xl font-heading italic text-slate-900 font-black">{confirmedField.length}<span className="text-slate-300 text-base">/8</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
                {players.map(p => (
                  <div key={p.id} className={`p-4 bg-slate-50 rounded-2xl border-2 border-slate-200 flex items-center justify-between transition-all group ${p.isConfirmed ? 'opacity-100 shadow-md border-blue-100' : 'opacity-40 grayscale grayscale-0'}`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${p.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900'} text-white shadow-md`}>
                        {p.isGoalkeeper ? <Shield size={16} /> : <User size={16} />}
                      </div>
                      <span className="font-heading italic text-slate-900 uppercase text-[13px] font-black tracking-tight">{p.name}</span>
                    </div>
                    <div className="flex gap-2 relative z-50">
                      <button onClick={() => toggleConfirm(p)} className={`p-2.5 rounded-xl transition-all ${p.isConfirmed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500 hover:bg-emerald-500 hover:text-white'}`}><UserCheck size={18} /></button>
                      <button onClick={() => toggleGK(p)} className={`p-2.5 rounded-xl transition-all ${p.isGoalkeeper ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500 hover:bg-orange-500 hover:text-white'}`}><Shield size={18} /></button>
                      <button
                        onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }}
                        className="p-2.5 rounded-xl bg-slate-200 text-slate-500 hover:bg-red-500 hover:text-white transition-all cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {confirmedPlayers.length >= 10 && (
                <button onClick={startDraw} className="w-full p-6 rounded-[1.5rem] font-heading italic text-xl uppercase tracking-[0.2em] bg-slate-900 text-white shadow-2xl active:scale-95 transition-all hover:bg-blue-700 border-b-4 border-slate-950">
                  REALIZAR SORTEIO ELITE
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
