import React, { useState } from 'react';
import { CheckCircle2, Clock, Copy, MapPin, ExternalLink, DollarSign, Check } from 'lucide-react';
import { Player, GameSettings } from '../types';

// ── PAINEL DO ADMIN — Lista de pagamentos ─────────────────
interface PaymentListProps {
  players: Player[];
  onTogglePaid: (player: Player) => void;
}

export const PaymentList: React.FC<PaymentListProps> = ({ players, onTogglePaid }) => {
  const confirmed = players.filter(p => p.isConfirmed);
  const paid = confirmed.filter(p => p.isPaid);
  const pending = confirmed.filter(p => !p.isPaid);

  return (
    <div className="space-y-5">
      {/* Contador */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em] italic">
            Pagamentos
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            {paid.length} pagos
          </span>
          <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-full border border-orange-200 dark:border-orange-800">
            {pending.length} pendentes
          </span>
        </div>
      </div>

      {/* Barra de progresso */}
      {confirmed.length > 0 && (
        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
            style={{ width: `${(paid.length / confirmed.length) * 100}%` }}
          />
        </div>
      )}

      {/* Lista */}
      {confirmed.length === 0 ? (
        <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl">
          <p className="text-[11px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest italic">
            Nenhum jogador confirmado ainda
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {confirmed.map(p => (
            <button
              key={p.id}
              onClick={() => onTogglePaid(p)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all active:scale-[0.98] ${
                p.isPaid
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  p.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900 dark:bg-slate-600'
                } text-white`}>
                  <span className="text-[10px] font-black">{p.isGoalkeeper ? 'GK' : 'JG'}</span>
                </div>
                <span className="font-heading italic text-slate-900 dark:text-white uppercase text-[13px] font-black tracking-tight">
                  {p.name}
                </span>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                p.isPaid
                  ? 'bg-emerald-500 text-white shadow-md'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
              }`}>
                {p.isPaid ? (
                  <><CheckCircle2 size={14} /> PAGO</>
                ) : (
                  <><Clock size={14} /> PENDENTE</>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── PAINEL DO ADMIN — Configurações de Pix e Local ────────
interface ArenaSettingsProps {
  settings: GameSettings;
  onSave: (updates: Partial<GameSettings>) => void;
}

export const ArenaSettings: React.FC<ArenaSettingsProps> = ({ settings, onSave }) => {
  const [pixKey, setPixKey] = useState(settings.pixKey || '');
  const [pixName, setPixName] = useState(settings.pixName || '');
  const [pixAmount, setPixAmount] = useState(settings.pixAmount?.toString() || '');
  const [locationName, setLocationName] = useState(settings.locationName || '');
  const [locationUrl, setLocationUrl] = useState(settings.locationUrl || '');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave({
      pixKey: pixKey.trim(),
      pixName: pixName.trim(),
      pixAmount: pixAmount ? parseFloat(pixAmount) : undefined,
      locationName: locationName.trim(),
      locationUrl: locationUrl.trim(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* PIX */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign size={18} className="text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em] italic">Dados do Pix</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Chave Pix</label>
            <input
              type="text"
              value={pixKey}
              onChange={e => setPixKey(e.target.value)}
              placeholder="CPF, email, telefone ou chave aleatória"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl text-sm font-bold focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome do recebedor</label>
            <input
              type="text"
              value={pixName}
              onChange={e => setPixName(e.target.value)}
              placeholder="Seu nome"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl text-sm font-bold focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Valor (R$)</label>
            <input
              type="number"
              value={pixAmount}
              onChange={e => setPixAmount(e.target.value)}
              placeholder="Ex: 25.00"
              min="0"
              step="0.50"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl text-sm font-bold focus:border-emerald-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* LOCAL */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border-2 border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <MapPin size={18} className="text-blue-600 dark:text-blue-400" />
          <span className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-[0.3em] italic">Local do Jogo</span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Nome do local</label>
            <input
              type="text"
              value={locationName}
              onChange={e => setLocationName(e.target.value)}
              placeholder="Ex: Arena Elite - Quadra 3"
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1 block">Link Google Maps</label>
            <input
              type="url"
              value={locationUrl}
              onChange={e => setLocationUrl(e.target.value)}
              placeholder="https://maps.google.com/..."
              className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 p-3.5 rounded-2xl text-sm font-bold focus:border-blue-500 outline-none transition-all text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Botão salvar */}
      <button
        onClick={handleSave}
        className={`w-full py-4 rounded-2xl font-heading italic text-sm uppercase tracking-widest text-white shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${
          saved
            ? 'bg-emerald-500 border-b-4 border-emerald-700'
            : 'bg-slate-900 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500 border-b-4 border-slate-950 dark:border-blue-800'
        }`}
      >
        {saved ? <><Check size={18} /> SALVO!</> : 'SALVAR CONFIGURAÇÕES'}
      </button>
    </div>
  );
};

// ── CARD DO JOGADOR — Pix + Local + Status ────────────────
interface PlayerPaymentCardProps {
  settings: GameSettings;
  isPaid: boolean;
}

export const PlayerPaymentCard: React.FC<PlayerPaymentCardProps> = ({ settings, isPaid }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyPix = async () => {
    if (!settings.pixKey) return;
    await navigator.clipboard.writeText(settings.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasInfo = settings.pixKey || settings.locationName;
  if (!hasInfo) return null;

  return (
    <div className="space-y-3 w-full max-w-sm">
      {/* Status de pagamento */}
      <div className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-2xl border-2 ${
        isPaid
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
          : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400'
      }`}>
        {isPaid ? <CheckCircle2 size={16} /> : <Clock size={16} />}
        <span className="text-[11px] font-black uppercase tracking-widest">
          {isPaid ? 'Pagamento confirmado ✓' : 'Pagamento pendente'}
        </span>
      </div>

      {/* Pix */}
      {settings.pixKey && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <DollarSign size={16} className="text-emerald-600 dark:text-emerald-400" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Pagar via Pix
              {settings.pixAmount && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400">
                  R$ {settings.pixAmount.toFixed(2)}
                </span>
              )}
            </span>
          </div>

          {settings.pixName && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black mb-2">
              Para: <span className="text-slate-900 dark:text-white">{settings.pixName}</span>
            </p>
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-700">
              <p className="text-[12px] font-mono text-slate-700 dark:text-slate-300 truncate">{settings.pixKey}</p>
            </div>
            <button
              onClick={handleCopyPix}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all active:scale-90 ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-900 dark:bg-blue-600 text-white hover:bg-blue-600'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}

      {/* Local */}
      {settings.locationName && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border-2 border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Local do Jogo</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] font-black text-slate-900 dark:text-white">{settings.locationName}</p>
            {settings.locationUrl && (
              <a
                href={settings.locationUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider active:scale-90 transition-all shrink-0"
              >
                <ExternalLink size={13} /> Maps
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
