import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getAchievements, getAllAchievements, type AchievementState } from '../services/achievementService';
import { Order } from '../types';
import { motion } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollReveal from '../components/ScrollReveal';
import { Trophy, Share2, ArrowLeft, Award, ShoppingBag } from 'lucide-react';
import { toast } from 'react-hot-toast';

const categoryMap: Record<string, { label: string; icon: string; color: string }> = {
  first_order: { label: 'Pedidos', icon: '🛵', color: '#FFC928' },
  five_orders: { label: 'Pedidos', icon: '🛵', color: '#FFC928' },
  ten_orders: { label: 'Pedidos', icon: '🛵', color: '#FFC928' },
  streak_3: { label: 'Streak', icon: '🔥', color: '#FF6B35' },
  streak_7: { label: 'Streak', icon: '🔥', color: '#FF6B35' },
  donation: { label: 'Doações', icon: '❤️', color: '#E11D48' },
  big_donor: { label: 'Doações', icon: '❤️', color: '#E11D48' },
  pix_payment: { label: 'Pagamentos', icon: '💸', color: '#10B981' },
  favorites_5: { label: 'Coleção', icon: '💝', color: '#EC4899' },
  big_spender: { label: 'Gastos', icon: '💰', color: '#8B5CF6' },
};

function ProgressRing({ percent, size = 72, strokeWidth = 5, color = '#FFC928' }: { percent: number; size?: number; strokeWidth?: number; color?: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-200 dark:text-slate-700" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

export default function AchievementsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [achievements, setAchievements] = useState<AchievementState | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    async function load() {
      try {
        const [ach, orderSnap] = await Promise.all([
          getAchievements(user.id),
          getDocs(query(collection(db, 'orders'), where('userId', '==', user.id), orderBy('createdAt', 'desc'))),
        ]);
        setAchievements(ach);
        setOrders(orderSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      } catch { } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col justify-between bg-[#f8fafc] dark:bg-[#0f172a]">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Trophy size={48} className="mx-auto mb-4 text-slate-300 dark:text-slate-600" />
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-slate-200 mb-2">Faça login</h2>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">Entre para ver suas conquistas</p>
            <button onClick={() => navigate('/perfil')} className="bg-[#FFC928] text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest">
              Entrar
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const allAchievements = getAllAchievements();
  const unlockedIds = achievements?.unlocked || [];
  const unlockedCount = unlockedIds.length;
  const totalCount = allAchievements.length;
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0;

  const categories = ['Pedidos', 'Streak', 'Doações', 'Pagamentos', 'Coleção', 'Gastos'];
  const grouped = categories.map(cat => ({
    category: cat,
    items: allAchievements.filter(a => categoryMap[a.id]?.label === cat),
  }));

  const handleShare = async () => {
    const text = `🍳 MEU OVO — Minhas Conquistas\n\n${unlockedCount}/${totalCount} badges desbloqueadas!\n\n`;
    const details = allAchievements.map(a => unlockedIds.includes(a.id) ? `✅ ${a.icon} ${a.label}` : `🔒 ${a.label}`).join('\n');
    const full = text + details + '\n\nVem comigo: https://meu-ovo.app';

    try {
      if (navigator.share) {
        await navigator.share({ title: 'Minhas Conquistas - MEU OVO', text: full });
      } else {
        await navigator.clipboard.writeText(full);
        toast.success('Compartilhado!');
      }
    } catch { }
  };

  return (
    <div className={`min-h-screen flex flex-col justify-between transition-colors ${isDark ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-[#111]'}`}>
      <Navbar />
      <div className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 space-y-8">
        <ScrollReveal direction="up">
          <button onClick={() => navigate('/perfil')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-[#FFC928] transition-colors mb-4">
            <ArrowLeft size={14} /> Voltar ao perfil
          </button>

          <div className={`relative overflow-hidden rounded-3xl p-8 ${isDark ? 'bg-[#1e293b]' : 'bg-white'} shadow-xl`}>
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#FFC928] via-purple-500 to-pink-500" />
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative">
                <ProgressRing percent={progressPercent} size={88} strokeWidth={6} color="#FFC928" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Trophy size={28} className="text-[#FFC928]" />
                </div>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-2xl font-black uppercase tracking-tight italic">Suas Conquistas</h1>
                <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {unlockedCount} de {totalCount} badges desbloqueadas
                </p>
                <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                  <span className="px-3 py-1 bg-[#FFC928]/10 text-[#FFC928] text-[9px] font-black uppercase tracking-wider rounded-lg border border-[#FFC928]/20 flex items-center gap-1">
                    <ShoppingBag size={10} /> {orders.length} pedidos
                  </span>
                  <span className="px-3 py-1 bg-purple-500/10 text-purple-500 text-[9px] font-black uppercase tracking-wider rounded-lg border border-purple-500/20 flex items-center gap-1">
                    <Award size={10} /> {unlockedCount} badges
                  </span>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[#FFC928] text-black text-[10px] font-black uppercase tracking-widest hover:bg-[#f5c010] transition-all"
              >
                <Share2 size={14} /> Compartilhar
              </button>
            </div>
          </div>
        </ScrollReveal>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-4 border-[#FFC928] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-10">
            {grouped.map(({ category, items }, gi) => (
              <ScrollReveal key={category} direction="up" delay={gi * 80}>
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-lg">{items[0] && categoryMap[items[0].id]?.icon}</span>
                    <h2 className="text-sm font-black uppercase tracking-widest">{category}</h2>
                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                    <span className={`text-[9px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      {items.filter(i => unlockedIds.includes(i.id)).length}/{items.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((achievement, ai) => {
                      const unlocked = unlockedIds.includes(achievement.id);
                      const cat = categoryMap[achievement.id];

                      return (
                        <motion.div
                          key={achievement.id}
                          initial={false}
                          whileHover={unlocked ? { scale: 1.02 } : {}}
                          className={`relative overflow-hidden rounded-2xl p-4 border-2 transition-all ${
                            unlocked
                              ? `${isDark ? 'bg-[#1e293b] border-amber-500/30' : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200/60'}`
                              : `${isDark ? 'bg-[#1e293b]/50 border-slate-700/50' : 'bg-slate-50 border-slate-200'}`
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="relative shrink-0">
                              <ProgressRing
                                percent={unlocked ? 100 : 0}
                                size={56}
                                strokeWidth={4}
                                color={cat?.color || '#FFC928'}
                              />
                              <div className="absolute inset-0 flex items-center justify-center text-lg">
                                {unlocked ? achievement.icon : '🔒'}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-[10px] font-black uppercase tracking-tight ${unlocked ? (isDark ? 'text-amber-300' : 'text-amber-800') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>
                                {achievement.label}
                              </p>
                              <p className={`text-[8px] font-bold mt-0.5 ${unlocked ? (isDark ? 'text-amber-400/70' : 'text-amber-600/70') : (isDark ? 'text-slate-600' : 'text-slate-400')}`}>
                                {achievement.description}
                              </p>
                              {unlocked && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={`inline-block mt-1.5 text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${isDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-700'}`}
                                >
                                  Desbloqueada
                                </motion.span>
                              )}
                            </div>
                          </div>
                          {unlocked && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 }}
                              className={`absolute -top-3 -right-3 w-12 h-12 ${isDark ? 'bg-amber-500/10' : 'bg-amber-100'} rounded-full`}
                            >
                              <span className="absolute top-3 right-3 text-xs">⭐</span>
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
