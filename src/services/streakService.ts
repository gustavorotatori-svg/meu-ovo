import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

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
