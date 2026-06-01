import { Restaurant, Order, Product } from '../types';

export interface ScoreData {
  restaurantId: string;
  orderCount: number;
  lastOrderDate?: string;
}

export function rankRestaurants(restaurants: Restaurant[], orders: Order[]) {
  // Count frequency of restaurants in orders
  const restaurantScores: Record<string, number> = {};
  
  orders.forEach(order => {
    // Add weight for each order
    restaurantScores[order.restaurantId] = (restaurantScores[order.restaurantId] || 0) + 1;
    
    // Bonus for recent orders (simple decay simulation)
    const orderDate = new Date(order.createdAt).getTime();
    const now = new Date().getTime();
    const daysSince = (now - orderDate) / (1000 * 60 * 60 * 24);
    
    if (daysSince < 7) {
      restaurantScores[order.restaurantId] += 0.5; // High priority for last week
    } else if (daysSince < 30) {
      restaurantScores[order.restaurantId] += 0.2; // Medium priority for last month
    }
  });

  return [...restaurants].sort((a, b) => {
    const scoreA = restaurantScores[a.id] || 0;
    const scoreB = restaurantScores[b.id] || 0;
    
    // Sort by score (intelligence)
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    
    // If scores are equal, sort by rating
    return (b.rating || 0) - (a.rating || 0);
  });
}

export function rankProducts(products: Product[], orders: Order[]) {
  const productScores: Record<string, number> = {};
  
  orders.forEach(order => {
    order.items.forEach(item => {
      productScores[item.productId] = (productScores[item.productId] || 0) + item.quantity;
    });
  });

  return [...products].sort((a, b) => {
    const scoreA = productScores[a.id] || 0;
    const scoreB = productScores[b.id] || 0;
    
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    
    // If scores are equal, featured products first
    if (a.isFeatured !== b.isFeatured) {
      return a.isFeatured ? -1 : 1;
    }
    
    return 0;
  });
}
