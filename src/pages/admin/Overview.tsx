import { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { useRestaurant } from '../../context/RestaurantContext';
import { Order } from '../../types';
import { TrendingUp, ShoppingBag, Users, Star, ArrowUpRight, ArrowDownRight, Sparkles } from 'lucide-react';
import { cn, formatCurrency } from '../../lib/utils';
import { CardSkeleton, Skeleton } from '../../components/Skeleton';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';

export default function Overview() {
  const { currentRestaurant: restaurant } = useRestaurant();
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    activeProducts: 0,
    recentOrders: [] as Order[]
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurant) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        // Products count
        const prodSnap = await getDocs(query(collection(db, 'products'), where('restaurantId', '==', restaurant.id)));
        
        // Today's orders
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const ordersSnap = await getDocs(query(
          collection(db, 'orders'), 
          where('restaurantId', '==', restaurant.id),
          where('createdAt', '>=', today.toISOString()),
          orderBy('createdAt', 'desc')
        ));

        const orders = ordersSnap.docs.map(doc => doc.data() as Order);
        const revenue = orders.reduce((acc, curr) => acc + (curr.status !== 'cancelled' ? curr.total : 0), 0);

        setStats({
          todayRevenue: revenue,
          todayOrders: orders.length,
          activeProducts: prodSnap.size,
          recentOrders: orders.slice(0, 5)
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [restaurant]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="w-48 h-8" />
          <Skeleton className="w-32 h-3" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="w-full h-[400px] rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="w-full h-32 rounded-2xl" />
            <Skeleton className="w-full h-48 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    { label: 'Faturamento', value: formatCurrency(stats.todayRevenue), icon: <TrendingUp size={24} />, color: 'text-brand-black', bg: 'bg-brand-egg' },
    { label: 'Pedidos Hoje', value: stats.todayOrders, icon: <ShoppingBag size={24} />, color: 'text-brand-white', bg: 'bg-brand-black' },
    { label: 'Itens Ativos', value: stats.activeProducts, icon: <Star size={24} />, color: 'text-brand-black', bg: 'bg-slate-100' },
  ];

  return (
    <div className="space-y-6">
      {stats.activeProducts === 0 && (
        <div className="bg-gradient-to-r from-brand-black to-slate-800 p-8 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
          <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-64 h-64 bg-brand-egg/10 rounded-full blur-3xl group-hover:bg-brand-egg/20 transition-all duration-700" />
          <div className="relative z-10 space-y-4 flex-1">
             <div className="inline-flex items-center gap-2 bg-brand-egg/20 text-brand-egg px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-egg/20">
               <Sparkles size={12} /> Sugestão de Novo Usuário
             </div>
             <h3 className="text-3xl font-black italic uppercase tracking-tighter leading-tight">Monte seu Cardápio <br /><span className="text-brand-egg">com Inteligência Artificial</span></h3>
             <p className="text-sm font-medium text-slate-400 max-w-md">
               Seu catálogo ainda está vazio. Deixe nossa IA criar sugestões de categorias e produtos para o seu restaurante em segundos.
             </p>
             <Link to="/admin/dashboard/menu?generate=true">
               <Button className="h-14 px-8 bg-brand-egg text-brand-black hover:bg-yellow-400 rounded-2xl font-black text-sm uppercase tracking-widest italic border-b-4 border-yellow-600 shadow-xl shadow-yellow-500/20 active:border-b-0 active:translate-y-1 transition-all mt-4">
                  LANÇAR MÁGICA
               </Button>
             </Link>
          </div>
          <div className="relative z-10 w-48 h-48 bg-white/5 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-md">
             <Sparkles size={80} className="text-brand-egg animate-pulse" />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-2xl font-black text-brand-black tracking-tight uppercase italic">Resumo de Hoje</h2>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Sua conta Meu Ovo em tempo real</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
            <div>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
               <p className="text-2xl font-black text-slate-900">{card.value}</p>
            </div>
            <div className={cn("p-2.5 rounded-lg shadow-sm border", card.bg, card.color, "border-current/10")}>
               {card.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
             <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-brand-black italic">Últimos Pedidos</h3>
             <button className="text-[10px] font-black text-brand-orange hover:tracking-widest transition-all uppercase italic">Ver todos</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3 border-b border-slate-100">Status</th>
                  <th className="px-5 py-3 border-b border-slate-100">Cliente</th>
                  <th className="px-5 py-3 border-b border-slate-100">Tipo</th>
                  <th className="px-5 py-3 border-b border-slate-100 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentOrders.map((order, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className={cn(
                        "text-[9px] uppercase font-black px-2 py-1 rounded-full border shadow-sm",
                        order.status === 'received' ? "bg-blue-50 text-blue-600 border-blue-100" :
                        order.status === 'preparing' ? "bg-orange-50 text-orange-600 border-orange-100" :
                        order.status === 'ready' ? "bg-blue-50 text-blue-700 border-blue-200" :
                        (order.status === 'out-for-delivery' || order.status === 'out_for_delivery') ? "bg-purple-50 text-purple-600 border-purple-100" :
                        (order.status === 'finished' || order.status === 'completed') ? "bg-green-50 text-green-600 border-green-100" : "bg-red-50 text-red-600 border-red-100"
                      )}>
                        {order.status === 'received' ? 'RECEBIDO' : 
                         order.status === 'preparing' ? 'PREPARANDO' : 
                         order.status === 'ready' ? 'PRONTO' :
                         (order.status === 'out-for-delivery' || order.status === 'out_for_delivery') ? 'ENTREGA' :
                         (order.status === 'finished' || order.status === 'completed') ? 'FINALIZADO' : 'CANCELADO'}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-700">{order.customerName}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs font-bold uppercase tracking-wider">{order.type === 'delivery' ? 'DELIVERY' : 'MESA'}</td>
                    <td className="px-5 py-3 text-right font-bold text-slate-900">{formatCurrency(order.total)}</td>
                  </tr>
                ))}
                {stats.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400 italic text-sm">
                      Aguardando novos pedidos...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
            <div className="bg-brand-black p-6 rounded-2xl text-brand-white shadow-xl shadow-slate-200">
              <h4 className="font-black text-[10px] uppercase tracking-[0.2em] mb-4 flex items-center gap-2 italic text-brand-egg">
                Insight do Dia <TrendingUp size={16} />
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed font-bold italic">
                Crescimento de 12% em pedidos via WhatsApp. Considere oferecer um item grátis via Programa de Fidelidade para fidelizar esses novos clientes.
              </p>
           </div>
           
           <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 italic">Meta do Mês</h4>
              <div className="space-y-4">
                 <div>
                    <div className="flex justify-between text-[10px] font-black text-slate-500 mb-2 uppercase tracking-widest">
                       <span>Total Vendas</span>
                       <span className="text-brand-black">R$ 12.450 / R$ 20.000</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="h-full bg-brand-egg rounded-full w-[62%]" />
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
