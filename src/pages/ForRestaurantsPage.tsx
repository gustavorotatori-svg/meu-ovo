import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap, QrCode, BarChart2, Smartphone, Heart, ShoppingBag, Trophy, Shield } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

export default function ForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-white">
      <SEO 
        title="Para Restaurantes - Cadastro Grátis"
        description="Crie seu cardápio digital grátis, receba pedidos direto no WhatsApp e venda sem comissão. Junte-se ao Meu Ovo e seja dono do seu negócio."
      />
      <Navbar />

      <div className="relative pt-20 pb-24 overflow-hidden bg-[#0A0A0A] border-b border-white/5 font-sans">
        {/* Glowing ambient background colored lights */}
        <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-amber-500 rounded-full blur-[140px] opacity-[0.25] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-[300px] h-[300px] bg-rose-500 rounded-full blur-[130px] opacity-[0.18] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[240px] h-[240px] bg-emerald-500 rounded-full blur-[120px] opacity-[0.12] pointer-events-none" />

        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-12 md:pt-16 pb-6">
            {/* Left side column: The High Contrast Copy */}
            <div className="lg:col-span-7 space-y-6 text-left">
              {/* Colored tag row */}
              <div className="flex flex-wrap gap-2.5">
                <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#FFC928]/10 text-[#FFC928] border border-[#FFC928]/35 shadow-sm shadow-[#FFC928]/5">
                  ✦ TAXA ZERO DE COMISSÃO
                </span>
                <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  ✦ CARDÁPIO EXCLUSIVO
                </span>
                <span className="px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/30">
                  ✦ PIX DIRETO
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7.5xl font-sans font-black tracking-tighter uppercase italic flex flex-col items-start gap-3 select-none leading-none">
                <span className="inline-block bg-[#111] text-white px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl transform hover:-rotate-1 transition-transform duration-300">
                  Para o seu
                </span>
                <span className="inline-block bg-[#FFC928] text-[#111] px-7 py-3 rounded-2xl shadow-xl shadow-[#FFC928]/10 transform hover:rotate-1 transition-transform duration-300">
                  Restaurante
                </span>
              </h1>

              {/* Bold Black Panel inside Hero for Contrast */}
              <div className="bg-black/80 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden max-w-2xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FFC928] to-orange-500" />
                <p className="text-gray-300 text-lg md:text-xl font-bold leading-relaxed">
                  Tudo que você precisa para <span className="text-[#FFC928] font-black underline decoration-wavy">vender e faturar mais</span>, sem pagar comissões abusivas de aplicativos terceiros. Controle o seu próprio destino.
                </p>
              </div>

              {/* Action Buttons with high color contrast */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/cadastro-restaurante"
                  className="inline-flex justify-center items-center gap-2.5 bg-[#FFC928] hover:bg-[#ffe083] text-[#111] font-black px-8 py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-[#FFC928]/20 group text-center"
                >
                  Começar grátis agora <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
                </Link>

                <a
                  href="#funcionalidades"
                  className="inline-flex justify-center items-center gap-2 border-2 border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-extrabold px-8 py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all text-center"
                >
                  Ver Recursos
                </a>
              </div>
            </div>

            {/* Right side column: Colorful Interactive Bento Mockup of Restaurant Operations */}
            <div className="lg:col-span-5 relative mt-8 lg:mt-0">
              {/* Colorful circular highlight ring */}
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-[#FFC928] via-emerald-400 to-orange-550 opacity-20 blur-lg" />
              
              {/* High Contrast Black Card with colourful live metrics mockups */}
              <div className="relative bg-[#111] border-2 border-white/15 rounded-[2.5rem] p-7 md:p-8 space-y-6 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Painel de Cozinha Ativo</h4>
                      <p className="text-[8px] text-[#FFC928] font-black uppercase tracking-wider">Restaurante Modelo Sabor</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-1 rounded-md border border-emerald-500/30">
                    Sincronizado
                  </span>
                </div>

                {/* Simulated colorful orders list queue */}
                <div className="space-y-3.5">
                  <div className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 transition-all flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-orange-400 bg-orange-950 px-1.5 py-0.5 rounded uppercase">Preparo</span>
                        <span className="text-[10px] font-bold text-gray-300">#2384 &bull; Carlos M.</span>
                      </div>
                      <p className="text-xs text-white font-bold leading-none">1x Parmegiana + Fritas Rústicas</p>
                    </div>
                    <span className="text-xs font-black text-[#FFC928]">R$ 49,90</span>
                  </div>

                  <div className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 transition-all flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded uppercase">Pronto</span>
                        <span className="text-[10px] font-bold text-gray-300">#2383 &bull; Marina S.</span>
                      </div>
                      <p className="text-xs text-white font-bold leading-none">2x Hambúrguer Artesanal Meu Ovo</p>
                    </div>
                    <span className="text-xs font-black text-emerald-400">R$ 78,00</span>
                  </div>
                </div>

                {/* Colorful dynamic profit indicator card nested in black box */}
                <div className="bg-black/50 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Margem Preservada</span>
                    <span className="text-2xl font-black italic text-emerald-400 leading-none">100% Livre de Taxas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Economia Estimada</span>
                    <span className="text-xs font-bold text-white bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl inline-block mt-0.5">
                      + R$ 2.450 /mês
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagonal Slanted Black & Yellow Warning/Banner Tape style ribbon at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#FFC928] overflow-hidden -skew-y-1 flex items-center shadow-lg pointer-events-none select-none">
          <div className="flex whitespace-nowrap gap-12 font-black uppercase text-[10px] tracking-widest text-[#111] animate-marquee py-2 justify-center w-full">
            <span>🚀 COMISSÕES ABUSIVAS NUNCA MAIS &bull;</span>
            <span>📍 PIX DIRETO DO CLIENTE &bull;</span>
            <span>📱 PEDIDOS FORMATADOS NO WHATSAPP &bull;</span>
            <span>🏆 PARTICIPE DO PRÊMIO OVOS DE OURO &bull;</span>
            <span className="hidden sm:inline">🌟 PLATAFORMA 100% GRATUITA Ontem, Hoje e Sempre &bull;</span>
            <span className="hidden md:inline">🚀 COMA COMIDA DE VERDADE &bull;</span>
          </div>
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

      {/* Transparência de Notas Section */}
      <section className="py-20 bg-white border-t border-gray-100/80">
        <div className="max-w-5xl mx-auto px-6">
          <div className="bg-[#111] text-white rounded-[3rem] p-8 md:p-14 relative overflow-hidden shadow-2xl border-2 border-white/10">
            {/* Ambient gradients */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500 rounded-full blur-[120px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#FFC928] rounded-full blur-[100px] opacity-[0.08] pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 bg-[#FFC928]/10 border border-[#FFC928]/35 px-3.5 py-1.5 rounded-full text-[9px] font-black text-[#FFC928] uppercase tracking-widest leading-none">
                  ⭐ TRANSPARÊNCIA RADICAL
                </div>
                <h3 className="text-3xl md:text-5xl font-sans font-black italic uppercase tracking-tighter text-white leading-none">
                  A sua qualidade é <span className="text-[#FFC928]">pública e valorizada</span>
                </h3>
                <p className="text-gray-300 text-sm md:text-base font-medium leading-relaxed">
                  No Meu Ovo, <strong className="text-white">as notas avaliadas pelos clientes finais são 100% visíveis</strong> para todos os usuários da plataforma. Os clientes avaliam e o resultado fica estampado em destaque na busca e no seu perfil, coroando quem faz comida de verdade e garantindo que o bom trabalho gere mais vendas espontâneas.
                </p>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Diferencial Exclusivo:</p>
                  <p className="text-[12px] text-[#FFC928] font-semibold leading-relaxed">
                    Diferente de aplicativos tradicionais que manipulam a visibilidade ou escondem avaliações por conta de planos pagos, nós priorizamos a transparência. A boa nota do seu restaurante é o seu maior ativo visível para novos clientes!
                  </p>
                </div>
              </div>

              {/* Live mockup of rating widget card */}
              <div className="lg:col-span-5 bg-black/50 border-2 border-white/10 rounded-3xl p-6 space-y-4 shadow-xl w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FFC928] text-black font-black text-xs rounded-xl flex items-center justify-center">
                    🍳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Restaurante Sabor de Casa</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">Meu Ovo Categoria Ouros</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center space-y-1.5">
                  <span className="text-[8px] font-black text-[#FFC928] uppercase tracking-widest block">Nota Média de Clientes</span>
                  <div className="text-5xl font-sans font-black italic text-white leading-none flex items-center justify-center gap-1">
                    4.9 <span className="text-2xl text-[#FFC928] not-italic">★</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400 block pb-1">Baseado em mais de 140 pedidos finalizados</span>
                  <div className="inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase px-2.5 py-1 rounded-lg">
                    ✔ Nota 100% Visível na Busca
                  </div>
                </div>
              </div>
            </div>
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

      {/* Ovos de Ouro Competition For Restaurants */}
      <section className="py-24 bg-white border-t border-gray-100 text-left">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <div className="md:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#FFC928]/10 border border-[#FFC928]/30 px-3 py-1 rounded-full text-[10px] font-black text-amber-600 uppercase tracking-wider leading-none">
                🏆 Ovos de Ouro {new Date().getFullYear()}
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#111] leading-none uppercase italic tracking-tighter">
                Sua comida em destaque,<br />
                <span className="text-[#FFC928]">sem vulnerabilidade.</span>
              </h2>
              <p className="text-gray-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                Nós criamos uma competição justa. Ative sua participação no painel ou login e deixe seus clientes votarem. Suas avaliações são completamente privadas e criptografadas, para que você possa avaliar seu desempenho amigavelmente. No final do ano, revelaremos unicamente as 3 maiores notas de SP, resguardando o sigilo de todos os demais.
              </p>
            </div>
            <div className="md:col-span-1 bg-gradient-to-br from-[#111] to-[#1e1e1e] rounded-[2rem] p-6 text-white border border-[#FFC928]/20 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-[#FFC928]" size={20} />
                <h4 className="font-extrabold text-[#FFC928] uppercase tracking-wide text-[11px]">Compromisso Meu Ovo</h4>
              </div>
              <ul className="space-y-3.5 text-xs text-gray-300 font-semibold list-inside list-disc">
                <li>Imparcialidade e rigor antifraude</li>
                <li>Filtro apenas na comida de verdade</li>
                <li>Apenas Top 3 vira público</li>
                <li>Termos de total sigilo ético</li>
              </ul>
              <Link 
                to="/ovos-de-ouro" 
                className="block text-center bg-[#FFC928] hover:bg-[#e6b520] text-black font-black text-[10px] uppercase tracking-widest py-3 px-4 rounded-xl transition-all"
              >
                Conhecer a Competição
              </Link>
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
