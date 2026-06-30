import { Restaurant, Order } from '../types';
import { UserProfile } from './userPreferences';

export interface ScoredRestaurant extends Restaurant {
  _score: number;
}

export function scoreRestaurantsForUser(
  restaurants: Restaurant[],
  orders: Order[],
  profile: UserProfile
): ScoredRestaurant[] {
  const orderCounts: Record<string, number> = {};
  orders.forEach(o => {
    orderCounts[o.restaurantId] = (orderCounts[o.restaurantId] || 0) + 1;
  });

  return restaurants.map(r => {
    let score = 0;

    const cuisineRank = profile.preferredCuisines.indexOf(r.cuisineType);
    if (cuisineRank >= 0) {
      score += 35 * (1 - cuisineRank / Math.max(profile.preferredCuisines.length, 1));
    }

    const cuisineClickWeight = profile.cuisineRestaurantCount[r.cuisineType] || 0;
    if (cuisineClickWeight > 0) {
      score += Math.min(cuisineClickWeight * 5, 20);
    }

    if (profile.viewedRestaurants.includes(r.id)) {
      score += 15;
    }

    score += ((r.rating ?? 0) / 5) * 15;

    const orderCount = orderCounts[r.id] || 0;
    score += Math.min(orderCount * 10, 15);

    return { ...r, _score: score };
  }).sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
}
