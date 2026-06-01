import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { Restaurant, Product, Category, Order, Table, DeliverySettings, CashierSession } from '../types';
import { mockRestaurants, mockDeliverySettings } from '../data/mockData';
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
  getDoc,
  orderBy
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>(mockRestaurants);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [deliverySettings] = useState<DeliverySettings>(mockDeliverySettings);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(mockRestaurants[0]);
  const [cashierSessions, setCashierSessions] = useState<CashierSession[]>([]);
  const [activeSession, setActiveSession] = useState<CashierSession | null>(null);
  const hasFirestoreData = useRef(false);

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
    localStorage.setItem('meuovo_favorites', JSON.stringify(favorites));
  }, [favorites]);

  // Sync all restaurants from Firestore (for marketplace)
  useEffect(() => {
    const q = query(collection(db, 'restaurants'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      const firestoreRestaurants = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Restaurant));
      setRestaurants(firestoreRestaurants);
      hasFirestoreData.current = true;
    }, (error) => {
      console.error('Error syncing restaurants from Firestore:', error);
    });
    return unsub;
  }, []);

  // Sync currentRestaurant based on logged user
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'restaurants'), where('ownerId', '==', user.id));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0];
        setCurrentRestaurant({ id: docData.id, ...docData.data() } as Restaurant);
      } else {
        // Fallback: doc ID = user.uid (Auth.tsx signup pattern)
        getDoc(doc(db, 'restaurants', user.id)).then((docSnap) => {
          if (docSnap.exists()) {
            setCurrentRestaurant({ id: docSnap.id, ...docSnap.data() } as Restaurant);
          } else if (!hasFirestoreData.current) {
            setCurrentRestaurant(mockRestaurants[0]);
          }
        });
      }
    });

    return () => unsub();
  }, [user]);

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

  // Real-time listeners
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
    // Only subscribe to ALL orders if the user is potentially an admin/staff
    // We check against the user ID. 
    // Note: our AuthContext has a user object with 'id'.
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

    return () => {
      unsubProducts();
      unsubCats();
      unsubOrders();
      unsubTables();
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
      // 1. Create Restaurant
      const { id: rId, ...rData } = restaurant;
      const finalRData = {
        ...rData,
        ownerId: auth.currentUser?.uid || 'anonymous',
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
          active: true,
          order: 0
        });
        catMap[name] = catId;
      }

      // 3. Create Products
      for (const p of productData) {
        const prodId = Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'products', prodId), {
          id: prodId,
          restaurantId: rId,
          name: p.name,
          price: parseFloat(p.price),
          categoryId: catMap[p.category] || '',
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
      await setDoc(doc(db, 'tables', id), data);
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

  const openCashier = (amount: number, user: string) => {
    const newSession: CashierSession = {
      id: Math.random().toString(36).substr(2, 9),
      restaurantId: currentRestaurant?.id || '',
      openedAt: new Date().toISOString(),
      openedBy: user,
      openingAmount: amount,
      totalSales: 0,
      status: 'open',
      withdrawals: [],
      additions: [],
    };
    setActiveSession(newSession);
    setCashierSessions(prev => [newSession, ...prev]);
  };

  const closeCashier = (amount: number) => {
    if (!activeSession) return;
    const closedSession: CashierSession = {
      ...activeSession,
      closedAt: new Date().toISOString(),
      closingAmount: amount,
      status: 'closed',
    };
    setActiveSession(null);
    setCashierSessions(prev => prev.map(s => s.id === closedSession.id ? closedSession : s));
  };

  const addCashierMovement = (type: 'withdrawal' | 'addition', amount: number, reason: string) => {
    if (!activeSession) return;
    const movement = { amount, reason, time: new Date().toISOString() };
    const updatedSession = { ...activeSession };
    if (type === 'withdrawal') {
      updatedSession.withdrawals.push(movement);
    } else {
      updatedSession.additions.push(movement);
    }
    setActiveSession(updatedSession);
    setCashierSessions(prev => prev.map(s => s.id === updatedSession.id ? updatedSession : s));
  };

  return (
    <RestaurantContext.Provider value={{
      currentRestaurant, setCurrentRestaurant, restaurants, products, categories,
      orders, tables, deliverySettings, cashierSessions, activeSession,
      favorites, toggleFavorite,
      addProduct, updateProduct, deleteProduct,
      addOrder, updateOrderStatus, addCategory, deleteCategory, reorderProducts, reorderCategories,
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
