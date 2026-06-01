import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ShoppingBag, DollarSign, Users, Plus, QrCode, Truck, ChefHat, Eye, Clock, Sparkles, Ticket, Gift, MessageCircle, Bike, Package, CheckCircle, XCircle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Order, Product } from '../../types';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area,
  Legend
} from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentRestaurant, activeSession } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Chart Data preparation
  const salesData = React.useMemo(() => {
    const last7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    });

    const dataMap: Record<string, number> = {};
    last7Days.forEach(day => { dataMap[day] = 0; });

    orders.forEach(order => {
      const date = order.createdAt ? new Date(order.createdAt) : new Date();
      const day = date.toLocaleDateString('pt-BR', { weekday: 'short' });
      if (dataMap.hasOwnProperty(day)) {
        dataMap[day] += order.total || 0;
      }
    });

    return Object.entries(dataMap).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const orderTypeData = React.useMemo(() => {
    const types: Record<string, number> = { 'Delivery': 0, 'Mesa': 0, 'Retirada': 0 };
    orders.forEach(o => {
      if (o.type === 'delivery') types['Delivery']++;
      else if (o.type === 'dine-in') types['Mesa']++;
      else if (o.type === 'pickup') types['Retirada']++;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [orders]);

  const COLORS = ['#FFC928', '#111111', '#FF7A00'];

  useEffect(() => {
    if (!currentRestaurant) return;

    const qOrders = query(collection(db, 'orders'), where('restaurantId', '==', currentRestaurant.id));
    const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setOrders(ordersData);
    });

    const qProducts = query(collection(db, 'products'), where('restaurantId', '==', currentRestaurant.id));
    const unsubscribeProducts = onSnapshot(qProducts, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(productsData);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, [currentRestaurant]);

  const today = new Date().toDateString();
  const todayOrders = orders.filter(o => {
    const d = o.createdAt ? new Date(o.createdAt) : new Date();
    return d.toDateString() === today;
  });
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
  const inProgress = orders.filter(o => ['received', 'preparing', 'ready', 'out-for-delivery'].includes(o.status));

  const statusColors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-700',
    preparing: 'bg-yellow-100 text-yellow-700',
    ready: 'bg-emerald-100 text-emerald-700 font-bold',
    'out-for-delivery': 'bg-purple-100 text-purple-700 font-bold',
    'out_for_delivery': 'bg-purple-100 text-purple-700 font-bold',
    finished: 'bg-gray-100 text-gray-600',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-700 font-bold',
  };

  const statusIcons: Record<string, React.ReactNode> = {
    received: <Clock size={12} />,
    preparing: <ChefHat size={12} />,
    ready: <Package size={12} />,
    'out-for-delivery': <Bike size={12} />,
    'out_for_delivery': <Bike size={12} />,
    finished: <CheckCircle size={12} />,
    completed: <CheckCircle size={12} />,
    cancelled: <XCircle size={12} />,
  };

  const statusLabels: Record<string, string> = {
    received: 'Recebido',
    preparing: 'Em preparo',
    ready: 'Pronto',
    'out-for-delivery': 'Saiu para entrega',
    'out_for_delivery': 'Saiu para entrega',
    finished: 'Finalizado',
    completed: 'Finalizado',
    cancelled: 'Cancelado',
  };

  return (
    <AdminLayout>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="font-black text-2xl text-[#111]">Bom dia! 👋</h2>
          <p className="text-gray-500">{currentRestaurant?.name} — Hoje, {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div 
          onClick={() => navigate('/admin/caixa')}
          className={`px-4 py-2 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${activeSession ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}
        >
          <div className={`w-2 h-2 rounded-full ${activeSession ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className={`text-[10px] font-black uppercase tracking-widest ${activeSession ? 'text-green-600' : 'text-red-600'}`}>
            Caixa {activeSession ? 'Aberto' : 'Fechado'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Pedidos hoje', value: todayOrders.length.toString(), icon: <ShoppingBag size={24} className="text-[#FFC928]" />, sub: `${inProgress.length} em andamento` },
          { label: 'Vendido hoje', value: `R$ ${todayRevenue.toFixed(2)}`, icon: <DollarSign size={24} className="text-green-500" />, sub: 'Sem contar entrega' },
          { label: 'Ticket médio', value: `R$ ${avgTicket.toFixed(2)}`, icon: <TrendingUp size={24} className="text-blue-500" />, sub: 'Hoje' },
          { label: 'Produtos ativos', value: products.filter(p => p.isActive).length.toString(), icon: <Users size={24} className="text-[#FF7A00]" />, sub: `${products.length} total` },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -5, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-50 transition-all hover:bg-[#FFC928]/5 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-[#FFC928] group-hover:text-white transition-colors">
                {stat.icon}
              </div>
            </div>
            <div className="font-display font-black text-3xl text-[#111] mb-1">{stat.value}</div>
            <div className="text-gray-400 text-xs font-black uppercase tracking-widest">{stat.label}</div>
            <div className="text-gray-400 text-[10px] mt-1 font-bold italic">{stat.sub}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Gerar com IA', icon: <Sparkles size={22} className="text-orange-500" />, onClick: () => navigate('/admin/cardapio?generate=true'), color: 'bg-white text-[#111] border-2 border-slate-100 ring-orange-400' },
          { label: 'Novo produto', icon: <Plus size={22} />, onClick: () => navigate('/admin/cardapio?add_product=true'), color: 'bg-[#FFC928] text-[#111] ring-[#FFC928]' },
          { label: 'Ver cardápio', icon: <Eye size={22} />, onClick: () => navigate(`/r/${currentRestaurant?.slug}`), color: 'bg-[#111111] text-white ring-gray-700' },
          { label: 'Gerar QR Code', icon: <QrCode size={22} />, onClick: () => navigate('/admin/garcom'), color: 'bg-blue-600 text-white ring-blue-400' },
          { label: 'Modo cozinha', icon: <ChefHat size={22} />, onClick: () => navigate('/admin/cozinha'), color: 'bg-[#FF7A00] text-white ring-orange-500' },
        ].map((action, i) => (
          <motion.button 
            key={i} 
            onClick={action.onClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + (i * 0.05) }}
            className={`${action.color} rounded-2xl p-4 flex flex-col items-center gap-2 font-bold text-sm transition-all shadow-sm hover:shadow-lg ring-offset-2 hover:ring-2`}
          >
            {action.icon}
            {action.label}
          </motion.button>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-[#111] text-lg leading-tight uppercase tracking-widest">Faturamento</h3>
              <p className="text-gray-400 text-xs font-bold mt-1">Vendas nos últimos 7 dias</p>
            </div>
            <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
              Relatório Semanal
            </div>
          </div>
          
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFC928" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFC928" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  itemStyle={{ color: '#111' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#FFC928" 
                  strokeWidth={4} 
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="font-black text-[#111] text-lg leading-tight uppercase tracking-widest">Canais de Venda</h3>
              <p className="text-gray-400 text-xs font-bold mt-1">Distribuição por tipo de pedido</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="h-[220px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={orderTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {orderTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              {orderTypeData.map((type, i) => (
                <div key={type.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs font-black text-[#111] uppercase tracking-widest">{type.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-500">{type.value} pedidos</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Promo & Loyalty Suggestion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group border border-orange-400Shadow shadow-xl shadow-orange-500/20">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <Ticket className="text-white" size={24} />
            </div>
            <h3 className="text-2xl font-display font-black italic uppercase tracking-tighter mb-2 leading-none">Aumente suas vendas</h3>
            <p className="text-orange-100 text-sm font-medium mb-6 leading-relaxed">
              Crie cupons de desconto (fixo ou %) com limite de uso e data de validade para atrair novos clientes hoje mesmo.
            </p>
            <button 
              onClick={() => navigate('/admin/cupons')}
              className="bg-white text-orange-600 font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              Criar cupom agora
            </button>
          </div>
          <Ticket className="absolute -right-8 -bottom-8 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" size={200} />
        </div>

        <div className="bg-gradient-to-br from-[#25D366] to-[#128C7E] rounded-[2.5rem] p-8 text-white relative overflow-hidden group shadow-xl">
          <div className="relative z-10">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6">
              <MessageCircle className="text-white" size={24} />
            </div>
            <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2 leading-none">Gestão WhatsApp</h3>
            <p className="text-emerald-50 text-sm font-medium mb-6 leading-relaxed">
              Abra seu WhatsApp Web para responder clientes e gerenciar suporte. Configurado para: {currentRestaurant?.whatsapp}
            </p>
            <a 
              href={`https://web.whatsapp.com/send?phone=${currentRestaurant?.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block bg-white text-[#128C7E] font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
            >
              Abrir conversas
            </a>
          </div>
          <MessageCircle className="absolute -right-8 -bottom-8 text-white/10 rotate-12 group-hover:rotate-0 transition-transform duration-700" size={200} />
        </div>
      </div>

      {/* Active orders */}
      <div className="bg-white rounded-2xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-[#111] text-lg">Pedidos ativos</h3>
          <button onClick={() => navigate('/admin/pedidos')} className="text-[#FFC928] font-bold text-sm hover:underline">Ver todos</button>
        </div>

        {inProgress.length === 0 ? (
          <div className="text-center py-8">
            <ShoppingBag size={40} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Nenhum pedido em andamento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inProgress.map(order => (
              <div key={order.id} className="bg-[#F5F5F5] rounded-xl p-4 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#111] text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1.5 ${statusColors[order.status]}`}>
                      {statusIcons[order.status]}
                      {statusLabels[order.status]}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm">{order.customerName} — {order.items.length} {order.items.length === 1 ? 'item' : 'itens'}</p>
                  <div className="flex items-center gap-1 text-gray-400 text-xs mt-1">
                    <Clock size={12} />
                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <span className="mx-1">•</span>
                    {order.type === 'dine-in' ? `Mesa ${order.tableNumber}` : order.type === 'delivery' ? 'Delivery' : 'Retirada'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-black text-[#111]">R$ {order.total.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
