import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { User, Package, MapPin, Settings, LogOut, ChevronRight, Clock, Star, Heart, Mail, Lock, Shield } from 'lucide-react';
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
import { toast } from 'react-hot-toast';
import { getCustomerStats } from '../services/customerRatingService';

export default function CustomerProfilePage() {
  const { t } = useTranslation();
  const { user, signOut, signIn, signUp } = useAuth();
  const { favorites, toggleFavorite, restaurants } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerStats, setCustomerStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'favorites'>('orders');

  useEffect(() => {
    if (!orders || orders.length === 0) return;
    const phone = orders.find(o => o.customerPhone)?.customerPhone;
    if (!phone) return;

    async function loadStats() {
      try {
        const res = await getCustomerStats(phone);
        setCustomerStats(res);
      } catch (err) {
        console.error("Error loading customer stats:", err);
      }
    }
    loadStats();
  }, [orders]);

  // Form states for login / signup
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword || (!isLogin && !authName)) {
      toast.error('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setAuthLoading(true);
    try {
      if (isLogin) {
        await signIn(authEmail, authPassword);
        toast.success('Bem-vindo de volta!');
      } else {
        await signUp(authEmail, authPassword, authName, 'customer');
        toast.success('Conta de cliente criada com sucesso!');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#f8fafc]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6 py-20">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative p-8 md:p-10">
            <div className="text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-[#FFC928]/10 rounded-2xl flex items-center justify-center mx-auto transition-transform hover:scale-110 duration-300">
                <User size={32} className="text-[#FFC928]" />
              </div>
              <h1 className="font-display font-black text-3xl uppercase tracking-tighter italic leading-none">
                {isLogin ? 'Fazer Login' : 'Criar Conta'}
              </h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                {isLogin ? 'Entre na sua conta para acompanhar seus pedidos' : 'Cadastre-se para favoritar restaurantes e salvar endereços'}
              </p>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-[#FFC928] focus:bg-white outline-none transition-all placeholder:text-slate-400"
                      placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-[#FFC928] focus:bg-white outline-none transition-all placeholder:text-slate-400"
                    placeholder="voce@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl text-xs font-black uppercase tracking-wider focus:ring-2 focus:ring-[#FFC928] focus:bg-white outline-none transition-all placeholder:text-slate-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#FFC928] text-black font-black py-4 rounded-2xl uppercase tracking-widest text-xs hover:bg-[#e6b520] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#FFC928]/10"
              >
                {authLoading ? 'Processando...' : isLogin ? 'Entrar' : 'Cadastrar'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setAuthEmail('');
                  setAuthPassword('');
                  setAuthName('');
                }}
                className="text-xs font-black text-slate-400 hover:text-black uppercase tracking-wider transition-colors"
              >
                {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça Login'}
              </button>
            </div>
          </div>
        </div>
        <Footer />
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
                
                {/* Trust Score block */}
                {customerStats ? (
                  <div className="mt-5 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 text-left w-full">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={16} className={customerStats.isProblematic ? "text-red-500" : "text-[#FFC928]"} />
                      <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider">Seu Índice de Confiança</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl font-black italic tracking-tighter ${customerStats.isProblematic ? 'text-red-500' : 'text-slate-800'}`}>
                        ★ {customerStats.averageRating.toFixed(1)}
                      </span>
                      <div>
                        <p className={`text-[9px] font-black uppercase tracking-wider ${customerStats.isProblematic ? 'text-red-500' : 'text-[#FFC928]'}`}>
                          {customerStats.statusText === 'Sem avaliações' ? 'Excelente' : customerStats.statusText}
                        </p>
                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">Baseado em {customerStats.totalRatings} avaliações</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-left w-full">
                    <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                      <Shield size={14} className="text-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Índice de Confiança: Perfeito</span>
                    </div>
                    <p className="text-[8px] font-bold text-gray-400 uppercase leading-normal">Seu score é excelente! Você é considerado um cliente confiável e de baixo risco na plataforma.</p>
                  </div>
                )}

                {/* Supporter Badge Section */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left w-full text-white select-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full bg-[#FFC928]/20 -z-0" />
                  <div className="flex items-center gap-1.5 text-[#FFC928] mb-2 relative z-10 w-full">
                    <Star size={14} fill="currentColor" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-[#FFC928]">Medalha de Apoiador</span>
                  </div>
                  <div className="flex items-center gap-3 relative z-10">
                    <span className="text-3xl">
                      {orders.length === 0 ? "🌱" : orders.length <= 3 ? "🥉" : orders.length <= 7 ? "🥈" : "🥇"}
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-white">
                        {orders.length === 0 ? "Amigo do Bairro" : orders.length <= 3 ? "Apoiador Bronze" : orders.length <= 7 ? "Apoiador Prata" : "Parceiro de Ouro 👑"}
                      </p>
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Soberania Comunitária</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-t border-white/5 mt-4 pt-3 text-center relative z-10 w-full">
                    <div>
                      <p className="text-lg font-display font-black text-[#FFC928] mt-0.5 leading-none">{orders.length}</p>
                      <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mt-1 leading-none">Refeições Diretas</p>
                    </div>
                    <div>
                      <p className="text-lg font-display font-black text-[#FFC928] mt-0.5 leading-none">
                        R$ {orders.reduce((acc, o) => acc + (o.donationAmount || 0), 0).toFixed(2)}
                      </p>
                      <p className="text-[7px] font-black uppercase tracking-widest text-gray-400 mt-1 leading-none">Apoio em Doações</p>
                    </div>
                  </div>
                </div>
                
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
                                order.status === 'finished' ? 'bg-emerald-100 text-emerald-600' : order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                              )}>
                                {order.status === 'received' ? 'Recebido' : order.status === 'accepted' ? 'Aguardando Pagamento' : order.status === 'preparing' ? 'Preparando' : order.status === 'ready' ? 'Pronto' : order.status === 'out-for-delivery' ? 'Saiu para entrega' : order.status === 'finished' ? 'Entregue' : order.status === 'cancelled' ? 'Cancelado' : order.status}
                              </div>
                            </div>
                            <h4 className="text-lg font-black text-[#111] uppercase tracking-tight mb-2">{restaurants.find(r => r.id === order.restaurantId)?.name || 'Restaurante'}</h4>
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
