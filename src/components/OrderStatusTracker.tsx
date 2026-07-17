import { useEffect, useRef } from 'react';
import { trackOrderStatus, showLocalNotification, getNotifPreferences } from '../services/notificationService';
import { toast } from 'react-hot-toast';

const STATUS_LABELS: Record<string, string> = {
  received: 'Pedido recebido',
  accepted: 'Pedido aceito!',
  preparing: 'Preparando seu pedido',
  ready: 'Pedido pronto!',
  'out-for-delivery': 'Saiu para entrega!',
  finished: 'Pedido entregue!',
  cancelled: 'Pedido cancelado',
};

const STATUS_ICONS: Record<string, string> = {
  received: '📥',
  accepted: '✅',
  preparing: '👨‍🍳',
  ready: '🍳',
  'out-for-delivery': '🛵',
  finished: '🎉',
  cancelled: '❌',
};

const STATUS_ORDER = ['received', 'accepted', 'preparing', 'ready', 'out-for-delivery', 'finished', 'cancelled'];

export default function OrderStatusTracker({ orderId, initialStatus }: { orderId: string; initialStatus: string }) {
  const lastStatusRef = useRef(initialStatus);

  useEffect(() => {
    if (!orderId) return;

    const prefs = getNotifPreferences();
    if (!prefs.order_status) return;

    const unsub = trackOrderStatus(orderId, (newStatus) => {
      const oldIdx = STATUS_ORDER.indexOf(lastStatusRef.current);
      const newIdx = STATUS_ORDER.indexOf(newStatus);
      if (newIdx <= oldIdx) return; // only forward or cancel
      if (newStatus === 'cancelled' && oldIdx === -1) return;

      lastStatusRef.current = newStatus;
      const icon = STATUS_ICONS[newStatus] || '🔔';
      const label = STATUS_LABELS[newStatus] || newStatus;

      showLocalNotification(`${icon} ${label}`, `Seu pedido #${orderId.slice(-6).toUpperCase()} ${label.toLowerCase()}`, () => {
        window.location.href = `/pedido/${orderId}`;
      });

      toast.custom((t) => (
        <div
          onClick={() => { window.location.href = `/pedido/${orderId}`; toast.dismiss(t.id); }}
          className="flex items-center gap-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-xl cursor-pointer max-w-sm"
        >
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${newStatus === 'cancelled' ? 'bg-red-100' : newStatus === 'finished' ? 'bg-emerald-100' : 'bg-brand-egg/20'}`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black text-[#111] dark:text-white uppercase tracking-tight">
              {label}
            </p>
            <p className="text-[8px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
              Pedido #{orderId.slice(-6).toUpperCase()}
            </p>
          </div>
        </div>
      ), { duration: 6000 });
    });

    return () => unsub();
  }, [orderId]);

  return null;
}
