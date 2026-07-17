import { useState, useEffect, type ReactNode } from 'react';
import { Bell, BellOff, ShoppingBag, Flame, Award, Truck, Megaphone } from 'lucide-react';
import { getNotifPreferences, setNotifPreferences, syncNotifPreferencesToFirestore, type NotifType, type NotifPreferences } from '../services/notificationService';
import { toast } from 'react-hot-toast';

const NOTIF_OPTIONS: { key: NotifType; label: string; desc: string; icon: ReactNode }[] = [
  { key: 'order_status', label: 'Status do Pedido', desc: 'Quando seu pedido avançar (aceito, saindo, etc)', icon: <Truck size={14} /> },
  { key: 'streak_reminder', label: 'Lembrete de Streak', desc: 'Se você não pediu hoje e está com streak ativa', icon: <Flame size={14} /> },
  { key: 'abandoned_cart', label: 'Carrinho Abandonado', desc: 'Se você deixar itens no carrinho por muito tempo', icon: <ShoppingBag size={14} /> },
  { key: 'achievement', label: 'Conquistas', desc: 'Quando desbloquear uma nova badge', icon: <Award size={14} /> },
  { key: 'promotion', label: 'Promoções', desc: 'Ofertas e descontos dos restaurantes', icon: <Megaphone size={14} /> },
  { key: 'reengagement', label: 'Re-engajamento', desc: 'Se passar muito tempo sem pedir', icon: <BellOff size={14} /> },
];

export default function NotificationPreferences({ userId, dark }: { userId?: string; dark?: boolean }) {
  const [prefs, setPrefs] = useState<NotifPreferences>(getNotifPreferences);
  const isDark = !!dark;

  const toggle = (key: NotifType) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setNotifPreferences(updated);
    if (userId) {
      syncNotifPreferencesToFirestore(userId, updated).catch(() => {});
    }
    const label = NOTIF_OPTIONS.find(o => o.key === key)?.label || key;
    toast.success(updated[key] ? `${label} ativada` : `${label} desativada`);
  };

  return (
    <div className="space-y-2">
      {NOTIF_OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={() => toggle(opt.key)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${
            prefs[opt.key]
              ? `${isDark ? 'border-amber-500/40 bg-amber-500/10' : 'border-amber-200 bg-amber-50'}`
              : `${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`
          }`}
        >
          <div className={`p-1.5 rounded-lg ${prefs[opt.key] ? 'text-[#FFC928]' : 'text-slate-400'}`}>
            {opt.icon}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-[9px] font-black uppercase tracking-tight ${prefs[opt.key] ? (isDark ? 'text-amber-300' : 'text-amber-800') : (isDark ? 'text-slate-400' : 'text-slate-500')}`}>
              {opt.label}
            </p>
            <p className={`text-[7px] font-bold mt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{opt.desc}</p>
          </div>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
            prefs[opt.key]
              ? 'bg-[#FFC928] border-[#FFC928]'
              : `${isDark ? 'border-slate-600' : 'border-slate-300'}`
          }`}>
            {prefs[opt.key] && <span className="text-[8px] text-black font-black">✓</span>}
          </div>
        </button>
      ))}
    </div>
  );
}
