import { useState, useMemo, useEffect, type ReactNode } from 'react';
import { Calculator, TrendingUp, TrendingDown, Wallet, Download, FileText, ShoppingBag, PackageX, AlertTriangle } from 'lucide-react';
import AdminLayout from './AdminLayout';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { toast } from 'react-hot-toast';
import { IngredientMovement } from '../../types';
import { formatCurrency, sanitizeCSVCell } from '../../lib/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';

function inRange(dateStr: string, start: string, end: string) {
  const d = new Date(dateStr).getTime();
  return d >= new Date(start + 'T00:00:00').getTime() && d <= new Date(end + 'T23:59:59').getTime();
}

export default function AdminFinancial() {
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
      ['Métrico', 'Valor'],
      ['Período', `${startDate} a ${endDate}`],
      ['Receita (pedidos finalizados)', stats.receita.toFixed(2)],
      ['Pedidos', String(stats.orderCount)],
      ['Ticket médio', stats.ticketMedio.toFixed(2)],
      ['Custo de mercadorias', stats.custo.toFixed(2)],
      ['Perdas', stats.perdas.toFixed(2)],
      ['Despesas (sangrias)', stats.despesas.toFixed(2)],
      ['Adições', stats.adicoes.toFixed(2)],
      ['Lucro estimado', stats.lucro.toFixed(2)],
    ];
    const csv = rows.map(r => `${sanitizeCSVCell(r[0])};${sanitizeCSVCell(r[1])}`).join('\r\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro-${restaurant?.slug || 'meuovo'}-${startDate}-a-${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success('Financeiro exportado para CSV!');
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
      doc.text('MEU OVO — CONTROLE FINANCEIRO', 14, 14);
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.text(`${restaurant?.name || 'Restaurante'}`, 14, 21);
      doc.text(`Período: ${startDate} a ${endDate}`, 14, 26);

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

      line('Receita (pedidos finalizados)', formatCurrency(stats.receita), GOLD);
      line('Pedidos no período', String(stats.orderCount));
      line('Ticket médio', formatCurrency(stats.ticketMedio));
      y += 4;
      line('Custo de mercadorias', `- ${formatCurrency(stats.custo)}`, [220, 38, 38]);
      line('Perdas', `- ${formatCurrency(stats.perdas)}`, [220, 38, 38]);
      line('Despesas (sangrias do caixa)', `- ${formatCurrency(stats.despesas)}`, [220, 38, 38]);
      y += 4;
      doc.setDrawColor(...GOLD);
      doc.line(14, y - 4, 196, y - 4);
      line('LUCRO ESTIMADO', formatCurrency(stats.lucro), stats.lucro >= 0 ? [16, 185, 129] : [220, 38, 38]);
      if (stats.caixaAtual !== null) {
        y += 2;
        line('Caixa aberto (situação atual)', formatCurrency(stats.caixaAtual));
      }

      doc.save(`relatorio-financeiro-${restaurant?.slug || 'meuovo'}-${startDate}-a-${endDate}.pdf`);
      toast.success('Relatório financeiro PDF gerado!');
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      toast.error('Erro na geração do PDF');
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
          <h1 className="text-2xl font-display font-black italic tracking-tighter uppercase">Controle Financeiro</h1>
          <p className="text-sm text-gray-500 font-semibold">DRE simplificado: receita, custos, despesas e lucro estimado.</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-semibold outline-none bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
          <span className="text-gray-400 text-sm font-black">até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
            className={`px-3 py-2 rounded-xl border text-sm font-semibold outline-none bg-transparent ${isDark ? 'border-white/10' : 'border-gray-200'}`} />
          <button onClick={exportCSV} title="Exportar CSV"
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition-colors">
            <Download size={16} />
          </button>
          <button onClick={generatePDF} title="Gerar PDF"
            className="p-2.5 rounded-xl bg-[#FFC928] text-[#111] hover:brightness-110 transition-colors">
            <FileText size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statCard('Receita (finalizados)', formatCurrency(stats.receita), <TrendingUp size={18} />, 'bg-emerald-500/10 text-emerald-500')}
        {statCard('Pedidos / Ticket médio', `${stats.orderCount} • ${formatCurrency(stats.ticketMedio)}`, <ShoppingBag size={18} />, 'bg-[#FFC928]/10 text-[#FFC928]')}
        {statCard('Custo de mercadorias', formatCurrency(stats.custo), <Calculator size={18} />, 'bg-sky-500/10 text-sky-500')}
        {statCard('Perdas', formatCurrency(stats.perdas), <PackageX size={18} />, 'bg-amber-500/10 text-amber-500')}
        {statCard('Despesas (sangrias)', formatCurrency(stats.despesas), <TrendingDown size={18} />, 'bg-rose-500/10 text-rose-400')}
        {statCard('Adições', formatCurrency(stats.adicoes), <Wallet size={18} />, 'bg-violet-500/10 text-violet-400')}
      </div>

      <div className={`rounded-2xl border p-5 mb-6 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Lucro estimado do período</p>
            <p className={`text-3xl font-display font-black italic ${stats.lucro >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>{formatCurrency(stats.lucro)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Caixa aberto</p>
            <p className={`text-2xl font-black ${stats.caixaAtual === null ? 'text-gray-400' : ''}`}>
              {stats.caixaAtual === null ? '—' : formatCurrency(stats.caixaAtual)}
            </p>
          </div>
        </div>
        {stats.caixaAtual === null && (
          <p className="mt-3 flex items-center gap-2 text-[11px] font-bold text-gray-400">
            <AlertTriangle size={14} /> Nenhuma sessão de caixa aberta. Abra o caixa em "Caixa" para registrar as vendas do dia.
          </p>
        )}
      </div>

      <div className={`rounded-2xl border p-5 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-white border-gray-100'}`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Como os valores são calculados</p>
        <ul className="space-y-1.5 text-xs sm:text-sm font-semibold text-gray-400 leading-relaxed">
          <li>• <strong className="text-gray-600">Receita:</strong> soma dos pedidos finalizados no período (status "entregue").</li>
          <li>• <strong className="text-gray-600">Custo de mercadorias:</strong> baixas automáticas de insumos nas vendas (ficha técnica × pedidos).</li>
          <li>• <strong className="text-gray-600">Perdas:</strong> movimentações de perda de insumos registradas no estoque.</li>
          <li>• <strong className="text-gray-600">Despesas/Adições:</strong> sangrias e adições registradas nas sessões de caixa do período.</li>
          <li>• O custo só aparece se o produto tiver <strong className="text-gray-600">ficha técnica</strong> com insumos cadastrados.</li>
        </ul>
      </div>
    </AdminLayout>
  );
}
