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
import { useTranslation } from 'react-i18next';
import { formatCurrency, currencyLocale } from '../../lib/utils';

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

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const loc = currencyLocale(i18n.language);
  const fmt = (v: number) => formatCurrency(v, loc);
  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      received: t('orderStatus.stepReceived'),
      accepted: t('orderStatus.stepAccepted'),
      preparing: t('orderStatus.stepPreparing'),
      ready: t('orderStatus.stepReady'),
      'out-for-delivery': t('orderStatus.stepOutForDelivery'),
      finished: t('orderStatus.stepFinished'),
      cancelled: t('orderStatus.etaCancelled'),
    };
    return map[s] || s;
  };
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
      return d.toLocaleDateString(loc, { weekday: 'short' });
    });
    const map: Record<string, number> = {};
    days.forEach(d => map[d] = 0);
    orders.forEach(o => {
      if (!o.createdAt) return;
      const day = new Date(o.createdAt).toLocaleDateString(loc, { weekday: 'short' });
      if (day in map) map[day] += o.total || 0;
    });
    return days.map(name => ({ name, value: map[name] }));
  }, [orders, loc]);

  const channelData = useMemo(() => {
    const types: Record<string, number> = { [t('admPanel.chDelivery')]: 0, [t('admPanel.chTable')]: 0, [t('admPanel.chPickup')]: 0 };
    orders.forEach(o => { if (o.type === 'delivery') types[t('admPanel.chDelivery')]++; else if (o.type === 'dine-in') types[t('admPanel.chTable')]++; else if (o.type === 'pickup') types[t('admPanel.chPickup')]++; });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [orders, t]);

  // Cashier actions
  const handleOpenCashier = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error(t('admPanel.openAmountRequired'));
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
      toast.success(t('admPanel.openOk'));
      setAmount('');
      setShowOpenModal(false);
    } catch { toast.error(t('admPanel.openError')); }
  };

  const handleCloseCashier = async () => {
    if (!activeSession) return;
    if (!amount || parseFloat(amount) < 0) return toast.error(t('admPanel.closeAmountRequired'));
    try {
      await updateDoc(doc(db, 'cashier_sessions', activeSession.id), {
        closedAt: new Date().toISOString(),
        closingAmount: parseFloat(amount),
        totalSales: sessionSales,
        status: 'closed',
      });
      toast.success(t('admPanel.closeOk'));
      setAmount('');
      setShowCloseModal(false);
    } catch { toast.error(t('admPanel.closeError')); }
  };

  const Modal = ({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) => (
    <div role="dialog" aria-modal="true" aria-label={t('admPanel.modalAria')} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-zinc-900 rounded-[2rem] p-8 max-w-md w-full mx-4 border border-zinc-700 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black uppercase tracking-tight text-white">{title}</h3>
            <button onClick={onClose} aria-label={t('ui.close')} className="text-gray-400 hover:text-white transition-colors"><X size={20} /></button>
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
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">{t('admPanel.title')}</h1>
            <p className="text-sm text-gray-400">{currentRestaurant?.name} — {new Date().toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {/* ─── WELCOME BANNER ─── */}
        {currentRestaurant && products.length === 0 && (
          <div className="bg-gradient-to-r from-[#FFC928]/20 via-[#FFC928]/10 to-transparent border border-[#FFC928]/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('admPanel.welcomeTitle')}</h2>
              <p className="text-sm text-gray-400 mt-1">{t('admPanel.welcomeDesc')}</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <button onClick={() => navigate('/admin/cardapio?add_product=true')} className="bg-[#FFC928] text-black font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all flex items-center gap-2">
                <Plus size={16} /> {t('admPanel.addProduct')}
              </button>
              <button onClick={() => navigate(`/r/${currentRestaurant?.slug}`)} className="bg-zinc-800 text-gray-300 border border-zinc-700 font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all flex items-center gap-2">
                <Eye size={16} /> {t('admPanel.viewMenu')}
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
                  <p className="text-xs font-black uppercase tracking-widest text-red-400">{t('admPanel.cashClosed')}</p>
                  <p className="text-sm text-gray-400">{t('admPanel.cashClosedDesc')}</p>
                </div>
              </div>
              <button onClick={() => setShowOpenModal(true)} className="bg-[#FFC928] text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all">
                {t('admPanel.openCash')}
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={20} className="text-emerald-400" /></div>
                  <div>
                      <p className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                        {t('admPanel.cashOpen')} <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      </p>
                      <p className="text-xs text-gray-400">{t('admPanel.openingLine', { v: fmt(activeSession.openingAmount || 0), d: new Date(activeSession.openedAt).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) })}</p>
                  </div>
                </div>
                <button onClick={() => setShowCloseModal(true)} className="bg-red-500/10 text-red-400 hover:bg-red-500/20 font-black px-5 py-3 rounded-xl text-[10px] uppercase tracking-widest border border-red-500/20 transition-all">
                  {t('admPanel.closeCash')}
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: t('admPanel.sumOpening'), value: fmt(activeSession.openingAmount || 0), color: 'text-blue-400' },
                  { label: t('admPanel.sumSales'), value: fmt(sessionSales), color: 'text-emerald-400' },
                  { label: t('admPanel.sumBalance'), value: fmt(sessionBalance), color: 'text-white font-black text-base' },
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
          <Modal title={t('admPanel.openTitle')} onClose={() => setShowOpenModal(false)}>
            <p className="text-sm text-gray-400 mb-4">{t('admPanel.openAsk')}</p>
            <input type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#FFC928]" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowOpenModal(false)} className="flex-1 bg-zinc-800 text-gray-400 font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all">{t('common.cancel')}</button>
              <button onClick={handleOpenCashier} className="flex-1 bg-[#FFC928] text-black font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all">{t('admPanel.openBtn')}</button>
            </div>
          </Modal>
        )}

        {showCloseModal && (
          <Modal title={t('admPanel.closeTitle')} onClose={() => setShowCloseModal(false)}>
            <div className="space-y-2 mb-6">
              {[
                { label: t('admPanel.closeSales'), value: sessionSales },
                { label: t('admPanel.closeExpected'), value: sessionBalance, highlight: true },
              ].map((s, i) => (
                <div key={i} className={`flex justify-between ${i === 1 ? 'pt-3 border-t border-zinc-700' : ''}`}>
                  <span className="text-sm text-gray-400">{s.label}</span>
                  <span className={`text-sm font-black ${s.highlight ? 'text-[#FFC928] text-lg' : 'text-white'}`}>{fmt(s.value)}</span>
                </div>
              ))}
            </div>

            {salesByMethod.length > 0 && (
              <div className="mb-6 p-3 bg-zinc-800/50 rounded-xl">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">{t('admPanel.byMethod')}</p>
                <div className="space-y-1.5">
                  {salesByMethod.map(([method, total]) => (
                    <div key={method} className="flex justify-between text-xs">
                      <span className="text-gray-400 font-bold uppercase tracking-wider">
                        {method === 'pix' ? t('checkout.pix') :
                         method === 'cash' ? t('checkout.payCash') :
                         method === 'credit' ? t('checkout.credit') :
                         method === 'debit' ? t('checkout.debit') :
                         method === 'card-on-delivery' ? t('checkout.cardOnDelivery') :
                         method === 'voucher' ? t('checkout.voucher') :
                         method === 'on-site' ? t('checkout.onSite') : method}
                      </span>
                      <span className="text-white font-black">{fmt(total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <p className="text-sm text-gray-400 mb-4">{t('admPanel.closeAsk')}</p>
            <input type="number" step="0.01" placeholder="0,00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white text-lg font-black mb-4 focus:outline-none focus:ring-2 focus:ring-[#FFC928]" autoFocus />
            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(false)} className="flex-1 bg-zinc-800 text-gray-400 font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-zinc-700 transition-all">{t('common.cancel')}</button>
              <button onClick={handleCloseCashier} className="flex-1 bg-red-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-red-600 transition-all">{t('admPanel.closeBtn')}</button>
            </div>
          </Modal>
        )}

        {/* ─── KPIs ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-zinc-800">
          {[
            { label: t('admPanel.kpiToday'), value: todayOrders.length.toString(), sub: t('admPanel.kpiInProgress', { n: inProgress.length }), accent: false },
            { label: t('admPanel.kpiRevenue'), value: fmt(todayRevenue), sub: t('admPanel.kpiOrdersSub', { n: todayOrders.length }), accent: true },
            { label: t('admPanel.kpiTicket'), value: fmt(avgTicket), sub: t('admPanel.kpiAvgDay'), accent: false },
            { label: t('admPanel.kpiProducts'), value: products.filter(p => p.isActive).length.toString(), sub: t('admPanel.kpiTotalSub', { n: products.length }), accent: false },
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
            <Plus size={18} /> {t('admPanel.newProduct')}
          </motion.button>
            {[
              { label: t('admPanel.aiGenerate'), icon: <Sparkles size={16} />, onClick: () => navigate('/admin/cardapio?generate=true') },
              { label: t('admPanel.viewMenu'), icon: <Eye size={16} />, onClick: () => navigate(`/r/${currentRestaurant?.slug}`) },
              { label: t('admPanel.qrCode'), icon: <QrCode size={16} />, onClick: () => navigate('/admin/mesas') },
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
                        {p.labelInfo.shelfLifeDays} {t('admPanel.expiryDays')} • {p.labelInfo.storageType === 'refrigerated' ? '🧊' : p.labelInfo.storageType === 'frozen' ? '❄️' : '🏠'} {t('admLabels.st' + p.labelInfo.storageType.charAt(0).toUpperCase() + p.labelInfo.storageType.slice(1), { defaultValue: p.labelInfo.storageType })}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {(p.selectedAllergens || []).slice(0, 6).map(key => {
                        const a = ALLERGEN_MAP.get(key);
                        return a ? <span key={key} className="text-[10px]" title={t('allergen.' + key, { defaultValue: a.label })}>{a.icon}</span> : null;
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
          <h3 className="text-sm font-black uppercase tracking-tight text-white mb-1">{t('admPanel.labelTitle')}</h3>
          <p className="text-xs text-gray-400 mb-4">{t('admPanel.labelDesc')}</p>
          <button onClick={() => navigate('/admin/etiquetas')} className="bg-[#FFC928] text-black font-black px-5 py-3 rounded-xl text-xs uppercase tracking-widest hover:bg-[#e6b520] transition-all">
            {t('admPanel.labelCta')}
          </button>
        </div>

        {/* ─── CHARTS ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">{t('admPanel.chartTitle')}</h3>
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
            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-6">{t('admPanel.channelsTitle')}</h3>
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
              <ShoppingBag size={14} /> {t('admPanel.activeTitle', { n: inProgress.length })}
            </h3>
            <button onClick={() => navigate('/admin/pedidos')} className="text-[10px] font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity">{t('admOverview.viewAll')}</button>
          </div>
          {inProgress.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">{t('admPanel.noActive')}</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {inProgress.map(order => (
                <div key={order.id} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/admin/pedidos'); } }} className="bg-zinc-800/50 rounded-xl p-4 flex items-center gap-4 hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => navigate('/admin/pedidos')}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-bold text-white">#{order.id.slice(-6).toUpperCase()}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg flex items-center gap-1 ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'}`}>
                        {STATUS_ICONS[order.status]} {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 truncate">{order.customerName} — {order.items?.length || 0} {order.items?.length === 1 ? t('market.itemOne') : t('market.itemsMany')}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' }) : ''}
                      {order.type === 'dine-in' ? t('admPanel.tableSuffix', { n: order.tableNumber || '' }) : order.type === 'delivery' ? t('admPanel.deliverySuffix') : t('admPanel.pickupSuffix')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-black text-white">{fmt(order.total ?? 0)}</p>
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
