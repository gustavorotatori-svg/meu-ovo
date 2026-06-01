import { Link } from 'react-router-dom';
import { LayoutDashboard, Store, Brain, BarChart3, Users, Heart, Search, Bell, Menu, X, ArrowUpRight, ArrowDownRight, MoreHorizontal } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../../components/Logo';
import Breadcrumbs from '../../components/admin/Breadcrumbs';

export default function PlatformDashboard() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const stats = [
    { label: 'Restaurantes Ativos', value: '1.284', change: '+12%', isPositive: true },
    { label: 'Pedidos (24h)', value: '18.492', change: '+8%', isPositive: true },
    { label: 'GMV Mensal', value: 'R$ 4.2M', change: '+15%', isPositive: true },
    { label: 'Doações Sociais', value: 'R$ 84.300', change: '+22%', isPositive: true },
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
          {[
            { to: '/plataforma', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
            { to: '/plataforma/restaurantes', label: 'Restaurantes', icon: <Store size={20} /> },
            { to: '/plataforma/inteligencia', label: 'Inteligência', icon: <Brain size={20} /> },
            { to: '/plataforma/relatorios', label: 'Relatórios do Mercado', icon: <BarChart3 size={20} /> },
            { to: '/plataforma/parceiros', label: 'Parceiros Social', icon: <Heart size={20} /> },
            { to: '/plataforma/doacoes', label: 'Gestão de Doações', icon: <Users size={20} /> },
          ].map(item => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${location.pathname === item.to ? 'bg-[#FFC928] text-[#111]' : 'text-gray-500 hover:bg-gray-100'}`}
            >
              {item.icon}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-inherit">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#FFC928] to-[#FF7A00] rounded-full" />
            <div>
              <p className="text-sm font-black text-[#111]">Admin Master</p>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Super User</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <header className={`h-20 border-b flex items-center justify-between px-8 sticky top-0 z-20 ${isDark ? 'bg-[#0a0a0a]/80 border-[#2a2a2a]' : 'bg-white/80 border-gray-200'} backdrop-blur-md`}>
          <h1 className="text-xl font-black text-[#111]">Visão Geral da Rede</h1>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar restaurante, pedido ou parceiro..."
                className="pl-10 pr-4 py-2 bg-gray-100 rounded-full text-sm w-80 focus:outline-none focus:ring-2 focus:ring-[#FFC928]"
              />
            </div>
            <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-full">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto">
          <Breadcrumbs />
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat, i) => (
              <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                <p className="text-sm font-bold text-gray-400 mb-1">{stat.label}</p>
                <div className="flex items-end justify-between">
                  <h3 className="text-3xl font-black text-[#111]">{stat.value}</h3>
                  <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${stat.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                    {stat.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {stat.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Map Placeholder or Chart */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-xl font-black text-[#111]">Crescimento da Rede</h3>
                    <p className="text-sm text-gray-400">Distribuição geográfica vs. Volume</p>
                  </div>
                  <div className="flex gap-2">
                    {['24h', '7d', '30d', '1y'].map(t => (
                      <button key={t} className={`px-4 py-2 rounded-xl text-xs font-black ${t === '30d' ? 'bg-[#111] text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="aspect-[2/1] bg-gray-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-gray-200">
                  <div className="text-center">
                    <BarChart3 size={48} className="text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-400 font-bold">Gráfico de Performance Global</p>
                    <p className="text-gray-300 text-xs">Aguardando agregação de dados em tempo real</p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-[#111] mb-6">Atividade Recente</h3>
                <div className="space-y-6">
                  {[
                    { action: 'Nova Doação', detail: 'Cliente de Pizzaria do João doou R$ 15', time: '2m ago', icon: <Heart size={16} className="text-red-500" /> },
                    { action: 'Novo Onboarding', detail: 'Sushi Master acaba de ser aprovado', time: '14m ago', icon: <Store size={16} className="text-blue-500" /> },
                    { action: 'Alto Volume', detail: 'Burger da Praça superou 100 pedidos hoje', time: '1h ago', icon: <TrendingUp size={16} className="text-green-500" /> },
                    { action: 'Inconsistência', detail: 'Atraso detectado em Delivery na Zona Sul', time: '3h ago', icon: <AlertCircle size={16} className="text-orange-500" /> },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center group-hover:bg-[#FFC928]/20 transition-colors">
                          {log.icon}
                        </div>
                        <div>
                          <p className="text-sm font-black text-[#111]">{log.action}</p>
                          <p className="text-xs text-gray-400">{log.detail}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 uppercase">{log.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-8">
              <div className="bg-[#111] rounded-[2.5rem] p-8 text-white shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC928] opacity-10 blur-3xl rounded-full translate-x-10 -translate-y-10" />
                <h3 className="text-xl font-black mb-6">Social Impact Hub</h3>
                <div className="space-y-6 relative z-10">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                    <p className="text-xs text-gray-400 mb-1">Mês Atual</p>
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

              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-black text-[#111] mb-6">Restaurantes On-Air</h3>
                <div className="space-y-4">
                  {[
                    { name: 'Pizzaria do João', status: 'Active', health: '88%' },
                    { name: 'Burger da Praça', status: 'Busy', health: '94%' },
                    { name: 'Marmita Dona Ana', status: 'Active', health: '72%' },
                    { name: 'Sushi Zen', status: 'Offline', health: '0%' },
                  ].map((res, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/50">
                      <div>
                        <p className="text-sm font-bold text-[#111]">{res.name}</p>
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-tight">{res.status}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-[#FFC928]">{res.health}</p>
                        <div className="w-12 h-1 bg-gray-200 rounded-full mt-1">
                          <div className={`h-full rounded-full ${Number(res.health.replace('%','')) > 80 ? 'bg-green-400' : 'bg-red-400'}`} style={{ width: res.health }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="w-full text-center text-sm font-bold text-gray-400 pt-2 hover:text-[#111] transition-colors">
                    Ver todos os 1.284 nodes
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Minimal icons used but not imported
const TrendingUp = ({ size, className }: any) => <BarChart3 size={size} className={className} />;
const AlertCircle = ({ size, className }: any) => <Users size={size} className={className} />;
