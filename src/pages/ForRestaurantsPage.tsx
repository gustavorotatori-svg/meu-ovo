import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap, QrCode, BarChart2, Smartphone, Heart, ShoppingBag } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export default function ForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="pt-20 bg-[#F5F5F5] pb-20">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-[#111] mb-6 leading-tight tracking-tight">
            Para o seu restaurante
          </h1>
          <p className="text-gray-500 text-xl font-medium max-w-3xl mx-auto">
            Tudo que você precisa para vender mais sem pagar comissão.
          </p>
        </div>
      </div>

      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Professional Cardápio Card */}
          <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-2xl shadow-black/5 hover:border-[#FFC928]/30 transition-all group">
            <div className="w-16 h-16 bg-[#F9F9F9] rounded-2xl flex items-center justify-center mb-8 border border-gray-100 shadow-inner group-hover:bg-[#FFC928]/10 transition-colors">
              <ShoppingBag className="text-[#FFC928]" size={32} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-[#111] mb-6 leading-tight">Cardápio digital profissional</h2>
            <p className="text-gray-500 text-lg font-medium mb-10 leading-relaxed">
              Crie seu cardápio online com fotos, descrições, preços e categorias. Atualize na hora, ative promoções e gerencie disponibilidade.
            </p>
            
            <ul className="space-y-4">
              {[
                'Fotos em alta qualidade',
                'Categorias personalizadas',
                'Adicionais e combos',
                'Promoções e destaques'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[#111] font-bold">
                  <CheckCircle className="text-green-500" size={20} />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* WhatsApp Orders Card */}
          <div className="bg-[#111] rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-[#FFC928]/20 transition-colors">
                <Zap className="text-[#FFC928]" size={32} />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-6 leading-tight">Pedidos no WhatsApp</h2>
              <p className="text-gray-400 text-lg font-medium mb-10 leading-relaxed">
                O pedido chega formatado direto no seu WhatsApp. Sem app separado, sem tablet extra, sem treinamento.
              </p>

              {/* Terminal Mockup */}
              <div className="bg-black/40 rounded-2xl p-6 font-mono text-[11px] lg:text-sm border border-white/5 shadow-inner">
                <div className="flex gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-green-500">Pedido pelo Meu Ovo</p>
                  <p className="text-white"><span className="text-gray-500">Cliente:</span> João Silva</p>
                  <p className="text-white"><span className="text-gray-500">Tipo:</span> Delivery</p>
                  <p className="text-white"><span className="text-gray-500">Endereço:</span> Rua X, 123</p>
                  <p className="text-green-400 pt-2">1x Pizza Calabresa - R$49,90</p>
                  <p className="text-green-400">1x Coca-Cola 2L - R$12,00</p>
                  <p className="text-yellow-500 font-bold pt-4">Total: R$67,90</p>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] opacity-5 rounded-full blur-3xl translate-x-20 -translate-y-20" />
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#F9F9F9]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#111]">Simples assim.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">01</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">Cadastre</h3>
              <p className="text-gray-500 text-sm font-medium">Crie sua conta em 2 minutos.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">02</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">Configure</h3>
              <p className="text-gray-500 text-sm font-medium">Adicione seus produtos.</p>
            </div>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">03</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">Venda</h3>
              <p className="text-gray-500 text-sm font-medium">Link pronto e Zero Taxa.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Pare de queimar<br />
            <span className="text-[#FFC928]">sua margem.</span>
          </h2>
          <p className="text-gray-500 text-xl mb-12 font-medium">O Meu Ovo é gratuito ontem, hoje e sempre.</p>
          <Link
            to="/cadastro-restaurante"
            className="inline-flex items-center gap-3 bg-[#FFC928] text-[#111] font-black px-12 py-6 rounded-[2rem] text-xl hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20"
          >
            Começar grátis agora <ArrowRight size={24} />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
