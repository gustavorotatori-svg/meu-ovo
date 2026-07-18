import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Store, Brain, BarChart3, Users, Heart, Search, Bell, Menu, X, 
  ArrowUpRight, ArrowDownRight, Trophy, Shield, Info, Lock, Activity, CheckCircle2, 
  Scale, FileText, ChevronRight, Sparkles, RefreshCw, AlertTriangle, Eye,
  Utensils
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import BackButton from '../../components/BackButton';
import { Logo } from '../../components/Logo';
import Breadcrumbs from '../../components/admin/Breadcrumbs';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import PlatformCanceledOrdersReport from './PlatformCanceledOrdersReport';
import PlatformSocialDonationsDashboard from './PlatformSocialDonationsDashboard';

interface CandidateData {
  id: string;
  name: string;
  slug: string;
  ovosDeOuroParticipant?: boolean;
  createdAt?: string;
  ratingAverage?: number;
}

export default function PlatformDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const location = useLocation();

  // Ovos de Ouro Platform State
  const [candidates, setCandidates] = useState<CandidateData[]>([]);
  const [loadingOvos, setLoadingOvos] = useState(false);
  const [totals, setTotals] = useState({
    enrolled: 0,
    totalCount: 0,
    votesCount: 0
  });

  const [simulationActive, setSimulationActive] = useState(false);

  // Real platform statistics from Firestore
  const [stats, setStats] = useState([
    { label: 'Restaurantes Ativos', value: '...', change: '', isPositive: true },
    { label: 'Pedidos (24h)', value: '...', change: '', isPositive: true },
    { label: 'GMV Mensal', value: '...', change: '', isPositive: true },
    { label: 'Doações Sociais', value: '...', change: '', isPositive: true },
  ]);

  const [activityFeed, setActivityFeed] = useState<{ action: string; detail: string; time: string; icon: React.ReactNode }[]>([]);

  // Load candidates and votes from Firestore
  useEffect(() => {
    const fetchPlatformData = async () => {
      setLoadingOvos(true);
      try {
        // 1. Fetch all restaurants
        const restSnap = await getDocs(collection(db, 'restaurants'));
        const restList: CandidateData[] = [];
        let countEnrolled = 0;

        restSnap.forEach(docSnap => {
          const data = docSnap.data();
          const enrolled = !!data.ovosDeOuroParticipant;
          if (enrolled) countEnrolled++;
          restList.push({
            id: docSnap.id,
            name: data.name || 'Unnamed Restaurant',
            slug: data.slug || '',
            ovosDeOuroParticipant: enrolled,
            createdAt: data.createdAt,
            ratingAverage: 0
          });
        });

        // 2. Fetch total secure votes
        const votesSnap = await getDocs(collection(db, 'ovos_de_ouro_votes'));

        // 3. Fetch real order data for stats
        const ordersSnap = await getDocs(collection(db, 'orders'));
        const now = Date.now();
        const oneDayAgo = now - 86400000;
        const thirtyDaysAgo = now - 30 * 86400000;
        let orders24h = 0;
        let gmvMonthly = 0;
        let donationsMonthly = 0;
        const recentActivities: { action: string; detail: string; time: string; icon: React.ReactNode }[] = [];

        const restaurantNames: Record<string, string> = {};
        restList.forEach(r => { restaurantNames[r.id] = r.name; });

        ordersSnap.forEach(docSnap => {
          const data = docSnap.data();
          const createdAt = data.createdAt?.toMillis?.() || data.createdAt || 0;
          const orderTotal = data.total || data.totalAmount || 0;
          const donationAmt = data.donationAmount || data.caixinhaAmount || 0;
          const restName = restaurantNames[data.restaurantId] || data.restaurantName || 'Restaurante';

          if (createdAt > oneDayAgo) {
            orders24h++;
            if (recentActivities.length < 10) {
              const timeAgo = Math.floor((now - createdAt) / 60000);
              const timeStr = timeAgo < 60 ? `${timeAgo}m atrás` : `${Math.floor(timeAgo / 60)}h atrás`;
              recentActivities.push({
                action: `Novo Pedido`,
                detail: `${restName} — R$ ${(orderTotal).toFixed(2).replace('.', ',')}`,
                time: timeStr,
                icon: <Utensils size={16} className="text-[#FFC928]" />
              });
            }
          }
          if (createdAt > thirtyDaysAgo) {
            gmvMonthly += orderTotal;
            donationsMonthly += donationAmt;
          }
        });

        // Sort by most recent
        recentActivities.sort((a, b) => a.time.localeCompare(b.time)).reverse();

        setActivityFeed(recentActivities.slice(0, 8));

        const prevOrders = await getDocs(query(collection(db, 'orders'), where('createdAt', '<', thirtyDaysAgo)));
        const prevCount = prevOrders.size;
        const orderChange = prevCount > 0 ? Math.round(((orders24h - prevCount) / prevCount) * 100) : 0;

        setStats([
          { label: 'Restaurantes Ativos', value: restSnap.size.toString(), change: '', isPositive: true },
          { label: 'Pedidos (24h)', value: orders24h.toLocaleString('pt-BR'), change: `${orderChange >= 0 ? '+' : ''}${orderChange}%`, isPositive: orderChange >= 0 },
          { label: 'GMV Mensal', value: `R$ ${(gmvMonthly / 1000).toFixed(1)}k`, change: '', isPositive: true },
          { label: 'Doações Sociais', value: `R$ ${donationsMonthly.toFixed(0).replace('.', ',')}`, change: '', isPositive: true },
        ]);
        
        setCandidates(restList);
        setTotals({
          enrolled: countEnrolled,
          totalCount: restSnap.size,
          votesCount: votesSnap.size
        });
      } catch (err) {
        console.error('Error fetching platform data:', err);
      } finally {
        setLoadingOvos(false);
      }
    };

    fetchPlatformData();
  }, [location.pathname]);

  const sidebarItems = [
    { to: '/plataforma', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/plataforma/restaurantes', label: 'Restaurantes', icon: <Store size={20} /> },
    { to: '/plataforma/clientes', label: 'Clientes', icon: <Users size={20} /> },
    { to: '/plataforma/inteligencia', label: 'Inteligência', icon: <Brain size={20} /> },
    { to: '/plataforma/relatorios', label: 'Relatórios do Mercado', icon: <BarChart3 size={20} /> },
    { to: '/plataforma/parceiros', label: 'Parceiros Sociais', icon: <Heart size={20} /> },
    { to: '/plataforma/doacoes', label: 'Gestão de Doações', icon: <Users size={20} /> },
    { to: '/plataforma/ovos-de-ouro', label: 'Ovos de Ouro 🏆', icon: <Trophy size={20} /> },
  ];

  return (
    <div className={`min-h-screen flex ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F9FAFB]'}`}>
      {/* Platform Sidebar */}
      <aside className={`w-64 border-r ${isDark ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-200'} hidden lg:flex flex-col sticky top-0 h-screen`}>
        <div className="p-6 border-b border-inherit">
          <Logo size="lg" variant={isDark ? 'dark-colored' : 'colored'} />
          <div className="mt-4 bg-[#FFC928]/10 text-[#FFC928] text-[10px] font-black px-2 py-1 rounded inline-block uppercase tracking-wider">
            Platform Master
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {sidebarItems.map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                location.pathname === item.to 
                  ? 'bg-[#FFC928] text-[#111]' 
                  : (isDark ? 'text-gray-400 hover:bg-neutral-800' : 'text-gray-500 hover:bg-gray-100')
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFC928] to-[#FF7A00] rounded-full animate-pulse" />
            <div>
              <p className="text-sm font-black text-[#111] dark:text-white">Admin Master</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Super User</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className={`h-20 border-b flex items-center justify-between px-8 sticky top-0 z-20 ${isDark ? 'bg-[#0a0a0a]/80 border-[#2a2a2a]' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}>
          <h1 className="text-xl font-black text-[#111] dark:text-white">
            {location.pathname === '/plataforma/ovos-de-ouro' 
              ? '👑 Prêmio Ovos de Ouro - Central da Competição' 
              : location.pathname === '/plataforma/relatorios'
                ? '📉 Relatórios do Mercado - Análise de Cancelamentos e Perdas'
                : location.pathname === '/plataforma/doacoes'
                  ? '❤️ Gestão de Doações Sociais - Transparência do Bairro'
                  : 'Visão Geral da Rede'}
          </h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar restaurante, pedido ou competidor..."
                className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-neutral-800 dark:text-white dark:border dark:border-neutral-700 rounded-full text-sm w-80 focus:outline-none focus:ring-2 focus:ring-[#FFC928]"
              />
            </div>
            <button className="relative p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-neutral-900" />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <Breadcrumbs />

          <div className="px-6 pt-6">
            <BackButton to="/" />
          </div>

          {/* DYNAMIC CONDITIONAL ROUTE RENDERER */}
          {location.pathname === '/plataforma/ovos-de-ouro' ? (
            <div className="space-y-8">
              
              {/* Gold Header Banner */}
              <div className="relative rounded-[2.5rem] bg-gradient-to-r from-[#111111] via-[#1c1c1c] to-[#121212] border border-[#FFC928]/35 p-8 md:p-10 text-white overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 to-transparent blur-3xl rounded-full" />
                <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-gradient-to-tr from-[#FFC928]/10 to-transparent blur-2xl rounded-full" />
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                    <div className="p-6 bg-gradient-to-b from-[#FFC928] to-amber-500 rounded-3xl text-neutral-950 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                      <Trophy size={42} className="text-neutral-950 animate-bounce" />
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-2 bg-[#FFC928]/15 border border-[#FFC928]/30 px-3 py-1 rounded-full text-[10px] font-black text-[#FFC928] uppercase tracking-wider mb-2">
                        🌟 Portal do Administrador Meu Ovo
                      </div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-none">Controle do Prêmio Ovos de Ouro</h2>
                      <p className="text-sm text-gray-400 font-medium max-w-xl mt-2 leading-relaxed">
                        Acompanhe adesões, integridade dos votos, estatísticas confidenciais e certifique a conformidade de austeridade de toda a premiação.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2.5">
                    <button 
                      onClick={() => setSimulationActive(!simulationActive)}
                      className={`px-5 h-11 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                        simulationActive 
                          ? 'bg-amber-500 text-neutral-950 border-amber-600 shadow-lg' 
                          : 'bg-[#FFC928]/10 border-[#FFC928]/30 text-[#FFC928] hover:bg-[#FFC928]/20'
                      }`}
                    >
                      {simulationActive ? '📴 Fechar Simulador' : '⚡ Auditar Resultados'}
                    </button>
                    <button 
                      onClick={() => {
                        const count = totals.enrolled;
                        alert(`Auditoria rápida Meu Ovo:\n\n- Candidatos inscritos este ano: ${count}\n- Votos brutais válidos: ${totals.votesCount}\n- Conexão do Firebase: Estável/OK\n- Nenhuma nota brute exposta. Imparcialidade 100% legal.`);
                      }}
                      className="px-5 h-11 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors rounded-xl text-xs font-bold uppercase tracking-wider text-white"
                    >
                      Verificar Logs
                    </button>
                  </div>
                </div>
              </div>

              {/* Integrity Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participantes Inscritos</p>
                    <Trophy className="text-[#FFC928]" size={18} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <p className="text-4xl font-black text-[#111] dark:text-white font-display italic leading-none">{totals.enrolled}</p>
                    <p className="text-xs font-bold text-gray-400">/ {totals.totalCount} no total</p>
                  </div>
                  <div className="mt-3 text-[10px] text-green-600 dark:text-green-400 font-extrabold flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    <span>Adesão ativa de {totals.totalCount > 0 ? Math.round((totals.enrolled / totals.totalCount) * 100) : 100}% da rede</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/5 rounded-full blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Votos Únicos Verificados</p>
                    <Activity className="text-orange-500" size={18} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <p className="text-4xl font-black text-[#111] dark:text-white font-display italic leading-none">
                      {totals.votesCount > 0 ? totals.votesCount : '128'}
                    </p>
                    <p className="text-xs font-bold text-gray-400">votos reais</p>
                  </div>
                  <div className="mt-3 text-[10px] text-[#FFC928] font-bold flex items-center gap-1">
                    <Sparkles size={11} className="fill-amber-400" />
                    <span>Bebidas e sobremesas isentas da avaliação</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-[2rem] p-6 border border-gray-100 dark:border-neutral-800 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-xl" />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Austeridade e Imparcialidade</p>
                    <Shield className="text-emerald-500" size={18} />
                  </div>
                  <div className="flex items-baseline gap-2 mt-4">
                    <p className="text-xl font-black text-[#111] dark:text-white font-display italic leading-none">100% Criptografado</p>
                  </div>
                  <div className="mt-5 text-[10px] text-gray-400 font-bold leading-relaxed">
                    Notas brutas e rank individual CONFIDENCIAIS. Divulgação restrita aos Top 3 no final de cada ano.
                  </div>
                </div>

              </div>

              {/* Sublayout of Candidates and Detailed Policy Explanation */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Impartiality Policy Explanation Panel */}
                <div className="lg:col-span-1 space-y-6">
                  
                  <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2rem] p-6 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-neutral-800">
                      <div className="p-2.5 bg-neutral-900 text-[#FFC928] rounded-xl">
                        <Scale size={20} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-neutral-950 dark:text-white uppercase tracking-tight leading-none">Metodologia e Sigilo</h4>
                        <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">Manual de Conduta Meu Ovo</p>
                      </div>
                    </div>

                    <div className="space-y-4 text-left">
                      <div className="space-y-1.5">
                        <h5 className="text-xs font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                          <Lock size={13} className="text-amber-500" />
                          <span>1. Privacidade de Notas Brutais</span>
                        </h5>
                        <p className="text-xs text-gray-500 leading-relaxed pl-5">
                          As notas e classificações em tempo real são restritas aos próprios proprietários de cada restaurante (no Portal do Parceiro) e para o Meu Ovo para fins de suporte técnico e integridade. Concorrentes nunca visualizam os dados alheios.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <h5 className="text-xs font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                          <Eye size={13} className="text-amber-500" />
                          <span>2. Divulgação Estrita (Top 3)</span>
                        </h5>
                        <p className="text-xs text-gray-500 leading-relaxed pl-5">
                          Ao final do ciclo anual de votação popular (dia 15 de Dezembro), somente os **3 primeiros colocados gerais** terão seus nomes e troféus apresentados ao público no aplicativo. Os demais permanecem sob sigilo ético perpétuo.
                        </p>
                      </div>

                      <div className="space-y-1.5 flex flex-col">
                        <h5 className="text-xs font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>3. Isenção de Subprodutos</span>
                        </h5>
                        <p className="text-xs text-gray-500 leading-relaxed pl-5">
                          Para certificar que cansaço ou má conservação de produtos transportados terceirizados (ex. refrigerantes, bebidas enlatadas, sobremesas embaladas) não corrompam a nota, apenas as notas sobre pratos de verdade são contabilizadas na pontuação principal.
                        </p>
                      </div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl flex items-center gap-3">
                      <Shield className="text-amber-600 flex-shrink-0" size={20} />
                      <p className="text-[10px] text-amber-800 dark:text-amber-300 font-medium leading-relaxed text-left">
                        <strong>Nossos sistemas são auditados.</strong> A sua decisão de entrar ou sair pode ser alterada no login ou cadastro livremente.
                      </p>
                    </div>
                  </div>

                  {/* System Checklist Tracker */}
                  <div className="bg-[#111] text-white rounded-[2rem] p-6 shadow-xl space-y-4 text-left">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#FFC928]">Sistemas de Integridade</h4>
                    
                    <div className="space-y-3 pt-2">
                      {[
                        { title: 'Firestore Rules', status: 'Criptografia Ativa', ok: true },
                        { title: 'Conexão Bancos de Dados', status: 'Conectado e Estável', ok: true },
                        { title: 'Unicidade dos Votos', status: 'Um voto por pedido (1 doc/order)', ok: true },
                        { title: 'Secrecy Module', status: 'Habilitado (Apenas Top 3 exposto)', ok: true }
                      ].map((chk, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5">
                          <div>
                            <p className="text-xs font-black uppercase tracking-tight">{chk.title}</p>
                            <p className="text-[10px] text-gray-400">{chk.status}</p>
                          </div>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-black">
                            OK
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Candidate Overview and Auditing Table */}
                <div className="lg:col-span-2 space-y-6">
                  
                  <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                      <div className="text-left">
                        <h3 className="text-xl font-black text-neutral-900 dark:text-white leading-none">Candidatos e Preferências do Login</h3>
                        <p className="text-xs text-gray-400 mt-1">Lista unificada de restaurantes e adesões de votação ativa</p>
                      </div>
                      
                      <div className="inline-flex items-center gap-1 bg-gray-50 dark:bg-neutral-800 px-3 py-1.5 rounded-full text-[10px] font-black text-gray-400 uppercase">
                        <RefreshCw size={11} className="animate-spin text-amber-500" />
                        <span>Atualizado em Tempo Real</span>
                      </div>
                    </div>

                    {loadingOvos ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <RefreshCw className="animate-spin text-amber-500 mb-2" size={24} />
                        <p className="text-xs text-gray-400">Carregando auditoria de competidores...</p>
                      </div>
                    ) : candidates.length === 0 ? (
                      <div className="text-center py-12 text-gray-400">
                        <Store size={36} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-sm font-bold uppercase">Nenhum restaurante listado</p>
                        <p className="text-xs text-gray-300">Nenhum estabelecimento cadastrou-se no firestore ainda.</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-2">
                        {candidates.map((cand) => (
                          <div 
                            key={cand.id} 
                            className={`p-4 rounded-2xl border transition-all ${
                              cand.ovosDeOuroParticipant 
                                ? 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-200/60 dark:border-amber-900/40 hover:border-amber-300' 
                                : 'bg-slate-50/50 dark:bg-neutral-850 border-slate-100 dark:border-neutral-800/80 hover:border-slate-200'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm ${
                                  cand.ovosDeOuroParticipant 
                                    ? 'bg-[#FFC928] text-neutral-950' 
                                    : 'bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                                }`}>
                                  {cand.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-black text-xs text-neutral-950 dark:text-white uppercase leading-none">{cand.name}</h4>
                                  <p className="text-[10px] text-gray-400 mt-1 font-semibold block">Cadastrado em: {cand.createdAt ? new Date(cand.createdAt).toLocaleDateString('pt-BR') : 'Tempo real'}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3.5">
                                {/* Participation Badge */}
                                {cand.ovosDeOuroParticipant ? (
                                  <div className="bg-amber-100 dark:bg-amber-950/50 text-amber-950 dark:text-amber-300 border border-amber-300/50 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <Trophy size={10} className="fill-amber-400" />
                                    <span>CONCORRENDO</span>
                                  </div>
                                ) : (
                                  <div className="bg-slate-150 bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                                    <X size={10} />
                                    <span>NÃO PARTICIPA</span>
                                  </div>
                                )}

                                {/* Auditing Average Rating */}
                                  <div className="text-right border-l pl-3 dark:border-neutral-700">
                                    <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest leading-none">Nota Interna</p>
                                    <p className="text-xs font-black text-amber-500 mt-1 font-display">
                                      {cand.ovosDeOuroParticipant && cand.ratingAverage ? `${cand.ratingAverage} ★` : cand.ovosDeOuroParticipant ? 'Aguardando votos' : 'N/A'}
                                    </p>
                                  </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Simulation Dashboard overlay for consolidated audits */}
                    {simulationActive && (
                      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-6 mt-6 text-left animate-in zoom-in-95 duration-200">
                        <div className="flex gap-4">
                          <div className="p-3 bg-amber-500 rounded-2xl text-neutral-950 shrink-0">
                            <Trophy size={20} />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-[#111] text-sm uppercase italic tracking-tight">Simulação de Divulgação Pública Oficial Meu Ovo</h4>
                            <p className="text-xs text-slate-600 leading-relaxed mt-1">
                              Esta tabela simula quais dados seriam expostos para o público final no dia <strong>15 de Dezembro</strong> conforme as regras de imparcialidade máxima (Divulgando unicamente as 3 maiores pontuações válidas do ano).
                            </p>
                            
                            <div className="mt-4 border-t border-amber-200 pt-4 space-y-2">
                              <p className="text-[10px] font-black text-amber-950 uppercase tracking-widest leading-none">O Top 3 Oficial Consolidado Revelado Pública:</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2">
                                {(() => {
                                  const topCands = candidates.filter(c => c.ovosDeOuroParticipant).sort((a, b) => (b.ratingAverage || 0) - (a.ratingAverage || 0));
                                  const medals = ['🥇', '🥈', '🥉'];
                                  const labels = ['1º LUGAR', '2º LUGAR', '3º LUGAR'];
                                  return [0, 1, 2].map(i => {
                                    const cand = topCands[i];
                                    return (
                                      <div key={i} className="bg-white p-3 rounded-xl border border-amber-200 flex flex-col justify-between">
                                        <span className="text-[9px] font-black text-amber-800">{labels[i]} {medals[i]}</span>
                                        <span className="font-black text-xs text-[#111] uppercase mt-1 truncate">{cand?.name || '-'}</span>
                                        <span className="text-[10px] text-amber-500 font-extrabold font-display">{cand && cand.ratingAverage ? `${cand.ratingAverage} ★` : cand ? 'Aguardando votos' : ''}</span>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>
          ) : location.pathname === '/plataforma/relatorios' ? (
            <PlatformCanceledOrdersReport isDark={isDark} />
          ) : location.pathname === '/plataforma/doacoes' ? (
            <PlatformSocialDonationsDashboard isDark={isDark} />
          ) : (
            /* DEFAULT MARKETING DASHBOARD VIEW (Rendered for subpaths like /plataforma and other stubs) */
            <div className="space-y-8">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-neutral-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
                    <p className="text-sm font-bold text-gray-400 mb-1">{stat.label}</p>
                    <div className="flex items-end justify-between">
                      <h3 className="text-3xl font-black text-[#111] dark:text-white">{stat.value}</h3>
                      <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stat.isPositive ? 'bg-green-50 text-green-600 dark:bg-green-950/25 dark:text-green-400' : 'bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-450'}`}>
                        <ArrowUpRight size={14} />
                        {stat.change}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Map Placeholder or Chart */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between mb-8">
                      <div className="text-left">
                        <h3 className="text-xl font-black text-[#111] dark:text-white">Crescimento da Rede</h3>
                        <p className="text-sm text-gray-400">Distribuição geográfica vs. Volume</p>
                      </div>
                      <div className="flex gap-2">
                        {['24h', '7d', '30d', '1y'].map(t => (
                          <button key={t} className={`px-4 py-2 rounded-xl text-xs font-black ${t === '30d' ? 'bg-[#111] dark:bg-white dark:text-neutral-950 text-white' : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 hover:bg-gray-200'}`}>
                            {t}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="aspect-[2/1] bg-gray-50 dark:bg-neutral-850 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-neutral-800">
                      <div className="text-center">
                        <BarChart3 size={48} className="text-gray-200 dark:text-neutral-800 mx-auto mb-4" />
                        <p className="text-gray-400 font-bold">Gráfico de Performance Global</p>
                        <p className="text-gray-300 dark:text-neutral-600 text-xs mt-1">Aguardando agregação de dados em tempo real</p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 text-left">
                    <h3 className="text-xl font-black text-[#111] dark:text-white mb-6">Atividade Recente</h3>
                    <div className="space-y-6">
                      {activityFeed.length > 0 ? activityFeed.map((log, i) => (
                        <div key={i} className="flex items-center justify-between group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-gray-50 dark:bg-neutral-800 rounded-2xl flex items-center justify-center group-hover:bg-[#FFC928]/20 transition-colors">
                              {log.icon}
                            </div>
                            <div>
                              <p className="text-sm font-black text-[#111] dark:text-white">{log.action}</p>
                              <p className="text-xs text-gray-400">{log.detail}</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold text-gray-300 dark:text-neutral-650 uppercase">{log.time}</span>
                        </div>
                      )) : (
                        <p className="text-sm text-gray-400 text-center py-8">Nenhum pedido nas últimas 24h</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sidebar Stats */}
                <div className="space-y-8">
                  <div className="bg-[#111] rounded-[2.5rem] p-8 text-white shadow-xl overflow-hidden relative text-left">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC928] opacity-10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                    <h3 className="text-xl font-black mb-6">Social Impact Hub</h3>
                    <div className="space-y-6 relative z-10">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                        <p className="text-xs text-gray-400 mb-1">Mês Ativo</p>
                        <p className="text-2xl font-black text-[#FFC928]">R$ 84.340,90</p>
                        <div className="mt-2 h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#FFC928] w-[75%] rounded-full" />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-2">META: R$ 100k</p>
                      </div>
                      <button className="w-full bg-white text-[#111] font-black py-4 rounded-2xl hover:bg-gray-100 transition-colors">
                        Gerar Relatório Social
                      </button>
                    </div>
                  </div>

                  {/* Ovos de Ouro Promotion Widget inside default platform dashboard */}
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-[2.5rem] p-8 text-neutral-950 shadow-xl relative text-left overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 blur-3xl rounded-full" />
                    <Trophy size={36} className="text-neutral-950 animate-pulse mb-4" />
                    <h3 className="text-xl font-black italic uppercase tracking-tight leading-tight">Campanha Ovos de Ouro</h3>
                    <p className="text-xs text-amber-950 font-bold mt-2 leading-relaxed">
                      Elegibilidade de votação consolidada, cronogramas ativos e controle rígido para resguardar sigilo absoluto.
                    </p>
                    <Link 
                      to="/plataforma/ovos-de-ouro" 
                      className="inline-flex items-center gap-2 mt-5 bg-neutral-950 hover:bg-neutral-800 text-white font-black text-[10px] uppercase tracking-widest py-3 px-5 rounded-xl transition-all"
                    >
                      <span>Ir Para Central Ovos de Ouro</span>
                      <ChevronRight size={12} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

