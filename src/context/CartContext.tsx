import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '../types';

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  tableNumber: string | null;
  setTableNumber: (n: string | null) => void;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

function loadCart(): CartItem[] {
  try {
    const stored = localStorage.getItem('meuovo_cart');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function loadRestaurantId(): string | null {
  try {
    const stored = localStorage.getItem('meuovo_cart_restaurant');
    return stored || null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart);
  const [restaurantId, setRestaurantId] = useState<string | null>(loadRestaurantId);
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('meuovo_cart', JSON.stringify(items));
    if (restaurantId) {
      localStorage.setItem('meuovo_cart_restaurant', restaurantId);
    } else {
      localStorage.removeItem('meuovo_cart_restaurant');
    }
  }, [items, restaurantId]);

  const addItem = (item: CartItem) => {
    if (restaurantId && restaurantId !== item.product.restaurantId) {
      setItems([item]);
      setRestaurantId(item.product.restaurantId);
      setTableNumber(null);
      import('react-hot-toast').then(({ toast }) => {
        toast.success('Seu carrinho foi atualizado com o seu novo restaurante escolhido! 🍳', {
          id: 'cart-switch-toast',
        });
      });
      return;
    }
    setRestaurantId(item.product.restaurantId);

    // Merge with existing item if same product + same additionals
    setItems(prev => {
      const existingIdx = prev.findIndex(existing =>
        existing.product.id === item.product.id &&
        existing.observations === item.observations &&
        JSON.stringify(existing.selectedAdditionals) === JSON.stringify(item.selectedAdditionals)
      );
      if (existingIdx >= 0) {
        return prev.map((existing, i) =>
          i === existingIdx ? { ...existing, quantity: existing.quantity + item.quantity } : existing
        );
      }
      return [...prev, item];
    });
  };

  const removeItem = (index: number) => {
    setItems(prev => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 0) {
        setRestaurantId(null);
        setTableNumber(null);
      }
      return next;
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) { removeItem(index); return; }
    setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
  };

  const clearCart = () => {
    setItems([]);
    setRestaurantId(null);
    setTableNumber(null);
  };

  const subtotal = items.reduce((sum, item) => {
    const additionalsTotal = (item.selectedAdditionals || []).reduce((s, a) => s + a.price, 0);
    const basePrice = item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price;
    return sum + (basePrice + additionalsTotal) * item.quantity;
  }, 0);

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, restaurantId, tableNumber, setTableNumber, addItem, removeItem, updateQuantity, clearCart, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
