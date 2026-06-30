import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, DollarSign, ShoppingBag, Users, Clock, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend } from 'recharts';
import { useRestaurant } from '../../context/RestaurantContext';
import type { Order, OrderItem } from '../../types';
import AdminLayout from './AdminLayout';
import { format, parseISO, getDay, getHours, startOfWeek, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PERIODS = [
  { label: '7 dias', value: 7 },
  { label: '30 dias', value: 30 },
  { label: '90 dias', value: 90 },
  { label: 'Tudo', value: 0 },
];

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const HOURS = Array.from({ length: 15 }, (_, i) => i + 8);

const CHART_COLORS = ['#FFC928', '#FF7A00', '#10B981', '#6366F1', '#EC4899', '#F59E0B', '#8B5CF6'];
const PIE_COLORS = ['#FFC928', '#10B981', '#6366F1', '#EC4899', '#F59E0B', '#6B7280'];
const STATUS_COLORS: Record<string, string> = {
  received: '#3B82F6',
  accepted: '#8B5CF6',
  preparing: '#F59E0B',
  ready: '#10B981',
  'out-for-delivery': '#8B5CF6',
  finished: '#6B7280',
  cancelled: '#EF4444',
};
const STATUS_LABELS: Record<string, string> = {
  received: 'Recebido',
  accepted: 'Aceito',
  preparing: 'Preparando',
  ready: 'Pronto',
  'out-for-delivery': 'Saiu p/ entrega',
  finished: 'Finalizado',
  cancelled: 'Cancelado',
};
const TYPE_LABELS: Record<string, string> = {
  delivery: 'Delivery',
  pickup: 'Retirada',
  'dine-in': 'Presencial',
};
const PAY_LABELS: Record<string, string> = {
  pix: 'PIX',
  cash: 'Dinheiro',
  'card-on-delivery': 'Cartão na entrega',
  'on-site': 'No local',
  credit: 'Crédito',
  debit: 'Débito',
  voucher: 'Voucher',
};

export default function AdminAnalytics() {
  const { orders, currentRestaurant } = useRestaurant();
  const [period, setPeriod] = useState(30);

  const filteredOrders = useMemo(() => {
    if (!orders?.length) return [];
    if (period === 0) return orders;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - period);
    return orders.filter(o => {
      const d = o.createdAt ? parseISO(o.createdAt) : new Date(0);
      return d >= cutoff;
    });
  }, [orders, period]);

  const kpis = useMemo(() => {
    const total = filteredOrders.length;
    const revenue = filteredOrders.reduce((s, o) => s + (o.total || 0), 0);
    const avgTicket = total > 0 ? revenue / total : 0;

    const phoneMap = new Map<string, number>();
    filteredOrders.forEach(o => {
      const p = o.customerPhone;
      phoneMap.set(p, (phoneMap.get(p) || 0) + 1);
    });
    const repeatCustomers = Array.from(phoneMap.values()).filter(c => c > 1).length;
    const repeatRate = phoneMap.size > 0 ? (repeatCustomers / phoneMap.size) * 100 : 0;

    const finished = filteredOrders.filter(o => o.status === 'finished').length;
    const completionRate = total > 0 ? (finished / total) * 100 : 0;

    return { total, revenue, avgTicket, repeatRate, completionRate };
  }, [filteredOrders]);

  const ordersByDay = useMemo(() => {
    const dayData: Record<number, { orders: number; revenue: number }> = {};
    for (let d = 0; d < 7; d++) dayData[d] = { orders: 0, revenue: 0 };
    filteredOrders.forEach(o => {
      if (!o.createdAt) return;
      const d = getDay(parseISO(o.createdAt));
      dayData[d].orders++;
      dayData[d].revenue += o.total || 0;
    });
    return DAY_LABELS.map((label, i) => ({
      day: label,
      pedidos: dayData[i].orders,
      faturamento: dayData[i].revenue,
    }));
  }, [filteredOrders]);

  const hourlyData = useMemo(() => {
    const matrix: Record<number, Record<number, number>> = {};
    HOURS.forEach(h => { matrix[h] = {}; for (let d = 0; d < 7; d++) matrix[h][d] = 0; });
    filteredOrders.forEach(o => {
      if (!o.createdAt) return;
      const dt = parseISO(o.createdAt);
      const h = getHours(dt);
      const d = getDay(dt);
      if (matrix[h]) matrix[h][d]++;
    });
    const maxVal = Math.max(1, ...HOURS.flatMap(h => Object.values(matrix[h])));
    return { matrix, maxVal };
  }, [filteredOrders]);

  const topProducts = useMemo(() => {
    const prodMap = new Map<string, { name: string; qty: number; revenue: number }>();
    filteredOrders.forEach(o => {
      (o.items || []).forEach((item: OrderItem) => {
        const existing = prodMap.get(item.productId) || { name: item.productName, qty: 0, revenue: 0 };
        existing.qty += item.quantity;
        existing.revenue += item.unitPrice * item.quantity;
        prodMap.set(item.productId, existing);
      });
    });
    return Array.from(prodMap.values())
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [filteredOrders]);

  const dailyTrend = useMemo(() => {
    const trendMap = new Map<string, { date: string; pedidos: number; receita: number }>();
    filteredOrders.forEach(o => {
      if (!o.createdAt) return;
      const dayKey = format(parseISO(o.createdAt), 'yyyy-MM-dd');
      const existing = trendMap.get(dayKey) || { date: dayKey, pedidos: 0, receita: 0 };
      existing.pedidos++;
      existing.receita += o.total || 0;
      trendMap.set(dayKey, existing);
    });
    return Array.from(trendMap.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders]);

  const statusData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach(o => {
      const s = o.status || 'received';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      name: STATUS_LABELS[key] || key,
      value,
    }));
  }, [filteredOrders]);

  const payMethodData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach(o => {
      const p = o.paymentMethod || 'pix';
      map.set(p, (map.get(p) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      name: PAY_LABELS[key] || key,
      value,
    }));
  }, [filteredOrders]);

  const typeData = useMemo(() => {
    const map = new Map<string, number>();
    filteredOrders.forEach(o => {
      const t = o.type || 'delivery';
      map.set(t, (map.get(t) || 0) + 1);
    });
    return Array.from(map.entries()).map(([key, value]) => ({
      name: TYPE_LABELS[key] || key,
      value,
    }));
  }, [filteredOrders]);

  const customers = useMemo(() => {
    const custMap = new Map<string, {
      name: string; phone: string; orders: number; total: number; lastOrder: string;
    }>();
    filteredOrders.forEach(o => {
      if (!o.customerPhone) return;
      const existing = custMap.get(o.customerPhone) || {
        name: o.customerName, phone: o.customerPhone, orders: 0, total: 0, lastOrder: '',
      };
      existing.orders++;
      existing.total += o.total || 0;
      if (!existing.lastOrder || (o.createdAt && o.createdAt > existing.lastOrder)) {
        existing.lastOrder = o.createdAt || '';
      }
      custMap.set(o.customerPhone, existing);
    });
    return Array.from(custMap.values()).sort((a, b) => b.total - a.total).slice(0, 20);
  }, [filteredOrders]);

  const heatColor = (val: number) => {
    if (val === 0) return 'bg-gray-100 dark:bg-zinc-800';
    const intensity = Math.min(1, val / hourlyData.maxVal);
    if (intensity < 0.33) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (intensity < 0.66) return 'bg-yellow-300 dark:bg-yellow-700/50';
    return 'bg-[#FFC928] dark:bg-yellow-500/70';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Analytics</h1>
            <p className="text-sm text-gray-400 font-medium">
              {currentRestaurant?.name || 'Seu restaurante'}
            </p>
          </div>
          <div className="flex gap-1 bg-zinc-900 rounded-xl p-1">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  period === p.value
                    ? 'bg-[#FFC928] text-black'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: ShoppingBag, label: 'Pedidos', value: kpis.total, prefix: '', suffix: '' },
            { icon: DollarSign, label: 'Faturamento', value: kpis.revenue, prefix: 'R$ ', suffix: '', decimals: 2 },
            { icon: TrendingUp, label: 'Ticket Médio', value: kpis.avgTicket, prefix: 'R$ ', suffix: '', decimals: 2 },
            { icon: Users, label: 'Recorrência', value: kpis.repeatRate, prefix: '', suffix: '%', decimals: 1 },
          ].map((k, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-[#FFC928]/10 flex items-center justify-center">
                  <k.icon size={16} className="text-[#FFC928]" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{k.label}</span>
              </div>
              <p className="text-2xl font-black text-white">
                {k.prefix}{k.decimals ? k.value.toFixed(k.decimals) : Math.round(k.value)}{k.suffix}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Orders & Revenue by Day of Week */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <Calendar size={14} /> Pedidos por dia da semana
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12 }}
                  labelStyle={{ color: '#f4f4f5' }}
                />
                <Bar dataKey="pedidos" fill="#FFC928" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
              <DollarSign size={14} /> Faturamento por dia da semana
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12 }}
                  labelStyle={{ color: '#f4f4f5' }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Faturamento']}
                />
                <Bar dataKey="faturamento" fill="#10B981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Peak Hours Heatmap */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Clock size={14} /> Horários de pico
          </h3>
          <div className="overflow-x-auto">
            <div className="grid gap-1" style={{ gridTemplateColumns: `60px repeat(7, minmax(56px, 1fr))` }}>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider p-2" />
              {DAY_LABELS.map(d => (
                <div key={d} className="text-[10px] text-gray-500 font-bold uppercase tracking-wider text-center p-2">{d}</div>
              ))}
              {HOURS.map(h => (
                <>
                  <div className="text-[10px] text-gray-500 font-bold p-2 text-right">{h}:00</div>
                  {[0, 1, 2, 3, 4, 5, 6].map(d => {
                    const val = hourlyData.matrix[h]?.[d] || 0;
                    return (
                      <div
                        key={`${h}-${d}`}
                        className={`rounded-lg p-2 text-center text-[10px] font-bold transition-colors ${heatColor(val)} ${val > 0 ? 'text-black' : 'text-gray-500'}`}
                        title={`${h}:00 - ${DAY_LABELS[d]}: ${val} pedidos`}
                      >
                        {val || ''}
                      </div>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products + Daily Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Pratos mais vendidos</h3>
            <div className="space-y-3">
              {topProducts.slice(0, 6).map((p, i) => {
                const pct = topProducts[0]?.qty ? (p.qty / topProducts[0].qty) * 100 : 0;
                return (
                  <div key={p.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-bold text-white truncate mr-2">{i + 1}. {p.name}</span>
                      <span className="text-gray-400 shrink-0">{p.qty} vendidos</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#FFC928] to-[#FF7A00] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {topProducts.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">Nenhum pedido no período</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Tendência de pedidos</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#a1a1aa', fontSize: 10 }}
                  tickFormatter={(v) => {
                    try { return format(parseISO(v), 'dd/MM'); } catch { return v; }
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12 }}
                  labelStyle={{ color: '#f4f4f5' }}
                  labelFormatter={(v) => {
                    try { return format(parseISO(v), 'dd/MM/yyyy'); } catch { return v; }
                  }}
                />
                <Area type="monotone" dataKey="pedidos" stroke="#FFC928" fill="#FFC928" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Status dos pedidos</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {statusData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Forma de pagamento</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={payMethodData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {payMethodData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Tipo de pedido</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <Users size={14} /> Clientes ({customers.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black uppercase tracking-widest text-gray-500 border-b border-zinc-800">
                  <th className="pb-3 pr-4">Cliente</th>
                  <th className="pb-3 pr-4">Telefone</th>
                  <th className="pb-3 pr-4 text-center">Pedidos</th>
                  <th className="pb-3 pr-4 text-right">Total gasto</th>
                  <th className="pb-3 text-right">Último pedido</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.phone} className="border-b border-zinc-800/50 text-sm hover:bg-zinc-800/30 transition-colors">
                    <td className="py-3 pr-4 font-bold text-white">{c.name}</td>
                    <td className="py-3 pr-4 text-gray-400">{c.phone}</td>
                    <td className="py-3 pr-4 text-center">
                      <span className="bg-zinc-800 text-[#FFC928] text-[10px] font-black px-2 py-0.5 rounded-full">{c.orders}x</span>
                    </td>
                    <td className="py-3 pr-4 text-right font-bold text-white">R$ {c.total.toFixed(2)}</td>
                    <td className="py-3 text-right text-gray-400 text-xs">
                      {c.lastOrder ? (() => {
                        try { return format(parseISO(c.lastOrder), 'dd/MM/yyyy'); } catch { return '-'; }
                      })() : '-'}
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-8 text-gray-500 text-sm">Nenhum cliente no período</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
