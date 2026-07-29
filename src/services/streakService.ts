import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { showLocalNotification, getNotifPreferences } from './notificationService';

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastOrderDate: string;
  streakHistory: string[];
}

export interface MilestoneInfo {
  days: number;
  label: string;
  reward: string;
}

export interface UpdateStreakResult {
  updated: StreakData;
  milestone: MilestoneInfo | null;
}

const MILESTONES = [
  { days: 3, label: '🔥 3 dias seguidos', reward: '5% de desconto' },
  { days: 7, label: '⚡ 7 dias seguidos', reward: 'Frete grátis' },
  { days: 14, label: '💫 14 dias seguidos', reward: '10% de desconto' },
  { days: 30, label: '👑 30 dias seguidos', reward: '15% de desconto + brinde' },
];

export function getMilestones() {
  return MILESTONES;
}

export function getNextMilestone(currentStreak: number) {
  return MILESTONES.find(m => m.days > currentStreak) || null;
}

export async function getStreak(userId: string): Promise<StreakData> {
  try {
    const snap = await getDoc(doc(db, 'streaks', userId));
    if (snap.exists()) return snap.data() as StreakData;
  } catch { }
  return { currentStreak: 0, longestStreak: 0, lastOrderDate: '', streakHistory: [] };
}

export async function updateStreak(userId: string): Promise<UpdateStreakResult> {
  const streak = await getStreak(userId);
  const today = new Date().toLocaleDateString('sv-SE');
  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');

  let newStreak = 1;
  if (streak.lastOrderDate === today) {
    return { updated: streak, milestone: null };
  }
  if (streak.lastOrderDate === yesterday) {
    newStreak = streak.currentStreak + 1;
  }

  const updated: StreakData = {
    currentStreak: newStreak,
    longestStreak: Math.max(newStreak, streak.longestStreak),
    lastOrderDate: today,
    streakHistory: [...streak.streakHistory, today].slice(-90),
  };

  try {
    await setDoc(doc(db, 'streaks', userId), updated);
  } catch { }

  const milestone = MILESTONES.find(m => m.days === newStreak) || null;
  return { updated, milestone };
}

const STREAK_REMINDER_KEY = 'meuovo_streak_reminded';

export function shouldRemindStreak(streak: StreakData): boolean {
  if (streak.currentStreak === 0) return false;
  const today = new Date().toLocaleDateString('sv-SE');
  if (streak.lastOrderDate === today) return false;
  try {
    const lastReminded = localStorage.getItem(STREAK_REMINDER_KEY);
    if (lastReminded === today) return false;
  } catch { }
  return true;
}

export function markStreakReminded(): void {
  try {
    localStorage.setItem(STREAK_REMINDER_KEY, new Date().toLocaleDateString('sv-SE'));
  } catch { }
}

export function checkStreakReminder(streak: StreakData): void {
  if (!shouldRemindStreak(streak)) return;
  const prefs = getNotifPreferences();
  if (!prefs.streak_reminder) return;
  markStreakReminded();
  showLocalNotification(
    '🔥 Streak em risco!',
    `Você está com ${streak.currentStreak} dia(s) seguidos! Faça um pedido hoje para não perder sua sequência.`
  );
}
