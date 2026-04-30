// Fut Manager - Dashboard v2
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Plus, Users, ChevronRight, User,
  ShieldCheck, LogOut, Share2,
  Shield, UserCheck,
  Sparkles, Zap, Settings, UserCircle, ShieldAlert,
  ChevronLeft,
  ArrowRight, Trash2, Clock, Minus, Copy, MessageCircle, X,
  Layers, CheckCircle2, AlertCircle, Sun, Moon
} from 'lucide-react';
import { Game, Player, QueueState, MatchHistory } from '../types';
import { supabase, supabaseClient } from '../services/supabase';
import { TeamLogic } from '../services/team-logic';
import { MatchTimer } from './MatchTimer';
import { BrandLogo } from './Layout/BrandLogo';
import { TeamCard } from './Teams/TeamCard';
import { LandscapeView } from './LandscapeView';

// ── Hook de tema ──────────────────────────────────────────
function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return { dark, toggle: () => setDark(d => !d) };
}

// ── Hook de orientação ────────────────────────────────────
function useOrientation() {
  const [isLandscape, setIsLandscape] = useState(
    () => window.innerWidth > window.innerHeight && window.innerWidth < 1024
  );

  useEffect(() => {
    const check = () => {
      const landscape = window.innerWidth > window.innerHeight && window.innerWidth < 1024;
      setIsLandscape(landscape);

      // Muda a theme-color para combinar com o fundo no landscape
      // Isso faz a status bar do Android ficar da mesma cor do app
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', landscape ? '#020617' : '#2563eb');
      }
    };
    window.addEventListener('resize', check);
    window.addEventListener('orientationchange', check);
    // Roda imediatamente
    check();
    return () => {
      window.removeEventListener('resize', check);
      window.removeEventListener('orientationchange', check);
    };
  }, []);

  return isLandscape;
}


