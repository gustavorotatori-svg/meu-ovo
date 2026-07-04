import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Achievement {
  id: string;
  label: string;
  icon: string;
  description: string;
  condition: (stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  orderCount: number;
  streakDays: number;
  totalDonated: number;
  totalSpent: number;
  favoriteCount: number;
  hasPix: boolean;
}

export interface AchievementState {
  unlocked: string[];
  lastChecked: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_order', label: 'Primeiro Pedido', icon: '🎉', description: 'Finalizou seu primeiro pedido', condition: s => s.orderCount >= 1 },
  { id: 'five_orders', label: 'Cliente Frequente', icon: '⭐', description: '5 pedidos realizados', condition: s => s.orderCount >= 5 },
  { id: 'ten_orders', label: 'Veterano', icon: '🏆', description: '10 pedidos realizados', condition: s => s.orderCount >= 10 },
  { id: 'streak_3', label: 'Streak de 3 dias', icon: '🔥', description: 'Pediu 3 dias seguidos', condition: s => s.streakDays >= 3 },
  { id: 'streak_7', label: 'Streak de 7 dias', icon: '⚡', description: 'Pediu 7 dias seguidos', condition: s => s.streakDays >= 7 },
  { id: 'donation', label: 'Coração Solidário', icon: '❤️', description: 'Fez sua primeira doação', condition: s => s.totalDonated > 0 },
  { id: 'big_donor', label: 'Doador Ouro', icon: '💛', description: 'Doou mais de R$ 50', condition: s => s.totalDonated >= 50 },
  { id: 'pix_payment', label: 'PIX na Veia', icon: '💸', description: 'Pagou com PIX', condition: s => s.hasPix },
  { id: 'favorites_5', label: 'Colecionador', icon: '💝', description: 'Favoritou 5 restaurantes', condition: s => s.favoriteCount >= 5 },
  { id: 'big_spender', label: 'Gourmet', icon: '🍽️', description: 'Gastou mais de R$ 500 em pedidos', condition: s => s.totalSpent >= 500 },
];

export function getAllAchievements(): Achievement[] {
  return ALL_ACHIEVEMENTS;
}

export async function getAchievements(userId: string): Promise<AchievementState> {
  try {
    const snap = await getDoc(doc(db, 'achievements', userId));
    if (snap.exists()) return snap.data() as AchievementState;
  } catch { }
  return { unlocked: [], lastChecked: '' };
}

export async function checkAndAwardAchievements(userId: string, stats: AchievementStats): Promise<string[]> {
  const state = await getAchievements(userId);
  const newlyUnlocked: string[] = [];

  for (const a of ALL_ACHIEVEMENTS) {
    if (!state.unlocked.includes(a.id) && a.condition(stats)) {
      newlyUnlocked.push(a.id);
    }
  }

  if (newlyUnlocked.length > 0) {
    try {
      await setDoc(doc(db, 'achievements', userId), {
        unlocked: [...state.unlocked, ...newlyUnlocked],
        lastChecked: new Date().toISOString(),
      });
    } catch { }
  }

  return newlyUnlocked;
}
