import { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Store, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  Heart, 
  MapPin, 
  DollarSign,
  ArrowUpRight,
  Monitor
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';
import { CardSkeleton, ChartSkeleton, Skeleton } from '../../components/Skeleton';
import { motion } from 'motion/react';

export default function PlatformAdmin() {
  const [stats, setStats] = useState({
    totalRestaurants: 242,
    totalOrders: 12450,
    totalSales: 458900.50,
    totalDonations: 12450.00,
    activeToday: 156
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading for better UX feedback during data fetch
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Mocked data for demonstration since we are in MVP
  const salesHistory = [
    { name: 'Seg', valor: 45000 },
    { name: 'Ter', valor: 52000 },
    { name: 'Qua', valor: 48000 },
    { name: 'Qui', valor: 61000 },
    { name: 'Sex', valor: 85000 },
    { name: 'Sáb', valor: 98000 },
    { name: 'Dom', valor: 92000 },
  ];

  const categoriesData = [
    { name: 'Pizza', value: 400 },
    { name: 'Burger', value: 300 },
    { name: 'Marmita', value: 200 },
    { name: 'Sushi', value: 100 },
    { name: 'Pastel', value: 150 },
  ];

  if (loading) {
    return (
      <div className="space-y-8 pb-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="w-64 h-8" />
            <Skeleton className="w-48 h-3" />
          </div>
          <Skeleton className="w-40 h-10 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2">
              <ChartSkeleton />
           </div>
           <div className="bg-brand-black p-8 rounded-3xl space-y-6">
              <Skeleton className="w-32 h-4 bg-slate-800" />
              {[...Array(5)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="w-16 h-3 bg-slate-800" />
                    <Skeleton className="w-8 h-3 bg-slate-800" />
                  </div>
                  <Skeleton className="w-full h-1.5 bg-slate-800" />
                </div>
              ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h1 className="text-3xl font-black text-brand-black uppercase italic tracking-tighter">Central Meu Ovo</h1>
           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Inteligência de Mercado e Gestão Global</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="px-4 py-2 bg-brand-egg text-brand-black rounded-xl font-black text-[10px] uppercase tracking-widest border-b-4 border-yellow-600">
             Relatórios Mensais 2026
           </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: "Restaurantes", val: stats.totalRestaurants, icon: <Store className="text-brand-orange" />, change: "+12% este mês" },
           { label: "Pedidos Totais", val: stats.totalOrders.toLocaleString(), icon: <ClipboardList className="text-blue-500" />, change: "+25% este mês" },
           { label: "Vendas Geradas", val: formatCurrency(stats.totalSales), icon: <DollarSign className="text-green-500" />, change: "+18% este mês" },
           { label: "Refeições Doadas", val: stats.totalDonations / 5, icon: <Heart className="text-red-500" />, change: "78% da meta" }
         ].map((stat, i) => (
           <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
              <div className="flex justify-between items-start mb-4">
                 <div className="p-3 bg-brand-gray rounded-2xl group-hover:bg-brand-egg transition-colors">
                    {stat.icon}
                 </div>
                 <div className="flex items-center gap-1 text-green-600 font-black text-[9px] uppercase">
                    <ArrowUpRight size={12} /> {stat.change}
                 </div>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-2xl font-black text-brand-black tracking-tight italic uppercase">{stat.val}</p>
           </div>
         ))}
      </div>

      {/* Main Charts Row */}
      <div className="grid lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-black text-brand-black uppercase tracking-widest italic">Volume de Vendas (Semanal)</h3>
               <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg">
                     <div className="w-2 h-2 rounded-full bg-brand-egg" />
                     <span className="text-[9px] font-black text-slate-500 uppercase">2026</span>
                  </div>
               </div>
            </div>
            <div className="h-[300px]">
               <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesHistory}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FFC928" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#FFC928" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fontWeight: 900, fill: '#94A3B8' }}
                      tickFormatter={(val) => `R$${val/1000}k`}
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontWeight: 900, textTransform: 'uppercase', fontSize: '10px' }}
                    />
                    <Area type="monotone" dataKey="valor" stroke="#FFC928" strokeWidth={4} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
               </ResponsiveContainer>
            </div>
         </div>

         <div className="bg-brand-black p-8 rounded-3xl text-brand-white">
            <h3 className="text-xs font-black text-brand-egg uppercase tracking-widest mb-8 italic">Top Categorias</h3>
            <div className="space-y-6">
               {categoriesData.map((cat, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                       <span>{cat.name}</span>
                       <span className="text-brand-egg">{((cat.value / 1150) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(cat.value / 400) * 100}%` }}
                        className="h-full bg-brand-egg"
                       />
                    </div>
                 </div>
               ))}
            </div>
            <div className="mt-12 p-6 bg-slate-900 rounded-2xl border border-slate-800">
               <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Insight do Dia</p>
               <p className="text-sm font-bold leading-relaxed italic">Pedidos de Hambúrguer cresceram 14% na Zona Sul de São Paulo após às 22h.</p>
            </div>
         </div>
      </div>

      {/* Intelligence Dashboard Mockups */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
         <div className="bg-brand-gray p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-brand-egg rounded-xl text-brand-black">
                  <TrendingUp size={20} />
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-widest">Inteligência B2B</h4>
            </div>
            <p className="text-lg font-black text-brand-black tracking-tight mb-4 uppercase italic">Distribuidores</p>
            <p className="text-slate-500 text-xs font-bold leading-relaxed mb-6">Oportunidade de venda de embalagens biodegradáveis para 45 restaurantes em expansão.</p>
            <button className="text-[9px] font-black uppercase tracking-widest text-brand-orange hover:tracking-[0.2em] transition-all">Ver Relatório B2B →</button>
         </div>

         <div className="bg-brand-gray p-6 rounded-3xl border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-brand-egg rounded-xl text-brand-black">
                  <Monitor size={20} />
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-widest">Ads Performance</h4>
            </div>
            <p className="text-lg font-black text-brand-black tracking-tight mb-4 uppercase italic">Espaços B2B</p>
            <div className="flex items-center justify-between text-xs font-bold">
               <span className="text-slate-400 uppercase">Leads Gerados</span>
               <span className="text-brand-black">1.240</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold mt-2">
               <span className="text-slate-400 uppercase">CTR Médio</span>
               <span className="text-brand-black">2.4%</span>
            </div>
         </div>

         <div className="bg-brand-egg p-6 rounded-3xl border border-yellow-300">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-brand-black rounded-xl text-brand-egg">
                  <Users size={20} />
               </div>
               <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-black">Audience View</h4>
            </div>
            <p className="text-lg font-black text-brand-black tracking-tight mb-4 uppercase italic">Padrões de Consumo</p>
            <p className="text-brand-black/70 text-[11px] font-bold">Consumidores entre 25-35 anos preferem pagamento via PIX (78%) e fazem pedidos 2.5x por semana através de links do Instagram.</p>
         </div>
      </div>
    </div>
  );
}
