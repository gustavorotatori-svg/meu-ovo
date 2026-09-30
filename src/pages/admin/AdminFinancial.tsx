import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { Calculator, TrendingUp, TrendingDown, Wallet, Download, FileText, ShoppingBag, PackageX, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { IngredientMovement } from '../../types';
import { formatCurrency, currencyLocale, sanitizeCSVCell } from '../../lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useTranslation } from 'react-i18next';

function inRange(dateStr: string, start: string, end: string) {
  const d = new Date(dateStr).getTime();
  return d >= new Date(start + 'T00:00:00').getTime() && d <= new Date(end + 'T23:59:59').getTime();
}

export default function AdminFinancial() {
  const { t, i18n } = useTranslation();
  const fmt = (v: number) => formatCurrency(v, currencyLocale(i18n.language));
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRestaurant: restaurant, orders, cashierSessions, activeSession } = useRestaurant();

  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(thirtyDaysAgo);
  const [endDate, setEndDate] = useState(today);

  const [movements, setMovements] = useState<IngredientMovement[]>([]);

  useEffect(() => {
    let active = true;
    if (!restaurant) return;
    const q = query(collection(db, 'ingredient_movements'), where('restaurantId', '==', restaurant.id));
    getDocs(q).then(snap => {
      if (!active) return;
      setMovements(snap.docs.map(d => ({ id: d.id, ...d.data() }) as IngredientMovement));
    }).catch(() => {
      if (active) setMovements([]);
    });
    return () => { active = false; };
  }, [restaurant]);

  const stats = useMemo(() => {
    const periodOrders = orders.filter(o =>
      o.status === 'finished' && inRange(o.createdAt, startDate, endDate)
    );
    const receita = periodOrders.reduce((s, o) => s + (o.total || 0), 0);
    const orderCount = periodOrders.length;
    const ticketMedio = orderCount > 0 ? receita / orderCount : 0;

    const periodMovements = movements.filter(m => inRange(m.createdAt, startDate, endDate));
    const custo = periodMovements
      .filter(m => m.type === 'sale')
      .reduce((s, m) => s + Math.abs(m.quantity) * (m.unitCost || 0), 0);
    const perdas = periodMovements
      .filter(m => m.type === 'waste')
      .reduce((s, m) => s + Math.abs(m.quantity) * (m.unitCost || 0), 0);

    const sessionsInRange = cashierSessions.filter(s => inRange(s.openedAt, startDate, endDate));
    const despesas = sessionsInRange.reduce((s, sess) => s + sess.withdrawals.reduce((a, w) => a + w.amount, 0), 0);
    const adicoes = sessionsInRange.reduce((s, sess) => s + sess.additions.reduce((a, w) => a + w.amount, 0), 0);

    const lucro = receita - custo - perdas - despesas;

    let caixaAtual: number | null = null;
    const open = activeSession || cashierSessions.find(s => s.status === 'open') || null;
    if (open) {
      caixaAtual =
        (open.openingAmount || 0) +
        (open.totalSales || 0) -
        open.withdrawals.reduce((a, w) => a + w.amount, 0) +
        open.additions.reduce((a, w) => a + w.amount, 0);
    }

    return { receita, orderCount, ticketMedio, custo, perdas, despesas, adicoes, lucro, caixaAtual };
  }, [orders, movements, cashierSessions, activeSession, startDate, endDate]);

  const exportCSV = () => {
    const rows = [
      [t('admFinancial.csvMetric'), t('admFinancial.csvValue')],
      [t('admFinancial.csvPeriod'), `${startDate} ${t('admFinancial.csvTo')} ${endDate}`],
      [t('admFinancial.csvRevenue'), stats.receita.toFixed(2)],
      [t('admFinancial.csvOrders'), String(stats.orderCount)],
      [t('admFinancial.csvTicket'), stats.ticketMedio.toFixed(2)],
      [t('admFinancial.csvCost'), stats.custo.toFixed(2)],
      [t('admFinancial.csvWaste'), stats.perdas.toFixed(2)],
      [t('admFinancial.csvExpenses'), stats.despesas.toFixed(2)],
      [t('admFinancial.csvAdditions'), stats.adicoes.toFixed(2)],
      [t('admFinancial.csvProfit'), stats.lucro.toFixed(2)],
    ];
    const csv = rows.map(r => `${sanitizeCSVCell(r[0])};${sanitizeCSVCell(r[1])}`).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro-${restaurant?.slug || 'meuovo'}-${startDate}-a-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success(t('admFinancial.csvOk'));
  };

  const generatePDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const GOLD: [number, number, number] = [255, 201, 40];
      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, 210, 30, 'F');
      doc.setTextColor(...GOLD);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t('admFinancial.pdfTitle'), 14, 14);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`${restaurant?.name || t('admFinancial.pdfRestFallback')}`, 14, 21);
      doc.text(`${t('admFinancial.pdfPeriod')}: ${startDate} ${t('admFinancial.csvTo')} ${endDate}`, 14, 26);

      let y = 42;
      const line = (label: string, value: string, color?: [number, number, number]) => {
        doc.setTextColor(80, 80, 80);
        doc.setFontSize(11);
        doc.text(label, 14, y);
        doc.setTextColor(...(color || [17, 17, 17]));
        doc.setFont('helvetica', 'bold');
        doc.text(value, 196, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 9;
      };

      line(t('admFinancial.pdfRevenue'), fmt(stats.receita), GOLD);
      line(t('admFinancial.pdfOrders'), String(stats.orderCount));
      line(t('admFinancial.pdfTicket'), fmt(stats.ticketMedio));
      y += 4;
      line(t('admFinancial.pdfCost'), `- ${fmt(stats.custo)}`, [220, 38, 38]);
      line(t('admFinancial.pdfWaste'), `- ${fmt(stats.perdas)}`, [220, 38, 38]);
      line(t('admFinancial.pdfExpenses'), `- ${fmt(stats.despesas)}`, [220, 38, 38]);
      y += 4;
      doc.setDrawColor(...GOLD);
      doc.line(14, y - 4, 196, y - 4);
      line(t('admFinancial.pdfProfit'), fmt(stats.lucro), stats.lucro >= 0 ? [16, 185, 129] : [220, 38, 38]);
      if (stats.caixaAtual !== null) {
        y += 2;
        line(t('admFinancial.pdfCash'), fmt(stats.caixaAtual));
      }

      doc.save(`relatorio-financeiro-${restaurant?.slug || 'meuovo'}-${startDate}-a-${endDate}.pdf`);
      toast.success(t('admFinancial.pdfOk'));
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error(t('admFinancial.pdfError'));
    }
  };

  const statCard = (title: string, value: string, icon: ReactNode, tone: string) => (
    <div className={`rounded-2xl border p-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center gap-3">
        <span className={`p-2.5 rounded-xl ${tone}`}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 truncate">{title}</p>
          <p className="text-lg sm:text-xl font-black truncate">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-1">
          <h1 className="text-2xl font-display font-black italic tracking-tighter uppercase">{t('admFinancial.title')}</h1>
          <p className="text-sm text-gray-500 font-semibold">{t('admFinancial.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-semibold outline-none bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
          <span className="text-gray-400 text-sm font-black">{t('admFinancial.toDate')}</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-semibold outline-none bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
          <button onClick={exportCSV} title={t('admFinancial.exportCsv')}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors">
            <Download size={16} />
          </button>
          <button onClick={generatePDF} title={t('admFinancial.exportPdf')}
            className="p-2.5 rounded-xl bg-[#FFC928] text-[#111] hover:brightness-110 transition-colors">
            <FileText size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statCard(t('admFinancial.cardRevenue'), fmt(stats.receita), <TrendingUp size={18} />, 'bg-emerald-500/10 text-emerald-500')}
        {statCard(t('admFinancial.cardOrders'), `${stats.orderCount} • ${fmt(stats.ticketMedio)}`, <ShoppingBag size={18} />, 'bg-[#FFC928]/10 text-[#FFC928]')}
        {statCard(t('admFinancial.cardCost'), fmt(stats.custo), <Calculator size={18} />, 'bg-sky-500/10 text-sky-500')}
        {statCard(t('admFinancial.cardWaste'), fmt(stats.perdas), <PackageX size={18} />, 'bg-amber-500/10 text-amber-500')}
        {statCard(t('admFinancial.cardExpenses'), fmt(stats.despesas), <TrendingDown size={18} />, 'bg-rose-500/10 text-rose-400')}
        {statCard(t('admFinancial.cardAdditions'), fmt(stats.adicoes), <Wallet size={18} />, 'bg-violet-500/10 text-violet-400')}
      </div>

      <div className={`rounded-2xl border p-5 mb-6 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('admFinancial.profitLabel')}</p>
            <p className={`text-3xl font-display font-black italic ${stats.lucro >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{fmt(stats.lucro)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{t('admFinancial.cashOpen')}</p>
            <p className={`text-2xl font-black ${stats.caixaAtual === null ? 'text-gray-400' : ''}`}>
              {stats.caixaAtual === null ? '—' : fmt(stats.caixaAtual)}
            </p>
          </div>
        </div>
        {stats.caixaAtual === null && (
          <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-gray-400">
            <AlertTriangle size={14} /> {t('admFinancial.noCash')}
          </p>
        )}
      </div>

      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">{t('admFinancial.howTitle')}</p>
        <ul className="space-y-1.5 text-xs sm:text-sm font-semibold text-gray-400 leading-relaxed">
          <li>• <strong className="text-gray-600">{t('admFinancial.howRevenueB')}</strong> {t('admFinancial.howRevenue')}</li>
          <li>• <strong className="text-gray-600">{t('admFinancial.howCostB')}</strong> {t('admFinancial.howCost')}</li>
          <li>• <strong className="text-gray-600">{t('admFinancial.howWasteB')}</strong> {t('admFinancial.howWaste')}</li>
          <li>• <strong className="text-gray-600">{t('admFinancial.howExpB')}</strong> {t('admFinancial.howExp')}</li>
          <li>• {t('admFinancial.howNote')}</li>
        </ul>
      </div>
    </AdminLayout>
  );
}
