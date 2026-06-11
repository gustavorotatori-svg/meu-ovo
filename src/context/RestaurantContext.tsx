import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Restaurant, Product, Category, Order, Table, DeliverySettings, CashierSession } from '../types';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  setDoc,
  orderBy,
  getDocs,
  arrayUnion
} from 'firebase/firestore';

interface RestaurantContextType {
  currentRestaurant: Restaurant | null;
  setCurrentRestaurant: (r: Restaurant | null) => void;
  restaurants: Restaurant[];
  products: Product[];
  categories: Category[];
  orders: Order[];
  tables: Table[];
  deliverySettings: DeliverySettings;
  cashierSessions: CashierSession[];
  activeSession: CashierSession | null;
  favorites: string[];
  toggleFavorite: (restaurantId: string) => void;
  addProduct: (p: Product) => Promise<void>;
  updateProduct: (p: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  addOrder: (o: Order) => Promise<void>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  addCategory: (c: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderProducts: (products: Product[]) => void;
  reorderCategories: (categories: Category[]) => void;
  registerRestaurant: (restaurant: Restaurant, categories: string[], products: any[]) => Promise<void>;
  addTable: (t: Table) => Promise<void>;
  updateTable: (t: Table) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  openCashier: (amount: number, user: string) => void;
  closeCashier: (amount: number) => void;
  addCashierMovement: (type: 'withdrawal' | 'addition', amount: number, reason: string) => void;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>({
    fee: 0,
    minimumOrder: 0,
    freeDeliveryRadius: 0,
    maxDeliveryRadius: 10
  });
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [cashierSessions, setCashierSessions] = useState<CashierSession[]>([]);
  const [activeSession, setActiveSession] = useState<CashierSession | null>(null);

  // Load cashier sessions from Firestore when currentRestaurant changes
  useEffect(() => {
    if (!currentRestaurant) {
      setCashierSessions([]);
      setActiveSession(null);
      return;
    }
    const qSessions = query(
      collection(db, 'cashier_sessions'),
      where('restaurantId', '==', currentRestaurant.id),
      orderBy('openedAt', 'desc')
    );
    const unsub = onSnapshot(qSessions, (snapshot) => {
      const sessions = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CashierSession));
      setCashierSessions(sessions);
      const open = sessions.find(s => s.status === 'open');
      setActiveSession(open || null);
    }, () => {});
    return unsub;
  }, [currentRestaurant]);

