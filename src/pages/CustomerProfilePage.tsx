import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Package, MapPin, Settings, LogOut, ChevronRight, Clock, Star, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../context/RestaurantContext';
import { Link } from 'react-router-dom';

export default function CustomerProfilePage() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { favorites, toggleFavorite, restaurants } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites'>('orders');

  const favoriteRestaurants = restaurants.filter(r => favorites.includes(r.id));

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
        setOrders(data);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="text-center space-y-6">
           <div className="w-20 h-20 bg-[#FFC928]/10 rounded-full flex items-center justify-center mx-auto">
             <User size={40} className="text-[#FFC928]" />
           </div>
           <h1 className="font-display font-black text-3xl uppercase tracking-tighter italic">Faça login para continuar</h1>
           <button 
             onClick={() => {/* Trigger auth modal or redirect */}}
             className="bg-[#FFC928] text-black font-black px-8 py-4 rounded-2xl uppercase tracking-widest text-xs"
           >
             Entrar ou Criar conta
           </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Sidebar / User Info */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-black/5 border border-white">
              <div className="flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-[2rem] bg-[#FFC928] flex items-center justify-center text-white text-4xl font-black mb-6 shadow-xl shadow-[#FFC928]/20 border-4 border-white overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : (user.displayName?.charAt(0) || <User size={48} />)}
                </div>
                <h2 className="font-display font-black text-3xl uppercase tracking-tighter italic leading-none">{user.displayName || 'Gourmet Explorer'}</h2>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">{user.email}</p>
                
                <div className="grid grid-cols-2 gap-4 w-full mt-8">
                  <button 
                    onClick={() => setActiveTab('orders')}
                    className={cn(
                      "p-4 rounded-xl border transition-all text-left block w-full",
                      activeTab === 'orders' ? "bg-slate-50 border-[#FFC928]" : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <p className="text-2xl font-black text-[#111]">{orders.length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Pedidos</p>
                  </button>
                  <button 
                    onClick={() => setActiveTab('favorites')}
                    className={cn(
                      "p-4 rounded-xl border transition-all text-left block w-full",
                      activeTab === 'favorites' ? "bg-slate-50 border-red-400" : "bg-white border-slate-100 hover:border-slate-200"
                    )}
                  >
                    <p className="text-2xl font-black text-red-500">{favorites.length}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Favoritos</p>
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-slate-100 space-y-1">
               {[
                 { id: 'orders', label: 'Meus Pedidos', icon: <Package size={18} /> },
                 { id: 'favorites', label: 'Restaurantes Favoritos', icon: <Heart size={18} /> },
                 { id: 'addresses', label: 'Endereços Salvos', icon: <MapPin size={18} />, disabled: true },
                 { id: 'settings', label: 'Configurações', icon: <Settings size={18} />, disabled: true },
               ].map((item, i) => (
                 <button 
                  key={i}
                  disabled={item.disabled}
                  onClick={() => {
                    if (item.id === 'orders' || item.id === 'favorites') {
                      setActiveTab(item.id as any);
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest text-left",
                    activeTab === item.id ? "bg-[#FFC928] text-black" : "text-slate-400 hover:bg-slate-50 hover:text-slate-600 disabled:opacity-50"
                  )}
                 >
                   <div className="flex items-center gap-4">
                     {item.icon}
                     {item.label}
                   </div>
                   <ChevronRight size={14} />
                 </button>
               ))}
               <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-[10px] uppercase tracking-widest mt-4"
               >
                 <LogOut size={18} />
                 Sair da conta
               </button>
            </div>
          </div>

          {/* Main Content / History */}
          <div className="lg:col-span-2 space-y-8">
            <header className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-black text-[#111] uppercase tracking-tighter italic">
                  {activeTab === 'orders' ? 'Histórico de Pedidos' : 'Restaurantes Favoritos'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeTab === 'orders' ? 'Acompanhe suas últimas experiências gastronômicas' : 'Seus estabelecimentos preferidos salvos'}
                </p>
              </div>
            </header>

            <div className="space-y-6">
              {activeTab === 'orders' ? (
                loading ? (
                  [...Array(3)].map((_, i) => (
                    <div key={i} className="h-40 bg-white rounded-[2rem] animate-pulse border-2 border-slate-50" />
                  ))
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={order.id}
                      className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 hover:border-[#FFC928] transition-all group"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
                            <Package size={24} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pedido #{order.id.slice(-6)}</span>
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                                order.status === 'delivered' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                              )}>
                                {order.status}
                              </div>
                            </div>
                            <h4 className="text-lg font-black text-[#111] uppercase tracking-tight mb-2">Restaurante XYZ</h4>
                            <div className="flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                              <span className="flex items-center gap-1"><Clock size={12} /> {new Date(order.createdAt).toLocaleDateString()}</span>
                              <span>{order.items.length} Itens</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Pago</p>
                          <p className="text-2xl font-display font-black text-[#111]">R$ {order.total.toFixed(2)}</p>
                          <button className="text-[#FFC928] text-[9px] font-black uppercase tracking-widest mt-2 flex items-center justify-end gap-1 hover:gap-2 transition-all">
                            Ver Detalhes <ChevronRight size={12} />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-slate-100">
                     <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                       <Package size={32} className="text-slate-200" />
                     </div>
                     <p className="font-display font-black text-slate-300 uppercase text-2xl italic tracking-tighter">Nenhum pedido ainda</p>
                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Que tal fazer o seu primeiro hoje?</p>
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {favoriteRestaurants.map(r => (
                    <motion.div
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={r.id}
                      className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 hover:border-[#FFC928] hover:shadow-lg transition-all group flex gap-4 relative"
                    >
                      <img src={r.logo} alt={r.name} className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-slate-100 shadow-sm" />
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h4 className="text-lg font-black text-[#111] uppercase tracking-tight truncate leading-tight">{r.name}</h4>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{r.cuisineType} • {r.neighborhood}</p>
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                          <Star size={12} className="text-[#FFC928] fill-[#FFC928]" />
                          <span className="text-xs font-bold text-[#111]">{r.rating}</span>
                        </div>
                      </div>
                      <div className="flex flex-col justify-between items-end shrink-0">
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(r.id);
                          }}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-500 rounded-full transition-all"
                          title="Remover dos favoritos"
                        >
                          <Heart size={14} className="fill-red-500" />
                        </button>
                        <Link 
                          to={`/r/${r.slug}`}
                          className="bg-[#111] hover:bg-[#FFC928] text-[#FFC928] hover:text-black transition-all text-[8px] font-black uppercase tracking-widest px-4 py-2 rounded-xl"
                        >
                          Cardápio
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                  {favoriteRestaurants.length === 0 && (
                    <div className="col-span-full bg-white rounded-[2rem] p-20 text-center border-2 border-slate-100">
                       <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                         <Heart size={32} className="text-slate-200" />
                       </div>
                       <p className="font-display font-black text-slate-300 uppercase text-2xl italic tracking-tighter">Nenhum favorito ainda</p>
                       <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Qual o seu restaurante preferido da região?</p>
                       <Link 
                         to="/marketplace" 
                         className="inline-block bg-[#FFC928] hover:bg-black text-black hover:text-[#FFC928] font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl mt-6 transition-all"
                       >
                         Explorar estabelecimentos
                       </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
