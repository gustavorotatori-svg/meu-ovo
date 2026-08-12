import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { showLocalNotification, getNotifPreferences } from '../services/notificationService';

const ABANDON_TIMEOUT = 20 * 60 * 1000;

export function useAbandonedCartReminder(itemCount: number) {
  const timerRef = useRef<number | null>(null);
  const notifiedRef = useRef(false);
  const countRef = useRef(itemCount);

  useEffect(() => {
    countRef.current = itemCount;

    const clearTimer = () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    if (itemCount === 0) {
      clearTimer();
      notifiedRef.current = false;
      return;
    }

    const prefs = getNotifPreferences();
    if (!prefs.abandoned_cart) return;
    if (notifiedRef.current) return;

    const remind = () => {
      if (notifiedRef.current || countRef.current === 0) return;
      notifiedRef.current = true;
      const body = `Você tem ${countRef.current} ${countRef.current === 1 ? 'item' : 'itens'} no carrinho. Finalize seu pedido!`;
      if (document.hidden) {
        showLocalNotification('🛒 Carrinho esquecido!', body, () => { window.location.href = '/carrinho'; });
      } else {
        toast(`🛒 ${body}`, { duration: 8000 });
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (!timerRef.current) {
          timerRef.current = window.setTimeout(remind, ABANDON_TIMEOUT);
        }
      } else {
        clearTimer();
        if (notifiedRef.current) return;
        // Re-arms for the next hide if the user just returned with items still in cart
        timerRef.current = window.setTimeout(remind, ABANDON_TIMEOUT);
      }
    };

    // Start a timer immediately even with the tab open, so it also fires in-app.
    timerRef.current = window.setTimeout(remind, ABANDON_TIMEOUT);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimer();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [itemCount]);
}
