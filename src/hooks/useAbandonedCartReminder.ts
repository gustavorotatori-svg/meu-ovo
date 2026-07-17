import { useEffect, useRef } from 'react';
import { showLocalNotification, getNotifPreferences } from '../services/notificationService';

const ABANDON_TIMEOUT = 30 * 60 * 1000;

export function useAbandonedCartReminder(itemCount: number) {
  const timerRef = useRef<number | null>(null);
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (itemCount === 0) {
      notifiedRef.current = false;
      return;
    }

    const prefs = getNotifPreferences();
    if (!prefs.abandoned_cart) return;

    if (notifiedRef.current) return;

    const handleVisibility = () => {
      if (document.hidden) {
        timerRef.current = window.setTimeout(() => {
          if (!notifiedRef.current && itemCount > 0) {
            notifiedRef.current = true;
            showLocalNotification(
              '🛒 Carrinho esquecido!',
              `Você tem ${itemCount} itens no carrinho. Finalize seu pedido!`,
              () => { window.location.href = '/carrinho'; }
            );
          }
        }, ABANDON_TIMEOUT);
      } else {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        if (itemCount === 0) notifiedRef.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [itemCount]);
}
