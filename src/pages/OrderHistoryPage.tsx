import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Product, CartItem } from '../types';
import { useRestaurant } from '../context/RestaurantContext';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { 
  ShoppingBag, 
  Search, 
  MapPin, 
  Clock, 
  ChevronRight, 
  ArrowLeft,
  Calendar,
  Package,
  History,
  RotateCcw
} from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function OrderHistoryPage() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { restaurants } = useRestaurant();
  const { addItem } = useCart();

  const [phone, setPhone] = useState(localStorage.getItem('customerPhone') || '');
  const [isSearching, setIsSearching] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(!!phone);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const sliced = digits.slice(0, 11);
    if (sliced.length <= 2) return sliced;
    if (sliced.length <= 6) return `(${sliced.slice(0, 2)}) ${sliced.slice(2)}`;
    if (sliced.length <= 10) return `(${sliced.slice(0, 2)}) ${sliced.slice(2, 6)}-${sliced.slice(6)}`;
    return `(${sliced.slice(0, 2)}) ${sliced.slice(2, 7)}-${sliced.slice(7)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
  };

  const fetchOrders = (phoneToSearch: string) => {
    if (!phoneToSearch) return;
    setLoading(true);
    setHasSearched(true);
    
    const q = query(
      collection(db, 'orders'),
      where('customerPhone', '==', phoneToSearch),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
      setLoading(false);
      localStorage.setItem('customerPhone', phoneToSearch);
    }, (error) => {
      console.error("Error fetching orders:", error);
      setLoading(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    if (phone && phone.replace(/\D/g, '').length >= 10) {
      unsubscribe = fetchOrders(phone);
    }
    return () => unsubscribe?.();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) return;
    fetchOrders(phone);
  };

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const handleReorder = async (order: Order) => {
    const restaurant = restaurants.find(r => r.id === order.restaurantId);
    if (!restaurant) {
      toast.error('Restaurante não encontrado');
      return;
    }
    try {
      const q = query(collection(db, 'products'), where('restaurantId', '==', order.restaurantId));
      const snap = await getDocs(q);
      const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));

      let addedCount = 0;
      for (const orderItem of order.items) {
        const product = products.find(p => p.id === orderItem.productId);
        if (!product || !product.isAvailable) continue;

        const cartItem: CartItem = {
          product,
          quantity: orderItem.quantity,
          selectedAdditionals: (orderItem.additionals || []).map(a => ({
            groupId: '',
            additionalId: '',
            name: a.name,
            price: a.price,
          })),
          observations: orderItem.observations || '',
        };
        addItem(cartItem);
        addedCount++;
      }

      if (addedCount === 0) {
        toast.error('Nenhum item disponível para reordenar');
        return;
      }
      toast.success(`${addedCount} item(ns) adicionado(s) ao carrinho!`);
      navigate('/carrinho');
    } catch (err) {
      console.error('Error reordering:', err);
      toast.error('Erro ao reordenar. Tente novamente.');
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'received': return 'bg-blue-100 text-blue-600';
      case 'accepted': return 'bg-violet-100 text-violet-600';
      case 'preparing': return 'bg-orange-100 text-orange-600';
      case 'ready': return 'bg-yellow-100 text-yellow-600';
      case 'out-for-delivery': return 'bg-purple-100 text-purple-600';
      case 'finished': return 'bg-green-100 text-green-600';
      case 'cancelled': return 'bg-red-100 text-red-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'received': return 'Recebido';
      case 'accepted': return 'Aguardando Pagamento';
      case 'preparing': return 'Em preparo';
      case 'ready': return 'Pronto';
      case 'out-for-delivery': return 'Saiu para entrega';
      case 'finished': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  return (
    <div className={cn("min-h-screen transition-colors", isDark ? "bg-[#0a0a0a]" : "bg-[#f8f9fa]")}>
      <Navbar />
      
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => navigate(-1)}
            className={cn(
              "p-3 rounded-2xl transition-all",
              isDark ? "bg-white/5 text-white hover:bg-white/10" : "bg-white text-brand-black hover:bg-gray-50 shadow-sm"
            )}
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-brand-egg text-brand-black shadow-lg shadow-yellow-500/10">
              <History size={24} />
            </div>
            <div>
              <h1 className={cn("text-2xl font-display font-black leading-none uppercase tracking-tight", isDark ? "text-white" : "text-[#111]")}>
                Meus Pedidos
              </h1>
              <p className={cn("text-xs font-bold mt-1 opacity-50", isDark ? "text-gray-400" : "text-gray-500")}>
                Acompanhe e visualize seu histórico de pedidos
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={cn(
            "p-6 rounded-3xl mb-8 transition-all border",
            isDark ? "bg-white/5 border-white/5" : "bg-white border-gray-100 shadow-sm shadow-black/5"
          )}
        >
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <label className={cn("text-[10px] font-black uppercase tracking-widest ml-1 mb-2 block", isDark ? "text-gray-400" : "text-gray-500")}>
                Seu WhatsApp
              </label>
              <div className="relative">
                <Search className={cn("absolute left-4 top-1/2 -translate-y-1/2", isDark ? "text-gray-500" : "text-gray-400")} size={20} />
                <input 
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="(11) 99999-9999"
                  className={cn(
                    "w-full h-14 pl-12 pr-4 rounded-2xl font-bold transition-all outline-none",
                    isDark ? "bg-white/5 border-white/10 text-white focus:bg-white/10" : "bg-slate-50 border-transparent focus:bg-white focus:border-brand-egg"
                  )}
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={phone.replace(/\D/g, '').length < 10 || loading}
              className="sm:self-end h-14 px-8 bg-brand-black text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
            >
              {loading ? "Buscando..." : "Buscar Pedidos"}
            </button>
          </form>
          {phone.replace(/\D/g, '').length > 0 && phone.replace(/\D/g, '').length < 10 && (
            <p className="text-red-500 text-[10px] font-black uppercase tracking-widest mt-2 ml-1">
              Telefone incompleto
            </p>
          )}
        </motion.div>

        {/* Order List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!hasSearched ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20 opacity-30"
              >
                <ShoppingBag size={64} className="mx-auto mb-4" />
                <p className={cn("font-black uppercase tracking-widest text-sm", isDark ? "text-white" : "text-brand-black")}>
                  Digite seu telefone para ver seus pedidos
                </p>
              </motion.div>
            ) : loading ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {[1, 2, 3].map(i => (
                  <div key={i} className={cn("h-40 rounded-3xl animate-pulse", isDark ? "bg-white/5" : "bg-white")} />
                ))}
              </motion.div>
            ) : orders.length === 0 ? (
              <motion.div 
                key="no-results"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-20"
              >
                <div className={cn("w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center", isDark ? "bg-white/5" : "bg-gray-100")}>
                  <Package size={32} className="opacity-20" />
                </div>
                <h3 className={cn("font-black text-xl mb-2", isDark ? "text-white" : "text-[#111]")}>Nenhum pedido encontrado</h3>
                <p className={cn("text-sm opacity-50", isDark ? "text-gray-400" : "text-gray-500")}>
                  Não encontramos pedidos vinculados a este número de telefone.
                </p>
              </motion.div>
            ) : (
              orders.map((order, index) => {
                const restaurant = restaurants.find(r => r.id === order.restaurantId);
                const isExpanded = expandedOrderId === order.id;

                return (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      "group rounded-3xl border transition-all overflow-hidden",
                      isDark ? "bg-white/5 border-white/5 shadow-2xl shadow-black/20" : "bg-white border-transparent shadow-sm shadow-black/5"
                    )}
                  >
                    <div 
                      onClick={() => toggleOrder(order.id)}
                      className="p-6 cursor-pointer"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 relative",
                            isDark ? "bg-white/5" : "bg-slate-50"
                          )}>
                            {restaurant?.logo ? (
                              <img src={restaurant.logo} alt={restaurant.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🥘</div>
                            )}
                          </div>
                          <div>
                            <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-40 mb-1", isDark ? "text-white" : "text-brand-black")}>
                              #{order.id.slice(-6).toUpperCase()}
                            </p>
                            <h3 className={cn("font-black text-lg leading-tight", isDark ? "text-white" : "text-[#111]")}>
                              {restaurant?.name || 'Restaurante'}
                            </h3>
                            <div className="flex items-center gap-3 mt-2">
                               <div className="flex items-center gap-1 opacity-50">
                                  <Calendar size={12} />
                                  <span className="text-[10px] font-bold">
                                    {new Date(order.createdAt).toLocaleDateString('pt-BR')}
                                  </span>
                               </div>
                               <div className="flex items-center gap-1 opacity-50">
                                  <Clock size={12} />
                                  <span className="text-[10px] font-bold">
                                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                               </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-4">
                          <div className="text-right">
                            <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-40 mb-0.5", isDark ? "text-white" : "text-brand-black")}>Total</p>
                            <p className={cn("text-xl font-display font-black leading-none", isDark ? "text-[#FFC928]" : "text-brand-orange")}>
                              {formatCurrency(order.total)}
                            </p>
                          </div>
                          <span className={cn(
                            "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                            getStatusColor(order.status)
                          )}>
                            {getStatusLabel(order.status)}
                          </span>
                        </div>
                      </div>

                      <div className={cn("mt-6 pt-6 border-t flex items-center justify-between", isDark ? "border-white/5" : "border-slate-50")}>
                         <div className="flex items-center gap-2 overflow-hidden">
                            {order.items.slice(0, 3).map((item, i) => (
                              <span key={i} className={cn("px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap", isDark ? "bg-white/5 text-gray-400" : "bg-slate-50 text-slate-500")}>
                                {item.quantity}x {item.productName}
                              </span>
                            ))}
                            {order.items.length > 3 && (
                              <span className={cn("text-[10px] font-bold opacity-30", isDark ? "text-white" : "text-[#111]")}>
                                +{order.items.length - 3} mais
                              </span>
                            )}
                         </div>
                         <motion.div
                           animate={{ rotate: isExpanded ? 90 : 0 }}
                           className="text-slate-400"
                         >
                           <ChevronRight size={18} />
                         </motion.div>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className={cn(
                            "border-t overflow-hidden",
                            isDark ? "bg-black/20 border-white/5" : "bg-slate-50/50 border-slate-50"
                          )}
                        >
                          <div className="p-6 space-y-6">
                            <div className="space-y-4">
                              <p className={cn("text-[10px] font-black uppercase tracking-widest opacity-40", isDark ? "text-white" : "text-brand-black")}>
                                Detalhes do Pedido
                              </p>
                              {order.items.map((item, i) => (
                                <div key={i} className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-brand-orange font-black text-sm italic">{item.quantity}x</span>
                                      <p className={cn("text-sm font-bold", isDark ? "text-white" : "text-[#111]")}>{item.productName}</p>
                                    </div>
                                    {(item.selectedAdditionals?.length > 0 || item.observations) && (
                                      <div className="mt-2 ml-7 space-y-1">
                                        {item.selectedAdditionals?.map((add, ai) => (
                                          <p key={ai} className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                                            + {add.name} ({formatCurrency(add.price)})
                                          </p>
                                        ))}
                                        {item.observations && (
                                          <p className="text-[10px] text-gray-400 italic font-medium">
                                            Obs: "{item.observations}"
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <p className={cn("text-sm font-black text-right", isDark ? "text-white" : "text-[#111]")}>
                                    {formatCurrency((item.price + (item.selectedAdditionals?.reduce((sum, a) => sum + a.price, 0) || 0)) * item.quantity)}
                                  </p>
                                </div>
                              ))}
                            </div>

                            <div className={cn("pt-6 border-t space-y-2", isDark ? "border-white/5" : "border-slate-100")}>
                              {order.type === 'delivery' && (
                                <div className="flex justify-between text-xs font-bold text-gray-400">
                                  <span>Taxa de Entrega</span>
                                  <span className={cn(isDark ? "text-white" : "text-[#111]")}>
                                    {order.deliveryFee === 0 ? 'Grátis' : formatCurrency(order.deliveryFee || 0)}
                                  </span>
                                </div>
                              )}
                              {order.donationAmount && (
                                <div className="flex justify-between text-xs font-bold text-red-400">
                                  <span>Doação Social ❤️</span>
                                  <span>{formatCurrency(order.donationAmount)}</span>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4">
                              <button 
                                onClick={() => handleReorder(order)}
                                className="flex-1 h-12 bg-brand-egg text-brand-black rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 active:scale-95"
                              >
                                <RotateCcw size={14} /> Repetir Pedido
                              </button>
                              <button 
                                onClick={() => navigate(`/r/${restaurant?.slug}/status/${order.id}`)}
                                className="flex-1 h-12 bg-[#111] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10 active:scale-95"
                              >
                                <Clock size={16} /> Acompanhar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
}
