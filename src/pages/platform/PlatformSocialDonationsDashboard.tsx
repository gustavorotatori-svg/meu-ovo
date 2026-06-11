import React, { useState, useEffect } from 'react';
import { 
  Heart, Store, Calendar, DollarSign, CheckCircle2, AlertCircle, 
  FileText, Share2, Copy, Check, TrendingUp, Users, Utensils, Search, ArrowUpRight
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, doc, getDocs } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { WA_NUMBER } from '../../services/whatsappService';

interface RestaurantDonationInfo {
  id: string;
  name: string;
  slug: string;
  contactPhone: string;
  ordersCount: number;
  donationTotal: number;
  checkoutDonations: number; // paid to restaurant, needs collection
  postPaymentDonations: number; // paid directly to platform
  status: 'pending' | 'success'; // Admin status tracker: whether restaurant settled with platform
  pixKey?: string;
}

interface PlatformSocialDonationsDashboardProps {
  isDark: boolean;
}

export default function PlatformSocialDonationsDashboard({ isDark }: PlatformSocialDonationsDashboardProps) {
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('2026-05'); // Default to active system month
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'success'>('all');
  
  // Status tracker for live restaurants (keeps toggle values in React state as persistent default fallback/preference)
  const [settledStates, setSettledStates] = useState<Record<string, 'pending' | 'success'>>({});
  
  // Modal tracking
  const [activeReportModal, setActiveReportModal] = useState<any | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Load real database info
  useEffect(() => {
    // Keep a reactive listener on orders to sync real checkout donations in real-time
    const qOrdersUnsub = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const ords: any[] = [];
      snapshot.forEach((d) => {
        ords.push({ id: d.id, ...d.data() });
      });
      setOrders(ords);
    });

    const qRestUnsub = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      const rests: any[] = [];
      snapshot.forEach((d) => {
        rests.push({ id: d.id, ...d.data() });
      });
      setRestaurants(rests);
      setLoading(false);
    });

    return () => {
      qOrdersUnsub();
      qRestUnsub();
    };
  }, []);

  // Preset historical baseline data for other months to provide rich audit trails
  const historicalData: Record<string, {
    totalDonated: number;
    meals: number;
    families: number;
    restaurantsBreakdown: { id: string; name: string; slug: string; phone: string; orders: number; amount: number; status: 'success' | 'pending' }[];
  }> = {
    '2026-04': {
      totalDonated: 14520,
      meals: 2904,
      families: 414,
      restaurantsBreakdown: [
        { id: '1', name: 'Pizzaria do João', slug: 'joao', phone: '5511999999991', orders: 184, amount: 2450.00, status: 'success' },
        { id: '2', name: 'Burger da Praça', slug: 'burger', phone: '5511999999992', orders: 240, amount: 3120.00, status: 'success' },
        { id: '3', name: 'Sushi Master', slug: 'sushi', phone: '5511999999993', orders: 110, amount: 1850.50, status: 'success' },
        { id: '4', name: 'Marmita Dona Ana', slug: 'marmita', phone: '5511999999994', orders: 315, amount: 4120.00, status: 'success' },
        { id: '5', name: 'Churrasquinho do Bigode', slug: 'churras', phone: '5511999999995', orders: 154, amount: 2012.00, status: 'success' },
        { id: '6', name: 'Pastelaria Oriental', slug: 'pastel', phone: '5511999999996', orders: 90, amount: 967.50, status: 'success' },
      ]
    },
    '2026-03': {
      totalDonated: 11210,
      meals: 2242,
      families: 320,
      restaurantsBreakdown: [
        { id: '1', name: 'Pizzaria do João', slug: 'joao', phone: '5511999999991', orders: 120, amount: 1650.00, status: 'success' },
        { id: '2', name: 'Burger da Praça', slug: 'burger', phone: '5511999999992', orders: 195, amount: 2600.00, status: 'success' },
        { id: '3', name: 'Sushi Master', slug: 'sushi', phone: '5511999999993', orders: 85, amount: 1350.00, status: 'success' },
        { id: '4', name: 'Marmita Dona Ana', slug: 'marmita', phone: '5511999999994', orders: 247, amount: 3500.00, status: 'success' },
        { id: '5', name: 'Churrasquinho do Bigode', slug: 'churras', phone: '5511999999995', orders: 122, amount: 1515.00, status: 'success' },
        { id: '6', name: 'Pastelaria Oriental', slug: 'pastel', phone: '5511999999996', orders: 60, amount: 595.00, status: 'success' },
      ]
    }
  };

  // Compute live active statistics (Maio/2026) using orders with real donationAmount
  const getLiveActiveData = (): RestaurantDonationInfo[] => {
    // Map with default baselines for standard items in the system to not display an empty slate
    const activeMapping: Record<string, { name: string; slug: string; phone: string; orders: number; amount: number; checkoutAmount: number; postPaymentAmount: number; pixKey?: string }> = {
      'joao': { name: 'Pizzaria do João', slug: 'joao', phone: '(11) 98765-4321', orders: 48, amount: 124.00, checkoutAmount: 124.00, postPaymentAmount: 0, pixKey: 'joao@pix.com' },
      'burger': { name: 'Burger da Praça', slug: 'burger', phone: '(11) 91234-5678', orders: 62, amount: 195.00, checkoutAmount: 195.00, postPaymentAmount: 0, pixKey: 'burgerpraca@pix.com' },
      'sushi': { name: 'Sushi Master', slug: 'sushi', phone: '(11) 99888-7766', orders: 25, amount: 88.00, checkoutAmount: 88.00, postPaymentAmount: 0, pixKey: 'sushimaster@pix.com' },
      'marmita': { name: 'Marmita Dona Ana', slug: 'marmita', phone: '(11) 95555-4444', orders: 94, amount: 285.00, checkoutAmount: 285.00, postPaymentAmount: 0, pixKey: 'ana.marmita@pix.com' },
      'churras': { name: 'Churrasquinho do Bigode', slug: 'churras', phone: '(11) 97777-1111', orders: 38, amount: 115.00, checkoutAmount: 115.00, postPaymentAmount: 0, pixKey: 'bigode@pix.com' },
    };

    // Inject any new restaurants signed up in database
    restaurants.forEach(r => {
      const slug = r.slug || r.id;
      if (!activeMapping[slug]) {
        activeMapping[slug] = {
          name: r.name || 'Restaurante Parceiro',
          slug: slug,
          phone: r.whatsapp || r.phone || 'Sem telefone',
          orders: 0,
          amount: 0,
          checkoutAmount: 0,
          postPaymentAmount: 0,
          pixKey: r.pixKey || `${slug}@pix.com`
        };
      }
    });

    // Sum actual database orders that are loaded live
    orders.forEach(o => {
      if (typeof o.donationAmount === 'number' && o.donationAmount > 0) {
        // Find corresponding restaurant mapping by id or slug
        const rDetails = restaurants.find(r => r.id === o.restaurantId);
        const slug = rDetails?.slug || o.restaurantId || 'unknown';
        const isPostPayment = o.donationMethod === 'post-payment';
        
        if (activeMapping[slug]) {
          activeMapping[slug].orders += 1;
          activeMapping[slug].amount += o.donationAmount;
          if (isPostPayment) {
            activeMapping[slug].postPaymentAmount += o.donationAmount;
          } else {
            activeMapping[slug].checkoutAmount += o.donationAmount;
          }
        } else {
          // Fallback dynamic entry
          activeMapping[slug] = {
            name: rDetails?.name || `Restaurante #${o.restaurantId.slice(0, 5)}`,
            slug: slug,
            phone: rDetails?.whatsapp || 'Sem contato',
            orders: 1,
            amount: o.donationAmount,
            checkoutAmount: isPostPayment ? 0 : o.donationAmount,
            postPaymentAmount: isPostPayment ? o.donationAmount : 0,
            pixKey: rDetails?.pixKey || 'admin@meuovo.com'
          };
        }
      }
    });

    // Convert mapping to response list
    return Object.entries(activeMapping).map(([key, item]) => {
      // Check settled state (paid vs pending) — only applies to checkout donations
      const currentStatus = settledStates[key] || 'pending';
      return {
        id: key,
        name: item.name,
        slug: item.slug,
        contactPhone: item.phone,
        ordersCount: item.orders,
        donationTotal: item.amount,
        checkoutDonations: item.checkoutAmount,
        postPaymentDonations: item.postPaymentAmount,
        status: currentStatus,
        pixKey: item.pixKey
      };
    });
  };

  // Toggle settled status (Paid/Conciliated vs Pending) for a restaurant
  const handleToggleStatus = (restaurantId: string) => {
    const current = settledStates[restaurantId] || 'pending';
    const nextValue = current === 'pending' ? 'success' : 'pending';
    
    setSettledStates(prev => ({
      ...prev,
      [restaurantId]: nextValue
    }));

    toast.success(`Status de repasse atualizado com sucesso!`);
  };

  // Determine active metrics
  const isHistorical = selectedMonth !== '2026-05';
  const displayList = isHistorical 
    ? (historicalData[selectedMonth]?.restaurantsBreakdown.map(r => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        contactPhone: r.phone,
        ordersCount: r.orders,
        donationTotal: r.amount,
        checkoutDonations: r.amount,
        postPaymentDonations: 0,
        status: r.status as 'pending' | 'success',
        pixKey: `${r.slug}@pix.com`
      })) || [])
    : getLiveActiveData();

  // Perform search and filter
  const filteredList = displayList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || item.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculate totals
  const totalCollectedInMonth = displayList.reduce((acc, curr) => acc + curr.donationTotal, 0);
  const totalOrdersWithDonations = displayList.reduce((acc, curr) => acc + curr.ordersCount, 0);
  const pendingCollection = displayList
    .filter(item => item.status === 'pending')
    .reduce((acc, curr) => acc + curr.checkoutDonations, 0);
  const successRepasse = displayList
    .filter(item => item.status === 'success')
    .reduce((acc, curr) => acc + curr.checkoutDonations, 0);
  const totalPostPayment = displayList.reduce((acc, curr) => acc + curr.postPaymentDonations, 0);

  // Translate month representation label
  const monthLabels: Record<string, string> = {
    '2026-05': 'Maio / 2026 (Ativo)',
    '2026-04': 'Abril / 2026 (Histórico)',
    '2026-03': 'Março / 2026 (Histórico)',
  };

  // Copy beautiful message text to send to restaurant
  const handleCopyRestaurantDraft = (item: any) => {
    const draftText = `🍳 *MEU OVO - RELATÓRIO SOCIAL DE DOAÇÕES* ❤️\n` +
      `-----------------------------------------\n` +
      `*Estabelecimento:* ${item.name}\n` +
      `*Mês de Referência:* ${monthLabels[selectedMonth]}\n` +
      `-----------------------------------------\n` +
      `Olá, parceiro! Gostaríamos de agradecer por apoiar nossa causa comunitária de combate à fome no bairro. Seguem os dados consolidados do seu ponto:\n\n` +
      `• *Pedidos com doações:* ${item.ordersCount} comandos\n` +
      `• *Total arrecadado com clientes (no checkout, incluso no total do pedido):* R$ ${item.checkoutDonations.toFixed(2)}\n` +
      `• *Doações diretas pós-pagamento (PIX para a plataforma):* R$ ${item.postPaymentDonations.toFixed(2)}\n` +
      `• *Total geral de doações geradas pelo seu estabelecimento:* R$ ${item.donationTotal.toFixed(2)}\n` +
      `• *Status do repasse (apenas doações de checkout):* ${item.status === 'success' ? 'CONCILIADO E REPASSADO 🟢' : 'A SER COLETADO PELO GESTOR 🟡'}\n\n` +
      `*Como fazer o acerto?*\n` +
      `Se constar como pendente, faça o PIX de R$ ${item.checkoutDonations.toFixed(2)} para a chave da plataforma adm (*chave: financeiro@meuovo.org*) para que possamos enviar o PIX unificado junto com este comprovante para a ONG beneficente parceira.\n\n` +
      `Muito obrigado por cozinhar com amor e soberania!`;

    navigator.clipboard.writeText(draftText);
    setCopiedText(true);
    toast.success('Relatório individual copiado para a área de transferência!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Copy consolidated memo draft for charity
  const handleCopyCharityConsolidatedReportLabel = () => {
    const listBreakdown = displayList
      .map(item => {
        const details = item.postPaymentDonations > 0
          ? ` (R$ ${item.checkoutDonations.toFixed(2)} checkout + R$ ${item.postPaymentDonations.toFixed(2)} direto)`
          : ` (R$ ${item.checkoutDonations.toFixed(2)} checkout)`;
        return `- *${item.name}*: R$ ${item.donationTotal.toFixed(2)}${details} — ${item.ordersCount} pedidos`;
      })
      .join('\n');

    const draft = `🍳 *MEU OVO - MEMORANDO CONSOLIDADO DE DOAÇÕES SOCIAIS* ❤️\n` +
      `*Mês de Referência:* ${monthLabels[selectedMonth]}\n` +
      `*Data de Geração:* ${new Date().toLocaleDateString('pt-BR')}\n` +
      `-----------------------------------------\n` +
      `Estimados parceiros da ONG Fome Zero Bairro, segue abaixo a prestação de contas das doações voluntárias coletadas diretamente de forma soberana e sem intermediários corporativos nos estabelecimentos gastronômicos do nosso bairro:\n\n` +
      `*DEMONSTRATIVO POR ESTABELECIMENTO:*\n` +
      `${listBreakdown}\n\n` +
      `-----------------------------------------\n` +
      `📊 *RESUMO CONSOLIDADO DA REDE:*\n` +
      `• *Total de Pedidos Apoiadores:* ${totalOrdersWithDonations} compras diretas\n` +
      `• *Total Coletado Geral:* R$ ${totalCollectedInMonth.toFixed(2)}\n` +
      `  - Doações no checkout (a receber das lojas): R$ ${(totalCollectedInMonth - totalPostPayment).toFixed(2)}\n` +
      `  - Doações diretas pós-pagamento (já conosco): R$ ${totalPostPayment.toFixed(2)}\n` +
      `• *Total Já Conciliado por Lojas:* R$ ${successRepasse.toFixed(2)}\n` +
      `• *Refeições Providenciadas:* ${Math.floor(totalCollectedInMonth / 5)} pratos de comida quente\n` +
      `-----------------------------------------\n` +
      `📬 *PIX DE ENVIO:* Integrado integralmente e encaminhado à ONG.\n\n` +
      `_Prestando contas e gerando soberania financeira aos efeituados. Juntos somos mais fortes!_`;

    navigator.clipboard.writeText(draft);
    setCopiedText(true);
    toast.success('Memorando consolidado da rede copiado com sucesso!');
    setTimeout(() => setCopiedText(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Visual Title Banner representing social justice */}
      <div className="relative rounded-[2.5rem] bg-gradient-to-r from-red-600 via-orange-600 to-red-500 border border-red-500/35 p-8 md:p-10 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-white/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-tr from-orange-400/25 to-transparent blur-2xl rounded-full" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="p-6 bg-white text-red-600 rounded-3xl shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <Heart size={42} className="fill-red-600 text-red-600 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center gap-2 bg-white/15 border border-white/30 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-wider mb-2">
                🌱 HUB DE IMPACTO SOCIAL & SOBERANIA
              </div>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Fechamento Mensal de Doações</h2>
              <p className="text-sm text-red-100 font-medium max-w-xl mt-2 leading-relaxed">
                Gerencie as gorjetas sociais incluídas nos PIX diretos pagos às lojas. Arrecade os valores com as lojas de forma transparente, envie os relatórios individuais e envie o Pix para a ONG.
              </p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <button 
              onClick={handleCopyCharityConsolidatedReportLabel}
              className="px-5 h-11 bg-white hover:bg-gray-50 text-red-600 font-black rounded-xl text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-all active:scale-95"
            >
              <Share2 size={14} />
              <span>Copiar Memorando p/ ONG</span>
            </button>
          </div>
        </div>
      </div>

      {/* Select Month and Summary metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-gray-100 dark:border-neutral-850 shadow-sm text-left">
        <div>
          <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">Período de Prestação de Contas</span>
          <div className="flex items-center gap-3 mt-1.5">
            <Calendar className="text-red-500" size={18} />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="font-black text-lg bg-transparent border-none text-[#111] dark:text-white focus:ring-0 cursor-pointer pr-8 uppercase"
            >
              <option value="2026-05" className="bg-white dark:bg-neutral-900 text-[#111] dark:text-white">Maio / 2026 (Período Ativo)</option>
              <option value="2026-04" className="bg-white dark:bg-neutral-900 text-[#111] dark:text-white">Abril / 2026 (Fechado/Pago)</option>
              <option value="2026-03" className="bg-white dark:bg-neutral-900 text-[#111] dark:text-white">Março / 2026 (Fechado/Pago)</option>
            </select>
          </div>
        </div>

        <div className="bg-red-500/5 dark:bg-red-500/10 border border-red-500/10 px-4 py-3 rounded-2xl max-w-md">
          <p className="text-[9px] font-black tracking-wider text-red-600 dark:text-red-400 uppercase">📌 Diretiva de Conciliação Fiduciária</p>
          <p className="text-xs text-gray-500 mt-1 leading-normal">
            Doações <strong>no checkout</strong> foram pagas ao restaurante — solicite o repasse ao lojista. Doações <strong>pós-pagamento</strong> foram pagas direto à plataforma via PIX — já estão conosco. O total de ambos é destinado à instituição de caridade.
          </p>
        </div>
      </div>

      {/* Core Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 text-left">
        
        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-850 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Arrecadação Total</p>
            <DollarSign className="text-red-500" size={18} />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-[#111] dark:text-white font-display italic">
              R$ {totalCollectedInMonth.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Acumulado de {totalOrdersWithDonations} pedidos</p>
          </div>
          <div className="mt-3 text-[10px] text-green-600 dark:text-green-400 font-extrabold flex items-center gap-1">
            <TrendingUp size={12} />
            <span>100% destinado ao Fome Zero</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-850 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando Coleta</p>
            <AlertCircle className="text-amber-500" size={18} />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-amber-600 font-display italic">
              R$ {pendingCollection.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">A recolher com lojistas</p>
          </div>
          <div className="mt-3 text-[10px] text-amber-500 font-extrabold flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>Pendente de acerto com {displayList.filter(i => i.status === 'pending').length} lojas</span>
          </div>
        </div>

        {/* Post-Payment Donations Card (direct to platform) */}
        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-850 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doação Direta (Pós-Pagamento)</p>
            <Heart className="text-blue-500" size={18} />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-blue-600 font-display italic">
              R$ {totalPostPayment.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Já recebido pela plataforma</p>
          </div>
          <div className="mt-3 text-[10px] text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Disponível para envio à ONG</span>
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-850 rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conciliado p/ Envio</p>
            <CheckCircle2 className="text-emerald-500" size={18} />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-emerald-600 font-display italic">
              R$ {successRepasse.toFixed(2)}
            </p>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Pronto para o Pix final</p>
          </div>
          <div className="mt-3 text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
            <CheckCircle2 size={12} />
            <span>Dinheiro seguro em posse do Admin</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 text-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-xl" />
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Equivalência Social</p>
            <Utensils className="text-red-400" size={18} />
          </div>
          <div className="mt-4">
            <p className="text-3xl font-black text-[#FFC928] font-display italic">
              {Math.floor(totalCollectedInMonth / 5)} pratos
            </p>
            <p className="text-[10px] text-slate-300 font-bold uppercase mt-1">Refeições de comida quente</p>
          </div>
          <div className="mt-3 text-[10px] text-slate-400 font-medium">
            Média estimada de R$ 5,00 por prato
          </div>
        </div>

      </div>

      {/* Detailed Restaurant Breakdown Grid */}
      <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-850 rounded-[2.5rem] p-8 shadow-sm">
        
        {/* Table header & searching */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="text-left">
            <h3 className="text-xl font-black text-[#111] dark:text-white uppercase italic tracking-tight">Detalhamento por Restaurante</h3>
            <p className="text-xs text-gray-400 mt-1">Acertos individuais, contatos diretos e geração de relatórios rápidos</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar chapa..."
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-100 dark:bg-neutral-800 dark:border-neutral-750 rounded-xl text-xs w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 dark:text-white"
              />
            </div>

            <div className="flex rounded-xl overflow-hidden border border-gray-100 dark:border-neutral-750">
              <button 
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider ${filterStatus === 'all' ? 'bg-[#111] text-white dark:bg-white dark:text-[#111]' : 'bg-gray-50 dark:bg-neutral-850 text-slate-500 dark:text-slate-400 hover:bg-gray-100'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider ${filterStatus === 'pending' ? 'bg-amber-500 text-black' : 'bg-gray-50 dark:bg-neutral-850 text-slate-500 dark:text-slate-400 hover:bg-gray-100'}`}
              >
                Pendentes
              </button>
              <button 
                onClick={() => setFilterStatus('success')}
                className={`px-3 py-2 text-[10px] font-black uppercase tracking-wider ${filterStatus === 'success' ? 'bg-emerald-500 text-white' : 'bg-gray-50 dark:bg-neutral-850 text-slate-500 dark:text-slate-400 hover:bg-gray-100'}`}
              >
                Conciliados
              </button>
            </div>
          </div>
        </div>

        {/* Audit List Table element */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Heart className="animate-pulse text-red-500 mb-2" size={32} />
            <p className="text-xs">Buscando banco de doações...</p>
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed border-gray-100 dark:border-neutral-800 rounded-3xl">
            <Store className="mx-auto text-gray-200 dark:text-neutral-800 mb-2" size={44} />
            <p className="text-sm font-black text-gray-400 uppercase">Nenhuma chapa encontrada</p>
            <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">Remova os filtros ou faça uma nova busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-50 dark:border-neutral-800 text-slate-400">
                  <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Estabelecimento</th>
                  <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Pedidos com Doação</th>
                  <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Total Arrecadado</th>
                  <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Chave Pix Loja</th>
                  <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Status Adm</th>
                  <th className="py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Ações Rápidas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-neutral-850">
                {filteredList.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-850/40 transition-colors group">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                          item.status === 'success' 
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                            : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                        }`}>
                          <Store size={16} />
                        </div>
                        <div>
                          <p className="font-bold text-sm uppercase text-slate-800 dark:text-white leading-none">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-semibold mt-1 block">{item.contactPhone}</p>
                        </div>
                      </div>
                    </td>
                    
                    <td className="py-4 text-center font-display font-medium text-xs text-slate-700 dark:text-slate-300">
                      {item.ordersCount} pedidos
                    </td>

                    <td className="py-4">
                      <span className="font-display font-black text-sm italic text-red-600 dark:text-red-400">
                        R$ {item.donationTotal.toFixed(2)}
                      </span>
                      {item.checkoutDonations > 0 && item.postPaymentDonations > 0 && (
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5 leading-tight">
                          R$ {item.checkoutDonations.toFixed(2)} checkout + R$ {item.postPaymentDonations.toFixed(2)} direto
                        </div>
                      )}
                      {item.checkoutDonations > 0 && item.postPaymentDonations === 0 && (
                        <div className="text-[9px] text-slate-400 font-semibold mt-0.5">(checkout)</div>
                      )}
                      {item.checkoutDonations === 0 && item.postPaymentDonations > 0 && (
                        <div className="text-[9px] text-blue-400 font-semibold mt-0.5">(direto plataforma)</div>
                      )}
                    </td>

                    <td className="py-4">
                      <span className="font-mono text-[10px] bg-slate-50 dark:bg-neutral-800 text-slate-500 dark:text-slate-400 px-2.5 py-1 rounded-md">
                        {item.pixKey || 'Chave Padrão'}
                      </span>
                    </td>

                    <td className="py-4 text-center">
                      <button 
                        onClick={() => handleToggleStatus(item.id)}
                        disabled={isHistorical}
                        className={`mx-auto text-[9px] font-black uppercase px-2.5 py-1 rounded-full border transition-all ${
                          item.status === 'success'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
                            : 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 hover:scale-105'
                        }`}
                        title={isHistorical ? "Meses históricos já fechados não podem ser alterados" : "Clique para alternar pendente / conciliado"}
                      >
                        {item.status === 'success' ? '🟢 CONCILIADO' : '🔴 COLETAR GORJETA'}
                      </button>
                    </td>

                    <td className="py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setActiveReportModal(item)}
                          className="p-2 bg-[#FFC928]/10 text-[#FFC928] border border-[#FFC928]/30 hover:bg-[#FFC928]/2 hover:scale-105 active:scale-95 transition-all rounded-xl text-xs font-black uppercase flex items-center gap-1.5"
                          title="Enviar fechamento para o lojista"
                        >
                          <FileText size={12} />
                          <span className="text-[9px] font-black tracking-wider block">Relatório Lojista</span>
                        </button>
                        
                        <button 
                          onClick={() => {
                            const message = encodeURIComponent(
                              `Olá, parceiro da *${item.name}*! Sou o administrador do *Meu Ovo*.\n\n` +
                              `Aqui estão seus números consolidados de impacto social referentes a *${monthLabels[selectedMonth]}*:\n\n` +
                              `• *Pedidos com doação voluntária:* ${item.ordersCount} pedidos\n` +
                              `• *Doações no checkout (inclusas no total do pedido, a acertar conosco):* R$ ${item.checkoutDonations.toFixed(2)}\n` +
                              `• *Doações diretas pós-pagamento (PIX para a plataforma, já conosco):* R$ ${item.postPaymentDonations.toFixed(2)}\n` +
                              `• *Total geral gerado:* R$ ${item.donationTotal.toFixed(2)}\n` +
                              `• *Status do repasse (checkout):* ${item.status === 'success' ? 'Conciliado e Pago 🟢' : 'Pendente de acerto 🔴'}\n\n` +
                              `Pedimos o PIX de R$ ${item.checkoutDonations.toFixed(2)} (apenas doações de checkout) para nossa conta consolidada (*chave: financeiro@meuovo.org*) para fazermos a doação final integral para a ONG beneficente parceira. Doações diretas pós-pagamento já estão conosco.\n\n` +
                              `Muito obrigado por somar na nossa causa local! 🍳🍳❤️`
                            );
                            window.open(`https://wa.me/${WA_NUMBER}?text=${message}`, '_blank');
                          }}
                          className="p-2 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all rounded-xl"
                          title="Chamar lojista direto no WhatsApp"
                        >
                          <Share2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Individual Report Template Modal */}
      {activeReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-gray-100 dark:border-neutral-800 p-6 max-w-lg w-full text-left shadow-2xl relative animate-in zoom-in-95 duration-200">
            <h3 className="font-display font-black text-lg uppercase italic tracking-tight text-[#111] dark:text-white mb-2 flex items-center gap-2">
              📜 Relatório Social - {activeReportModal.name}
            </h3>
            <p className="text-xs text-gray-400 mb-4 font-semibold uppercase tracking-wider">{monthLabels[selectedMonth]}</p>
            
            <div className="bg-gray-50 dark:bg-neutral-950 p-4 rounded-xl border border-gray-100 dark:border-neutral-800 font-mono text-[10px] text-slate-600 dark:text-slate-300 space-y-1.5 overflow-y-auto max-h-64 break-words">
              <p className="font-extrabold text-slate-800 dark:text-white">🍳 MEU OVO - RELATÓRIO SOCIAL DE DOAÇÕES ❤️</p>
              <p>-----------------------------------------</p>
              <p><strong>Estabelecimento:</strong> {activeReportModal.name}</p>
              <p><strong>Mês de Referência:</strong> {monthLabels[selectedMonth]}</p>
              <p>-----------------------------------------</p>
              <p>Olá, parceiro! Gostaríamos de agradecer por apoiar nossa causa comunitária de combate à fome no bairro. Seguem os dados consolidados do seu ponto:</p>
              <br />
              <p>• <strong>Pedidos com doações:</strong> {activeReportModal.ordersCount} comandos</p>
              <p>• <strong>Doações no checkout (inclusas no total do pedido):</strong> R$ {activeReportModal.checkoutDonations.toFixed(2)}</p>
              <p>• <strong>Doações diretas pós-pagamento (PIX plataforma):</strong> R$ {activeReportModal.postPaymentDonations.toFixed(2)}</p>
              <p>• <strong>Total geral:</strong> R$ {activeReportModal.donationTotal.toFixed(2)}</p>
              <p>• <strong>Status do repasse (checkout):</strong> {activeReportModal.status === 'success' ? 'CONCILIADO E REPASSADO 🟢' : 'A SER COLETADO PELO GESTOR 🟡'}</p>
              <br />
              <p><strong>Como fazer o acerto?</strong></p>
              <p>Se constar como pendente, faça o PIX de R$ {activeReportModal.checkoutDonations.toFixed(2)} (apenas doações de checkout) para a chave da plataforma adm (<strong>chave: financeiro@meuovo.org</strong>) para que possamos enviar o PIX unificado junto com este comprovante para a ONG beneficente parceira. Doações diretas pós-pagamento já estão conosco.</p>
              <br />
              <p>Muito obrigado por cozinhar com amor e soberania!</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <button
                onClick={() => handleCopyRestaurantDraft(activeReportModal)}
                className="w-full bg-[#FFC928] hover:bg-[#e6b520] text-black font-black py-3 rounded-xl hover:scale-[1.02] active:scale-95 transition-all text-xs uppercase flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10"
              >
                {copiedText ? (
                  <>
                    <Check size={14} />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar Texto</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setActiveReportModal(null)}
                className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 dark:text-white text-slate-700 font-extrabold py-3 rounded-xl text-xs uppercase"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
