import { getMessaging, getToken, onMessage, deleteToken, type Messaging } from 'firebase/messaging';
import { doc, getDoc, updateDoc, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { app } from '../lib/firebase-core';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';

const VAPID_KEY = 'BAbjQh50TTQV9EzCRVHHGo6PqG4dpKDc5U8CHDcV1l3eyRzLwvwP_C-VhWqGMmN7kQ3xlM9Y5wbfmnN74yZGP1w';
const TOKEN_REFRESH_DAYS = 7;

export type NotifType = 'order_status' | 'streak_reminder' | 'abandoned_cart' | 'achievement' | 'promotion' | 'reengagement';

export interface NotifPreferences {
  order_status: boolean;
  streak_reminder: boolean;
  abandoned_cart: boolean;
  achievement: boolean;
  promotion: boolean;
  reengagement: boolean;
}

export const DEFAULT_NOTIF_PREFERENCES: NotifPreferences = {
  order_status: true,
  streak_reminder: true,
  abandoned_cart: true,
  achievement: true,
  promotion: false,
  reengagement: true,
};

let messaging: Messaging | null = null;
let foregroundUnsub: (() => void) | null = null;

function initMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;
  if (messaging) return messaging;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const existing = Notification.permission;
  if (existing === 'granted') return 'granted';
  if (existing === 'denied') return 'denied';
  return Notification.requestPermission();
}

export async function getFCMToken(): Promise<string | null> {
  const msg = initMessaging();
  if (!msg) return null;
  const perm = await requestPushPermission();
  if (perm !== 'granted') return null;
  try {
    return await getToken(msg, { vapidKey: VAPID_KEY });
  } catch {
    return null;
  }
}

export async function saveFCMToken(userId: string): Promise<string | null> {
  try {
    const token = await getFCMToken();
    if (token) {
      await updateDoc(doc(db, 'users', userId), {
        fcmToken: token,
        lastActiveAt: new Date().toISOString(),
      });
    }
    return token;
  } catch {
    return null;
  }
}

export async function refreshTokenIfNeeded(userId: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return;
    const data = snap.data();
    const lastRefresh = data.lastActiveAt;
    if (lastRefresh) {
      const daysSince = (Date.now() - new Date(lastRefresh).getTime()) / 86400000;
      if (daysSince < TOKEN_REFRESH_DAYS) return;
    }
    await saveFCMToken(userId);
  } catch { }
}

export async function cleanupInvalidToken(userId: string): Promise<void> {
  try {
    const msg = initMessaging();
    if (!msg) return;
    await deleteToken(msg);
    await updateDoc(doc(db, 'users', userId), { fcmToken: null });
  } catch { }
}

export function listenForegroundNotifications(): () => void {
  if (foregroundUnsub) foregroundUnsub();
  const msg = initMessaging();
  if (!msg) return () => {};

  foregroundUnsub = onMessage(msg, (payload) => {
    const title = payload.notification?.title || 'Meu OVO';
    const body = payload.notification?.body || '';
    const rawClickAction = (payload as { webpush?: { fcmOptions?: { link?: string } } })?.webpush?.fcmOptions?.link || '';
    const clickAction = rawClickAction && rawClickAction.startsWith('/') && !rawClickAction.startsWith('//') ? rawClickAction : '';
    toast.custom((t) => (
      <div
        onClick={() => { if (clickAction) window.location.href = clickAction; toast.dismiss(t.id); }}
        className="flex items-center gap-3 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 shadow-xl cursor-pointer max-w-sm"
      >
        <div className="w-8 h-8 rounded-full bg-[#FFC928]/10 flex items-center justify-center text-sm shrink-0">
          {title.includes('🍳') ? '🍳' : '🔔'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-[#111] dark:text-white uppercase tracking-tight truncate">{title.replace(/[^\w\s]/g, '')}</p>
          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold truncate">{body}</p>
        </div>
      </div>
    ), { duration: 5000 });
  });

  return () => { if (foregroundUnsub) { foregroundUnsub(); foregroundUnsub = null; } };
}

export function getNotifPreferences(): NotifPreferences {
  try {
    const raw = localStorage.getItem('meuovo_notif_prefs');
    if (raw) return { ...DEFAULT_NOTIF_PREFERENCES, ...JSON.parse(raw) };
  } catch { }
  return { ...DEFAULT_NOTIF_PREFERENCES };
}

export function setNotifPreferences(prefs: NotifPreferences): void {
  try { localStorage.setItem('meuovo_notif_prefs', JSON.stringify(prefs)); } catch { }
}

export async function syncNotifPreferencesToFirestore(userId: string, prefs: NotifPreferences): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), { notifPreferences: prefs });
    setNotifPreferences(prefs);
  } catch { }
}

export async function loadNotifPreferencesFromFirestore(userId: string): Promise<NotifPreferences> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (snap.exists()) {
      const data = snap.data();
      if (data.notifPreferences) {
        const prefs = { ...DEFAULT_NOTIF_PREFERENCES, ...data.notifPreferences };
        setNotifPreferences(prefs);
        return prefs;
      }
    }
  } catch { }
  return getNotifPreferences();
}

export function trackOrderStatus(orderId: string, onStatusChange: (status: string) => void): Unsubscribe {
  const unsub = onSnapshot(doc(db, 'orders', orderId), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    if (data.status) onStatusChange(data.status);
  });
  return unsub;
}

export function showLocalNotification(title: string, body: string, onClick?: () => void): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, {
      body,
      icon: '/pwa-icon.svg',
      badge: '/pwa-icon.svg',
      ...({ vibrate: [200, 100, 200] } as NotificationOptions),
    });
    if (onClick) n.onclick = () => { n.close(); onClick(); };
  } catch { }
}

export function isPushSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}
