import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';

/**
 * Banner de instalação PWA
 * - Android/Chrome: usa o evento beforeinstallprompt nativo
 * - iOS/Safari: detecta e mostra guia manual
 */
export const InstallBanner: React.FC = () => {
  const [showAndroid, setShowAndroid] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Não mostra se já foi dispensado ou já está instalado
    const wasDismissed = localStorage.getItem('pwa_banner_dismissed');
    if (wasDismissed) return;

    // Detecta se já está rodando como PWA instalado
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) return;

    // Android/Chrome — evento nativo
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowAndroid(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    // iOS — detecta Safari no iPhone/iPad
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /safari/i.test(navigator.userAgent) && !/chrome/i.test(navigator.userAgent);
    if (isIOS && isSafari) {
      // Mostra após 3 segundos para não ser intrusivo
      const t = setTimeout(() => setShowIOS(true), 3000);
      return () => {
        clearTimeout(t);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallAndroid = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowAndroid(false);
      localStorage.setItem('pwa_banner_dismissed', '1');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowAndroid(false);
    setShowIOS(false);
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', '1');
  };

  // ── Android banner ────────────────────────────────────
  if (showAndroid && !dismissed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow-2xl flex items-center gap-4 max-w-sm mx-auto">
          {/* Ícone */}
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shrink-0 shadow-lg">
            <img src="/icon-72.png" alt="Fut Manager" className="w-10 h-10 rounded-xl" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>

          {/* Texto */}
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-black text-white uppercase tracking-tight">Instalar Fut Manager</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Adicione à tela inicial para acesso rápido</p>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-2 shrink-0">
            <button
              onClick={handleInstallAndroid}
              className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow-lg"
            >
              <Download size={14} />
              Instalar
            </button>
            <button
              onClick={handleDismiss}
              className="text-slate-500 text-[10px] font-black uppercase tracking-wider text-center hover:text-slate-300 transition-colors"
            >
              Agora não
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── iOS banner ────────────────────────────────────────
  if (showIOS && !dismissed) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500">
        <div className="bg-slate-900 dark:bg-slate-800 border border-slate-700 rounded-3xl p-5 shadow-2xl max-w-sm mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <img src="/icon-72.png" alt="" className="w-8 h-8 rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              </div>
              <div>
                <p className="text-[13px] font-black text-white uppercase">Instalar Fut Manager</p>
                <p className="text-[10px] text-slate-400">Adicione à tela inicial</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1.5 rounded-full bg-slate-700 text-slate-400">
              <X size={14} />
            </button>
          </div>

          {/* Passos */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-2xl border border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-blue-400">1</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <Share size={16} className="text-blue-400 shrink-0" />
                <p className="text-[12px] text-slate-300 font-black">Toque no botão <span className="text-blue-400">Compartilhar</span> do Safari</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-2xl border border-slate-700">
              <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-600 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-blue-400">2</span>
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-slate-300 font-black">Selecione <span className="text-blue-400">"Adicionar à Tela de Início"</span></p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-2xl border border-slate-700">
              <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-600 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-black text-emerald-400">✓</span>
              </div>
              <div className="flex-1">
                <p className="text-[12px] text-slate-300 font-black">Toque em <span className="text-emerald-400">"Adicionar"</span> — pronto!</p>
              </div>
            </div>
          </div>

          {/* Seta apontando para baixo (onde fica o botão de compartilhar no Safari) */}
          <div className="flex justify-center mt-3">
            <div className="flex flex-col items-center gap-1 text-slate-500">
              <p className="text-[9px] font-black uppercase tracking-widest">Botão compartilhar fica aqui</p>
              <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-slate-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
