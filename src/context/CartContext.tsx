import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CartItem } from '../types';

const CART_KEY = 'meuovo_cart';

function loadCart(): { items: CartItem[]; restaurantId: string | null; tableNumber: string | null } {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return { items: [], restaurantId: null, tableNumber: null };
    const parsed = JSON.parse(raw);
    return {
      items: parsed.items || [],
      restaurantId: parsed.restaurantId || null,
      tableNumber: parsed.tableNumber || null,
    };
  } catch {
    return { items: [], restaurantId: null, tableNumber: null };
  }
}

function saveCart(items: CartItem[], restaurantId: string | null, tableNumber: string | null) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify({ items, restaurantId, tableNumber }));
  } catch (e) {
    console.error('Error saving cart to localStorage:', e);
  }
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  tableNumber: string | null;
  setTableNumber: (n: string | null) => void;
  addItem: (item: CartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  total: number;
  subtotal: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(loadCart().items);
  const [restaurantId, setRestaurantId] = useState<string | null>(loadCart().restaurantId);
  const [tableNumber, setTableNumber] = useState<string | null>(loadCart().tableNumber);

  useEffect(() => {
    saveCart(items, restaurantId, tableNumber);
  }, [items, restaurantId, tableNumber]);

  const addItem = (item: CartItem) => {
    if (restaurantId && restaurantId !== item.product.restaurantId) {
      if (!window.confirm('Seu carrinho tem itens de outro restaurante. Deseja limpar e adicionar este item?')) return;
      setItems([item]);
      setRestaurantId(item.product.restaurantId);
      setTableNumber(null);
      return;
    }
    setRestaurantId(item.product.restaurantId);
    setItems(prev => [...prev, item]);
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
    localStorage.removeItem(CART_KEY);
  };

  const subtotal = items.reduce((sum, item) => {
    const additionalsTotal = item.selectedAdditionals.reduce((s, a) => s + a.price, 0);
    const basePrice = item.product.onPromotion && item.product.promotionPrice ? item.product.promotionPrice : item.product.price;
    return sum + (basePrice + additionalsTotal) * item.quantity;
  }, 0);

  const total = subtotal;
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, restaurantId, tableNumber, setTableNumber, addItem, removeItem, updateQuantity, clearCart, total, subtotal, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
