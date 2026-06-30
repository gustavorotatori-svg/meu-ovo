import React, { useState } from 'react';
import { 
  AlertTriangle, Clock, Percent, DollarSign, ArrowUpRight, BarChart3, 
  ShieldAlert, Sparkles, Zap, CheckCircle2, Sliders, ChevronDown, 
  HelpCircle, AlertCircle, RefreshCw, Trash2, ShieldCheck, Heart
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, 
  CartesianGrid, Legend, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

interface ReportProps {
  isDark: boolean;
}

export default function PlatformCanceledOrdersReport({ isDark }: ReportProps) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'reason' | 'hour'>('reason');
  const [showInsightSavedAlert, setShowInsightSavedAlert] = useState(false);

  // Dynamic datasets depending on selected restaurant
  const dataset: Record<string, {
    restaurantName: string;
    metrics: {
      rate: string;
      rateChange: string;
      isRateDown: boolean;
      lostGmv: string;
      recoverableGmv: string;
      primaryReason: string;
      peakHour: string;
    };
    reasons: { name: string; value: number; count: number; color: string; recovery: string }[];
    hourly: { hour: string; rate: number; count: number }[];
    insights: string[];
  }> = {
    all: {
      restaurantName: 'Todos os Restaurantes (Consolidado)',
      metrics: {
        rate: '2.3%',
        rateChange: '-0.4% em relação ao mês anterior',
        isRateDown: true,
        lostGmv: 'R$ 14.820,00',
        recoverableGmv: 'R$ 8.030,00 (54% recuperável)',
        primaryReason: 'Tempo Limite KDS Estourado',
        peakHour: '19h00 - 21h00',
      },
      reasons: [
        { name: 'KDS Timeout (Atraso de Preparo)', value: 42, count: 184, color: '#EF4444', recovery: 'Integrar KDS inteligente e pausar recebimento de pedidos quando fila estiver em sobrecarga.' },
        { name: 'Menu Desatualizado (Falta de Estoque)', value: 28, count: 122, color: '#F97316', recovery: 'Habilitar o timer de auto-desativação rápida e link direto de pausa de ingredientes no app painel.' },
        { name: 'Cancelado pelo Usuário (Arrependimento rápidos)', value: 15, count: 66, color: '#3B82F6', recovery: 'Inserir countdown visual na tela de pedido de 45s antes do envio do pedido para a cozinha.' },
        { name: 'Problemas de Logística / Entregador', value: 10, count: 44, color: '#F59E0B', recovery: 'Aumentar o raio dinâmico de cobrança ou priorizar frotas locais parceiras no rush.' },
        { name: 'Duplicidade ou Erro Operacional interno', value: 5, count: 22, color: '#8B5CF6', recovery: 'Implementar debounce no botão de finalizar para evitar duplo clique e pedido repetido.' },
      ],
      hourly: [
        { hour: '11:00', rate: 1.2, count: 15 },
        { hour: '12:00', rate: 2.1, count: 32 },
        { hour: '13:05', rate: 1.9, count: 28 },
        { hour: '14:00', rate: 0.5, count: 4 },
        { hour: '15:00', rate: 0.2, count: 2 },
        { hour: '16:00', rate: 0.3, count: 3 },
        { hour: '17:00', rate: 0.6, count: 8 },
        { hour: '18:00', rate: 1.5, count: 21 },
        { hour: '19:00', rate: 3.8, count: 64 },
        { hour: '20:00', rate: 4.8, count: 98 },
        { hour: '21:00', rate: 3.2, count: 52 },
        { hour: '22:00', rate: 2.0, count: 29 },
        { hour: '23:00', rate: 1.1, count: 10 },
      ],
      insights: [
        'Grande parte das perdas se concentra entre 19:30 e 20:30, correlacionada diretamente com a alta latência acumulada no KDS das cozinhas de fast-food.',
        'A falta de sincronização em tempo real de produtos esgotados (principalmente bebidas no início do fim de semana) causou um prejuízo de R$ 4.150 no faturamento geral.',
        'Inserir uma estimativa dinâmica de fila evita o cancelamento súbito do cliente por ansiedade na entrega.'
      ]
    },
    joao: {
      restaurantName: 'Pizzaria do João',
      metrics: {
        rate: '3.4%',
        rateChange: '+0.8% em relação ao mês anterior',
        isRateDown: false,
        lostGmv: 'R$ 5.120,00',
        recoverableGmv: 'R$ 3.200,50 (62% recuperável)',
        primaryReason: 'Forno Sobrecarregado (Timeout)',
        peakHour: '19h30 - 21h00',
      },
      reasons: [
        { name: 'KDS Timeout (Atraso de Preparo)', value: 58, count: 72, color: '#EF4444', recovery: 'Limite de pizza simultânea configurado no forno. Ajustar capacidade instalada.' },
        { name: 'Cancelado pelo Usuário (Arrependimento)', value: 15, count: 18, color: '#3B82F6', recovery: 'Definir limite de 1 min para desistência sem ônus.' },
        { name: 'Menu Desatualizado (Insumos)', value: 12, count: 15, color: '#F97316', recovery: 'Aviso imediato quando queijo ou recheio premium estiver no fim.' },
        { name: 'Problemas de Logística / Entregador', value: 10, count: 12, color: '#F59E0B', recovery: 'Ampliar contratação de motoboys adicionais fixos nas sextas.' },
        { name: 'Duplicidade ou Erro Operacional', value: 5, count: 6, color: '#8B5CF6', recovery: 'Treinar operador na tela de recepção rápida no caixa.' },
      ],
      hourly: [
        { hour: '11:00', rate: 0.1, count: 0 },
        { hour: '12:00', rate: 0.4, count: 1 },
        { hour: '13:05', rate: 0.2, count: 1 },
        { hour: '14:00', rate: 0.0, count: 0 },
        { hour: '15:00', rate: 0.0, count: 0 },
        { hour: '16:00', rate: 0.0, count: 0 },
        { hour: '17:00', rate: 0.5, count: 2 },
        { hour: '18:00', rate: 1.8, count: 11 },
        { hour: '19:00', rate: 4.5, count: 32 },
        { hour: '20:00', rate: 6.2, count: 54 },
        { hour: '21:00', rate: 4.8, count: 39 },
        { hour: '22:00', rate: 2.1, count: 15 },
        { hour: '23:00', rate: 1.2, count: 8 },
      ],
      insights: [
        'O gargalo crítico deste parceiro está na capacidade produtiva física do forno de esteira durante as noites de domingo.',
        'Sugerimos configurar um tempo de entrega fixo realista de 55 minutos (em vez dos 35 padrão) automaticamente às sextas e domingos após as 19:30h.'
      ]
    },
    praça: {
      restaurantName: 'Burger da Praça',
      metrics: {
        rate: '1.8%',
        rateChange: '-0.2% em relação ao mês anterior',
        isRateDown: true,
        lostGmv: 'R$ 3.450,00',
        recoverableGmv: 'R$ 1.950,20 (56% recuperável)',
        primaryReason: 'Falta de Insumos Premium (Brioche)',
        peakHour: '21h00 - 22h00',
      },
      reasons: [
        { name: 'Menu Desatualizado (Falta de Estoque)', value: 45, count: 48, color: '#F97316', recovery: 'Integração de estoque mínimo. Desativar brioche e carne fresca no AdminMenu de forma dinâmica.' },
        { name: 'KDS Timeout (Atraso de Preparo)', value: 25, count: 27, color: '#EF4444', recovery: 'Readequar a chapa durante o pico focado em agilizar montagem.' },
        { name: 'Cancelado pelo Usuário (Arrependimento)', value: 18, count: 19, color: '#3B82F6', recovery: 'Alertar sobre falta de estorno de itens perecíveis em preparo rápido.' },
        { name: 'Problemas de Logística / Entregador', value: 8, count: 9, color: '#F59E0B', recovery: 'Utilizar rotas otimizadas para bairros adjacentes.' },
        { name: 'Duplicidade ou Erro Operacional', value: 4, count: 4, color: '#8B5CF6', recovery: 'Facilitar cliques na KDS reduzindo margem de duplo comando.' },
      ],
      hourly: [
        { hour: '11:00', rate: 0.5, count: 2 },
        { hour: '12:00', rate: 1.1, count: 8 },
        { hour: '13:05', rate: 1.0, count: 6 },
        { hour: '14:00', rate: 0.2, count: 1 },
        { hour: '15:00', rate: 0.1, count: 1 },
        { hour: '16:00', rate: 0.3, count: 2 },
        { hour: '17:00', rate: 0.4, count: 3 },
        { hour: '18:00', rate: 1.2, count: 10 },
        { hour: '19:00', rate: 2.8, count: 24 },
        { hour: '20:00', rate: 3.1, count: 29 },
        { hour: '21:00', rate: 5.2, count: 45 },
        { hour: '22:00', rate: 3.9, count: 32 },
        { hour: '23:00', rate: 1.5, count: 11 },
      ],
      insights: [
        'A falta recorrente do pão brioche artesanal no final do horário de pico (após as 21:00h) força o cancelamento subsequente de vários burgers montados.',
        'Ações de compra predictiva de insumos de pão artesanal às quintas-feiras reduziria a perda deste estabelecimento em até 38%.'
      ]
    },
    sushi: {
      restaurantName: 'Sushi Master',
      metrics: {
        rate: '2.1%',
        rateChange: '-0.6% em relação ao mês anterior',
        isRateDown: true,
        lostGmv: 'R$ 4.250,55',
        recoverableGmv: 'R$ 1.800,00 (42% recuperável)',
        primaryReason: 'Logística / Raio Longo de Entrega',
        peakHour: '20h00 - 21h30',
      },
      reasons: [
        { name: 'Problemas de Logística / Entregador', value: 38, count: 35, color: '#F59E0B', recovery: 'Restringir a área máxima de raio de entrega para até 7km a partir das 20:00h, evitando estalos longos.' },
        { name: 'KDS Timeout (Atraso de Preparo)', value: 32, count: 29, color: '#EF4444', recovery: 'Adicionar balcão refrigerado extra para cortes rápidos de sashimi de salmão.' },
        { name: 'Cancelado pelo Usuário (Arrependimento)', value: 15, count: 13, color: '#3B82F6', recovery: 'Implementar chat interativo para tranquilizar cliente em atrasos logísticos.' },
        { name: 'Menu Desatualizado (Falta de Estoque)', value: 10, count: 9, color: '#F97316', recovery: 'Marcar salmão fresco como indisponível de forma fácil quando peso atingir mínimo de segurança.' },
        { name: 'Duplicidade ou Erro Operacional', value: 5, count: 4, color: '#8B5CF6', recovery: 'Automatizar integração com comandas de mesa para evitar re-digitação.' },
      ],
      hourly: [
        { hour: '11:00', rate: 0.1, count: 1 },
        { hour: '12:00', rate: 0.8, count: 5 },
        { hour: '13:05', rate: 0.6, count: 4 },
        { hour: '14:00', rate: 0.1, count: 0 },
        { hour: '15:00', rate: 0.0, count: 0 },
        { hour: '16:00', rate: 0.0, count: 0 },
        { hour: '17:00', rate: 0.2, count: 1 },
        { hour: '18:00', rate: 1.0, count: 8 },
        { hour: '19:00', rate: 3.1, count: 25 },
        { hour: '20:00', rate: 4.9, count: 42 },
        { hour: '21:00', rate: 4.1, count: 36 },
        { hour: '22:00', rate: 2.5, count: 18 },
        { hour: '23:00', rate: 1.0, count: 4 },
      ],
      insights: [
        'Cancelamentos logísticos severos para locais longínquos prejudicam a reputação e frescor do produto.',
        'Ativar entrega própria rápida ou limitar os bairros atendidos reduzirá devoluções de barcas de sushis que esquentam no trânsito.'
      ]
    },
    marmita: {
      restaurantName: 'Marmita Dona Ana',
      metrics: {
        rate: '0.9%',
        rateChange: '-0.1% em relação ao mês anterior',
        isRateDown: true,
        lostGmv: 'R$ 2.000,00',
        recoverableGmv: 'R$ 1.080,00 (54% recuperável)',
        primaryReason: 'Cliente Desistiu (Busca do Balcão)',
        peakHour: '12h00 - 13h00',
      },
      reasons: [
        { name: 'Cancelado pelo Usuário (Arrependimento / Atraso busca)', value: 35, count: 14, color: '#3B82F6', recovery: 'Exigir pré-pagamento online para opções "Retirada" para evitar marmitas abandonadas.' },
        { name: 'Menu Desatualizado (Falta de Estoque)', value: 30, count: 12, color: '#F97316', recovery: 'Sincronizar mistura do dia (frango assado, carne panela) dinamicamente.' },
        { name: 'KDS Timeout (Atraso de Preparo)', value: 20, count: 8, color: '#EF4444', recovery: 'Marmitas montadas sob esquema de linha de montagem rápida antes do meio dia.' },
        { name: 'Problemas de Logística / Entregador', value: 10, count: 4, color: '#F59E0B', recovery: 'Formar parceria com entregadores locais de bicicleta no bairro.' },
        { name: 'Duplicidade ou Erro Operacional', value: 5, count: 2, color: '#8B5CF6', recovery: 'Organizar fila com nomes no caixa integrado.' },
      ],
      hourly: [
        { hour: '11:00', rate: 1.1, count: 5 },
        { hour: '12:00', rate: 2.2, count: 24 },
        { hour: '13:05', rate: 1.5, count: 15 },
        { hour: '14:00', rate: 0.3, count: 2 },
        { hour: '15:00', rate: 0.0, count: 0 },
        { hour: '16:00', rate: 0.0, count: 0 },
        { hour: '17:00', rate: 0.0, count: 0 },
        { hour: '18:00', rate: 0.0, count: 0 },
        { hour: '19:00', rate: 0.0, count: 0 },
        { hour: '20:00', rate: 0.0, count: 0 },
        { hour: '21:00', rate: 0.0, count: 0 },
        { hour: '22:00', rate: 0.0, count: 0 },
        { hour: '23:00', rate: 0.0, count: 0 },
      ],
      insights: [
        'Marmitas de almoço têm taxa de conversão altíssima, mas sofrem quando clientes de agendamento não buscam a tempo e o prato esfria.',
        'O pre-pagamento pix é a solução definitiva de austeridade operacional para este modelo de negócio.'
      ]
    }
  };

  const currentReport = dataset[selectedRestaurant] || dataset.all;

  const handleSaveInsight = () => {
    setShowInsightSavedAlert(true);
    setTimeout(() => {
      setShowInsightSavedAlert(false);
    }, 3000);
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Banner Report */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#111111] via-[#1a1a1a] to-[#141414] border border-orange-500/15 p-8 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-red-500/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-tr from-orange-500/5 to-transparent blur-2xl rounded-full" />
        
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10 text-left">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3.5 py-1.5 rounded-full text-[10px] font-black text-red-400 uppercase tracking-widest leading-none">
              <ShieldAlert size={12} className="text-red-400 rotate-12" />
              <span>Auditoria de Contenção de Perdas</span>
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Padrões de Cancelamento & Perdas</h2>
            <p className="text-sm text-gray-400 font-medium max-w-2xl leading-relaxed">
              Mapeamento estratégico e identificação automatizada de prejuízos operacionais na rede. Filtre por parceiro para visualizar as horas críticas e os principais motivos de cancelamento acumulados.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 items-stretch w-full md:w-auto shrink-0">
            {/* Dynamic SELECT filter */}
            <div className="relative">
              <Sliders className="absolute left-3.5 top-1/2 -translate-y-1/2 text-orange-500" size={14} />
              <select
                value={selectedRestaurant}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="pl-9 pr-10 py-3 bg-white/5 border border-white/10 text-white rounded-2xl text-xs font-black uppercase tracking-wider outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer appearance-none min-w-[210px] h-12"
              >
                <option value="all" className="bg-[#111] text-white">Rede Consolidada (Geral)</option>
                <option value="joao" className="bg-[#111] text-white">Pizzaria do João</option>
                <option value="praça" className="bg-[#111] text-white">Burger da Praça</option>
                <option value="sushi" className="bg-[#111] text-white">Sushi Master</option>
                <option value="marmita" className="bg-[#111] text-white">Marmita Dona Ana</option>
              </select>
              <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>

            <button 
              onClick={handleSaveInsight}
              className="px-5 h-12 bg-[#FFC928] text-neutral-950 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={13} className="animate-spin" />
              <span>Re-processar Dados</span>
            </button>
          </div>
        </div>

        {showInsightSavedAlert && (
          <div className="absolute bottom-4 right-8 bg-emerald-500 text-neutral-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={14} />
            <span>Sincronização do Firestore concluída com sucesso!</span>
          </div>
        )}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
        
        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl animate-pulse" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Taxa de Cancelamentos</p>
            <AlertTriangle className="text-red-500" size={18} />
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <p className="text-4xl font-black text-red-600 dark:text-red-450 font-display italic leading-none">
              {currentReport.metrics.rate}
            </p>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
              currentReport.metrics.isRateDown ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {currentReport.metrics.isRateDown ? '📉 -14%' : '📈 +22%'}
            </span>
          </div>
          <p className="mt-4 text-[10px] text-gray-400 font-medium leading-relaxed">
            {currentReport.metrics.rateChange}
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Perda Mensal de GMV</p>
            <DollarSign className="text-orange-500" size={18} />
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="text-3xl font-black text-slate-900 dark:text-white font-display italic leading-none">
              {currentReport.metrics.lostGmv}
            </p>
          </div>
          <p className="mt-5 text-[10px] text-orange-600 font-black uppercase tracking-wider flex items-center gap-1">
            <Zap size={11} className="fill-orange-500 text-orange-500" />
            <span>Faturamento Descartado no Lixo</span>
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Faturamento Recuperável</p>
            <Percent className="text-emerald-500" size={18} />
          </div>
          <div className="flex items-baseline gap-1 mt-4">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter leading-none">
              {currentReport.metrics.recoverableGmv}
            </p>
          </div>
          <p className="mt-5 text-[10px] text-gray-400 font-medium leading-relaxed">
            Corrigindo atrasos operacionais recorrentes e timeouts do KDS de forma proativa.
          </p>
        </div>

        <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Pico de Ocorrências</p>
            <Clock className="text-purple-500" size={18} />
          </div>
          <div className="flex flex-col gap-0.5 mt-4 text-left">
            <p className="text-sm font-black text-[#111] dark:text-white uppercase truncate">{currentReport.metrics.primaryReason}</p>
            <p className="text-1xl font-black text-purple-600 dark:text-purple-400 font-display mt-1">{currentReport.metrics.peakHour}</p>
          </div>
          <p className="mt-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wide">
            Janela Crítica de Atenção Obrigatória
          </p>
        </div>

      </div>

      {/* Main Breakdown Section with Tabs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Visual Charts analysis */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-neutral-800 shadow-md text-left">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div>
                <h3 className="text-xl font-black text-neutral-900 dark:text-white">Análise Gráfica Detalhada</h3>
                <p className="text-xs text-gray-400 mt-1">Alternância entre visual de causas fundamentais e comportamento temporal</p>
              </div>

              <div className="flex rounded-xl bg-gray-100 dark:bg-neutral-800 p-1 shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => setActiveTab('reason')}
                  className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'reason' 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Por Motivos
                </button>
                <button
                  onClick={() => setActiveTab('hour')}
                  className={`px-4.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    activeTab === 'hour' 
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-neutral-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  Por Horário
                </button>
              </div>
            </div>

            <div className="h-80 w-full relative">
              {activeTab === 'reason' ? (
                /* PIE / BAR Recharts element for cancellation reasons */
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentReport.reasons} layout="vertical" margin={{ left: 5, right: 30, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#222' : '#f1f1f1'} horizontal={true} vertical={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#666' : '#999', fontSize: 10, fontWeight: '700' }} unit="%" />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#aaa' : '#444', fontSize: 10, fontWeight: '800' }} width={170} />
                    <Tooltip 
                      formatter={(value: number, name: string, props: { payload?: { count: number } }) => [`${value}% (${props.payload?.count ?? 0} pedidos)`, 'Fração']}
                      contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                      {currentReport.reasons.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                /* AREA / LINE Recharts element for cancellation rate by hour */
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentReport.hourly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="cancelRateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EF4444" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#222' : '#f1f1f1'} vertical={false} />
                    <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: isDark ? '#666' : '#999', fontSize: 10, fontWeight: '700' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: isDark ? '#666' : '#999', fontSize: 10, fontWeight: '700' }} unit="%" />
                    <Tooltip 
                      formatter={(value) => [`${value}% de taxa de perda`, 'Impacto']}
                      contentStyle={{ backgroundColor: isDark ? '#111' : '#fff', borderRadius: '12px', border: 'none', color: isDark ? '#fff' : '#000', fontSize: '11px', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="rate" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#cancelRateGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-gray-100 dark:border-neutral-800 pt-4">
              {activeTab === 'reason' ? (
                currentReport.reasons.map((r, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[10px] font-black uppercase text-gray-500 dark:text-gray-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    <span>{r.name.split(' (')[0]} ({r.value}%)</span>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-4 text-[10px] font-black uppercase text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-[#EF4444]" />
                    <span>Taxa Média de Perda (%)</span>
                  </div>
                  <p>Represamento Máximo ocorre no horário das refeições</p>
                </div>
              )}
            </div>
          </div>

          {/* Actionable Measures Suggestions Grid */}
          <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-neutral-800 shadow-md text-left">
            <h3 className="text-xl font-black text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              <Zap size={22} className="text-[#FFC928]" />
              <span>Ações Recomendadas para Mitigar Prejuízos</span>
            </h3>

            <div className="space-y-4">
              {currentReport.reasons.map((r, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-2xl border bg-slate-50/50 dark:bg-neutral-850 border-gray-100 dark:border-neutral-800/80 hover:border-orange-200 dark:hover:border-orange-900/30 transition-all">
                  <div className="p-3 rounded-xl uppercase font-black text-xs h-10 w-10 flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: `${r.color}15`, color: r.color }}>
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-xs text-neutral-950 dark:text-white uppercase leading-none">{r.name}</h4>
                      <span className="bg-red-50 text-red-600 dark:bg-red-950/20 text-[9px] font-bold px-2 py-0.5 rounded-full">
                        {r.count} Cancels
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed font-medium">
                      {r.recovery}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Deep Insights, Loss Prevention Center */}
        <div className="space-y-8">
          
          <div className="bg-neutral-950 text-white rounded-[2.5rem] p-8 shadow-xl relative overflow-hidden text-left border border-[#FFC928]/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC928]/10 blur-3xl rounded-full" />
            <h3 className="text-lg font-black text-white italic uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles size={18} className="text-[#FFC928]" />
              <span>Plano de Contingência</span>
            </h3>

            <div className="space-y-5 text-gray-300 relative z-10 pt-2">
              {currentReport.insights.map((ins, i) => (
                <div key={i} className="flex gap-3 text-xs leading-relaxed border-b border-white/5 pb-4 last:border-0 last:pb-0 font-medium">
                  <span className="text-[#FFC928] text-base shrink-0 leading-none">⚡</span>
                  <p>{ins}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-400 font-extrabold uppercase">Meta de Redução de Perdas</p>
                <p className="text-lg font-black text-[#FFC928] leading-none mt-1">-50% em 30 dias</p>
              </div>
              <div className="p-3 bg-white/5 rounded-2xl border border-white/10 text-emerald-400 font-black text-xs uppercase tracking-wider">
                Ativo de Rede
              </div>
            </div>
          </div>

          {/* Loss Preventer interactive checklist toggle */}
          <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-neutral-800 shadow-sm text-left">
            <h3 className="text-lg font-black text-neutral-950 dark:text-white uppercase mb-5">
              Checklist de Mitigação
            </h3>
            
            <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4">
              Configure as travas gerais da plataforma para reduzir cancelamentos de forma transparente e preventiva.
            </p>

            <div className="space-y-3.5">
              {[
                { title: 'Tempo KDS Dinâmico', desc: 'Soma atraso atual na estimativa exposta p/ cliente.', defaultChecked: true },
                { title: 'Pix p/ busca retirada', desc: 'Evita marmitas esquecidas sem pagamento.', defaultChecked: true },
                { title: 'Pause Auto-Estoque', desc: 'Inativa produtos se informados esgotados 2 vezes no KDS.', defaultChecked: false },
                { title: 'Fila de Overflow', desc: 'Se acumular 10 pedidos em preparo, pausa aceites por 15 min.', defaultChecked: false },
              ].map((item, idx) => (
                <label 
                  key={idx} 
                  className="flex items-start gap-3 p-3.5 bg-slate-50/50 dark:bg-neutral-850/80 border border-slate-100 dark:border-neutral-800 rounded-2xl cursor-pointer hover:border-orange-200 transition-all block group"
                >
                  <input 
                    type="checkbox" 
                    defaultChecked={item.defaultChecked}
                    className="mt-1 accent-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <div className="space-y-0.5">
                    <p className="text-xs font-black text-slate-900 dark:text-white uppercase transition-colors group-hover:text-orange-600">{item.title}</p>
                    <p className="text-[10px] text-gray-400 font-semibold">{item.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Audit disclaimer */}
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30 p-5 rounded-[2rem] flex items-start gap-3.5 text-left">
            <HelpCircle className="text-orange-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <h4 className="text-xs font-black text-orange-950 dark:text-orange-300 uppercase">Imunidade a Spoofing</h4>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                Algoritmos de inteligência cruzam timestamps e logins dos clientes para descartar cancelamentos forjados (competidores inflando estatísticas ruins de rivais). Dados de alta austeridade garantidos pelo Meu Ovo.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
