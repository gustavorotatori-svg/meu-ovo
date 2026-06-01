import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useRestaurant } from '../../context/RestaurantContext';
import { Product, Category, Order, Table } from '../../types';
import { Search, Plus, Minus, ShoppingCart, Users, ChevronRight, X, Clock, CheckCircle2, QrCode as QrIcon, Printer, Share2, Eye } from 'lucide-react';
import { Button } from '../../components/Button';
import { toast } from 'react-hot-toast';
import { cn, formatCurrency } from '../../lib/utils';
import { Skeleton } from '../../components/Skeleton';
import AdminLayout from './AdminLayout';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'react-qr-code';

type TabType = 'tables' | 'new-order' | 'qr-codes';

export default function WaiterMode() {
  const { currentRestaurant: restaurant, tables } = useRestaurant();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<TabType>('tables');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [viewingTableOrders, setViewingTableOrders] = useState<string | null>(null);
  const [cart, setCart] = useState<{product: Product, quantity: number}[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showQrModal, setShowQrModal] = useState<Table | null>(null);

  useEffect(() => {
    if (!restaurant) return;
    
    // Fetch products and categories
    const fetchData = async () => {
      try {
        const qCat = query(collection(db, 'categories'), where('restaurantId', '==', restaurant.id));
        const qProd = query(collection(db, 'products'), where('restaurantId', '==', restaurant.id), where('isActive', '==', true), where('isAvailable', '==', true));
        
        const [catSnap, prodSnap] = await Promise.all([getDocs(qCat), getDocs(qProd)]);
        
        setCategories(catSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
        setProducts(prodSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Listen for active orders (received, preparing)
    const qOrders = query(
      collection(db, 'orders'), 
      where('restaurantId', '==', restaurant.id),
      where('status', 'in', ['received', 'preparing']),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(qOrders, (snapshot) => {
      setActiveOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    });

    return () => unsubscribe();
  }, [restaurant]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map(item => item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item);
      }
      return prev.filter(item => item.product.id !== productId);
    });
  };

  const handleSendOrder = async () => {
    if (!selectedTable) {
      toast.error('Selecione uma mesa');
      return;
    }
    if (cart.length === 0) {
      toast.error('Adicione itens ao pedido');
      return;
    }

    try {
      const subtotal = cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0);
      
      await addDoc(collection(db, 'orders'), {
        restaurantId: restaurant?.id,
        customerName: `Garçom (Mesa ${selectedTable})`,
        customerPhone: 'N/A',
        type: 'table',
        tableNumber: selectedTable,
        items: cart.map(item => ({
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        })),
        total: subtotal,
        status: 'received',
        paymentMethod: 'on-site',
        createdAt: new Date().toISOString()
      });

      toast.success('Pedido enviado para a cozinha!');
      setCart([]);
      setActiveTab('tables');
    } catch (e) {
      toast.error('Erro ao enviar pedido');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesCat = activeCategory === 'all' || p.categoryId === activeCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getTableOrders = (tableNumber: string) => {
    return activeOrders.filter(o => o.tableNumber === tableNumber);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="h-full flex flex-col gap-6 max-w-4xl mx-auto">
          <Skeleton className="w-full h-20 rounded-2xl" />
          <Skeleton className="w-full h-32 rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="w-full h-12 rounded-xl" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm mb-6">
          <button 
            onClick={() => setActiveTab('tables')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'tables' ? "bg-brand-black text-white" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Users size={18} />
            Mesas Ativas
          </button>
          <button 
            onClick={() => { setActiveTab('new-order'); if (!selectedTable) setSelectedTable('1'); }}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'new-order' ? "bg-brand-black text-white" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Plus size={18} />
            Novo Pedido
          </button>
          <button 
            onClick={() => setActiveTab('qr-codes')}
            className={cn(
              "flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2",
              activeTab === 'qr-codes' ? "bg-brand-black text-white" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <QrIcon size={18} />
            QR Codes
          </button>
        </div>

        {/* Tab Content: Tables View */}
        {activeTab === 'tables' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tables.map(table => {
              const tableOrders = getTableOrders(table.number);
              const isActive = tableOrders.length > 0;
              const totalItems = tableOrders.reduce((acc, o) => acc + o.items.reduce((iAcc, i) => iAcc + i.quantity, 0), 0);
              const totalValue = tableOrders.reduce((acc, o) => acc + o.total, 0);

              return (
                <motion.div
                  key={table.id}
                  whileHover={{ scale: 1.02 }}
                  className={cn(
                    "relative p-6 rounded-3xl border-2 transition-all text-left flex flex-col items-start gap-4 h-auto min-h-[180px] overflow-hidden",
                    isActive ? "border-[#FFC928] bg-yellow-50/30" : "border-slate-50 bg-white"
                  )}
                >
                  <div className="flex justify-between items-center w-full">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl transition-colors",
                      isActive ? "bg-[#FFC928] text-white" : "bg-slate-100 text-slate-400"
                    )}>
                      {table.number}
                    </div>
                    {isActive && (
                      <button 
                        onClick={() => setViewingTableOrders(table.number)}
                        className="p-2 bg-white rounded-xl text-slate-400 hover:text-[#111] shadow-sm transition-all"
                      >
                        <Eye size={16} />
                      </button>
                    )}
                  </div>

                  <div className="mt-4 w-full">
                    {isActive ? (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa Ocupada</p>
                        <p className="text-sm font-black text-[#111]">{totalItems} itens lançados</p>
                        <p className="text-xs font-bold text-brand-orange">{formatCurrency(totalValue)}</p>
                        <button 
                          onClick={() => { setSelectedTable(table.number); setActiveTab('new-order'); }}
                          className="w-full mt-3 bg-white border border-slate-100 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#111] hover:bg-slate-50"
                        >
                          + Adicionar Itens
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesa Livre</p>
                        <p className="text-sm font-black text-slate-300">Nenhum pedido</p>
                        <button 
                          onClick={() => { setSelectedTable(table.number); setActiveTab('new-order'); }}
                          className="w-full mt-3 bg-slate-50 border border-transparent py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-100"
                        >
                          Abrir Mesa
                        </button>
                      </div>
                    )}
                  </div>

                  {isActive && (
                    <motion.div 
                      layoutId={`active-table-dot-${table.id}`}
                      className="absolute top-4 right-4 w-2 h-2 bg-[#FFC928] rounded-full animate-pulse"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Tab Content: New Order View */}
        {activeTab === 'new-order' && (
          <div className="space-y-6">
            {/* Table Selector (mini) */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Mesa Selecionada</p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {tables.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTable(t.number)}
                    className={cn(
                      "w-12 h-12 rounded-xl flex-shrink-0 font-black text-sm transition-all",
                      selectedTable === t.number ? "bg-brand-black text-white scale-110 shadow-lg" : "bg-slate-50 text-slate-400 hover:bg-slate-100"
                    )}
                  >
                    {t.number}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Sections */}
            <div className="flex flex-col md:flex-row gap-6">
              {/* Product List */}
              <div className="flex-1 space-y-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="Buscar produto..."
                    className="w-full bg-white border border-slate-100 h-14 pl-12 pr-4 rounded-2xl font-bold outline-none focus:ring-2 focus:ring-[#FFC928] transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                  <button 
                    onClick={() => setActiveCategory('all')}
                    className={cn(
                      "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                      activeCategory === 'all' ? "bg-[#FFC928] text-brand-black shadow-lg shadow-yellow-100" : "bg-white text-slate-400 hover:bg-slate-50"
                    )}
                  >
                    Todos
                  </button>
                  {categories.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={cn(
                        "px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                        activeCategory === cat.id ? "bg-[#FFC928] text-brand-black shadow-lg shadow-yellow-100" : "bg-white text-slate-400 hover:bg-slate-50"
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredProducts.map(p => {
                    const inCart = cart.find(item => item.product.id === p.id);
                    return (
                      <motion.button
                        layout
                        key={p.id}
                        onClick={() => addToCart(p)}
                        className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-[#FFC928]/30 transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-colors",
                            inCart ? "bg-yellow-50" : "bg-slate-50"
                          )}>
                            🥘
                          </div>
                          <div>
                            <p className="text-xs font-black text-brand-black uppercase tracking-tight">{p.name}</p>
                            <p className="text-[10px] font-bold text-brand-orange mt-0.5">{formatCurrency(p.price)}</p>
                          </div>
                        </div>
                        {inCart && (
                          <div className="bg-[#FFC928] text-brand-black w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black">
                            {inCart.quantity}
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Order Sidebar / Cart */}
              <div className="w-full md:w-80 shrink-0">
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sticky top-24">
                  <h3 className="font-black text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                    <ShoppingCart size={18} />
                    Pedido - Mesa {selectedTable}
                  </h3>
                  
                  <div className="space-y-4 max-h-[400px] overflow-y-auto no-scrollbar mb-6">
                    {cart.map(item => (
                      <div key={item.product.id} className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-[#111] truncate">{item.product.name}</p>
                          <p className="text-[10px] text-slate-400">{formatCurrency(item.product.price)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => removeFromCart(item.product.id)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400 hover:bg-slate-200"><Minus size={12}/></button>
                          <span className="w-4 text-center text-xs font-black">{item.quantity}</span>
                          <button onClick={() => addToCart(item.product)} className="w-6 h-6 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400 hover:bg-slate-200"><Plus size={12}/></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && (
                      <div className="text-center py-10 opacity-30">
                        <ShoppingCart size={32} className="mx-auto mb-2" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Carrinho Vazio</p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-slate-50 pt-6 space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-display font-black text-brand-orange">
                        {formatCurrency(cart.reduce((acc, curr) => acc + (curr.product.price * curr.quantity), 0))}
                      </span>
                    </div>
                    <button 
                      onClick={handleSendOrder}
                      disabled={cart.length === 0}
                      className="w-full bg-brand-black text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                    >
                      Lançar Pedido <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab Content: QR Codes Management */}
        {activeTab === 'qr-codes' && (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="font-black text-xl text-[#111] uppercase tracking-tight">QR Codes das Mesas</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Gere e baixe os códigos para as mesas do seu restaurante.</p>
              </div>
              <Button onClick={() => setShowQrModal(tables[0] || null)} className="bg-brand-egg text-brand-black hover:bg-yellow-400">
                Imprimir Todos
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {tables.map(table => (
                <div key={table.id} className="p-6 rounded-3xl border border-slate-50 bg-slate-50/30 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-xl shadow-sm">
                      {table.number}
                    </div>
                    <div>
                      <p className="text-sm font-black text-[#111]">Mesa {table.number}</p>
                      <button 
                        onClick={() => setShowQrModal(table)}
                        className="text-[10px] font-black text-[#FFC928] uppercase tracking-widest hover:underline mt-1"
                      >
                        Visualizar QR Code
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowQrModal(table)} className="p-3 bg-white rounded-xl text-slate-400 hover:text-[#111] transition-all shadow-sm">
                      <QrIcon size={18} />
                    </button>
                    <button onClick={() => window.print()} className="p-3 bg-white rounded-xl text-slate-400 hover:text-brand-orange transition-all shadow-sm">
                      <Printer size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowQrModal(null)} 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-[40px] w-full max-w-sm p-10 text-center shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-[#FFC928]" />
              <button 
                onClick={() => setShowQrModal(null)} 
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="font-display font-black text-3xl mb-2 text-[#111]">Mesa {showQrModal.number}</h3>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Escaneie para pedir</p>
              
              <div className="w-64 h-64 bg-slate-50 rounded-[40px] mx-auto mb-10 p-8 flex items-center justify-center relative">
                <QRCode 
                  value={showQrModal.qrCodeUrl || `${window.location.origin}/r/${restaurant?.slug}?mesa=${showQrModal.number}`}
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  viewBox={`0 0 256 256`}
                />
                <div className="absolute inset-0 border-2 border-dashed border-[#FFC928]/30 rounded-[40px] m-4 pointer-events-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 bg-[#111111] text-white font-black py-4 rounded-2xl hover:bg-[#222] transition-all shadow-xl shadow-black/10"
                >
                  <Printer size={18} /> Imprimir
                </button>
                <button className="flex items-center justify-center gap-2 bg-slate-100 text-slate-500 font-black py-4 rounded-2xl hover:bg-slate-200 transition-all">
                  <Share2 size={18} /> Compartilhar
                </button>
              </div>
              
              <p className="mt-8 text-[9px] font-bold text-slate-300 break-all bg-slate-50 p-3 rounded-xl">
                {showQrModal.qrCodeUrl || `${window.location.origin}/r/${restaurant?.slug}?mesa=${showQrModal.number}`}
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Table Orders Modal */}
      <AnimatePresence>
        {viewingTableOrders && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setViewingTableOrders(null)} 
            />
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="relative bg-white h-full max-w-md w-full ml-auto shadow-2xl p-8 overflow-y-auto"
            >
               <button 
                onClick={() => setViewingTableOrders(null)} 
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mt-8 mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-2">Pedidos Ativos</p>
                <h3 className="font-display font-black text-3xl text-[#111]">Mesa {viewingTableOrders}</h3>
              </div>

              <div className="space-y-6">
                {getTableOrders(viewingTableOrders).map(order => (
                  <div key={order.id} className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs font-black text-[#111]">PEDIDO #{order.id.slice(-4).toUpperCase()}</p>
                        <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-1">
                          <Clock size={10} />
                          {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={cn(
                        "text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest",
                        order.status === 'received' ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {order.status === 'received' ? 'Recebido' : 'Preparando'}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <p className="text-[#111] font-bold"><span className="text-brand-orange">{item.quantity}x</span> {item.productName || item.name}</p>
                            <p className="text-slate-400 font-black">{formatCurrency((item.unitPrice || item.price) * item.quantity)}</p>
                          </div>
                          {(item.observations) && (
                            <div className={cn(
                              "px-2 py-1 rounded-md text-[9px] font-black uppercase border mb-2",
                              (item.observations.toLowerCase().includes('alerg') || item.observations.toLowerCase().includes('restric') || item.observations.toLowerCase().includes('sem'))
                                ? "bg-red-50 border-red-100 text-red-600"
                                : "bg-orange-50 border-orange-100 text-orange-600"
                            )}>
                              Obs: {item.observations}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total do Pedido</p>
                      <p className="font-black text-lg text-[#111]">{formatCurrency(order.total)}</p>
                    </div>
                  </div>
                ))}
                
                {getTableOrders(viewingTableOrders).length === 0 && (
                   <div className="text-center py-20 opacity-30">
                      <CheckCircle2 size={48} className="mx-auto mb-4" />
                      <p className="font-black uppercase tracking-widest text-xs">Nenhum pedido ativo</p>
                   </div>
                )}
              </div>

              <div className="mt-10 pt-10 border-t border-slate-100">
                <button 
                  onClick={() => { setSelectedTable(viewingTableOrders); setViewingTableOrders(null); setActiveTab('new-order'); }}
                  className="w-full bg-brand-black text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                  Novo Item para Mesa {viewingTableOrders} <Plus size={18} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AdminLayout>
  );
}
