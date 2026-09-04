import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Plus, QrCode, Eye, Sparkles, Wallet, X, Clock, ChefHat, Package, Bike, CheckCircle, XCircle, Sticker, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { Order, Product } from '../../types';
import { ALLERGEN_MAP } from '../../data/allergens';
import { motion } from 'motion/react';
import { AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { toast } from 'react-hot-toast';

const COLORS = ['#FFC928', '#111111', '#FF7A00'];
const STATUS_COLORS: Record<string, string> = {
  received: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
  preparing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400',
  ready: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  'out-for-delivery': 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
  finished: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
};
const STATUS_ICONS: Record<string, React.ReactNode> = {
  received: <Clock size={12} />, preparing: <ChefHat size={12} />, ready: <Package size={12} />,
  'out-for-delivery': <Bike size={12} />, finished: <CheckCircle size={12} />, cancelled: <XCircle size={12} />,
};
const STATUS_LABELS: Record<string, string> = {
  received: 'Recebido', preparing: 'Em preparo', ready: 'Pronto',
  'out-for-delivery': 'Saiu p/ entrega', finished: 'Finalizado', cancelled: 'Cancelado',
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentRestaurant, activeSession } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (!currentRestaurant) return;
    const qOrders = query(collection(db, 'orders'), where('restaurantId', '==', currentRestaurant.id), orderBy('createdAt', 'desc'), limit(50));
    const unsubOrders = onSnapshot(qOrders, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order))), (error) => { if (error.code !== 'permission-denied') console.error('AdminDashboard orders:', error); });
    const qProducts = query(collection(db, 'products'), where('restaurantId', '==', currentRestaurant.id));
    const unsubProducts = onSnapshot(qProducts, snap => setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Product))), (error) => { if (error.code !== 'permission-denied') console.error('AdminDashboard products:', error); });
    return () => { unsubOrders(); unsubProducts(); };
  }, [currentRestaurant]);

  // Cashier calculations (always computed from orders)
  const sessionOrders = useMemo(() => {
    if (!activeSession) return [];
    return orders.filter(o => o.status === 'finished' && o.createdAt && new Date(o.createdAt) > new Date(activeSession.openedAt));
  }, [orders, activeSession]);

  const sessionSales = useMemo(() => sessionOrders.reduce((s, o) => s + (o.total || 0), 0), [sessionOrders]);

  const salesByMethod = useMemo(() => {
    const map = new Map<string, number>();
    sessionOrders.forEach(o => {
      const method = o.paymentMethod || 'pix';
      map.set(method, (map.get(method) || 0) + (o.total || 0));
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [sessionOrders]);

  const sessionBalance = useMemo(() => {
    if (!activeSession) return 0;
    const adds = (activeSession.additions || []).reduce((s, a) => s + a.amount, 0);
    const withdrawals = (activeSession.withdrawals || []).reduce((s, w) => s + w.amount, 0);
    return (activeSession.openingAmount || 0) + sessionSales + adds - withdrawals;
  }, [activeSession, sessionSales]);

  // Today stats
  const todayStr = new Date().toDateString();
  const todayOrders = orders.filter(o => o.createdAt && new Date(o.createdAt).toDateString() === todayStr);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const avgTicket = todayOrders.length > 0 ? todayRevenue / todayOrders.length : 0;
  const inProgress = orders.filter(o => ['received', 'accepted', 'preparing', 'ready', 'out-for-delivery'].includes(o.status));

  // Chart data
  const salesTrend = useMemo(() => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString('pt-BR', { weekday: 'short' });
    });
    const map: Record<string, number> = {};
    days.forEach(d => map[d] = 0);
    orders.forEach(o => {
      if (!o.createdAt) return;
      const day = new Date(o.createdAt).toLocaleDateString('pt-BR', { weekday: 'short' });
      if (day in map) map[day] += o.total || 0;
    });
    return days.map(name => ({ name, value: map[name] }));
  }, [orders]);

  const channelData = useMemo(() => {
    const types: Record<string, number> = { Delivery: 0, Mesa: 0, Retirada: 0 };
    orders.forEach(o => { if (o.type === 'delivery') types.Delivery++; else if (o.type === 'dine-in') types.Mesa++; else if (o.type === 'pickup') types.Retirada++; });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Cashier actions
  const handleOpenCashier = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Informe um valor de abertura válido');
    try {
      await addDoc(collection(db, 'cashier_sessions'), {
        restaurantId: currentRestaurant?.id,
        openedAt: new Date().toISOString(),
        openedBy: 'Admin',
        openingAmount: parseFloat(amount),
        totalSales: 0,
        status: 'open',
        withdrawals: [],
        additions: [],
      });
      toast.success('Caixa aberto com sucesso!');
      setAmount('');
      setShowOpenModal(false);
    } catch { toast.error('Erro ao abrir caixa'); }
  };

  const handleCloseCashier = async () => {
    if (!activeSession) return;
    if (!amount || parseFloat(amount) < 0) return toast.error('Informe o valor de fechamento');
    try {
      await updateDoc(doc(db, 'cashier_sessions', activeSession.id), {
        closedAt: new Date().toISOString(),
        closingAmount: parseFloat(amount),
        totalSales: sessionSales,
        status: 'closed',
      });
      toast.success('Caixa fechado com sucesso!');
      setAmount('');
      setShowCloseModal(false);
    } catch { toast.error('Erro ao fechar caixa'); }
  };

  const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div role="dialog" aria-modal="true" aria-label="Fechar caixa" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 rounded-[2rem] p-8 max-w-md w-full mx-4 border border-zinc-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black uppercase tracking-tight text-white">{title}</h3>
           <button onClick={onClose} aria-label="Fechar" className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
        </div>
        {children}
      </motion.div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Painel</h1>
            <p className="text-sm text-gray-400">{currentRestaurant?.name} — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {/* ─── WELCOME BANNER ─── */}
        {currentRestaurant && products.length === 0 && (
          <div className="bg-gradient-to-r from-[#FFC928]/20 via-[#FFC928]/10 to-transparent border border-[#FFC928]/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">Bem-vindo ao Meu OVO!</h2>
              <p className="text-sm text-gray-400 mt-1">Seu restaurante já está no ar. Complete o cadastro para começar a vender.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => navigate('/admin/cardapio?add_product=true')} className="bg-[#FFC928] text-black font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all flex items-center gap-2">
                <Plus size={16} /> Adicionar Produto
              </button>
              <button onClick={() => navigate(`/r/${currentRestaurant?.slug}`)} className="bg-zinc-800 text-gray-300 border border-zinc-700 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center gap-2">
                <Eye size={16} /> Ver Cardápio
              </button>
            </div>
          </div>
        )}

        {/* ─── CASHIER BAR ─── */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-[2rem] p-6 border ${activeSession ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-zinc-900/50 border-zinc-700/30'}`}>
          {!activeSession ? (
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Wallet size={20} className="text-red-400" /></div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-red-400">Caixa Fechado</p>
                  <p className="text-sm text-gray-400">Abra o caixa para começar a registrar as vendas do dia</p>
                </div>
              </div>
              <button onClick={() => setShowOpenModal(true)} className="bg-[#FFC928] text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all">
                Abrir Caixa
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={20} className="text-emerald-400" /></div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      Caixa Aberto <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </p>
                    <p className="text-xs text-gray-400">Abertura: R$ {(activeSession.openingAmount || 0).toFixed(2)} — {new Date(activeSession.openedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                <button onClick={() => setShowCloseModal(true)} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 font-black px-5 py-3 rounded-xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all">
                  Fechar Caixa
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: 'Abertura', value: `R$ ${(activeSession.openingAmount || 0).toFixed(2)}`, color: 'text-blue-400' },
                  { label: 'Vendas', value: `R$ ${sessionSales.toFixed(2)}`, color: 'text-emerald-400' },
                  { label: 'Saldo', value: `R$ ${sessionBalance.toFixed(2)}`, color: 'text-white font-black text-base' },
                ].map((s, i) => (
                  <div key={i} className={`rounded-xl p-3 ${i === 2 ? 'bg-zinc-800 border border-zinc-700' : 'bg-zinc-800/50'}`}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{s.label}</p>
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>

        {/* ─── CASHIER MODALS ─── */}
        {showOpenModal && (
          <Modal title="Abrir Caixa" onClose={() => setShowOpenModal(false)}>
            <p className="text-sm text-gray-400 mb-4">Qual o valor em dinheiro disponível para abertura?</p>
            <input type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#FFC928]" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowOpenModal(false)} className="flex-1 bg-zinc-800 text-gray-400 font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all">Cancelar</button>
              <button onClick={handleOpenCashier} className="flex-1 bg-[#FFC928] text-black font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all">Abrir</button>
            </div>
          </Modal>
        )}

        {showCloseModal && (
          <Modal title="Fechar Caixa" onClose={() => setShowCloseModal(false)}>
            <div className="space-y-2 mb-6">
              {[
                { label: 'Vendas (Meu OVO)', value: sessionSales },
                { label: 'Saldo esperado', value: sessionBalance, highlight: true },
              ].map((s, i) => (
                <div key={i} className={`flex justify-between ${i === 1 ? 'pt-3 border-t border-zinc-700' : ''}`}>
                  <span className="text-sm text-gray-400">{s.label}</span>
                  <span className={`text-sm font-black ${s.highlight ? 'text-[#FFC928] text-lg' : 'text-white'}`}>R$ {s.value.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {salesByMethod.length > 0 && (
              <div className="mb-6 p-3 bg-zinc-800/50 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Por forma de pagamento</p>
                <div className="space-y-1.5">
                  {salesByMethod.map(([method, total]) => (
                    <div key={method} className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">
                        {method === 'pix' ? 'PIX' :
                         method === 'cash' ? 'Dinheiro' :
                         method === 'credit' ? 'Crédito' :
                         method === 'debit' ? 'Débito' :
                         method === 'card-on-delivery' ? 'Cartão na entrega' :
                         method === 'voucher' ? 'Voucher' :
                         method === 'on-site' ? 'No local' : method}
                      </span>
                      <span className="text-white font-black">R$ {total.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-400 mb-4">Valor em caixa para fechamento:</p>
            <input type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#FFC928]" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 bg-zinc-800 text-gray-400 font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all">Cancelar</button>
              <button onClick={handleCloseCashier} className="flex-1 bg-red-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-red-600 transition-all">Fechar</button>
            </div>
          </Modal>
        )}

        {/* ─── KPIs ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-800">
          {[
            { label: 'Pedidos hoje', value: todayOrders.length.toString(), sub: `${inProgress.length} em andamento`, accent: false },
            { label: 'Faturamento', value: `R$ ${todayRevenue.toFixed(2)}`, sub: `${todayOrders.length} pedidos`, accent: true },
            { label: 'Ticket médio', value: `R$ ${avgTicket.toFixed(2)}`, sub: 'Média do dia', accent: false },
            { label: 'Produtos ativos', value: products.filter(p => p.isActive).length.toString(), sub: `${products.length} total`, accent: false },
          ].map((k, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`p-5 ${i === 0 ? 'rounded-l-2xl' : ''} ${i === 3 ? 'rounded-r-2xl' : ''}`}
            >
              <div className={`text-[10px] font-black uppercase tracking-[0.15em] mb-2 ${k.accent ? 'text-emerald-400' : 'text-gray-500'}`}>{k.label}</div>
              <p className={`text-2xl md:text-3xl font-black leading-none mb-1 ${k.accent ? 'text-emerald-400' : 'text-white'}`}>{k.value}</p>
              <p className="text-[10px] text-gray-500">{k.sub}</p>
            </motion.div>
          ))}
        </div>

        {/* ─── QUICK ACTIONS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <motion.button onClick={() => navigate('/admin/cardapio?add_product=true')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="bg-[#FFC928] text-black rounded-2xl py-4 px-6 flex items-center gap-3 text-xs font-black uppercase tracking-widest transition-all md:col-span-2"
          >
            <Plus size={18} /> Novo Produto
          </motion.button>
          {[
            { label: 'Gerar com IA', icon: <Sparkles size={16} />, onClick: () => navigate('/admin/cardapio?generate=true') },
            { label: 'Ver cardápio', icon: <Eye size={16} />, onClick: () => navigate(`/r/${currentRestaurant?.slug}`) },
            { label: 'QR Code', icon: <QrCode size={16} />, onClick: () => navigate('/admin/mesas') },
          ].map((a, i) => (
            <motion.button key={i} onClick={a.onClick} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="bg-zinc-900 border border-zinc-800 text-gray-300 rounded-2xl py-4 px-5 flex items-center gap-2 text-[11px] font-black uppercase tracking-widest hover:border-zinc-700 transition-all"
            >
              {a.icon} {a.label}
            </motion.button>
          ))}
        </div>

        {/* ─── NEAR EXPIRY ─── */}
        {(() => {
          const nearExpiry = products.filter(p => {
            if (!p.labelInfo?.shelfLifeDays) return false;
            const daysLeft = p.labelInfo.shelfLifeDays;
            return daysLeft <= 7 && daysLeft > 0;
          }).slice(0, 5);
          return nearExpiry.length > 0 ? (
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-[#FFC928]" /> Produtos com Validade
                </h3>
                <button onClick={() => navigate('/admin/etiquetas')} className="text-[10px] font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity flex items-center gap-1">
                  <Sticker size={12} /> Etiquetas
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {nearExpiry.map(p => (
                  <div key={p.id} className="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-3">
                    <p className="text-sm font-bold text-white truncate">{p.name}</p>
                    {p.labelInfo && (
                      <p className="text-[10px] text-gray-500 mt-1">
                        {p.labelInfo.shelfLifeDays} dias • {p.labelInfo.storageType === 'refrigerated' ? '🧊' : p.labelInfo.storageType === 'frozen' ? '❄️' : '🏠'} {p.labelInfo.storageType}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {(p.selectedAllergens || []).slice(0, 6).map(key => {
                        const a = ALLERGEN_MAP.get(key);
                        return a ? <span key={key} className="text-[10px]" title={a.label}>{a.icon}</span> : null;
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null;
        })()}

        {/* ─── ETIQUETAS REMINDER ─── */}
        <div className="border-l-4 border-[#FFC928] bg-zinc-900/50 rounded-r-2xl p-6">
          <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">Etiquetas para seus Produtos</h3>
          <p className="text-xs text-gray-400 mb-4">Crie etiquetas automáticas com data de validade, alérgenos e informações de armazenamento para imprimir e colar nos seus produtos.</p>
          <button onClick={() => navigate('/admin/etiquetas')} className="bg-[#FFC928] text-black font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all">
            Gerenciar Etiquetas
          </button>
        </div>

        {/* ─── CHARTS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Faturamento — Últimos 7 dias</h3>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={salesTrend}>
                <defs><linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FFC928" stopOpacity={0.3}/><stop offset="95%" stopColor="#FFC928" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 700 }} />
                <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="value" stroke="#FFC928" strokeWidth={3} fill="url(#salesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">Canais de Venda</h3>
            <div className="flex items-center gap-6 flex-wrap">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie data={channelData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={6} dataKey="value">
                    {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {channelData.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t.name}</span>
                    <span className="text-xs font-bold text-white">{t.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ─── ACTIVE ORDERS ─── */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
              <ShoppingBag size={14} /> Pedidos Ativos ({inProgress.length})
            </h3>
            <button onClick={() => navigate('/admin/pedidos')} className="text-[10px] font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity">Ver Todos</button>
          </div>
          {inProgress.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">Nenhum pedido em andamento</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {inProgress.map(order => (
                <div key={order.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/pedidos'); } }} className="bg-zinc-800/50 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => navigate('/admin/pedidos')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg flex items-center gap-1 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_ICONS[order.status]} {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{order.customerName} — {order.items?.length || 0} {order.items?.length === 1 ? 'item' : 'itens'}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                      {order.type === 'dine-in' ? ` • Mesa ${order.tableNumber || ''}` : ` • ${order.type === 'delivery' ? 'Delivery' : 'Retirada'}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-white">R$ {order.total?.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
