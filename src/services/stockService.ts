import { collection, query, where, getDocs, doc, increment, addDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Ingredient, Order, RecipeSheet } from '../types';

export interface StockDeductionResult {
  orderId: string;
  ingredientsUpdated: number;
  movementsCreated: number;
}

async function getRecipeSheets(restaurantId: string): Promise<RecipeSheet[]> {
  const q = query(collection(db, 'recipe_sheets'), where('restaurantId', '==', restaurantId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as RecipeSheet);
}

async function getIngredients(restaurantId: string): Promise<Map<string, Ingredient>> {
  const q = query(collection(db, 'ingredients'), where('restaurantId', '==', restaurantId));
  const snap = await getDocs(q);
  const map = new Map<string, Ingredient>();
  snap.docs.forEach(d => map.set(d.id, ({ id: d.id, ...d.data() }) as Ingredient));
  return map;
}

async function applyStockForOrder(
  order: Order,
  restaurantId: string,
  sign: -1 | 1,
  reasonPrefix: string
): Promise<StockDeductionResult> {
  const result: StockDeductionResult = { orderId: order.id, ingredientsUpdated: 0, movementsCreated: 0 };
  if (!order.items || order.items.length === 0) return result;

  try {
    const sheets = await getRecipeSheets(restaurantId);
    if (sheets.length === 0) return result;
    const byProduct = new Map(sheets.map(s => [s.productId, s]));
    const ingredientMap = await getIngredients(restaurantId);

    for (const item of order.items) {
      const sheet = byProduct.get(item.productId);
      if (!sheet || !sheet.ingredients || sheet.ingredients.length === 0) continue;

      for (const recipeIng of sheet.ingredients) {
        const ingredientRef = doc(db, 'ingredients', recipeIng.ingredientId);
        const totalQty = (recipeIng.quantity || 0) * (item.quantity || 1);
        if (totalQty <= 0) continue;
        const unitCost = ingredientMap.get(recipeIng.ingredientId)?.costPerUnit || 0;

        await updateDoc(ingredientRef, {
          stock: increment(sign * totalQty),
        });
        result.ingredientsUpdated++;

        await addDoc(collection(db, 'ingredient_movements'), {
          restaurantId,
          ingredientId: recipeIng.ingredientId,
          ingredientName: recipeIng.ingredientName || ingredientMap.get(recipeIng.ingredientId)?.name || '',
          type: 'sale',
          quantity: sign * totalQty,
          unitCost,
          reason: `${reasonPrefix} - ${item.productName} (${item.quantity}x)`,
          orderId: order.id,
          createdAt: new Date().toISOString(),
        });
        result.movementsCreated++;
      }
    }
  } catch (error) {
    console.error('[Stock] Erro ao aplicar estoque:', error);
  }
  return result;
}

export async function deductStockForOrder(order: Order, restaurantId: string): Promise<StockDeductionResult> {
  return applyStockForOrder(order, restaurantId, -1, 'Venda');
}

export async function restoreStockForOrder(order: Order, restaurantId: string): Promise<StockDeductionResult> {
  return applyStockForOrder(order, restaurantId, 1, 'Cancelamento');
}

