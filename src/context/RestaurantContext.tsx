import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { Restaurant, Product, Category, Order, Table, DeliverySettings, CashierSession } from '../types';
import { auth } from '../lib/firebase-auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from './AuthContext';
import { toast } from 'react-hot-toast';
import { mockRestaurants, mockProducts, mockCategories, mockOrders, mockTables, mockDeliverySettings } from '../data/mockData';
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
  getDoc,
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
  registerRestaurant: (restaurant: Restaurant, categories: string[], products: any[]) => Promise<string | undefined>;
  addTable: (t: Table) => Promise<void>;
  updateTable: (t: Table) => Promise<void>;
  deleteTable: (id: string) => Promise<void>;
  openCashier: (amount: number, user: string) => void;
  closeCashier: (amount: number) => void;
  addCashierMovement: (type: 'withdrawal' | 'addition', amount: number, reason: string) => void;
}

const RestaurantContext = createContext<RestaurantContextType | null>(null);

function sanitizeForFirestore<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore) as unknown as T;
  }
  if (value && typeof value === 'object') {
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (v !== undefined) {
        clean[k] = sanitizeForFirestore(v);
      }
    }
    return clean as T;
  }
  return value;
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const { user, refreshUserProfile } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [categories, setCategories] = useState<Category[]>(mockCategories);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [tables, setTables] = useState<Table[]>(mockTables);
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
      return [];
    }
  });

  // Sync favorites to Firestore on auth state
  useEffect(() => {
    if (user?.id) {
      import('firebase/firestore').then(({ getDoc, doc }) => {
        getDoc(doc(db, 'users', user.id)).then(snap => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.favorites && Array.isArray(data.favorites) && data.favorites.length > 0) {
              setFavorites(data.favorites);
              try { localStorage.setItem('meuovo_favorites', JSON.stringify(data.favorites)); } catch {}
            }
          }
        }).catch(() => {});
      });
    }
  }, [user?.id]);

  useEffect(() => {
    try { localStorage.setItem('meuovo_favorites', JSON.stringify(favorites)); } catch {}
    if (user?.id) {
      import('firebase/firestore').then(({ updateDoc, doc }) => {
        updateDoc(doc(db, 'users', user.id), { favorites }).catch(() => {});
      });
    }
  }, [favorites, user?.id]);

  const toggleFavorite = useCallback((restaurantId: string) => {
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
  }, []);

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
      } else {
        const defaults: DeliverySettings = {
          restaurantId: currentRestaurant.id,
          enabled: true,
          radiusKm: 10,
          fee: 0,
          estimatedTime: 0,
          minimumOrder: 0,
          observation: '',
          feeByNeighborhood: []
        };
        setDeliverySettings(defaults);
        setDoc(doc(db, 'deliverySettings', currentRestaurant.id), defaults)
          .catch(() => {});
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

  const addProduct = useCallback(async (p: Product) => {
    try {
      const { id, ...data } = p;
      await setDoc(doc(db, 'products', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${p.id}`);
    }
  }, []);

  const updateProduct = useCallback(async (p: Product) => {
    try {
      const { id, ...data } = p;
      await updateDoc(doc(db, 'products', id), data as Partial<Product>);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `products/${p.id}`);
    }
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'products', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `products/${id}`);
    }
  }, []);

  const addOrder = useCallback(async (o: Order) => {
    try {
      const { id, ...data } = o;
      const clean = sanitizeForFirestore(data);
      if (id) {
        await setDoc(doc(db, 'orders', id), clean);
      } else {
        await addDoc(collection(db, 'orders'), clean);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'orders');
      throw error;
    }
  }, []);

  const updateOrderStatus = useCallback(async (id: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', id), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `orders/${id}`);
      throw error;
    }
  }, []);

  const addCategory = useCallback(async (c: Category) => {
    try {
      const { id, ...data } = c;
      await setDoc(doc(db, 'categories', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categories/${c.id}`);
    }
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'categories', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${id}`);
    }
  }, []);

  const reorderProducts = useCallback((newProducts: Product[]) => {
    setProducts(newProducts);
  }, []);

  const reorderCategories = useCallback((newCategories: Category[]) => {
    setCategories(newCategories);
  }, []);

  const registerRestaurant = useCallback(async (restaurant: Restaurant, categoryNames: string[], productData: any[]): Promise<string | undefined> => {
    try {
      if (!auth.currentUser?.uid) {
        toast.error('Você precisa estar logado para cadastrar um restaurante');
        return undefined;
      }
      // 1. Create Restaurant with unique slug
      let { id: rId, ...rData } = restaurant;
      const existingSnap = await getDoc(doc(db, 'restaurants', rId));
      if (existingSnap.exists()) {
        rId += `-${Math.random().toString(36).substr(2, 4)}`;
      }
      const finalRData = {
        ...rData,
        id: rId,
        slug: rId,
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, 'restaurants', rId), sanitizeForFirestore(finalRData));

      // 2. Update user role to 'restaurant'
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        role: 'restaurant',
        pwaInstallPending: false,
      });

      await refreshUserProfile();

      // 3. Create Categories
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

      // 4. Create Products
      for (const p of productData) {
        const prodId = Math.random().toString(36).substr(2, 9);
        const productPrice = parseFloat(p.price);
        await setDoc(doc(db, 'products', prodId), sanitizeForFirestore({
          id: prodId,
          restaurantId: rId,
          name: p.name,
          price: isNaN(productPrice) ? 0 : productPrice,
          categoryId: catMap[p.category] || '',
          imageUrl: p.image || undefined,
          description: p.description || undefined,
          isActive: true,
          isAvailable: true
        }));
      }

      setCurrentRestaurant({ ...restaurant, ...finalRData });
      return rId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'restaurants/multi');
      throw error;
    }
  });

  const addTable = useCallback(async (t: Table) => {
    try {
      const { id, ...data } = t;
      await setDoc(doc(db, 'tables', id), {
        ...data,
        status: data.status || 'free'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tables/${t.id}`);
    }
  }, []);

  const updateTable = useCallback(async (t: Table) => {
    try {
      const { id, ...data } = t;
      await updateDoc(doc(db, 'tables', id), data as Partial<Table>);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `tables/${t.id}`);
    }
  }, []);

  const deleteTable = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tables', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `tables/${id}`);
    }
  }, []);

  const openCashier = useCallback(async (amount: number, user: string) => {
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
  }, [currentRestaurant]);

  const closeCashier = useCallback(async (amount: number) => {
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
  }, [activeSession]);

  const addCashierMovement = useCallback(async (type: 'withdrawal' | 'addition', amount: number, reason: string) => {
    if (!activeSession) return;
    const movement = { amount, reason, time: new Date().toISOString() };
    try {
      const sessionRef = doc(db, 'cashier_sessions', activeSession.id);
      if (type === 'withdrawal') {
        await updateDoc(sessionRef, {
          withdrawals: arrayUnion(movement),
        } as unknown as Partial<CashierSession>);
      } else {
        await updateDoc(sessionRef, {
          additions: arrayUnion(movement),
        } as unknown as Partial<CashierSession>);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'cashier_sessions');
    }
  }, [activeSession]);

  const value = useMemo(() => ({
    currentRestaurant, setCurrentRestaurant, restaurants, products, categories,
    orders, tables, deliverySettings, cashierSessions, activeSession,
    favorites, toggleFavorite,
    addProduct, updateProduct, deleteProduct,
    addOrder, updateOrderStatus, addCategory, deleteCategory, reorderProducts, reorderCategories,
    registerRestaurant,
    addTable, updateTable, deleteTable, openCashier, closeCashier, addCashierMovement
  }), [
    currentRestaurant, setCurrentRestaurant, restaurants, products, categories,
    orders, tables, deliverySettings, cashierSessions, activeSession,
    favorites, toggleFavorite,
    addProduct, updateProduct, deleteProduct,
    addOrder, updateOrderStatus, addCategory, deleteCategory, reorderProducts, reorderCategories,
    registerRestaurant,
    addTable, updateTable, deleteTable, openCashier, closeCashier, addCashierMovement
  ]);

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error('useRestaurant must be used within RestaurantProvider');
  return ctx;
}
