import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, addDoc, arrayUnion, increment, runTransaction } from 'firebase/firestore';
import { Restaurant, Order, LoyaltyProfile } from '../types';

export const awardLoyaltyPoints = async (order: Order, restaurant: Restaurant) => {
  if (!restaurant.loyaltySettings?.enabled) return;

  const { pointsPerReal, pointsPerOrder, accumulationType } = restaurant.loyaltySettings;
  let pointsToEarn = 0;

  if (accumulationType === 'amount') {
    pointsToEarn = Math.floor(order.total * (pointsPerReal || 1));
  } else {
    pointsToEarn = pointsPerOrder || 10;
  }

  if (pointsToEarn <= 0) return;

  try {
    const q = query(
      collection(db, 'loyalty_profiles'),
      where('restaurantId', '==', restaurant.id),
      where('customerPhone', '==', order.customerPhone)
    );
    const snapshot = await getDocs(q);

    const historyItem = {
      type: 'earn' as const,
      points: pointsToEarn,
      description: `Pedido #${order.id}`,
      orderId: order.id,
      createdAt: new Date().toISOString()
    };

    if (snapshot.empty) {
      await addDoc(collection(db, 'loyalty_profiles'), {
        restaurantId: restaurant.id,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        pointsBalance: pointsToEarn,
        history: [historyItem]
      });
    } else {
      const profileDoc = snapshot.docs[0];
      const profileRef = doc(db, 'loyalty_profiles', profileDoc.id);
      await runTransaction(db, async (transaction) => {
        const tDoc = await transaction.get(profileRef);
        if (!tDoc.exists()) return;
        const tData = tDoc.data();
        if (tData.history?.some((h: any) => h.orderId === order.id)) return;
        transaction.update(profileRef, {
          pointsBalance: increment(pointsToEarn),
          history: arrayUnion(historyItem)
        });
      });
    }
  } catch (error) {
    console.error('Error awarding loyalty points:', error);
  }
};

export const redeemLoyaltyPoints = async (
  restaurantId: string, 
  customerPhone: string, 
  pointsToRedeem: number, 
  description: string
) => {
  try {
    const q = query(
      collection(db, 'loyalty_profiles'), 
      where('restaurantId', '==', restaurantId),
      where('customerPhone', '==', customerPhone)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) throw new Error('Perfil de fidelidade não encontrado');

    const profileDoc = snapshot.docs[0];
    const profileRef = doc(db, 'loyalty_profiles', profileDoc.id);

    const result = await runTransaction(db, async (transaction) => {
      const tDoc = await transaction.get(profileRef);
      if (!tDoc.exists()) throw new Error('Perfil de fidelidade não encontrado');
      const tData = tDoc.data() as LoyaltyProfile;

      if (tData.pointsBalance < pointsToRedeem) {
        throw new Error('Saldo de pontos insuficiente');
      }

      const historyItem = {
        type: 'redeem' as const,
        points: pointsToRedeem,
        description: `Resgate: ${description}`,
        createdAt: new Date().toISOString()
      };

      transaction.update(profileRef, {
        pointsBalance: increment(-pointsToRedeem),
        history: arrayUnion(historyItem)
      });
      return true;
    });

    return result;
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
    throw error;
  }
};
