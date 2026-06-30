import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Store, Brain, BarChart3, Users, Heart, Search, Bell, Trophy, Star, RefreshCw, Shield, ChevronRight, X, User, Phone } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../../components/Logo';
import Breadcrumbs from '../../components/admin/Breadcrumbs';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { CustomerRating } from '../../types';

interface CustomerSummary {
  phone: string;
  name: string;
  averageRating: number;
  totalRatings: number;
  lastRating: string;
}

export default function PlatformCustomers() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, 'customer_ratings'));
        const ratings = snap.docs.map(d => d.data() as CustomerRating);

        const grouped: Record<string, { name: string; ratings: number[]; lastRating: string }> = {};
        ratings.forEach(r => {
          if (!grouped[r.customerPhone]) {
            grouped[r.customerPhone] = { name: r.customerName, ratings: [], lastRating: '' };
          }
          grouped[r.customerPhone].ratings.push(r.rating);
          if (r.createdAt > grouped[r.customerPhone].lastRating) {
            grouped[r.customerPhone].lastRating = r.createdAt;
          }
        });

        const list = Object.entries(grouped).map(([phone, data]) => ({
          phone,
          name: data.name,
          averageRating: Number((data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1)),
          totalRatings: data.ratings.length,
          lastRating: data.lastRating,
        })).sort((a, b) => b.averageRating - a.averageRating);

        setCustomers(list);
      } catch (err) {
        console.error('Error fetching customer ratings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  const filtered = search
    ? customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search))
    : customers;

  const sidebarItems = [
    { to: '/plataforma', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/plataforma/restaurantes', label: 'Restaurantes', icon: <Store size={20} /> },
    { to: '/plataforma/clientes', label: 'Clientes', icon: <Users size={20} /> },
    { to: '/plataforma/inteligencia', label: 'Inteligência', icon: <Brain size={20} /> },
    { to: '/plataforma/relatorios', label: 'Relatórios do Mercado', icon: <BarChart3 size={20} /> },
    { to: '/plataforma/parceiros', label: 'Parceiros Sociais', icon: <Heart size={20} /> },
    { to: '/plataforma/doacoes', label: 'Gestão de Doações', icon: <Heart size={20} /> },
    { to: '/plataforma/ovos-de-ouro', label: 'Ovos de Ouro 🏆', icon: <Trophy size={20} /> },
  ];

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F9FAFB]'}`}>
      <aside className={`w-64 border-r ${isDark ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-200'} hidden lg:flex flex-col sticky top-0 h-screen`}>
        <div className="p-6 border-b border-inherit">
          <Logo size="lg" variant={isDark ? 'dark-colored' : 'colored'} />
          <div className="mt-4 bg-[#FFC928]/10 text-[#FFC928] text-[10px] font-black px-2 py-1 rounded inline-block uppercase tracking-wider">Platform Master</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                location.pathname === item.to
                  ? 'bg-[#FFC928] text-[#111]'
                  : (isDark ? 'text-gray-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-6 border-t border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFC928] to-[#FF7A00] rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-black text-[#111] dark:text-white">Admin Master</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Super User</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className={`h-20 border-b flex items-center justify-between px-8 sticky top-0 z-20 ${isDark ? 'bg-[#0a0a0a]/80 border-[#2a2a2a]' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}>
          <h1 className="text-xl font-black text-[#111] dark:text-white">👤 Avaliações dos Clientes</h1>
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome ou telefone..."
              className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 rounded-full text-sm w-72 focus:outline-none focus:ring-2 focus:ring-[#FFC928]"
            />
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <Breadcrumbs />

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <RefreshCw className="animate-spin text-amber-500 mb-2" size={24} />
              <p className="text-xs text-gray-400">Carregando avaliações...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 text-gray-400">
              <User size={48} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-bold uppercase">Nenhum cliente avaliado</p>
              <p className="text-xs text-gray-300 mt-1">Os restaurantes ainda não avaliaram nenhum cliente.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
              <div className="p-6 border-b border-gray-100 dark:border-neutral-800">
                <p className="text-xs font-bold text-gray-400">{filtered.length} cliente{filtered.length !== 1 ? 's' : ''} avaliado{filtered.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-800/50">
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Telefone</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Média</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Avaliações</th>
                      <th className="p-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Última</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((c, i) => (
                      <tr key={c.phone} className="border-b border-gray-50 dark:border-neutral-800/50 hover:bg-gray-50 dark:hover:bg-neutral-800/30 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                              c.averageRating >= 4 ? 'bg-emerald-100 text-emerald-700' : c.averageRating >= 3 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {c.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-black text-sm text-[#111] dark:text-white">{c.name}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="text-xs font-bold text-gray-400 flex items-center gap-1">
                            <Phone size={12} /> {c.phone}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-amber-500">{c.averageRating.toFixed(1)}</span>
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                          </div>
                        </td>
                        <td className="p-5">
                          <span className="text-xs font-bold text-gray-400">{c.totalRatings} {c.totalRatings === 1 ? 'avaliação' : 'avaliações'}</span>
                        </td>
                        <td className="p-5">
                          <span className="text-[10px] font-bold text-gray-400">{new Date(c.lastRating).toLocaleDateString('pt-BR')}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