  // Favorites state and persistence
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('meuovo_favorites');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error("Error reading favorites from localStorage:", e);
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem('meuovo_favorites', JSON.stringify(favorites)); } catch (e) {}
  }, [favorites]);

  const toggleFavorite = (restaurantId: string) => {
    setFavorites(prev => {
      const isAlreadyFav = prev.includes(restaurantId);
      if (isAlreadyFav) {
        toast.success('Removido dos favoritos!');
        return prev.filter(id => id !== restaurantId);
      } else {
        toast.success('Adicionado aos favoritos!');
        return [...prev, restaurantId];
      }
    });
  };

  // Listen to restaurants from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      setRestaurants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Restaurant)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'restaurants'));
    return unsub;
  }, []);

  // Set currentRestaurant based on user's owned restaurant
  useEffect(() => {
    if (!user || user.role !== 'restaurant') {
      setCurrentRestaurant(null);
      return;
    }
    const q = query(collection(db, 'restaurants'), where('ownerId', '==', user.id));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0];
        setCurrentRestaurant({ id: data.id, ...data.data() } as Restaurant);
      } else {
        setCurrentRestaurant(null);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'restaurants'));
    return unsub;
  }, [user]);

  // Real-time listeners for products, categories, orders, tables, delivery settings
  useEffect(() => {
    if (!currentRestaurant) return;

    // Listen to Products
    const qProducts = query(collection(db, 'products'), where('restaurantId', '==', currentRestaurant.id));
    const unsubProducts = onSnapshot(qProducts, (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'products'));

    // Listen to Categories
    const qCats = query(collection(db, 'categories'), where('restaurantId', '==', currentRestaurant.id));
    const unsubCats = onSnapshot(qCats, (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'categories'));

    // Listen to Orders
    let unsubOrders = () => {};
    const isOwner = user && currentRestaurant.ownerId === user.id;

    if (isOwner) {
      const qOrders = query(
        collection(db, 'orders'),
        where('restaurantId', '==', currentRestaurant.id),
        orderBy('createdAt', 'desc')
      );
      unsubOrders = onSnapshot(qOrders, (snapshot) => {
        setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'orders');
        }
      });
    }

    // Listen to Tables
    let unsubTables = () => {};
    if (isOwner) {
      const qTables = query(collection(db, 'tables'), where('restaurantId', '==', currentRestaurant.id));
      unsubTables = onSnapshot(qTables, (snapshot) => {
        setTables(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table)));
      }, (error) => {
        if (error.code !== 'permission-denied') {
          handleFirestoreError(error, OperationType.LIST, 'tables');
        }
      });
    }

    // Listen to Delivery Settings
    const unsubDelivery = onSnapshot(doc(db, 'deliverySettings', currentRestaurant.id), (snapshot) => {
      if (snapshot.exists()) {
        setDeliverySettings(snapshot.data() as DeliverySettings);
      }
    }, () => {});

    return () => {
      unsubProducts();
      unsubCats();
      unsubOrders();
      unsubTables();
      unsubDelivery();
    };
  }, [currentRestaurant, user]);

  const addProduct = async (p: Product) => {
    try {
      const { id, ...data } = p;
      await setDoc(doc(db, 'products', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${p.id}`);
    }
  };

  const updateProduct = async (p: Product) => {
    try {
      const { id, ...data } = p;
      await updateDoc(doc(db, 'products', id), data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${p.id}`);
    }
  };

  const deleteProduct = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  };

  const addOrder = async (o: Order) => {
    try {
      const { id, ...data } = o;
      if (id) {
        await setDoc(doc(db, 'orders', id), data);
      } else {
        await addDoc(collection(db, 'orders'), data);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
    }
  };

  const updateOrderStatus = async (id: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${id}`);
    }
  };

  const addCategory = async (c: Category) => {
    try {
      const { id, ...data } = c;
      await setDoc(doc(db, 'categories', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categories/${c.id}`);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  };

  const reorderProducts = (newProducts: Product[]) => {
    // In a real app, you might update a 'sortOrder' field in Firestore
    setProducts(newProducts);
  };

  const reorderCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
  };

  const registerRestaurant = async (restaurant: Restaurant, categoryNames: string[], productData: any[]) => {
    try {
      if (!auth.currentUser?.uid) {
        toast.error('Você precisa estar logado para cadastrar um restaurante');
        return;
      }
      // 1. Create Restaurant
      const { id: rId, ...rData } = restaurant;
      const finalRData = {
        ...rData,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'restaurants', rId), finalRData);

      // 2. Create Categories
      const catMap: Record<string, string> = {};
      for (const name of categoryNames) {
        const catId = Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'categories', catId), {
          id: catId,
          restaurantId: rId,
          name,
          order: 0
        });
        catMap[name] = catId;
      }

      // 3. Create Products
      for (const p of productData) {
        const prodId = Math.random().toString(36).substr(2, 9);
        const productPrice = parseFloat(p.price);
        await setDoc(doc(db, 'products', prodId), {
          id: prodId,
          restaurantId: rId,
          name: p.name,
          price: isNaN(productPrice) ? 0 : productPrice,
          categoryId: catMap[p.category] || '',
          image: p.image || undefined,
          description: p.description || undefined,
          isActive: true,
          isAvailable: true
        });
      }

      setCurrentRestaurant({ ...restaurant, ...finalRData });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'restaurants/multi');
    }
  };

  const addTable = async (t: Table) => {
    try {
      const { id, ...data } = t;
      await setDoc(doc(db, 'tables', id), {
        ...data,
        status: data.status || 'free'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tables/${t.id}`);
    }
  };

  const updateTable = async (t: Table) => {
    try {
      const { id, ...data } = t;
      await updateDoc(doc(db, 'tables', id), data as any);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tables/${t.id}`);
    }
  };

  const deleteTable = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tables', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tables/${id}`);
    }
  };

  const openCashier = async (amount: number, user: string) => {
    const newSession: Omit<CashierSession, 'id'> = {
      restaurantId: currentRestaurant?.id || '',
      openedAt: new Date().toISOString(),
      openedBy: user,
      openingAmount: amount,
      totalSales: 0,
      status: 'open',
      withdrawals: [],
      additions: [],
    };
    try {
      const docRef = await addDoc(collection(db, 'cashier_sessions'), newSession);
      const created = { id: docRef.id, ...newSession } as CashierSession;
      setActiveSession(created);
      setCashierSessions(prev => [created, ...prev]);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cashier_sessions');
    }
  };

  const closeCashier = async (amount: number) => {
    if (!activeSession) return;
    try {
      await updateDoc(doc(db, 'cashier_sessions', activeSession.id), {
        closedAt: new Date().toISOString(),
        closingAmount: amount,
        status: 'closed',
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cashier_sessions');
    }
  };

  const addCashierMovement = async (type: 'withdrawal' | 'addition', amount: number, reason: string) => {
    if (!activeSession) return;
    const movement = { amount, reason, time: new Date().toISOString() };
    try {
      const sessionRef = doc(db, 'cashier_sessions', activeSession.id);
      if (type === 'withdrawal') {
        await updateDoc(sessionRef, {
          withdrawals: arrayUnion(movement),
        } as any);
      } else {
        await updateDoc(sessionRef, {
          additions: arrayUnion(movement),
        } as any);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cashier_sessions');
    }
  };

  return (
    <RestaurantContext.Provider value={{
      currentRestaurant, setCurrentRestaurant, restaurants, products, categories,
      orders, tables, deliverySettings, cashierSessions, activeSession,
      favorites, toggleFavorite,
      addProduct, updateProduct, deleteProduct,
      addOrder, updateOrderStatus, addCategory, deleteCategory, reorderProducts, reorderCategories,
      registerRestaurant,
      addTable, updateTable, deleteTable, openCashier, closeCashier, addCashierMovement
    }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used within RestaurantProvider');
  return ctx;
}
