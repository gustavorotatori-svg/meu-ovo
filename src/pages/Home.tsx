import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  Search, 
  ArrowRight,
  Utensils,
  Pizza,
  Coffee,
  Beer,
  Gift,
  Star,
  Share2
} from 'lucide-react';
import { Button } from '../components/Button';
import { motion } from 'motion/react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ShareModal from '../components/ShareModal';
import VoiceSearch from '../components/VoiceSearch';
import SEO from '../components/SEO';
import OptimizedImage from '../components/OptimizedImage';

import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../context/RestaurantContext';
import { useAuth } from '../context/AuthContext';
import { Restaurant } from '../types';
import { rankRestaurants } from '../lib/recommendations';
import { getStreak, getNextMilestone, checkStreakReminder } from '../services/streakService';

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { restaurants, orders, favorites, toggleFavorite } = useRestaurant();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [streak, setStreak] = useState<{ currentStreak: number } | null>(null);

  useEffect(() => {
    if (user?.id) {
      getStreak(user.id).then(s => {
        setStreak(s);
        checkStreakReminder(s);
      }).catch(() => {});
    }
  }, [user?.id]);
  
  const rankedRestaurants = useMemo(() => {
    return rankRestaurants(restaurants, orders);
  }, [restaurants, orders]);

  const [shareData, setShareData] = useState<{ isOpen: boolean; url: string; title: string }>({
    isOpen: false,
    url: '',
    title: ''
  });

  const handleShare = (e: React.MouseEvent, restaurant: Restaurant) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/r/restaurante-exemplo`; // In a real app we'd use the real slug
    setShareData({
      isOpen: true,
      url,
      title: `Confira o cardápio de ${restaurant.name} no MEU OVO!`
    });
  };

  const restaurantTypes = [
    { icon: <Pizza size={20} />, label: 'Pizza' },
    { icon: <Utensils size={20} />, label: 'Burger' },
    { icon: <Coffee size={20} />, label: 'Lanches' },
    { icon: <Beer size={20} />, label: 'Bebidas' },
    { icon: <Gift size={20} />, label: 'Promo' },
  ];
  return (
    <div className={`min-h-screen font-sans transition-colors overflow-x-hidden ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title="Delivery Direto e Social"
        description="Peça comida dos melhores restaurantes com impacto social. Zero taxas abusivas para os estabelecimentos."
      />
      <Navbar />
      
      {/* Search Header */}
      <section className="pt-40 pb-20 px-6 relative">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg aspect-square blur-[120px] -z-10 rounded-full ${isDark ? 'bg-[#FFC928]/5' : 'bg-[#FFC928]/10'}`} />
        <div className="max-w-4xl mx-auto text-center space-y-8">
           <motion.h1 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className={`text-5xl lg:text-7xl font-display font-black tracking-tighter uppercase italic leading-[0.9] transition-colors ${isDark ? 'text-white' : 'text-black'}`}
           >
             {t('home.heroTitle')}<br />
             <span className="text-[#FFC928]">{t('home.heroTitleHighlight')}</span>
           </motion.h1>
           <p className={`text-lg md:text-xl font-display font-semibold max-w-xl mx-auto leading-relaxed tracking-tight transition-colors ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
             {t('home.heroSubtitle')}
           </p>

           <div className="max-w-2xl mx-auto relative group flex items-center gap-3">
              <div className="relative flex-1">
                <Search className={`absolute left-6 top-1/2 -translate-y-1/2 transition-colors ${isDark ? 'text-gray-500 group-focus-within:text-[#FFC928]' : 'text-gray-400 group-focus-within:text-[#111]'}`} size={24} />
                <input 
                 type="text" 
                 placeholder={t('home.searchPlaceholder')} 
                 className={`w-full border-2 h-20 pl-16 pr-6 rounded-[2rem] text-xl font-display font-black outline-none transition-all placeholder:text-gray-600 ${
                   isDark 
                     ? 'bg-white/5 border-white/10 focus:border-[#FFC928] focus:bg-white/10 text-white' 
                     : 'bg-gray-100 border-gray-200 focus:border-[#FFC928] focus:bg-white text-black'
                 }`}
                 value={searchTerm}
                 onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                   if (e.key === 'Enter') {
                     if (searchTerm.trim()) {
                       navigate(`/busca?search=${encodeURIComponent(searchTerm.trim())}`);
                     } else {
                       navigate('/busca');
                     }
                   }
                 }}
                 onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <VoiceSearch 
                onTranscript={(text) => {
                  setSearchTerm(text);
                  navigate(`/busca?search=${encodeURIComponent(text)}`);
                }} 
                isDark={isDark}
                className="h-20 w-20 rounded-[2rem] flex-shrink-0"
              />
           </div>

           {/* Types */}
           <div className="flex gap-4 overflow-x-auto py-8 no-scrollbar justify-center">
              {restaurantTypes.map((type, i) => {
                 const handleTypeClick = () => {
                   if (type.label === 'Pizza') {
                     navigate('/busca?cuisine=Pizza');
                   } else if (type.label === 'Burger') {
                     navigate('/busca?cuisine=Hamburguer');
                   } else if (type.label === 'Lanches') {
                     navigate('/busca?search=Lanches');
                   } else if (type.label === 'Bebidas') {
                     navigate('/busca?cuisine=Bebidas');
                   } else {
                     navigate('/busca');
                   }
                 };
                 return (
                <button key={i} onClick={handleTypeClick} className="flex flex-col items-center gap-3 min-w-[90px] group">
                   <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 transform group-hover:-translate-y-1 border ${
                     isDark 
                       ? 'bg-white/5 text-gray-500 group-hover:bg-[#FFC928] group-hover:text-black border-white/5' 
                       : 'bg-gray-100 text-gray-600 group-hover:bg-[#FFC928] group-hover:text-black border-gray-200'
                   }`}>
                      {type.icon}
                   </div>
                   <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isDark ? 'text-gray-500 group-hover:text-white' : 'text-gray-500 group-hover:text-black'}`}>{type.label}</span>
                </button>
              );
            })}
           </div>
        </div>
      </section>

      {/* Streak + Daily Suggestion Section */}
      <section className="pb-4 px-6 max-w-7xl mx-auto">
        {streak && streak.currentStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-3xl border mb-6 ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-gradient-to-r from-orange-50 to-red-50 border-orange-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#111]'}`}>
                    {streak.currentStreak} {streak.currentStreak === 1 ? 'dia' : 'dias'} seguidos pedindo!
                  </p>
                  {(() => {
                    const next = getNextMilestone(streak.currentStreak);
                    if (!next) return <p className="text-[10px] font-bold text-orange-500">Streak máximo! 👑</p>;
                    return (
                      <p className="text-[10px] font-bold text-orange-500">
                        Faltam {next.days - streak.currentStreak} dias para {next.reward}
                      </p>
                    );
                  })()}
                </div>
              </div>
              <Link
                to="/busca"
                className="text-[10px] font-black text-[#FFC928] uppercase tracking-widest hover:underline"
              >
                Pedir agora →
              </Link>
            </div>
          </motion.div>
        )}

        {rankedRestaurants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className={`p-6 rounded-3xl border overflow-hidden ${
              isDark ? 'bg-white/5 border-white/5' : 'bg-white border-gray-100 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🍽️</span>
              <div>
                <p className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#111]'}`}>
                  Sugestão do dia
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {(() => {
                    const today = new Date().getDay();
                    const cuisines = ['Pizza', 'Hamburguer', 'Comida Brasileira', 'Japonês', 'Italiano', 'Mexicano', 'Árabe'];
                    return `${cuisines[today]} — ideal para hoje`;
                  })()}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const today = new Date().getDay();
                const cuisines = ['Pizza', 'Hamburguer', 'Brasileira', 'Japonês', 'Italiano', 'Mexicano', 'Árabe'];
                const suggestedCuisine = cuisines[today];
                const suggestions = rankedRestaurants
                  .filter(r => r.cuisineType?.toLowerCase().includes(suggestedCuisine.toLowerCase()))
                  .slice(0, 4);
                if (suggestions.length === 0) {
                  return <p className="text-xs text-gray-400 col-span-full">Nenhum restaurante encontrado para esta sugestão</p>;
                }
                return suggestions.map(r => (
                  <Link
                    key={r.id}
                    to={`/r/${r.slug}`}
                    className={`p-3 rounded-2xl border transition-all hover:border-[#FFC928] ${
                      isDark ? 'border-white/5 hover:bg-white/5' : 'border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    <p className={`font-black text-xs uppercase tracking-tight truncate ${isDark ? 'text-white' : 'text-[#111]'}`}>{r.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{r.cuisineType} • {r.neighborhood}</p>
                  </Link>
                ));
              })()}
            </div>
          </motion.div>
        )}
      </section>

      {/* Featured Section */}
      <section className="py-20 px-6 max-w-7xl mx-auto">
         <div className="flex items-center justify-between mb-12">
            <h2 className={`text-3xl font-display font-black italic tracking-tighter uppercase transition-colors ${isDark ? 'text-white' : 'text-black'}`}>{t('home.featuredRestaurants')}</h2>
            <Link to="/busca" className="flex items-center gap-2 text-[#FFC928] font-black text-xs uppercase tracking-widest hover:opacity-80">
              Ver todos <ArrowRight size={16} />
            </Link>
         </div>         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {rankedRestaurants.slice(0, 6).map((res, i) => (
              <Link to={`/r/${res.slug}`} key={res.id} className="group">
                <div className={`border-2 rounded-[2.5rem] overflow-hidden transition-all hover:border-[#FFC928]/50 hover:shadow-2xl hover:shadow-[#FFC928]/5 ${
                  isDark ? 'bg-[#0e0e11] border-white/5' : 'bg-white border-gray-100'
                }`}>
                   <div className="h-48 relative overflow-hidden">
                      <OptimizedImage src={res.coverImage} alt={res.name} width={400} height={192} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute top-6 right-6 flex flex-col gap-2 z-10">
                        <button 
                           onClick={(e) => handleShare(e, res)}
                           className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-[#FFC928] hover:text-black transition-all"
                           aria-label="Compartilhar restaurante"
                        >
                           <Share2 size={16} />
                        </button>
                        <button 
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             toggleFavorite(res.id);
                           }}
                           className={`p-2 backdrop-blur-md rounded-full transition-all hover:scale-110 ${
                             favorites.includes(res.id)
                               ? 'bg-red-500/90 text-white hover:bg-red-600' 
                               : 'bg-black/20 text-white hover:bg-red-500 hover:text-white'
                           }`}
                           title={favorites.includes(res.id) ? "Remover dos favoritos" : "Favoritar"}
                           aria-label="Favoritar restaurante"
                        >
                           <Heart size={16} className={favorites.includes(res.id) ? "fill-white text-white" : ""} />
                        </button>
                      </div>
                      <span className="absolute top-6 left-6 bg-[#FFC928] text-[10px] font-black text-black px-3 py-1 rounded-lg uppercase tracking-tight shadow-xl">100% DIRETO</span>
                      <div className="absolute bottom-6 left-6 flex items-center gap-3">
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-xl border-2 border-white/10 overflow-hidden">
                           <OptimizedImage src={res.logo} alt={res.name} width={48} height={48} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <h3 className="font-black text-white uppercase text-xl leading-none">{res.name}</h3>
                          <p className="text-[#FFC928] text-[10px] font-black uppercase tracking-widest mt-1">{res.cuisineType}</p>
                        </div>
                      </div>
                   </div>
                   <div className="p-6">
                      <div className="grid grid-cols-3 gap-4">
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Tempo</p>
                            <p className={`text-xs font-bold transition-colors ${isDark ? 'text-white' : 'text-black'}`}>{res.estimatedTime} min</p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Entrega</p>
                            <p className={`text-xs font-bold transition-colors ${isDark ? 'text-white' : 'text-black'}`}>
                               {res.deliveryFee === 0 ? 'Grátis' : `R$ ${res.deliveryFee.toFixed(2)}`}
                            </p>
                         </div>
                         <div className="space-y-1">
                            <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">Avaliação</p>
                            <div className="flex items-center gap-1">
                               <Star size={10} className="fill-[#FFC928] text-[#FFC928]" />
                               <span className={`text-xs font-bold transition-colors ${isDark ? 'text-white' : 'text-black'}`}>{res.rating}</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </Link>
            ))}
         </div>
      </section>

      {/* Social Banner */}
      <section className="py-24 px-6">
         <div className="max-w-7xl mx-auto bg-[#FFC928] rounded-[4rem] p-12 lg:p-20 relative overflow-hidden flex flex-col lg:flex-row items-center gap-12 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 group-hover:scale-125 transition-transform duration-1000" />
            
            <div className="flex-1 space-y-6 relative z-10 text-center lg:text-left">
               <div className="inline-flex items-center gap-2 px-4 py-1 bg-black text-white rounded-full">
                  <Heart size={12} className="text-red-500 fill-current" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Transformação Social</span>
               </div>
               <h2 className="text-5xl lg:text-7xl font-display font-black text-black tracking-tighter leading-[0.8] uppercase italic">
                 Comer bem <br/><span className="text-white">faz o bem.</span>
               </h2>
               <p className="text-black/60 text-lg lg:text-xl font-display font-semibold leading-relaxed tracking-tight max-w-lg mx-auto lg:mx-0">
                 Ao pedir pelo Meu Ovo, você pode arredondar sua conta e ajudar a combater a fome na sua cidade. 100% transparente.
               </p>
               <button className="bg-black text-white font-black px-10 py-5 rounded-3xl text-sm uppercase tracking-widest hover:scale-105 transition-all active:scale-95 shadow-2xl">
                 Ver impacto real
               </button>
            </div>

            <div className="w-full lg:w-96 aspect-square bg-black rounded-[3rem] items-center justify-center p-12 hidden lg:flex shadow-2xl">
               <div className="text-center space-y-4">
                  <p className="text-7xl font-black text-[#FFC928] tracking-tighter italic">2.4k+</p>
                  <p className="text-[10px] font-black text-white uppercase tracking-widest leading-tight">Refeições doadas<br/><span className="opacity-40">este mês em SP</span></p>
               </div>
            </div>
         </div>
      </section>

      <Footer />
      
      <ShareModal 
        isOpen={shareData.isOpen}
        onClose={() => setShareData(prev => ({ ...prev, isOpen: false }))}
        url={shareData.url}
        title={shareData.title}
      />
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
