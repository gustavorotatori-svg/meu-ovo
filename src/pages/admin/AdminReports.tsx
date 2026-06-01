import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import { Calendar, Download, TrendingUp, TrendingDown, DollarSign, ShoppingBag, Users, Clock } from 'lucide-react';
import AdminLayout from './AdminLayout';

const data = [
  { name: 'Seg', orders: 120, revenue: 4500 },
  { name: 'Ter', orders: 132, revenue: 5200 },
  { name: 'Qua', orders: 101, revenue: 3800 },
  { name: 'Qui', orders: 134, revenue: 6100 },
  { name: 'Sex', orders: 290, revenue: 12400 },
  { name: 'Sab', orders: 320, revenue: 15600 },
  { name: 'Dom', orders: 210, revenue: 9800 },
];

const channelData = [
  { name: 'WhatsApp', value: 45, color: '#25D366' },
  { name: 'Meu Ovo Market', value: 30, color: '#FFC928' },
  { name: 'Mesa (QR Code)', value: 25, color: '#111111' },
];

export default function AdminReports() {
  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-black text-2xl text-[#111]">Relatórios & Inteligência</h2>
          <p className="text-gray-500">Acompanhe seu desempenho e tome decisões baseadas em dados.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-[#111] font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-gray-50 transition-colors">
            <Calendar size={18} />
            Últimos 7 dias
          </button>
          <button className="bg-[#111111] text-white font-black px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#222] transition-colors shadow-sm">
            <Download size={18} />
            Exportar
          </button>
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Faturamento', value: 'R$ 57.400', grow: '+12.5%', isUp: true, icon: <DollarSign size={20} className="text-green-500" /> },
          { label: 'Total Pedidos', value: '1.307', grow: '+8.2%', isUp: true, icon: <ShoppingBag size={20} className="text-blue-500" /> },
          { label: 'Ticket Médio', value: 'R$ 43,91', grow: '-2.1%', isUp: false, icon: <TrendingUp size={20} className="text-purple-500" /> },
          { label: 'Novos Clientes', value: '412', grow: '+24%', isUp: true, icon: <Users size={20} className="text-orange-500" /> },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-[#F5F5F5] rounded-xl flex items-center justify-center">
                {stat.icon}
              </div>
              <div className={`flex items-center gap-1 text-xs font-bold ${stat.isUp ? 'text-green-500' : 'text-red-500'}`}>
                {stat.isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {stat.grow}
              </div>
            </div>
            <div className="text-2xl font-black text-[#111]">{stat.value}</div>
            <div className="text-gray-400 text-xs font-medium uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-[#111]">Faturamento Diário</h3>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-[#FFC928] rounded-full" />
                <span className="text-xs text-gray-500 font-medium">Esta semana</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-200 rounded-full" />
                <span className="text-xs text-gray-500 font-medium">Semana anterior</span>
              </div>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FFC928" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#FFC928" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9CA3AF' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#FFC928" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Origin pie chart */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#111] mb-6">Origem dos Pedidos</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-3 mt-4">
            {channelData.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-black text-[#111]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-black text-[#111] mb-6">Top 5 Produtos</h3>
          <div className="space-y-4">
            {[
              { name: 'Pizza Calabresa', sales: 342, revenue: 'R$ 17.065', progress: 100 },
              { name: 'Pizza Portuguesa', sales: 289, revenue: 'R$ 14.421', progress: 85 },
              { name: 'Pizza Margherita', sales: 215, revenue: 'R$ 10.728', progress: 65 },
              { name: 'Coca-Cola 2L', sales: 187, revenue: 'R$ 2.431', progress: 55 },
              { name: 'Brotinho Chocolate', sales: 154, revenue: 'R$ 4.604', progress: 45 },
            ].map((p, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <span className="text-sm font-bold text-[#111]">{p.name}</span>
                    <span className="text-xs text-gray-400 block">{p.sales} vendas</span>
                  </div>
                  <span className="text-sm font-black text-[#FFC928]">{p.revenue}</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#FFC928] rounded-full transition-all duration-1000" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap / Peak hours teaser */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-[#111]">Horários de Pico</h3>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock size={12} />
              Último mês
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center opacity-40">
            <TrendingUp size={48} className="text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">Mapeamento de demanda por hora<br />será habilitado após 500 pedidos.</p>
            <div className="mt-4 bg-[#FFC928]/10 text-[#FFC928] font-black px-4 py-2 rounded-full text-xs animate-pulse">
              52% COMPLETADO
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
