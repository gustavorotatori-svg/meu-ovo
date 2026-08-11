import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, getDocs, limit, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Restaurant } from '../types';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import OptimizedImage from '../components/OptimizedImage';
import Badge from '../components/Badge';
import { Skeleton } from '../components/Skeleton';
import { Trophy, Star, Flame, Crown } from 'lucide-react';

const PAGE_SIZE = 30;

const MEDALS = [
  <Crown key="gold" size={18} className="text-amber-400" />,
  <Flame key="silver" size={18} className="text-slate-400" />,
  <Star key="bronze" size={18} className="text-amber-600" />,
];

export default function MaisPedidosPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'restaurants'), where('isActive', '==', true), limit(100));
      const snap = await getDocs(q);
      const list = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Restaurant))
        .sort((a, b) => ((b.orderCount ?? 0) - (a.orderCount ?? 0)) || ((b.rating ?? 0) - (a.rating ?? 0)));
      setRestaurants(list.slice(0, PAGE_SIZE));
    } catch (err) {
      console.error('[MaisPedidos] Failed to load:', err);
      setRestaurants([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className={`min-h-screen font-sans transition-colors ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO
        title="Restaurantes Mais Pedidos"
        description="Veja o ranking dos restaurantes mais pedidos no Meu OVO. Os favoritos do delivery local direto no seu bairro, sem taxas abusivas."
        url="/mais-pedidos"
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/busca" />
      </div>

      <main className="pt-20 pb-24 px-6 max-w-7xl mx-auto">
        <header className="mb-14 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFC928] text-black rounded-full text-[10px] font-black uppercase tracking-widest">
            <Trophy size={12} /> Ranking da comunidade
          </div>
          <h1 className="text-5xl lg:text-7xl font-display font-black tracking-tighter uppercase italic leading-[0.85]">
            Mais <span className="text-[#FFC928]">Pedidos</span>
          </h1>
          <p className={`text-base font-medium max-w-xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Os restaurantes que o seu bairro mais pede. Comida de verdade, direto do parceiro.
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-72 rounded-3xl" />)}
          </div>
        ) : restaurants.length === 0 ? (
          <p className={`text-center py-20 text-sm font-black uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Ainda não há pedidos suficientes para montar o ranking.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((r, i) => {
              const orders = r.orderCount ?? 0;
              return (
                <Link
                  key={r.id}
                  to={`/r/${r.slug}`}
                  className={`group block bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-gray-100 ${i < 3 ? 'ring-2 ring-[#FFC928]/60' : ''}`}
                >
                  <div className="relative h-44 overflow-hidden">
                    <OptimizedImage
                      src={r.coverImage}
                      alt={r.name}
                      width={400}
                      height={176}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                    <div className="absolute top-3 left-3 z-10">
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-[10px] uppercase tracking-widest ${i === 0 ? 'bg-amber-400 text-black' : i === 1 ? 'bg-slate-300 text-black' : i === 2 ? 'bg-amber-700 text-white' : 'bg-black/50 text-white'}`}>
                        {MEDALS[i] || <span className="text-white">#{i + 1}</span>}
                        <span>{i + 1}º lugar</span>
                      </div>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 z-10 flex items-end justify-between">
                      <div>
                        <h3 className="font-black text-white text-xl leading-tight drop-shadow-lg">{r.name}</h3>
                        <p className="text-gray-200 text-xs font-semibold drop-shadow">{r.cuisineType} • {r.neighborhood}</p>
                      </div>
                      <div className="flex items-center gap-1 bg-black/50 rounded-full px-2.5 py-1">
                        <Flame size={12} className="text-[#FFC928]" />
                        <span className="text-white text-[10px] font-black uppercase tracking-widest">{orders} pedidos</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star size={14} className="text-amber-400 fill-amber-400" />
                      <span className="text-sm font-black">{r.rating?.toFixed(1) ?? '—'}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-400' : 'text-gray-400'}`}>
                        ({r.reviewCount ?? 0})
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge>🍳 Direto</Badge>
                      {r.isOpen && <Badge variant="success">Aberto</Badge>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