const Dashboard: React.FC = () => {
  const { dark, toggle: toggleTheme } = useTheme();
  const isLandscape = useOrientation();
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
    const code = new URLSearchParams(window.location.search).get('code');

    const init = async () => {
      try {
        const { data } = await supabaseClient.auth.getSession();
        const session = data?.session;

        if (session?.user) {
          const sessionUser = { id: session.user.id, email: session.user.email };
          setUser(sessionUser);
          // Carrega jogos em background — não bloqueia o loading
          loadAdminGames(session.user.id).catch(console.error);
          if (code) {
            setIsInitializing(false);
            await joinGame(code);
          } else {
            setView('dashboard');
          }
        } else {
          if (code) {
            setJoinCodeInput(code.toUpperCase());
            setView('join');
          }
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setIsInitializing(false);
      }
    };

    // Timeout absoluto de 3s — nunca trava
    const t = setTimeout(() => setIsInitializing(false), 3000);
    init().finally(() => clearTimeout(t));

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const sessionUser = { id: session.user.id, email: session.user.email };
          setUser(sessionUser);
          loadAdminGames(session.user.id).catch(console.error);
          setView(prev => (prev === 'auth' || prev === 'join') ? 'dashboard' : prev);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setView('auth');
        }
      }
    );

    return () => subscription.unsubscribe();
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
    if (!gameNameInput.trim()) return;

    // Garante sessão atualizada antes de criar
    let currentUser = user;
    if (!currentUser) {
      const session = await supabase.auth.getSession();
      if (session) {
        currentUser = session;
        setUser(session);
      }
    }

    if (!currentUser) {
      alert("Sessão expirada. Faça login novamente.");
      setView('auth');
      return;
    }

    try {
      const newGame: Game = {
        id: Math.random().toString(36).substring(7),
        name: gameNameInput.toUpperCase(),
        joinCode: Math.random().toString(36).substring(2, 7).toUpperCase(),
        status: 'configurando',
        adminId: currentUser.id,
        settings: { matchTime: 10 },
        timerState: { isRunning: false, startTime: null, remainingSeconds: 600 },
        scoreA: 0, scoreB: 0
      };
      await supabase.games.create(newGame);
      await loadAdminGames(currentUser.id);
      await joinGame(newGame.joinCode);
    } catch (err: any) {
      console.error('Erro ao criar arena:', err);
      alert(`Erro ao criar arena: ${err.message || 'Tente novamente.'}`);
    }
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

  // Botão de tema reutilizável
  const ThemeToggle = () => (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
      title={dark ? 'Modo claro' : 'Modo escuro'}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );

  if (isInitializing) return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Carregando...</p>
      </div>
    </div>
  );

  if (view === 'auth') return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-slate-950 p-5 relative overflow-hidden">
      {/* Fundo decorativo */}
      <div className="absolute top-0 left-0 w-full h-[35vh] bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-200 dark:border-slate-800 flex items-center justify-center">
        <div className="opacity-[0.05] select-none text-[22vw] font-heading font-black italic absolute tracking-tighter text-slate-900 dark:text-white">ELITE</div>
      </div>

      {/* Botão de tema */}
      <div className="absolute top-4 right-4 z-20"><ThemeToggle /></div>

      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <BrandLogo size={110} className="mb-10" />

        <div className="space-y-7">
          <div className="text-center space-y-1.5">
            <h2 className="text-xl font-heading italic font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {authMode === 'login' ? 'The Game Awaits' : 'Join the Ranks'}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.2em]">Controle Profissional</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 py-4 px-5 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-slate-700 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-sm"
              placeholder="E-MAIL"
              required
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 py-4 px-5 rounded-2xl text-sm font-bold focus:bg-white dark:focus:bg-slate-700 focus:border-blue-600 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-white shadow-sm"
              placeholder="SENHA"
              required
              autoComplete="current-password"
            />
            {authError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertCircle size={16} />{authError}
              </div>
            )}
            <button
              type="submit"
              className="w-full bg-slate-900 dark:bg-blue-600 text-white font-black italic uppercase tracking-wider py-4 rounded-xl hover:bg-blue-600 dark:hover:bg-blue-500 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {authMode === 'login' ? 'Autenticar' : 'Registrar'} <ChevronRight size={16} />
            </button>
          </form>

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
              className="text-slate-500 dark:text-slate-400 font-black text-[11px] uppercase tracking-widest hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              {authMode === 'login' ? 'Ainda não possui conta?' : 'Já possui conta?'}
            </button>
            <button
              onClick={() => setView('join')}
              className="flex items-center justify-center gap-3 text-blue-700 dark:text-blue-400 font-black uppercase text-[11px] tracking-[0.2em] transition-opacity hover:opacity-70 bg-blue-50 dark:bg-blue-900/30 py-3 rounded-xl border border-blue-100 dark:border-blue-800"
            >
              <Zap size={16} className="fill-current" /> Entrar como convidado
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'dashboard') return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <div className="max-w-xl mx-auto px-4 py-6 space-y-8 animate-in fade-in duration-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-100 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-600 dark:text-slate-400 border-2 border-slate-200 dark:border-slate-700 shadow-sm">
              <User size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-0.5 italic">COMANDANTE</p>
              <h2 className="text-lg font-heading italic text-slate-900 dark:text-white leading-none tracking-tighter uppercase">{user?.email?.split('@')[0]}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/30 border border-slate-200 dark:border-slate-700">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Nova Arena */}
        <button
          onClick={() => setView('create_game')}
          className="w-full group bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 py-5 px-6 rounded-2xl flex items-center justify-between text-white transition-all duration-300 active:scale-[0.98] shadow-xl border-2 border-slate-800 dark:border-blue-500"
        >
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform"><Plus size={20} strokeWidth={3} /></div>
            <span className="text-sm font-heading italic uppercase tracking-widest">Nova Arena</span>
          </div>
          <ArrowRight size={20} className="opacity-60 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Minhas Arenas */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.3em] italic mb-5">Minhas Arenas</h3>
          <div className="space-y-3 max-h-72 overflow-y-auto custom-scrollbar pr-1">
            {adminGames.length === 0 ? (
              <div className="py-12 text-center text-slate-300 dark:text-slate-600 italic font-black text-[11px] uppercase tracking-widest border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
                Nenhuma Arena Encontrada
              </div>
            ) : (
              adminGames.map(g => (
                <button key={g.id} onClick={() => joinGame(g.joinCode)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl border-2 border-slate-200 dark:border-slate-700 transition-all group shadow-sm"
                >
                  <div className="text-left">
                    <p className="font-heading italic text-slate-900 dark:text-white uppercase text-sm tracking-tight mb-1">{g.name}</p>
                    <span className="text-[10px] font-mono text-blue-700 dark:text-blue-400 font-black tracking-widest bg-blue-100 dark:bg-blue-900/40 px-3 py-0.5 rounded-full">{g.joinCode}</span>
                  </div>
                  <ChevronRight size={18} className="text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (view === 'join') return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-5">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm space-y-10 animate-in fade-in duration-700">
        <button onClick={() => setView('auth')}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all font-black uppercase text-[10px] tracking-[0.3em] bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full"
        >
          <ChevronLeft size={16} /> VOLTAR
        </button>
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-heading italic uppercase tracking-tighter leading-none text-slate-900 dark:text-white">
            CÓDIGO DA <span className="text-blue-600">ARENA</span>
          </h2>
        </div>
        <input
          type="text"
          value={joinCodeInput}
          onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
          placeholder="XXXXX"
          className="w-full bg-slate-50 dark:bg-slate-800 border-4 border-slate-200 dark:border-slate-700 p-6 rounded-3xl text-4xl sm:text-5xl font-heading italic text-center tracking-[0.2em] outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-700 transition-all uppercase placeholder:text-slate-200 dark:placeholder:text-slate-700 shadow-inner text-slate-900 dark:text-white"
        />
        <button
          onClick={() => joinGame(joinCodeInput)}
          className="w-full bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 py-5 rounded-2xl font-heading italic uppercase tracking-widest text-white active:scale-95 transition-all text-base shadow-2xl"
        >
          CONECTAR
        </button>
      </div>
    </div>
  );

  if (view === 'create_game') return (
    <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-5">
      <div className="absolute top-4 right-4"><ThemeToggle /></div>
      <div className="w-full max-w-sm space-y-8 animate-in fade-in duration-700">
        <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400 font-black uppercase text-[10px] tracking-[0.4em] italic bg-blue-50 dark:bg-blue-900/30 px-5 py-2 rounded-full border border-blue-100 dark:border-blue-800 w-fit">
          <Settings size={16} /> Configuração
        </div>
        <form onSubmit={finalizeCreateGame} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.3em] ml-1">Título da Arena</label>
            <input
              type="text"
              value={gameNameInput}
              onChange={e => setGameNameInput(e.target.value)}
              placeholder="EX: ARENA ELITE"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-5 rounded-2xl font-heading italic text-base outline-none focus:border-blue-600 focus:bg-white dark:focus:bg-slate-700 transition-all uppercase text-slate-900 dark:text-white shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-600"
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setView('dashboard')}
              className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
            >
              CANCELAR
            </button>
            <button type="submit"
              className="flex-[2] py-4 bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 rounded-2xl font-heading italic text-sm uppercase tracking-widest text-white shadow-xl transition-all active:scale-95"
            >
              CRIAR AGORA
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  // --- GAMEPLAY VIEW ---
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 safe-bottom">
      {/* Barra admin — oculta no landscape */}
      {isCurrentGameAdmin && view === 'admin' && !isLandscape && (
        <div className="bg-slate-900 dark:bg-blue-900 text-white py-2 px-6 flex items-center justify-center gap-3 sticky top-0 z-[100] border-b-2 border-white/10 shadow-xl">
          <ShieldAlert size={13} className="text-blue-400 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] italic">ADMIN MODE ACTIVE</span>
        </div>
      )}

      {/* MODAL DE COMPARTILHAMENTO */}
      {showShareModal && (
        <div className="fixed inset-0 z-[1000] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setShowShareModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl border-2 border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-base font-heading italic font-black text-slate-900 dark:text-white uppercase tracking-widest">Compartilhar Arena</h3>
              <button onClick={() => setShowShareModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400"><X size={22} /></button>
            </div>
            <div className="space-y-4">
              <button onClick={handleShareWhatsApp} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-lg">
                <MessageCircle size={24} />
                <span className="font-heading italic uppercase text-sm tracking-widest">Enviar WhatsApp</span>
              </button>
              <button onClick={handleCopyLink} className="w-full bg-slate-900 dark:bg-slate-700 hover:bg-blue-600 text-white py-5 rounded-2xl flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-lg">
                <Copy size={22} />
                <span className="font-heading italic uppercase text-sm tracking-widest">Copiar Link</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANIMAÇÃO DE GOL */}
      {showGoalAnim && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center pointer-events-none p-4">
          <div className={`animate-goal ${showGoalAnim === 'A' ? 'bg-blue-600' : 'bg-orange-600'} text-white px-8 py-6 sm:px-16 sm:py-10 rounded-[2.5rem] shadow-2xl text-center border-4 border-white/20`}>
            <div className="text-6xl sm:text-8xl font-heading italic font-black tracking-tighter leading-none mb-3">GOOOOOL!</div>
            <div className="text-sm sm:text-xl font-black uppercase tracking-[0.4em] opacity-80">TIME {showGoalAnim === 'A' ? 'ALPHA' : 'BETA'} MARCOU!</div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 pt-5 space-y-6 animate-in fade-in duration-700">
        {/* Nav bar */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => { setView(user ? 'dashboard' : 'auth'); setCurrentGame(null); }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all font-black px-2"
          >
            <ChevronLeft size={18} />
            <span className="text-[10px] uppercase tracking-[0.3em] italic hidden sm:block">SAIR DA ARENA</span>
          </button>
          <div className="flex gap-2">
            <ThemeToggle />
            <button onClick={() => setShowShareModal(true)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-blue-600 transition-all active:scale-90">
              <Share2 size={18} />
            </button>
            {isCurrentGameAdmin && (
              <button
                onClick={() => setView(view === 'admin' ? 'player' : 'admin')}
                className="px-4 py-2 bg-slate-900 dark:bg-blue-700 text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-md hover:bg-blue-700 transition-all"
              >
                {view === 'admin' ? 'PLAYER' : 'ADMIN'}
              </button>
            )}
          </div>
        </div>

        {/* Header da Arena */}
        <div className="text-center space-y-3 py-2">
          <h2 className="text-2xl sm:text-3xl font-heading italic text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{currentGame?.name}</h2>
          <div className="flex items-center justify-center gap-4">
            <div className="h-[2px] w-10 bg-slate-200 dark:bg-slate-700"></div>
            <span className="text-base text-blue-700 dark:text-blue-400 font-mono font-black tracking-[0.4em] bg-blue-50 dark:bg-blue-900/30 px-4 py-1 rounded-full border border-blue-100 dark:border-blue-800">{currentGame?.joinCode}</span>
            <div className="h-[2px] w-10 bg-slate-200 dark:bg-slate-700"></div>
          </div>
          <div className="flex justify-center">
            <span className={`text-[10px] px-4 py-1.5 rounded-full font-black uppercase tracking-[0.3em] border-2 ${currentGame?.status === 'em_jogo' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'}`}>
              {currentGame?.status === 'em_jogo' ? 'MATCH IN PROGRESS' : 'PRE-MATCH READY'}
            </span>
          </div>
        </div>

        {/* VISÃO DO CONVIDADO (PLAYER) */}
        {view === 'player' && (
          <div className="flex flex-col items-center py-8 space-y-10 animate-in slide-in-from-bottom-6 duration-500">
            <div className="w-full max-w-sm space-y-8">
              <div className="space-y-3">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] italic px-1">Seu nome na lista</span>
                <input
                  type="text"
                  value={newPlayerName}
                  onChange={e => setNewPlayerName(e.target.value)}
                  placeholder="EX: RONALDO"
                  className="w-full p-6 rounded-2xl border-4 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-heading italic text-center text-3xl sm:text-4xl uppercase focus:border-blue-600 focus:bg-white dark:focus:bg-slate-700 outline-none transition-all text-slate-900 dark:text-white shadow-lg placeholder:text-slate-200 dark:placeholder:text-slate-700"
                />
              </div>

              <div className="flex flex-col items-center gap-8 pt-4">
                <div className="flex gap-3 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full border-2 border-slate-200 dark:border-slate-700">
                  <button onClick={() => setSelectedPosition('linha')} className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all ${selectedPosition === 'linha' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400'}`}>LINHA</button>
                  <button onClick={() => setSelectedPosition('goleiro')} className={`px-6 py-2.5 rounded-full font-black text-[11px] uppercase tracking-[0.2em] transition-all ${selectedPosition === 'goleiro' ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400'}`}>GOLEIRO</button>
                </div>

                <div className="relative">
                  <div className={`absolute inset-0 blur-[80px] opacity-30 transition-all duration-700 ${guestPlayer?.isConfirmed ? 'bg-emerald-400' : 'bg-slate-300'}`}></div>
                  <button
                    onClick={togglePresence}
                    disabled={!newPlayerName.trim()}
                    className={`relative z-10 w-48 h-48 sm:w-56 sm:h-56 rounded-full flex flex-col items-center justify-center transition-all duration-500 shadow-2xl active:scale-90 border-[8px] ${guestPlayer?.isConfirmed ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'} ${!newPlayerName.trim() ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                  >
                    <span className="text-6xl sm:text-7xl font-heading italic font-black tracking-tighter">{guestPlayer?.isConfirmed ? 'ON' : 'OFF'}</span>
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] mt-2 bg-black/10 px-3 py-1 rounded-full">
                      {guestPlayer?.isConfirmed ? 'CONFIRMADO' : 'PENDENTE'}
                    </span>
                  </button>
                </div>

                <p className="text-[12px] text-slate-500 dark:text-slate-400 font-black uppercase tracking-[0.1em] italic text-center max-w-[260px] leading-relaxed bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                  {guestPlayer?.isConfirmed ? 'VOCÊ JÁ ESTÁ NA ARENA! BOA SORTE ATLETA.' : 'ATIVE O BOTÃO PARA CONFIRMAR SUA PRESENÇA.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VISÃO DO ADMINISTRADOR - EM JOGO */}
        {view === 'admin' && currentGame?.status === 'em_jogo' && (
          <>
            {/* ── LANDSCAPE: layout compacto tudo numa tela ── */}
            {isLandscape ? (
              <div className="fixed inset-0 z-[200] bg-slate-950">
                <LandscapeView
                  game={currentGame}
                  queue={queue}
                  players={players}
                  isAdmin={isCurrentGameAdmin}
                  onUpdate={handleUpdateGame}
                  onScore={updateScore}
                  onEndMatch={handleEndMatch}
                />
              </div>
            ) : (
          <div className="space-y-8 pb-10">
            {currentGame && <MatchTimer game={currentGame} isAdmin={true} onUpdate={handleUpdateGame} />}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <TeamCard title="EQUIPE ALPHA" playerIds={queue?.teamA || []} color="border-blue-600" allPlayers={players} isMandante />
              <TeamCard title="EQUIPE BETA" playerIds={queue?.teamB || []} color="border-orange-600" allPlayers={players} />
            </div>

            {/* Placar */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-xl flex items-center justify-center gap-8 sm:gap-12">
              <div className="flex flex-col items-center gap-3">
                <span className="text-[11px] font-black uppercase text-blue-700 dark:text-blue-400 tracking-[0.4em] italic bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">ALPHA</span>
                <span className="text-7xl sm:text-8xl font-heading italic text-slate-900 dark:text-white tabular-nums font-black">{currentGame.scoreA}</span>
                <div className="flex gap-2">
                  <button onClick={() => updateScore('A', -1)} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white w-11 h-10 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-2 border-slate-200 dark:border-slate-700">-</button>
                  <button onClick={() => updateScore('A', 1)} className="bg-blue-600 text-white w-14 h-10 rounded-xl font-black shadow-lg active:scale-90 transition-all border-b-4 border-blue-800 text-lg">+</button>
                </div>
              </div>
              <div className="text-3xl font-heading italic text-slate-200 dark:text-slate-700 font-black">X</div>
              <div className="flex flex-col items-center gap-3">
                <span className="text-[11px] font-black uppercase text-orange-700 dark:text-orange-400 tracking-[0.4em] italic bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-full">BETA</span>
                <span className="text-7xl sm:text-8xl font-heading italic text-slate-900 dark:text-white tabular-nums font-black">{currentGame.scoreB}</span>
                <div className="flex gap-2">
                  <button onClick={() => updateScore('B', -1)} className="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white w-11 h-10 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border-2 border-slate-200 dark:border-slate-700">-</button>
                  <button onClick={() => updateScore('B', 1)} className="bg-orange-600 text-white w-14 h-10 rounded-xl font-black shadow-lg active:scale-90 transition-all border-b-4 border-orange-800 text-lg">+</button>
                </div>
              </div>
            </div>

            {/* Next 4 */}
            <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 border-2 border-slate-800 dark:border-slate-700 shadow-xl">
              <div className="flex items-center gap-3 mb-5">
                <Sparkles size={18} className="text-blue-400" />
                <div>
                  <span className="text-[11px] font-black uppercase text-slate-400 tracking-[0.4em] italic">Next 4 Lineup</span>
                  <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">TIME C - PRÓXIMO COMBATE</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(queue?.nextBlock || []).map((id, i) => (
                  <div key={i} className="bg-white/5 p-3 rounded-2xl text-center border border-white/10">
                    <span className="text-[10px] font-black text-blue-400 block mb-1">#{i + 1}</span>
                    <span className="text-[12px] font-heading italic text-white uppercase truncate block font-black">{players.find(p => p.id === id)?.name || '?'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Fila RE */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-1">
                <Layers size={20} className="text-slate-700 dark:text-slate-400" />
                <div>
                  <span className="text-[12px] font-black uppercase text-slate-900 dark:text-white tracking-[0.3em] italic">Fila de Espera (RE)</span>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROSTER EM ESPERA</p>
                </div>
              </div>
              <div className="space-y-3">
                {groupedReQueue.length > 0 ? groupedReQueue.map((teamChunk, teamIdx) => {
                  const isFull = teamChunk.length === 4;
                  const teamLetter = String.fromCharCode(68 + teamIdx);
                  return (
                    <div key={teamIdx} className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 shadow-lg ${isFull ? 'border-blue-500 dark:border-blue-700' : 'border-slate-100 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-xl ${isFull ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}><Users size={16} /></div>
                          <div>
                            <h4 className="text-sm font-heading italic font-black text-slate-900 dark:text-white uppercase">TIME {teamLetter}</h4>
                            <p className={`text-[9px] font-black uppercase tracking-widest ${isFull ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>{isFull ? 'EQUIPE COMPLETA' : 'EM FORMAÇÃO'}</p>
                          </div>
                        </div>
                        {isFull ? <CheckCircle2 size={20} className="text-blue-600 dark:text-blue-400" /> : <AlertCircle size={20} className="text-slate-200 dark:text-slate-700" />}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {teamChunk.map((id, i) => {
                          const p = players.find(x => x.id === id);
                          return (
                            <div key={i} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-lg ${p?.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900 dark:bg-slate-600'} text-white`}>
                                {p?.isGoalkeeper ? <Shield size={14} /> : <User size={14} />}
                              </div>
                              <span className="text-[12px] font-black text-slate-900 dark:text-white uppercase truncate">{p?.name || 'Vazio'}</span>
                            </div>
                          );
                        })}
                        {!isFull && Array.from({ length: 4 - teamChunk.length }).map((_, i) => (
                          <div key={`e-${i}`} className="flex items-center gap-2 p-3 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-100 dark:border-slate-700 opacity-50">
                            <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-300"><Plus size={14} /></div>
                            <span className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase">AGUARDANDO...</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-12 text-center border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl">
                    <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-[0.3em] italic">Nenhum atleta na espera</p>
                  </div>
                )}
              </div>
            </div>

            {/* Botões de resultado */}
            <div className="grid grid-cols-3 gap-3 sticky bottom-6 pb-2 z-[110]">
              <button onClick={() => handleEndMatch('A')} className="bg-blue-600 text-white py-5 rounded-2xl font-heading italic text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all border-b-4 border-blue-800 font-black">WIN ALPHA</button>
              <button onClick={() => handleEndMatch('Empate')} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white py-5 rounded-2xl font-heading italic text-[11px] uppercase tracking-[0.2em] active:scale-95 transition-all border-2 border-slate-300 dark:border-slate-600 font-black shadow-xl">DRAW</button>
              <button onClick={() => handleEndMatch('B')} className="bg-orange-600 text-white py-5 rounded-2xl font-heading italic text-[11px] uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all border-b-4 border-orange-800 font-black">WIN BETA</button>
            </div>
          </div>
            )}
          </>
        )}

        {/* ADMIN - CONFIGURANDO */}
        {view === 'admin' && currentGame?.status === 'configurando' && (
          <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
            {/* Adicionar jogador */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 space-y-4">
              <div className="flex items-center gap-3">
                <UserCircle size={20} className="text-slate-600 dark:text-slate-400" />
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.4em] italic">Escalação</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={adminAddPlayerName}
                  onChange={e => setAdminAddPlayerName(e.target.value)}
                  placeholder="NOME DO ATLETA"
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-4 rounded-2xl text-[13px] font-black uppercase focus:border-blue-600 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 text-slate-900 dark:text-white"
                  onKeyDown={e => e.key === 'Enter' && adminAddPlayer()}
                />
                <button onClick={adminAddPlayer} className="bg-slate-900 dark:bg-blue-600 text-white px-6 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg active:scale-95">
                  ADD
                </button>
              </div>
            </div>

            {/* Tempo da partida */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-blue-600" />
                <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.4em] italic">Tempo da Partida</span>
              </div>
              <div className="flex items-center justify-center gap-8 py-2">
                <button onClick={() => updateMatchTime(currentGame.settings.matchTime - 1)} className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90"><Minus size={24} strokeWidth={3} /></button>
                <div className="text-center">
                  <span className="text-6xl font-heading italic text-slate-900 dark:text-white tabular-nums font-black">{currentGame.settings.matchTime}</span>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic">MINUTOS</p>
                </div>
                <button onClick={() => updateMatchTime(currentGame.settings.matchTime + 1)} className="w-14 h-14 flex items-center justify-center rounded-full bg-slate-900 dark:bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-90 shadow-xl"><Plus size={24} strokeWidth={3} /></button>
              </div>
            </div>

            {/* Roster */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border-2 border-slate-100 dark:border-slate-800 shadow-lg">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-[11px] font-black uppercase text-blue-600 tracking-[0.4em] italic">ROSTER ({confirmedPlayers.length})</h3>
                <div className="flex gap-6">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-0.5">GK</p>
                    <p className="text-xl font-heading italic text-slate-900 dark:text-white font-black">{confirmedGK.length}<span className="text-slate-300 dark:text-slate-600 text-sm">/2</span></p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase italic mb-0.5">LINHA</p>
                    <p className="text-xl font-heading italic text-slate-900 dark:text-white font-black">{confirmedField.length}<span className="text-slate-300 dark:text-slate-600 text-sm">/8</span></p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
                {players.map(p => (
                  <div key={p.id} className={`p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 flex items-center justify-between transition-all ${p.isConfirmed ? 'border-blue-100 dark:border-blue-900 shadow-sm' : 'border-slate-200 dark:border-slate-700 opacity-50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 flex items-center justify-center rounded-xl ${p.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900 dark:bg-slate-600'} text-white`}>
                        {p.isGoalkeeper ? <Shield size={14} /> : <User size={14} />}
                      </div>
                      <span className="font-heading italic text-slate-900 dark:text-white uppercase text-[12px] font-black">{p.name}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => toggleConfirm(p)} className={`p-2 rounded-xl transition-all ${p.isConfirmed ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-emerald-500 hover:text-white'}`}><UserCheck size={15} /></button>
                      <button onClick={() => toggleGK(p)} className={`p-2 rounded-xl transition-all ${p.isGoalkeeper ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-orange-500 hover:text-white'}`}><Shield size={15} /></button>
                      <button onClick={(e) => { e.stopPropagation(); removePlayer(p.id); }} className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 hover:bg-red-500 hover:text-white transition-all"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {confirmedPlayers.length >= 10 && (
                <button onClick={startDraw} className="w-full p-5 rounded-2xl font-heading italic text-lg uppercase tracking-[0.2em] bg-slate-900 dark:bg-blue-600 text-white shadow-2xl active:scale-95 transition-all hover:bg-blue-700 border-b-4 border-slate-950 dark:border-blue-800">
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
