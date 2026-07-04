import { doc, getDoc, setDoc, updateDoc, increment, runTransaction } from 'firebase/firestore';
import { db } from '../lib/firebase';

const POINTS_PER_REAL = 1;
const REDEMPTION_RATE = 20;

export interface PlatformPointsProfile {
  userId: string;
  totalPoints: number;
  lifetimePoints: number;
  pointsHistory: { amount: number; type: 'earn' | 'redeem'; description: string; createdAt: string }[];
  updatedAt: string;
}

export async function getPlatformPoints(userId: string): Promise<PlatformPointsProfile> {
  try {
    const snap = await getDoc(doc(db, 'platform_loyalty', userId));
    if (snap.exists()) return snap.data() as PlatformPointsProfile;
  } catch { }
  return { userId, totalPoints: 0, lifetimePoints: 0, pointsHistory: [], updatedAt: new Date().toISOString() };
}

export async function awardPlatformPoints(userId: string, orderTotal: number) {
  const pointsEarned = Math.floor(orderTotal * POINTS_PER_REAL);
  if (pointsEarned <= 0) return null;

  try {
    const ref = doc(db, 'platform_loyalty', userId);
    const existing = await getPlatformPoints(userId);

    const updated = {
      userId,
      totalPoints: existing.totalPoints + pointsEarned,
      lifetimePoints: existing.lifetimePoints + pointsEarned,
      pointsHistory: [
        ...existing.pointsHistory,
        { amount: pointsEarned, type: 'earn' as const, description: `Pedido de R$ ${orderTotal.toFixed(2)}`, createdAt: new Date().toISOString() }
      ].slice(-100),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(ref, updated);
    return { earned: pointsEarned, total: updated.totalPoints };
  } catch {
    return null;
  }
}

export async function redeemPlatformPoints(userId: string, pointsToRedeem: number) {
  if (pointsToRedeem < 100) return null;

  const profile = await getPlatformPoints(userId);
  if (profile.totalPoints < pointsToRedeem) return null;

  const discountValue = Math.floor(pointsToRedeem / REDEMPTION_RATE);

  try {
    const ref = doc(db, 'platform_loyalty', userId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error('Profile not found');
      const data = snap.data() as PlatformPointsProfile;
      if (data.totalPoints < pointsToRedeem) throw new Error('Insufficient points');

      transaction.update(ref, {
        totalPoints: increment(-pointsToRedeem),
        pointsHistory: [
          ...data.pointsHistory,
          { amount: -pointsToRedeem, type: 'redeem', description: `Resgate: R$ ${discountValue.toFixed(2)} de desconto`, createdAt: new Date().toISOString() }
        ].slice(-100),
        updatedAt: new Date().toISOString(),
      });
    });

    return { discountCents: discountValue, pointsUsed: pointsToRedeem };
  } catch {
    return null;
  }
}

export function pointsToDiscount(points: number) {
  return Math.floor(points / REDEMPTION_RATE);
}
