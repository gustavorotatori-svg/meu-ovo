import { db } from '../lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, addDoc, arrayUnion, increment } from 'firebase/firestore';
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
    // Find or create loyalty profile for this customer
    const q = query(
      collection(db, 'loyalty_profiles'), 
      where('restaurantId', '==', restaurant.id),
      where('customerPhone', '==', order.customerPhone)
    );
    
    const snapshot = await getDocs(q);

    // Idempotency: check if this orderId already earned points
    if (!snapshot.empty) {
      const profileData = snapshot.docs[0].data();
      if (profileData.history?.some((h: any) => h.orderId === order.id)) return;
    }
    const historyItem = {
      type: 'earn' as const,
      points: pointsToEarn,
      description: `Pedido #${order.id}`,
      orderId: order.id,
      createdAt: new Date().toISOString()
    };

    if (snapshot.empty) {
      // Create new profile
      await addDoc(collection(db, 'loyalty_profiles'), {
        restaurantId: restaurant.id,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        pointsBalance: pointsToEarn,
        history: [historyItem]
      });
    } else {
      // Update existing profile
      const profileDoc = snapshot.docs[0];
      await updateDoc(doc(db, 'loyalty_profiles', profileDoc.id), {
        pointsBalance: increment(pointsToEarn),
        history: arrayUnion(historyItem)
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
    const profile = profileDoc.data() as LoyaltyProfile;

    if (profile.pointsBalance < pointsToRedeem) {
      throw new Error('Saldo de pontos insuficiente');
    }

    const historyItem = {
      type: 'redeem' as const,
      points: pointsToRedeem,
      description: `Resgate: ${description}`,
      createdAt: new Date().toISOString()
    };

    await updateDoc(doc(db, 'loyalty_profiles', profileDoc.id), {
      pointsBalance: increment(-pointsToRedeem),
      history: arrayUnion(historyItem)
    });

    return true;
  } catch (error) {
    console.error('Error redeeming loyalty points:', error);
    throw error;
  }
};
