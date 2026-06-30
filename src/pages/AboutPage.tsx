import { useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Flame, 
  ArrowLeft,
  ShieldAlert,
  Handshake,
  Soup,
  ChevronDown
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [showFullStory, setShowFullStory] = useState(false);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title="Sobre Nós - Nossa História"
        description="Conheça a história e o manifesto do Meu Ovo: uma plataforma feita por quem serve, dedicada inteiramente aos novos protagonistas do sabor real."
      />
      <Navbar />

      {/* Hero Section */}
      <section className="pt-36 pb-16 px-6 relative overflow-hidden">
        {/* Abstract golden radial background blur */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl aspect-square blur-[140px] -z-10 rounded-full bg-[#FFC928]/10" />
        
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity"
          >
            <ArrowLeft size={12} /> Voltar para o início
          </Link>
          
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-display font-black tracking-tighter uppercase italic leading-[0.9] max-w-3xl mx-auto">
            FEITO POR QUEM <span className="text-[#FFC928]">CONHECE A CHAPA</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl font-display font-semibold max-w-2xl mx-auto leading-relaxed text-gray-400">
            Muito antes de virar código e tecnologia, nossa história começou com o cheiro de alho e cebola dourando no fogão de metal, o barulho ritmado da chapa e as pernas cansadas após 14 horas de serviço diário.
          </p>
        </div>
      </section>

      {/* Heartfelt Narrative Section */}
      <section className="py-16 px-6 max-w-4xl mx-auto text-left">
        <div className="prose prose-lg dark:prose-invert max-w-none space-y-8 font-sans">
          
          <div className="relative pl-6 border-l-4 border-[#FFC928]">
            <span className="text-xs font-black tracking-widest text-[#FFC928] uppercase">A Herança do Suor</span>
            <p className="text-lg md:text-xl font-display font-bold italic leading-relaxed mt-2">
              "Eu cresci debaixo de um balcão de fórmica. Para quem é de família de restaurante, o berço é um engradado de refrigerante e o som de fundo é o óleo estalando."
            </p>
          </div>

          {!showFullStory && (
            <button
              onClick={() => setShowFullStory(true)}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity mx-auto mt-6"
            >
              Ler história completa <ChevronDown size={14} />
            </button>
          )}

          {showFullStory && (
            <>
              <p className="text-sm sm:text-base leading-relaxed text-gray-500 font-medium mt-8">
                Minha infância inteira foi cercada pela rotina implacável de uma cozinha comercial. Eu via meus pais acordarem antes do sol nascer para ir ao Ceasa negociar cada caixa de tomate. Eu vi as contas que não batiam no fim do mês, as queimas inesperadas de motores de geladeira nos dias mais quentes e o cansaço visível em cada ruga do rosto deles ao desligarem a coifa no final do expediente.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-gray-500 font-medium">
                Mas, acima de tudo, eu vivi a <strong>magia indomável</strong> que só quem cozinha entende: o orgulho de entregar comida de verdade, quente, bem-temperada, e ver o prato voltar limpo para a pia. A cozinha não é apenas um negócio; ela é uma extensão da alma de quem serve.
              </p>

              <div className="my-12 p-8 rounded-[2.5rem] border bg-gradient-to-br from-[#FFC928]/5 via-[#FFC928]/0 to-transparent border-gray-100 dark:border-white/5 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="p-2 rounded-xl bg-[#FFC928]/10 text-[#FFC928]">
                    <Flame size={20} className="animate-pulse" />
                  </span>
                  <h3 className="font-display font-black uppercase text-lg sm:text-xl italic tracking-tight">
                    De donos de restaurante, para donos de restaurante.
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-semibold">
                  O <strong>Meu Ovo</strong> nasceu da nossa revolta legítima diante do mercado tecnológico atual. Nós nos cansamos de ver grandes corporações frias e algoritmos predadores que tratam a arte da culinária como mera engrenagem logística, esmagando as margens de lucro de quem realmente acorda cedo para ralar. Aqui, não criamos intermediários gulosos; nós criamos uma <strong>ponte honesta e transparente</strong>.
                </p>
              </div>

              <h3 className="font-display font-black text-2xl uppercase italic tracking-tight mt-12">
                Aqui, você é o <span className="text-[#FFC928]">Ator Principal</span>
              </h3>

              <p className="text-sm sm:text-base leading-relaxed text-gray-500 font-medium">
                Entendemos que o restaurante é o verdadeiro combustível do bairro. É o sabor que conecta pessoas, que embala encontros e que conforta após dias longos. Por isso, no Meu Ovo, o restaurante nunca é tratado em letrinhas miúdas como um simples fornecedor secundário. Você é a estrela.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-gray-500 font-medium">
                Desde a concepção do nosso código, criamos ferramentas para que você tenha controle absoluto do seu negócio: taxas extremamente enxutas e transparentes, acompanhamento geográfico detalhado e o prêmio independente <strong>Ovos de Ouro</strong>, desenhado com auditoria matemática à prova de fraudes para prestigiar o seu talento genuíno, sem favorecer corporações bilionárias.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Our Values / Manifesto Bento Grid */}
      <section className="py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-16">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-[#FFC928]">Inabaláveis e Transparentes</span>
          <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight uppercase">Nosso Compromisso Sagrado</h2>
          <p className="text-xs sm:text-sm text-gray-400 font-semibold max-w-md mx-auto">Os pilares humanos fundamentais que escrevemos no código de cada funcionalidade do Meu Ovo</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className={`p-8 rounded-[2.5rem] border text-left space-y-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50/50 border-gray-100'} hover:border-[#FFC928]/30 transition-colors`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <Soup size={22} />
            </div>
            <h3 className="text-lg font-black uppercase italic tracking-tight">Respeito ao Legado</h3>
            <p className="text-xs sm:text-sm text-gray-450 leading-relaxed font-semibold">
              Honramos a rotina exaustiva de quem vive em frente ao fogo alto. Criamos telas limpas, atalhos de teclado ágeis e integrações que economizam o recurso mais precioso do dono do restaurante: o tempo útil de operação.
            </p>
          </div>

          <div className={`p-8 rounded-[2.5rem] border text-left space-y-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50/50 border-gray-100'} hover:border-[#FFC928]/30 transition-colors`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <Handshake size={22} />
            </div>
            <h3 className="text-lg font-black uppercase italic tracking-tight font-display">Sem Letras Miúdas</h3>
            <p className="text-xs sm:text-sm text-gray-450 leading-relaxed font-semibold">
              Taxações absurdas de 30% que retiram toda a possibilidade de inovação do comerciante local estão banidas daqui. Cobramos o mínimo operacional viável, mantendo a integridade financeira e o fluxo de caixa ágil na sua conta.
            </p>
          </div>

          <div className={`p-8 rounded-[2.5rem] border text-left space-y-4 ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50/50 border-gray-100'} hover:border-[#FFC928]/30 transition-colors`}>
            <div className="w-12 h-12 bg-amber-500/10 text-[#FFC928] rounded-2xl flex items-center justify-center">
              <ShieldAlert size={22} />
            </div>
            <h3 className="text-lg font-black uppercase italic tracking-tight">Tecnologia ao Seu Lado</h3>
            <p className="text-xs sm:text-sm text-gray-450 leading-relaxed font-semibold">
              Acreditamos que IA e dados devem pertencer a você para otimizar suas compras, reduzir perdas, ajustar horários e fidelizar clientes de forma inteligente — e não para criar barreiras ou forçar publicidades caras.
            </p>
          </div>

        </div>
      </section>

      {/* Interactive Invitation Visual Banner */}
      <section className="py-20 px-6 max-w-5xl mx-auto text-center">
        <div className={`p-10 sm:p-16 rounded-[3rem] relative overflow-hidden border ${isDark ? 'bg-zinc-950/40 border-white/5' : 'bg-amber-50/40 border-amber-100/60'}`}>
          <div className="absolute top-0 right-0 w-64 h-64 blur-[120px] -z-10 rounded-full bg-[#FFC928]/10" />
          
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-display font-black tracking-tight uppercase italic leading-none">
              Pronto para retomar o controle de sua cozinha?
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-semibold leading-relaxed">
              Junte-se à nossa rede de parceiros e faça parte do ecossistema que trata comida com o devido respeito. Comece agora a receber pedidos no melhor marketplace independente do Brasil.
            </p>
            
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              <Link
                to="/cadastro-restaurante"
                className="px-8 py-4 bg-[#FFC928] text-black text-xs font-black uppercase tracking-widest rounded-2xl hover:scale-105 transition-transform"
              >
                Cadastrar meu restaurante
              </Link>
              <Link
                to="/busca"
                className={`px-8 py-4 text-xs font-black uppercase tracking-widest rounded-2xl border transition-colors ${isDark ? 'border-white/10 hover:bg-white/5 text-white' : 'border-[#111]/10 hover:bg-black/5 text-[#111]'}`}
              >
                Explorar Sabores
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
