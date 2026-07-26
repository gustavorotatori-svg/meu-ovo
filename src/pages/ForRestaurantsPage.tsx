import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap, QrCode, BarChart2, Smartphone, Heart, ShoppingBag, Trophy, Shield, Star, CheckCircle2, Sticker } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import ScrollReveal from '../components/ScrollReveal';

export default function ForRestaurantsPage() {
  return (
    <div className="min-h-screen bg-white for-restaurants-page">
      <SEO 
        title="Para Restaurantes - Cadastro Grátis"
        description="Crie seu cardápio digital grátis, receba pedidos direto no WhatsApp e venda sem comissão. Junte-se ao Meu Ovo e seja dono do seu negócio."
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

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
            <ScrollReveal direction="up" delay={0} className="lg:col-span-7 space-y-6 text-left">
              {/* Colored tag row */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-[#FFC928] via-yellow-200 to-[#FFC928] bg-clip-text text-transparent animate-gradient-shift inline-flex items-center gap-1">
                  <span className="text-[#FFC928]">✦</span> VOCÊ AVALIA O CLIENTE
                  <span className="hidden sm:inline text-[#FFC928]/30">•</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent animate-gradient-shift inline-flex items-center gap-1">
                  <span className="text-emerald-400">✦</span> TAXA ZERO
                  <span className="hidden sm:inline text-emerald-400/30">•</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 bg-clip-text text-transparent animate-gradient-shift inline-flex items-center gap-1">
                  <span className="text-orange-400">✦</span> PIX DIRETO
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7.5xl font-sans font-black tracking-tighter uppercase italic flex flex-col items-start gap-3 select-none leading-none">
                <span className="inline-block bg-[#FFC928] text-[#111] px-7 py-3 rounded-2xl shadow-xl shadow-[#FFC928]/10 transform hover:rotate-1 transition-transform duration-300">
                  O Restaurante
                </span>
                <span className="inline-block bg-[#111] text-white px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl transform hover:-rotate-1 transition-transform duration-300">
                  é o Astro
                </span>
              </h1>

              {/* Bold Black Panel inside Hero for Contrast */}
              <div className="bg-black/80 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden max-w-2xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FFC928] to-orange-500" />
                <p className="text-gray-300 text-lg md:text-xl font-bold leading-relaxed">
                  Cansado de ser escravo da nota? <span className="text-[#FFC928] font-black">Aqui o restaurante avalia o cliente</span>, não o contrário. Você vê a reputação de quem pede e decide se aceita. Sem comissão, sem refém de avaliação pública, sem algoritmo que te suga.
                </p>
              </div>

              {/* Action Buttons with high color contrast */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/cadastro"
                  className="inline-flex justify-center items-center gap-2.5 bg-[#FFC928] hover:bg-[#ffe083] text-[#111] font-black px-8 py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-[#FFC928]/20 group text-center"
                >
                  Seja dono do seu destino <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
                </Link>

                <a
                  href="#revolucao"
                  className="inline-flex justify-center items-center gap-2 border-2 border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-extrabold px-8 py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all text-center"
                >
                  Entender a Revolução
                </a>
              </div>
            </ScrollReveal>

            {/* Right side column: Colorful Interactive Bento Mockup of Restaurant Operations */}
            <ScrollReveal direction="left" delay={150} className="lg:col-span-5 relative mt-8 lg:mt-0">
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
            </ScrollReveal>
          </div>
        </div>

        {/* Diagonal Slanted Black & Yellow Warning/Banner Tape style ribbon at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#FFC928] overflow-hidden -skew-y-1 flex items-center shadow-lg pointer-events-none select-none">
          <div className="flex whitespace-nowrap gap-12 font-black uppercase text-[10px] tracking-widest text-[#111] animate-marquee py-2 justify-center w-full">
            <span>🔥 VOCÊ AVALIA O CLIENTE, NÃO O CONTRÁRIO &bull;</span>
            <span>📍 PIX DIRETO DO CLIENTE &bull;</span>
            <span>📱 PEDIDOS FORMATADOS NO WHATSAPP &bull;</span>
            <span>🏆 PRÊMIO OVOS DE OURO — NOTA PRIVADA &bull;</span>
            <span className="hidden sm:inline">⭐ RESTAURANTE É O ASTRO, NÃO ESCRAVO DE APP &bull;</span>
            <span className="hidden md:inline">🚀 TAXA ZERO ONTEM, HOJE E SEMPRE &bull;</span>
          </div>
        </div>
      </div>

      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Professional Cardápio Card */}
          <ScrollReveal direction="up" delay={0}>
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
                'Adicionais e extras',
                'Promoções e destaques'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[#111] font-bold">
                  <CheckCircle className="text-green-500" size={20} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          </ScrollReveal>

          {/* WhatsApp Orders Card */}
          <ScrollReveal direction="up" delay={100}>
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
                  <p className="text-green-500">Pedido pelo Meu OVO</p>
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
          </ScrollReveal>

          {/* Etiquetas Inteligentes Card */}
          <ScrollReveal direction="up" delay={200}>
          <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-2xl shadow-black/5 hover:border-[#FFC928]/30 transition-all group">
            <div className="w-16 h-16 bg-[#F9F9F9] rounded-2xl flex items-center justify-center mb-8 border border-gray-100 shadow-inner group-hover:bg-[#FFC928]/10 transition-colors">
              <Sticker className="text-[#FFC928]" size={32} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-[#111] mb-6 leading-tight">Etiquetas Inteligentes</h2>
            <p className="text-gray-500 text-lg font-medium mb-10 leading-relaxed">
              Gere etiquetas automáticas com validade, lote e alérgenos. Imprima e cole — ideal para a RDC 727/2025.
            </p>

            {/* Label Visual Mockup — like the terminal mockup above */}
            <div className="bg-[#111] rounded-2xl p-6 border border-white/10 shadow-inner mb-8">
              <div className="flex gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-black max-w-xs mx-auto font-mono text-[10px] leading-tight shadow-lg">
                <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700">Restaurante Sabor</p>
                </div>
                <p className="text-center text-sm font-black uppercase tracking-tight text-black mb-3">Bolo de Cenoura</p>
                <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Preparo</span>
                    <span className="font-bold text-black">20/07/2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Validade</span>
                    <span className="font-bold text-black">27/07/2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Lote</span>
                    <span className="font-bold text-black">#LOT-0001</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2 mt-2">
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">Alérgenos</p>
                  <div className="flex gap-2 text-[11px]">
                    <span>🥚 Glúten</span>
                    <span>🥛 Leite</span>
                    <span>🌾 Ovos</span>
                  </div>
                </div>
                <p className="text-center text-[9px] font-bold text-gray-600 border-t border-dashed border-gray-300 pt-2 mt-2">Conservar em geladeira</p>
                <p className="text-center text-[7px] text-gray-400 uppercase tracking-wider border-t border-dashed border-gray-300 pt-2 mt-2">Gerado por Meu OVO</p>
              </div>
            </div>

            <ul className="space-y-4">
              {[
                'Validade calculada automaticamente',
                'Alérgenos e ícones nos rótulos',
                'Impressão direta do painel',
                'Histórico completo de etiquetas'
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[#111] font-bold">
                  <CheckCircle className="text-green-500" size={20} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Transparência de Notas Section */}
      <section id="revolucao" className="py-20 bg-white border-t border-gray-100/80">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal direction="up" delay={0}>
          <div className="bg-[#111] text-white rounded-[3rem] p-8 md:p-14 relative overflow-hidden shadow-2xl border-2 border-white/10">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500 rounded-full blur-[120px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#FFC928] rounded-full blur-[100px] opacity-[0.08] pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest leading-none relative">
                  <span className="relative z-10 bg-gradient-to-r from-[#FFC928] via-yellow-200 to-[#FFC928] bg-clip-text text-transparent animate-gradient-shift">⭐ REVOLUÇÃO DO RESTAURANTE</span>
                  <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FFC928]/60 via-yellow-300/40 to-[#FFC928]/60 animate-gradient-shift rounded-full" />
                </div>
                <h3 className="text-3xl md:text-5xl font-sans font-black italic uppercase tracking-tighter text-white leading-none">
                  Aqui quem avalia<br />é <span className="text-[#FFC928]">você</span>
                </h3>
                <p className="text-gray-300 text-sm md:text-base font-medium leading-relaxed">
                  No Meu Ovo, <strong className="text-white">o restaurante dá a nota no cliente</strong>. No momento do pedido, você vê a reputação do cliente e decide se aceita ou não. Cliente difícil fica com nota baixa e você não precisa mais ser refém de avaliações públicas injustas. O restaurante é o grande astro — o cliente é bem-vindo, mas também é avaliado.
                </p>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Diferença Revolucionária:</p>
                  <p className="text-[12px] text-[#FFC928] font-semibold leading-relaxed">
                    Nos outros apps, o restaurante é escravo da nota — qualquer cliente dá nota e o restaurante se fode. Aqui é o contrário: você avalia o cliente e decide quem merece seu prato. Sua cozinha, suas regras.
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5 bg-black/50 border-2 border-white/10 rounded-3xl p-6 space-y-4 shadow-xl w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FFC928] text-black font-black text-xs rounded-xl flex items-center justify-center">
                    🍳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Cliente João Silva</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">15 pedidos realizados</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center space-y-1.5">
                  <span className="text-[8px] font-black text-[#FFC928] uppercase tracking-widest block">Nota do Cliente (dada por você)</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-black text-5xl text-white">4.8</span>
                    <div className="flex items-center">
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold">Visível para você no ato do pedido — aceite ou recuse</p>
                </div>

                <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                  <CheckCircle2 size={10} />
                  <span>✔ Você decide quem merece seu prato</span>
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-24 bg-[#F9F9F9]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#111]">Simples assim.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal direction="up" delay={0}>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">01</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">Cadastre</h3>
              <p className="text-gray-500 text-sm font-medium">Crie sua conta em 2 minutos.</p>
            </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={100}>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">02</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">Configure</h3>
              <p className="text-gray-500 text-sm font-medium">Adicione seus produtos.</p>
            </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={200}>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">03</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">Venda</h3>
              <p className="text-gray-500 text-sm font-medium">Link pronto e Zero Taxa.</p>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Ovos de Ouro Competition For Restaurants */}
      <section className="py-24 bg-white border-t border-gray-100 text-left">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <ScrollReveal direction="up" delay={0} className="md:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider leading-none relative">
                <span className="relative z-10 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 bg-clip-text text-transparent animate-gradient-shift">🏆 Ovos de Ouro {new Date().getFullYear()}</span>
                <span className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500/60 via-yellow-300/50 to-amber-500/60 animate-gradient-shift rounded-full blur-[1px]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#111] leading-none uppercase italic tracking-tighter">
                Sua comida em destaque,<br />
                <span className="text-[#FFC928]">sem vulnerabilidade.</span>
              </h2>
              <p className="text-gray-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                Uma competição justa onde apenas quem realmente comprou e finalizou o pedido pode avaliar seus pratos. Bebidas não entram na disputa. 
                <strong className="text-[#111]">Você não vê as notas</strong> — o ranking é 100% privado, visível apenas para a administração da plataforma. 
                No dia 20 de Dezembro, revelamos os vencedores: Top 3 por tipo de cozinha, Top 3 por bairro e Top 3 por cidade. 
                Os pratos premiados ganham um selo exclusivo para usar durante todo o ano seguinte.
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={100}>
            <div className="md:col-span-1 bg-gradient-to-br from-[#111] to-[#1e1e1e] rounded-[2rem] p-6 text-white border border-[#FFC928]/20 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-[#FFC928]" size={20} />
                <h4 className="font-extrabold text-[#FFC928] uppercase tracking-wide text-[11px]">Compromisso Meu Ovo</h4>
              </div>
              <ul className="space-y-3.5 text-xs text-gray-300 font-semibold list-inside list-disc">
                <li>Notas visíveis apenas para o admin</li>
                <li>Antifraude contra votos falsos</li>
                <li>Apenas pratos reais (sem bebidas)</li>
                <li>Selo exclusivo para os vencedores</li>
              </ul>
              <Link 
                to="/ovos-de-ouro" 
                className="block text-center bg-[#FFC928] hover:bg-[#e6b520] text-black font-black text-[10px] uppercase tracking-widest py-3 px-4 rounded-xl transition-all"
              >
                Conhecer a Competição
              </Link>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal direction="up" delay={0}>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Pare de queimar<br />
            <span className="text-[#FFC928]">sua margem.</span>
          </h2>
          <p className="text-gray-500 text-xl mb-12 font-medium">O Meu Ovo é gratuito ontem, hoje e sempre.</p>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-3 bg-[#FFC928] text-[#111] font-black px-12 py-6 rounded-2xl text-xl hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20"
          >
            Começar grátis agora <ArrowRight size={24} />
          </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
