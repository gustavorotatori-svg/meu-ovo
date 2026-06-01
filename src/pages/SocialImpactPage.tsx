import { Heart, CheckCircle, TrendingUp, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

import { useTheme } from '../context/ThemeContext';

export default function SocialImpactPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const totalDonated = 12430;
  const mealsServed = 2486;
  const families = 348;

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <Navbar />

      {/* Hero Header Banner */}
      <div className="pt-20 bg-[#FFC928]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:divide-x-2 md:divide-black/10">
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">500+</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Restaurantes ativos</div>
            </div>
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">R$ 0</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Taxa por pedido</div>
            </div>
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">3 cliques</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Para fazer um pedido</div>
            </div>
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">100%</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Gratuito para sempre</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <div className="space-y-8">
            <span className="inline-block bg-red-100 text-red-600 text-[10px] font-black px-4 py-1.5 rounded-lg uppercase tracking-widest">
              Impacto Social
            </span>
            <h1 className={`text-5xl md:text-7xl font-black leading-[1.1] tracking-tight transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
              Comida de verdade<br />
              <span className="text-[#FF7A00]">também faz o bem.</span>
            </h1>
            <p className={`text-xl font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No checkout, o cliente pode escolher doar uma refeição para pessoas em situação de vulnerabilidade. As doações serão direcionadas a um projeto social parceiro na cidade de São Paulo.
            </p>

            <div className={`rounded-3xl p-8 border mt-12 relative overflow-hidden group transition-all ${
              isDark ? 'bg-[#0a0a0a] border-white/5 shadow-2xl' : 'bg-[#F9F9F9] border-gray-100 shadow-xl shadow-black/5'
            }`}>
              <div className="flex items-start gap-6 relative z-10">
                <div className="w-16 h-16 bg-[#FFC928] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FFC928]/20 group-hover:scale-110 transition-transform">
                  <Heart className="text-black" size={32} />
                </div>
                <div>
                  <h3 className={`text-xl font-black mb-2 uppercase italic tracking-tight transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>Cozinha Solidária SP</h3>
                  <p className="text-[#FF7A00] text-sm font-bold uppercase mb-4 tracking-tighter italic">Parceiro atual do mês</p>
                  <p className={`text-sm font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    100% das doações são repassadas diretamente para a instituição parceira. Transparência total.
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC928] opacity-5 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
            </div>

            <button className={`font-black px-10 py-5 rounded-3xl text-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mt-8 shadow-xl ${
              isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-[#111] text-white hover:bg-black/90'
            }`}>
              Quero apoiar essa causa <ArrowRight size={24} />
            </button>
          </div>

          <div className={`rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden transition-all ${
            isDark ? 'bg-[#0a0a0a] border border-white/5' : 'bg-[#111]'
          }`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] opacity-5 rounded-full blur-3xl translate-x-20 -translate-y-20" />
            
            <h2 className="text-3xl font-black mb-12 text-[#FFC928] italic uppercase tracking-tighter">Impacto real em números</h2>
            
            <div className="space-y-10">
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-sm lg:text-base uppercase tracking-tight">Total arrecadado em 2025</span>
                <span className="text-2xl lg:text-4xl font-black text-[#FFC928]">R$ {totalDonated.toLocaleString('pt-BR')},00</span>
              </div>
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-sm lg:text-base uppercase tracking-tight">Refeições doadas</span>
                <span className="text-2xl lg:text-4xl font-black text-[#FFC928]">{mealsServed.toLocaleString('pt-BR')}</span>
              </div>
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-sm lg:text-base uppercase tracking-tight">Famílias beneficiadas</span>
                <span className="text-2xl lg:text-4xl font-black text-[#FFC928]">{families}</span>
              </div>
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-sm lg:text-base uppercase tracking-tight">Cidades atendidas</span>
                <span className="text-2xl lg:text-4xl font-black text-[#FFC928]">3</span>
              </div>
            </div>

            <p className="mt-12 text-gray-500 text-xs font-bold uppercase tracking-widest italic">
              * Dados simulados para demonstração
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
