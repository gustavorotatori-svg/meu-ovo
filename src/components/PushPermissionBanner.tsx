import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X } from 'lucide-react';
import { requestPushPermission, getFCMToken, isPushSupported } from '../services/notificationService';
import { toast } from 'react-hot-toast';

const DISMISS_KEY = 'meuovo_push_banner_dismissed';

export default function PushPermissionBanner({ userId, onTokenReady }: { userId: string; onTokenReady?: (token: string) => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    try {
      if (localStorage.getItem(DISMISS_KEY)) return;
    } catch { }
    const timer = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleAllow = async () => {
    const perm = await requestPushPermission();
    if (perm === 'granted') {
      const token = await getFCMToken();
      if (token) onTokenReady?.(token);
      toast.success('Notificações ativadas!');
    } else {
      toast.error('Notificações bloqueadas. Ative nas configurações do navegador.');
    }
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch { }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="fixed bottom-20 left-4 right-4 z-50 max-w-sm mx-auto"
        >
          <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFC928]/10 flex items-center justify-center shrink-0">
              <Bell size={20} className="text-[#FFC928]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-[#111] dark:text-white uppercase tracking-tight">Não perca novidades!</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">Ative as notificações para saber quando seu pedido atualizar</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAllow}
                  className="px-4 py-2 bg-[#FFC928] text-black rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#f5c010] transition-all"
                >
                  Ativar
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-all"
                >
                  Agora não
                </button>
              </div>
            </div>
            <button onClick={handleDismiss} className="p-1 text-slate-300 hover:text-slate-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
