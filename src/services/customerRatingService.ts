import { db } from '../lib/firebase';
import { collection, query, where, getDocs, setDoc, doc, getDoc } from 'firebase/firestore';
import { CustomerRating } from '../types';

/**
 * Normalizes a phone number to digits-only for consistent querying.
 */
export const normalizePhone = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

/**
 * Submits or updates a customer rating for a specific order and restaurant.
 * Each order is limited to one rating to prevent duplicate entries.
 */
export const submitCustomerRating = async (ratingData: Omit<CustomerRating, 'id' | 'createdAt'>): Promise<CustomerRating> => {
  const cleanPhone = normalizePhone(ratingData.customerPhone);
  const ratingId = `rating_${ratingData.restaurantId}_${ratingData.orderId || Math.random().toString(36).substr(2, 9)}`;
  
  const rating: CustomerRating = {
    ...ratingData,
    id: ratingId,
    createdAt: new Date().toISOString()
  };

  try {
    // Save to Firestore 'customer_ratings' collection
    await setDoc(doc(db, 'customer_ratings', ratingId), {
      ...rating,
      customerPhoneClean: cleanPhone,
      createdAt: new Date() // Store as server-side compatible timestamp or let Firestore rules check it
    });
    
    return rating;
  } catch (error) {
    console.error('Error submitting customer rating:', error);
    throw error;
  }
};

/**
 * Fetches all ratings given to a specific customer's phone number across the whole platform.
 */
export const fetchCustomerRatings = async (customerPhone: string): Promise<CustomerRating[]> => {
  const cleanPhone = normalizePhone(customerPhone);
  if (!cleanPhone) return [];

  try {
    const q = query(
      collection(db, 'customer_ratings'),
      where('customerPhoneClean', '==', cleanPhone)
    );
    
    const snapshot = await getDocs(q);
    const ratings: CustomerRating[] = [];
    
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Ensure compatible structure
      ratings.push({
        id: docSnap.id,
        restaurantId: data.restaurantId || '',
        orderId: data.orderId || '',
        customerPhone: data.customerPhone || '',
        customerName: data.customerName || '',
        rating: typeof data.rating === 'number' ? data.rating : 5,
        comment: data.comment || '',
        tags: data.tags || [],
        createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : (data.createdAt?.toDate?.()?.toISOString() || data.createdAt || new Date().toISOString())
      });
    });
    
    return ratings;
  } catch (error) {
    console.error('Error fetching customer ratings:', error);
    return [];
  }
};

export interface CustomerStats {
  averageRating: number;
  totalRatings: number;
  isProblematic: boolean;
  statusText: 'Excelente' | 'Bom' | 'Regular' | 'Problemático' | 'Sem avaliações';
  tagsSummary: Record<string, number>;
  ratings: CustomerRating[];
}

/**
 * Summarizes the platform performance stats for a customer.
 */
export const getCustomerStats = async (customerPhone: string): Promise<CustomerStats> => {
  const ratings = await fetchCustomerRatings(customerPhone);
  
  if (ratings.length === 0) {
    return {
      averageRating: 0,
      totalRatings: 0,
      isProblematic: false,
      statusText: 'Sem avaliações',
      tagsSummary: {},
      ratings: []
    };
  }

  const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
  const averageRating = parseFloat((sum / ratings.length).toFixed(1));
  
  const tagsSummary: Record<string, number> = {};
  ratings.forEach((r) => {
    r.tags?.forEach((tag) => {
      tagsSummary[tag] = (tagsSummary[tag] || 0) + 1;
    });
  });

  // Problematic defined if average rating is less than 3.5 or has critical bad feedback tags
  const badTags = ['Demorou para responder', 'Endereço incorreto', 'Ofensivo/Grosseiro', 'Não atendeu/recusou entrega', 'Trote / Mentira'];
  const hasMultipleBadTags = ratings.some(r => r.tags?.some(t => badTags.includes(t)));
  const isProblematic = averageRating < 3.2 || (averageRating < 4.0 && hasMultipleBadTags);

  let statusText: CustomerStats['statusText'] = 'Bom';
  if (averageRating >= 4.5) statusText = 'Excelente';
  else if (averageRating >= 3.5) statusText = 'Bom';
  else if (averageRating >= 3.0) statusText = 'Regular';
  else statusText = 'Problemático';

  return {
    averageRating,
    totalRatings: ratings.length,
    isProblematic,
    statusText,
    tagsSummary,
    ratings
  };
};

/**
 * Counts how many orders a customer has placed at a specific restaurant.
 */
export const getCustomerOrderCount = async (customerPhone: string, restaurantId: string): Promise<number> => {
  const cleanPhone = normalizePhone(customerPhone);
  if (!cleanPhone || !restaurantId) return 0;

  try {
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', restaurantId),
      where('customerPhone', '==', cleanPhone)
    );
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting customer orders:', error);
    return 0;
  }
};

/**
 * Checks coupon targeting rules against a customer's profile.
 */
export const checkCouponTargeting = async (
  coupon: import('../types').Coupon,
  customerPhone: string,
  restaurantId: string
): Promise<{ valid: boolean; reason?: string }> => {
  if (coupon.targetAudience === 'all') return { valid: true };

  const stats = await getCustomerStats(customerPhone);
  const orderCount = await getCustomerOrderCount(customerPhone, restaurantId);

  switch (coupon.targetAudience) {
    case 'new':
      if (orderCount > 0) return { valid: false, reason: 'Este cupom é apenas para novos clientes' };
      return { valid: true };

    case 'returning':
      if (orderCount < (coupon.targetMinOrders || 1)) return { valid: false, reason: 'Este cupom é apenas para clientes recorrentes' };
      return { valid: true };

    case 'by_rating':
      if (stats.totalRatings === 0) return { valid: false, reason: 'Este cupom exige um histórico de avaliações' };
      if (coupon.targetMinRating && stats.averageRating < coupon.targetMinRating) {
        return { valid: false, reason: `Este cupom exige rating mínimo de ${coupon.targetMinRating}★ (seu rating: ${stats.averageRating.toFixed(1)}★)` };
      }
      if (coupon.targetMaxRating && stats.averageRating > coupon.targetMaxRating) {
        return { valid: false, reason: `Este cupom é apenas para ratings até ${coupon.targetMaxRating}★ (seu rating: ${stats.averageRating.toFixed(1)}★)` };
      }
      return { valid: true };

    case 'by_orders':
      if (orderCount < (coupon.targetMinOrders || 1)) {
        return { valid: false, reason: `Este cupom exige no mínimo ${coupon.targetMinOrders} pedidos realizados (você tem ${orderCount})` };
      }
      return { valid: true };

    default:
      return { valid: true };
  }
};
