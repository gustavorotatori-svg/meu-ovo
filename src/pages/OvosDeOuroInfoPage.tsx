import { Link } from 'react-router-dom';
import { Trophy, Shield, EyeOff, Scale, HelpCircle, ArrowRight, CheckCircle2, Lock, Sparkles, Star } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import ScrollReveal from '../components/ScrollReveal';
import { useTheme } from '../context/ThemeContext';

export default function OvosDeOuroInfoPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-black text-white' : 'bg-white text-neutral-900'}`}>
      <SEO 
        title="Prêmio Ovos de Ouro - Competição Anual"
        description="Conheça o Prêmio Ovos de Ouro: a competição anual do Meu Ovo baseada em imparcialidade histórica, austeridade rígida e sigilo absoluto das avaliações."
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      {/* Hero Section */}
      <section className={`pt-36 pb-20 px-6 relative overflow-hidden text-center`}>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl aspect-square blur-[140px] -z-10 rounded-full bg-amber-500/10" />
        
        <ScrollReveal direction="up" delay={0}>
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-black uppercase tracking-widest leading-none relative">
            <span className="relative z-10 bg-gradient-to-r from-[#FFC928] via-yellow-200 to-[#FFC928] bg-clip-text text-transparent animate-gradient-shift">🏆 Competição Anual Oficial Meu Ovo</span>
            <span className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-gradient-to-r from-[#FFC928]/80 via-yellow-300/50 to-[#FFC928]/80 animate-gradient-shift rounded-full blur-[2px]" />
          </div>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tighter uppercase italic leading-[0.95] max-w-3xl mx-auto">
            Prêmio <span className="text-[#FFC928]">Ovos de Ouro</span>
          </h1>
          
          <p className="text-lg md:text-xl font-display font-semibold max-w-2xl mx-auto leading-relaxed text-gray-400">
            A celebração anual da comida de verdade. Uma competição onde a austeridade e o sigilo protegem o seu negócio enquanto premiam os melhores sabores da sua região.
          </p>
        </div>
        </ScrollReveal>
      </section>

      {/* Highlights Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <ScrollReveal direction="up" delay={0}>
          <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'} text-left space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <EyeOff size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Ranking 100% Privado</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              O ranking geral e as notas brutas individuais são confidenciais. Nenhum concorrente ou cliente terá acesso às suas notas. Elas servem exclusivamente para o seu controle interno e auditoria matemática da nossa equipe.
            </p>
          </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
          <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'} text-left space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <Trophy size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter font-display">Apenas o Top 3 Revelado</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              Ao final do ciclo anual (dia <strong>20 de Dezembro</strong>), apenas os <strong>3 primeiros colocados</strong> serão divulgados publicamente na plataforma com destaque e troféus. O restante da lista permanecerá sob sigilo perpétuo.
            </p>
          </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={200}>
          <div className={`p-8 rounded-[2.5rem] border ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'} text-left space-y-4`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <Scale size={24} />
            </div>
            <h3 className="text-xl font-black uppercase italic tracking-tighter">Austeridade e Imparcialidade</h3>
            <p className="text-sm text-gray-500 leading-relaxed font-semibold">
              Dispomos de inteligência de filtragem antifraude contra votos falsos (spoofing) e filtramos avaliações focadas inteiramente no prato real e artesanal, descartando interferências de refrigerantes ou industrializados fechados.
            </p>
          </div>
          </ScrollReveal>

        </div>
      </section>

      {/* Rules and Explanation Session */}
      <section className={`py-24 border-y ${isDark ? 'bg-[#030303] border-white/5' : 'bg-[#FDFDFD] border-gray-150'}`}>
        <div className="max-w-4xl mx-auto px-6 text-left space-y-12">
          
          <ScrollReveal direction="up" delay={0}>
          <div className="text-center md:text-left space-y-2">
            <h2 className="text-3xl md:text-4xl font-black leading-none font-display uppercase tracking-tight">Como funciona a Competição?</h2>
            <p className="text-sm text-gray-400 font-semibold">Entenda o cronograma e os critérios de auditabilidade das notas</p>
          </div>
          </ScrollReveal>

          <div className="space-y-8">
            <ScrollReveal direction="up" delay={0}>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#FFC928] text-black font-black text-xs flex items-center justify-center shrink-0 mt-1">1</div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-[#FFC928]">Ciclo de Votação</h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">
                  A votação popular anual de Ovos de Ouro abre no dia <strong>1 de Janeiro</strong> e encerra de forma automática pelo nosso servidor no dia <strong>15 de Dezembro</strong>. Clientes votam de forma segura ao final de seus pedidos reais.
                </p>
              </div>
            </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={100}>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#FFC928] text-black font-black text-xs flex items-center justify-center shrink-0 mt-1">2</div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-[#FFC928]">Liberdade e Opt-In</h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">
                  Nenhum restaurante é forçado a concorrer. No momento de realizar o cadastro ou fazer o login no painel, você escolhe se deseja participar ou não. Sua decisão pode ser alterada a qualquer momento nas configurações do seu perfil do parceiro.
                </p>
              </div>
            </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={200}>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-[#FFC928] text-black font-black text-xs flex items-center justify-center shrink-0 mt-1">3</div>
              <div>
                <h4 className="text-base font-black uppercase tracking-tight text-[#FFC928]">Foco na Comida de Verdade</h4>
                <p className="text-sm text-gray-500 leading-relaxed mt-1 font-medium">
                  Para resguardar que conservantes ou má refrigeração de subprodutos lacrados industrializados não prejudiquem o talento culinário do seu Chef, o Meu Ovo filtra os votos, concentrando o peso principal da nota no prato cozinhado.
                </p>
              </div>
            </div>
            </ScrollReveal>
          </div>

          {/* Secure Shield Box */}
          <ScrollReveal direction="up" delay={100}>
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-[#FFC928]/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
            <div className="p-4 bg-[#FFC928] text-black rounded-2xl">
              <Shield size={36} className="text-neutral-900" />
            </div>
            <div className="space-y-1.5 flex-1 text-center md:text-left">
              <h4 className="font-extrabold text-white text-base font-display flex items-center justify-center md:justify-start gap-2">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span>Segurança e Imparcialidade Garantidas</span>
              </h4>
              <p className="text-xs text-gray-400 font-semibold leading-relaxed">
                Nossos bancos de dados Firebase Firestore rodam com regras rígidas de leitura que impedem qualquer indevida consulta externa de pontuação. Sinta-se plenamente seguro de que seus feedbacks e estatísticas de fidelidade operam em total blindagem.
              </p>
            </div>
          </div>
          </ScrollReveal>

        </div>
      </section>

      {/* CTA section to start onboarding */}
      <section className="py-28 max-w-4xl mx-auto px-6 text-center space-y-8">
        <ScrollReveal direction="up" delay={0}>
        <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tighter">Prepare sua cozinha para os Ovos de Ouro</h2>
        <p className="text-sm text-gray-400 font-semibold max-w-xl mx-auto">
          Crie seu cardápio digital grátis hoje e participe de uma rede que valoriza a gastronomia local com integridade absoluta.
        </p>
        </ScrollReveal>
        <ScrollReveal direction="up" delay={100}>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            to="/cadastro"
            className="bg-[#FFC928] hover:bg-[#e6b520] text-black font-extrabold px-8 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all"
          >
            Cadastrar meu Restaurante
          </Link>
          <Link 
            to="/busca"
            className="bg-white/5 border border-white/10 hover:bg-white/10 text-white font-extrabold px-8 py-4 rounded-2xl text-sm uppercase tracking-widest transition-all"
          >
            Ver Restaurantes Ativos
          </Link>
        </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  );
}
