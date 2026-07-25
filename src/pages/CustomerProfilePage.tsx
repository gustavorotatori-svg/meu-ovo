import { useState, useEffect, type FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Package, MapPin, Settings, LogOut, ChevronRight, Clock, Star, Heart, Mail, Lock, Shield, Plus, Trash2, Check, Home, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, SavedAddress, Product, CartItem } from '../types';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BackButton from '../components/BackButton';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../context/RestaurantContext';
import { useCart } from '../context/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import { getCustomerStats } from '../services/customerRatingService';
import { getStreak, getNextMilestone } from '../services/streakService';
import { getPlatformPoints, pointsToDiscount } from '../services/platformLoyaltyService';
import { getAchievements, getAllAchievements, type AchievementState } from '../services/achievementService';

type Tab = 'orders' | 'favorites' | 'addresses';

export default function CustomerProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, signOut, signIn, signUp } = useAuth();
  const { favorites, toggleFavorite, restaurants } = useRestaurant();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerStats, setCustomerStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState<{ currentStreak: number; longestStreak: number } | null>(null);
  const [platformPoints, setPlatformPoints] = useState<{ totalPoints: number } | null>(null);
  const [achievements, setAchievements] = useState<AchievementState | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(() => {
    try { return JSON.parse(localStorage.getItem('meuovo_addresses') || '[]'); } catch { return []; }
  });
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '' });

  useEffect(() => {
    try { localStorage.setItem('meuovo_addresses', JSON.stringify(savedAddresses)); } catch {}
  }, [savedAddresses]);

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
  const [lgpdConsent, setLgpdConsent] = useState(false);

  const favoriteRestaurants = restaurants.filter(r => favorites.includes(r.id));

  useEffect(() => {
    if (!user) return;

    async function fetchOrders() {
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.id),
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
    if (user?.id) {
      getStreak(user.id).then(s => setStreak(s)).catch(() => {});
      getPlatformPoints(user.id).then(p => setPlatformPoints(p)).catch(() => {});
      getAchievements(user.id).then(a => setAchievements(a)).catch(() => {});
    }
  }, [user]);

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

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim()) {
      toast.error('Digite seu e-mail.');
      return;
    }
    if (!EMAIL_REGEX.test(authEmail.trim())) {
      toast.error('E-mail inválido. Use o formato: nome@provedor.com');
      return;
    }
    if (!authPassword) {
      toast.error('Digite sua senha.');
      return;
    }
    if (authPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!isLogin && !authName.trim()) {
      toast.error('Digite seu nome.');
      return;
    }
    if (!isLogin && !lgpdConsent) {
      toast.error('Você precisa aceitar os termos de privacidade para criar uma conta.');
      return;
    }

    setAuthLoading(true);
    try {
      if (isLogin) {
        await signIn(authEmail.trim(), authPassword);
        toast.success('Bem-vindo de volta!');
      } else {
        await signUp(authEmail.trim(), authPassword, authName.trim(), 'customer');
        toast.success('Conta de cliente criada com sucesso!');
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Ocorreu um erro ao processar a autenticação.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#f8fafc] customer-profile-page">
        <Navbar />
        <div className="px-6 pt-6">
          <BackButton to="/" />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 py-20">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden relative p-8 md:p-10">
              <div className="text-center space-y-4 mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all duration-500 ${isLogin ? 'bg-[#FFC928]/10' : 'bg-green-100'}`}>
                  {isLogin ? <User size={32} className="text-[#FFC928]" /> : <span className="text-3xl">🍳</span>}
                </div>
                <h1 className="font-display font-black text-3xl uppercase tracking-tighter italic leading-none">
                  {isLogin ? 'Fazer Login' : 'Criar Conta'}
                </h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed max-w-xs mx-auto">
                  {isLogin ? 'Entre na sua conta para acompanhar seus pedidos' : 'Crie sua conta em 30 segundos e tenha uma experiência completa'}
                </p>
                {!isLogin && (
                  <div className="flex flex-wrap justify-center gap-2 mt-3">
                    {['Pedidos salvos', 'Favoritos', 'Avaliações', 'Delivery ágil'].map(b => (
                      <span key={b} className="px-3 py-1 bg-green-50 text-green-700 text-[9px] font-black uppercase tracking-wider rounded-lg border border-green-200">
                        ✓ {b}
                      </span>
                    ))}
                  </div>
                )}
              </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-1.5">
                  <label htmlFor="profile-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
                    <input
                      id="profile-name"
                      type="text"
                      autoFocus
                      required
                      autoComplete="name"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all placeholder:text-gray-400"
                    placeholder="Ex: João da Silva"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="profile-email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
                  <input
                    id="profile-email"
                    type="email"
                    required
                    autoFocus={isLogin}
                    autoComplete="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all placeholder:text-gray-400"
                    placeholder="voce@exemplo.com"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="profile-password" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" aria-hidden="true" />
                  <input
                    id="profile-password"
                    type="password"
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50/50 border border-gray-100 rounded-xl text-sm font-bold focus:outline-none focus:border-[#FFC928] focus:bg-white transition-all placeholder:text-gray-400"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                {!isLogin && authPassword && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[authPassword.length >= 6, /[A-Z]/.test(authPassword), /[0-9]/.test(authPassword), authPassword.length >= 8].map((ok, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-colors ${ok ? 'bg-green-500' : 'bg-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                      {authPassword.length < 6 ? 'Mínimo 6 caracteres' : authPassword.length < 8 ? 'Quase lá! Adicione mais caracteres' : 'Senha boa ✓'}
                    </p>
                  </div>
                )}
              </div>

              {isLogin && (
                <button
                  type="button"
                  onClick={async () => {
                    if (!authEmail.trim()) { toast.error('Digite seu e-mail primeiro'); return; }
                    try {
                      const { sendPasswordResetEmail } = await import('firebase/auth');
                      const { auth } = await import('../lib/firebase-auth');
                      await sendPasswordResetEmail(auth, authEmail);
                      toast.success('E-mail de recuperação enviado!');
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : 'Erro ao enviar e-mail de recuperação');
                    }
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-[#FFC928] transition-colors block"
                >
                  Esqueci minha senha
                </button>
              )}

              {!isLogin && (
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={lgpdConsent}
                      onChange={e => setLgpdConsent(e.target.checked)}
                      className="mt-0.5 h-5 w-5 text-[#FFC928] border-gray-300 rounded focus:ring-[#FFC928] accent-[#FFC928]"
                    />
                    <div>
                      <span className="text-[10px] font-black text-slate-700 block leading-tight">
                        Aceito os termos de privacidade
                      </span>
                      <span className="text-[9px] text-slate-500 font-medium mt-0.5 block leading-relaxed">
                        Autorizo o tratamento dos meus dados conforme a LGPD.{' '}
                        <Link to="/privacidade" className="text-[#FFC928] font-bold underline">Ver Política de Privacidade</Link>
                      </span>
                    </div>
                  </label>
                </div>
              )}

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
    <div className="min-h-screen bg-[#f8fafc] customer-profile-page">
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

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

                {/* Streak Section */}
                {streak && streak.currentStreak > 0 && (
                  <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20 text-left w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🔥</span>
                        <div>
                          <p className="text-xs font-black text-orange-700 uppercase tracking-wider">
                            {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'} seguidos
                          </p>
                          {(() => {
                            const next = getNextMilestone(streak.currentStreak);
                            if (!next) return <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mt-0.5">Streak máximo atingido! 👑</p>;
                            const progress = (streak.currentStreak / next.days) * 100;
                            return (
                              <>
                                <p className="text-[8px] font-bold text-orange-400 uppercase tracking-widest mt-0.5">
                                  Faltam {next.days - streak.currentStreak} dias para: {next.reward}
                                </p>
                                <div className="w-full h-1.5 bg-orange-200/30 rounded-full mt-1.5 overflow-hidden">
                                  <div className="h-full bg-gradient-to-r from-orange-500 to-red-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Platform Points */}
                {platformPoints && platformPoints.totalPoints > 0 && (
                  <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50 text-left w-full">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏆</span>
                        <div>
                          <p className="text-xs font-black text-purple-800 uppercase tracking-wider">
                            {platformPoints.totalPoints} pontos MEU OVO
                          </p>
                          <p className="text-[8px] font-bold text-purple-500 uppercase tracking-widest mt-0.5">
                            {pointsToDiscount(platformPoints.totalPoints) >= 1
                              ? `R$ ${pointsToDiscount(platformPoints.totalPoints).toFixed(2)} em descontos disponíveis`
                              : `Faltam ${100 - platformPoints.totalPoints} pts para R$ 5 de desconto`
                            }
                          </p>
                        </div>
                      </div>
                      <span className="text-2xl">💎</span>
                    </div>
                  </div>
                )}

                {/* Achievements */}
                {achievements && achievements.unlocked.length > 0 && (
                  <div className="mt-5 p-4 rounded-2xl bg-white border border-slate-200 text-left w-full">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-sm">🏅</span>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Conquistas ({achievements.unlocked.length}/{getAllAchievements().length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getAllAchievements().filter(a => achievements.unlocked.includes(a.id)).map(a => (
                        <span key={a.id} className="px-2 py-1 rounded-lg bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-[9px] font-bold text-amber-800 flex items-center gap-1" title={a.description}>
                          {a.icon} {a.label}
                        </span>
                      ))}
                      {getAllAchievements().filter(a => !achievements.unlocked.includes(a.id)).slice(0, 3).map(a => (
                        <span key={a.id} className="px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-[9px] font-bold text-slate-300 flex items-center gap-1" title={a.description}>
                          🔒 {a.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Medal Progress Bar */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-100 border border-slate-200 text-left w-full">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Star size={12} className="text-[#FFC928]" />
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Progresso para próxima medalha</span>
                  </div>
                  {(() => {
                    const tiers = [
                      { min: 0, max: 1, label: '🌱 Amigo do Bairro', next: '🥉 Apoiador Bronze', needed: 1 },
                      { min: 1, max: 4, label: '🥉 Apoiador Bronze', next: '🥈 Apoiador Prata', needed: 4 },
                      { min: 4, max: 8, label: '🥈 Apoiador Prata', next: '🥇 Parceiro de Ouro', needed: 8 },
                      { min: 8, max: Infinity, label: '🥇 Parceiro de Ouro 👑', next: null, needed: 8 },
                    ];
                    const current = tiers.find(t => orders.length >= t.min && orders.length < t.max) || tiers[tiers.length - 1];
                    const progress = current.next ? (orders.length / current.needed) * 100 : 100;
                    return (
                      <div>
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-600 mb-1">
                          <span>{current.label}</span>
                          {current.next && <span className="text-[#FFC928]">{current.next}</span>}
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[#FFC928] to-yellow-500 rounded-full transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <p className="text-[8px] font-bold text-slate-400 mt-1">
                          {current.next ? `${orders.length}/${current.needed} pedidos` : 'Nível máximo!'}
                        </p>
                      </div>
                    );
                  })()}
                </div>

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
                  { id: 'addresses', label: 'Endereços Salvos', icon: <MapPin size={18} /> },
                  { id: 'settings', label: 'Configurações', icon: <Settings size={18} />, disabled: true },
                ].map((item, i) => (
                  <button 
                   key={i}
                   disabled={item.disabled}
                   onClick={() => {
                     if (item.id === 'orders' || item.id === 'favorites' || item.id === 'addresses') {
                       setActiveTab(item.id as Tab);
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
                  {activeTab === 'orders' ? 'Histórico de Pedidos' : activeTab === 'favorites' ? 'Restaurantes Favoritos' : 'Endereços Salvos'}
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {activeTab === 'orders' ? 'Acompanhe suas últimas experiências gastronômicas' : activeTab === 'favorites' ? 'Seus estabelecimentos preferidos salvos' : 'Seus endereços de entrega favoritos'}
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
                          <div className="flex items-center justify-end gap-2 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReorder(order); }}
                              className="bg-[#FFC928] text-black text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl flex items-center gap-1 hover:bg-yellow-400 transition-all"
                            >
                              <RotateCcw size={10} /> Repetir
                            </button>
                            <button className="text-[#FFC928] text-[9px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                              Ver Detalhes <ChevronRight size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <EmptyState
                    icon={<Package size={32} />}
                    title="Nenhum pedido ainda"
                    subtitle="Que tal fazer o seu primeiro hoje?"
                    className="bg-white rounded-[2rem] p-20 border-2 border-slate-100"
                  />
                )
              ) : activeTab === 'favorites' ? (
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
                          aria-label="Favoritar"
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
                    <div className="col-span-full">
                      <EmptyState
                        icon={<Heart size={32} />}
                        title="Nenhum favorito ainda"
                        subtitle="Qual o seu restaurante preferido da região?"
                        className="bg-white rounded-[2rem] p-20 border-2 border-slate-100"
                        action={
                          <Link 
                            to="/marketplace" 
                            className="inline-block bg-[#FFC928] hover:bg-black text-black hover:text-[#FFC928] font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all"
                          >
                            Explorar estabelecimentos
                          </Link>
                        }
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {savedAddresses.length === 0 ? (
                    <EmptyState
                      icon={<MapPin size={32} />}
                      title="Nenhum endereço salvo"
                      subtitle="Adicione endereços para agilizar seus pedidos"
                      className="bg-white rounded-[2rem] p-16 border-2 border-slate-100"
                    />
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {savedAddresses.map((addr, i) => (
                        <div key={addr.id} className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 hover:border-[#FFC928] transition-all relative">
                          {addr.isDefault && <span className="absolute top-4 right-4 text-[8px] font-black uppercase tracking-widest text-[#FFC928] bg-[#FFC928]/10 px-3 py-1 rounded-full">Padrão</span>}
                          <div className="flex items-center gap-2 mb-3">
                            <Home size={16} className="text-slate-400" />
                            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">{addr.label}</span>
                          </div>
                          <p className="text-sm text-slate-600 font-bold leading-relaxed">
                            {addr.street}, {addr.number}{addr.complement ? ` - ${addr.complement}` : ''}
                          </p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-1">{addr.neighborhood}, {addr.city}</p>
                          <button
                            onClick={() => {
                              setSavedAddresses(prev => prev.filter(a => a.id !== addr.id));
                              toast.success('Endereço removido');
                            }}
                            className="mt-4 text-[10px] text-red-400 hover:text-red-500 font-black uppercase tracking-widest flex items-center gap-1 transition-colors"
                          >
                            <Trash2 size={12} /> Remover
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <AnimatePresence>
                    {showAddressForm ? (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-white rounded-[2rem] p-6 border-2 border-[#FFC928] overflow-hidden">
                        <h4 className="text-xs font-black text-[#111] uppercase tracking-wider mb-4">Novo Endereço</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Identificação *</label>
                            <input value={addressForm.label} onChange={e => setAddressForm(f => ({ ...f, label: e.target.value }))} placeholder="Ex: Casa, Trabalho" className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#FFC928] outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Rua *</label>
                            <input value={addressForm.street} onChange={e => setAddressForm(f => ({ ...f, street: e.target.value }))} placeholder="Nome da rua" className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#FFC928] outline-none" />
                          </div>
                          <div>
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Número *</label>
                            <input value={addressForm.number} onChange={e => setAddressForm(f => ({ ...f, number: e.target.value }))} placeholder="Nº" className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#FFC928] outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Complemento</label>
                            <input value={addressForm.complement} onChange={e => setAddressForm(f => ({ ...f, complement: e.target.value }))} placeholder="Apto, Bloco" className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#FFC928] outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bairro *</label>
                            <input value={addressForm.neighborhood} onChange={e => setAddressForm(f => ({ ...f, neighborhood: e.target.value }))} placeholder="Seu bairro" className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#FFC928] outline-none" />
                          </div>
                          <div className="col-span-2 md:col-span-1">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Cidade *</label>
                            <input value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} placeholder="Sua cidade" className="w-full mt-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-[#FFC928] outline-none" />
                          </div>
                        </div>
                        <div className="flex gap-3 mt-4">
                          <button onClick={() => setShowAddressForm(false)} className="flex-1 bg-slate-100 text-slate-500 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                          <button onClick={() => {
                            if (!addressForm.label.trim() || !addressForm.street.trim() || !addressForm.number.trim() || !addressForm.neighborhood.trim() || !addressForm.city.trim()) {
                              toast.error('Preencha todos os campos obrigatórios');
                              return;
                            }
                            const newAddr: SavedAddress = { id: `addr-${Date.now()}`, userId: user?.id || '', ...addressForm, complement: addressForm.complement, isDefault: savedAddresses.length === 0, createdAt: new Date().toISOString() };
                            setSavedAddresses(prev => [...prev, newAddr]);
                            setAddressForm({ label: '', street: '', number: '', complement: '', neighborhood: '', city: '' });
                            setShowAddressForm(false);
                            toast.success('Endereço salvo!');
                          }} className="flex-1 bg-[#FFC928] text-black font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center gap-2">
                            <Check size={14} /> Salvar
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <button onClick={() => setShowAddressForm(true)} className="w-full border-2 border-dashed border-slate-200 hover:border-[#FFC928] text-slate-400 hover:text-black font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                        <Plus size={16} /> Adicionar Endereço
                      </button>
                    )}
                  </AnimatePresence>
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
