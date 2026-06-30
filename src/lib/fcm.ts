import { getMessaging, getToken, onMessage, type Messaging } from 'firebase/messaging';
import { app } from './firebase-core';

const VAPID_KEY = 'BAbjQh50TTQV9EzCRVHHGo6PqG4dpKDc5U8CHDcV1l3eyRzLwvwP_C-VhWqGMmN7kQ3xlM9Y5wbfmnN74yZGP1w';

let messaging: Messaging | null = null;

export function initMessaging() {
  if (typeof window === 'undefined') return null;
  if (!('Notification' in window)) return null;
  try {
    messaging = getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export async function getFCMToken(): Promise<string | null> {
  const msg = initMessaging();
  if (!msg) return null;

  const perm = await requestPermission();
  if (perm !== 'granted') return null;

  try {
    const token = await getToken(msg, { vapidKey: VAPID_KEY });
    return token;
  } catch {
    return null;
  }
}

export function onForegroundMessage(callback: (payload: any) => void) {
  const msg = initMessaging();
  if (!msg) return () => {};
  return onMessage(msg, callback);
}
