import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, FileText, Scale, Gavel, Lock, AlertTriangle, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

const sections = [
  {
    icon: FileText,
    title: '1. Aceitação dos Termos',
    content: 'Ao acessar ou usar a plataforma Meu Ovo, você confirma que leu, entendeu e concorda em ficar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não utilize nossos serviços. Estes termos podem ser atualizados periodicamente; o uso continuado após alterações constitui aceitação das novas condições.'
  },
  {
    icon: Scale,
    title: '2. Definições',
    content: '"Plataforma" refere-se ao site, aplicativo e serviços do Meu Ovo. "Restaurante" ou "Parceiro" é o estabelecimento cadastrado que oferece produtos através da plataforma. "Cliente" ou "Usuário" é a pessoa física que utiliza a plataforma para realizar pedidos. "Pedido" é a solicitação de compra de produtos realizada pelo Cliente junto ao Restaurante.'
  },
  {
    icon: Shield,
    title: '3. Cadastro e Conta',
    content: 'Para utilizar determinadas funcionalidades, você precisará criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais e por todas as atividades que ocorrerem em sua conta. As informações fornecidas devem ser precisas, completas e atualizadas. A plataforma se reserva o direito de recusar ou cancelar cadastros a seu critério.'
  },
  {
    icon: Gavel,
    title: '4. Responsabilidades do Restaurante',
    content: 'O Restaurante é o único responsável pela qualidade, preparo, entrega e segurança dos produtos anunciados e vendidos através da plataforma. Cabe ao Restaurante manter seu cardápio atualizado, precificar corretamente seus produtos, cumprir os prazos de entrega estimados e respeitar as normas sanitárias vigentes. A plataforma não se responsabiliza por eventuais problemas na execução do pedido.'
  },
  {
    icon: Lock,
    title: '5. Pagamentos e Transações',
    content: 'A plataforma Meu Ovo não processa nem intermediia pagamentos entre Clientes e Restaurantes. Todas as transações financeiras são de responsabilidade exclusiva do Restaurante, que define seus próprios métodos de pagamento (PIX, crédito, débito, voucher, dinheiro). O Cliente deve resolver diretamente com o Restaurante qualquer questão relacionada a cobranças, reembolsos ou estornos.'
  },
  {
    icon: AlertTriangle,
    title: '6. Limitação de Responsabilidade',
    content: 'A plataforma Meu Ovo atua exclusivamente como ferramenta tecnológica de conexão entre Restaurantes e Clientes. Não nos responsabilizamos por: (a) atrasos na entrega; (b) qualidade ou quantidade dos produtos; (c) cobranças indevidas; (d) danos decorrentes de uso indevido da plataforma; (e) indisponibilidade temporária do serviço. A responsabilidade da plataforma é limitada ao valor máximo legalmente permitido.'
  },
  {
    icon: FileText,
    title: '7. Propriedade Intelectual',
    content: 'Todo o conteúdo da plataforma, incluindo logotipos, textos, imagens, código-fonte e design, é propriedade do Meu Ovo ou de seus licenciadores. É proibida a reprodução, distribuição, modificação ou uso não autorizado de qualquer conteúdo sem prévia autorização por escrito.'
  },
  {
    icon: Scale,
    title: '8. Disposições Gerais',
    content: 'Estes Termos são regidos pelas leis brasileiras. Qualquer disputa será resolvida no foro da comarca de São Paulo - SP. Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor. O não exercício de qualquer direito por parte da plataforma não constitui renúncia.'
  }
];

export default function TermsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title="Termos de Uso"
        description="Termos e condições de uso da plataforma Meu Ovo. Saiba seus direitos e deveres ao utilizar nossos serviços."
      />
      <Navbar />

      <section className="pt-36 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl aspect-square blur-[140px] -z-10 rounded-full bg-[#FFC928]/10" />
        
        <div className="max-w-4xl mx-auto">
          <Link 
            to="/" 
            className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-[#FFC928] hover:opacity-80 transition-opacity mb-8"
          >
            <ArrowLeft size={12} /> Voltar para o início
          </Link>

          <div className="text-center space-y-4 mb-16">
            <h1 className="text-4xl sm:text-5xl font-display font-black tracking-tighter uppercase italic leading-[0.9]">
              Termos de <span className="text-[#FFC928]">Uso</span>
            </h1>
            <p className="text-sm text-gray-400 font-semibold">
              Última atualização: Junho de 2026
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section, i) => {
              const isOpen = openSection === i;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`rounded-[2rem] border overflow-hidden ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-gray-50/50 border-gray-100'}`}
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : i)}
                    className={`w-full flex items-center gap-4 p-6 sm:p-8 text-left transition-colors ${isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-100/50'}`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#FFC928]/10 flex items-center justify-center shrink-0">
                      <section.icon size={20} className="text-[#FFC928]" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base sm:text-lg font-black uppercase tracking-tight">{section.title}</h2>
                    </div>
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''} ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className={`px-6 sm:px-8 pb-6 sm:pb-8 text-xs sm:text-sm leading-relaxed font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {section.content}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          <div className={`mt-12 p-6 sm:p-8 rounded-[2rem] border text-center ${isDark ? 'bg-zinc-950/60 border-white/5' : 'bg-amber-50/40 border-amber-100/60'}`}>
            <p className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Em caso de dúvidas, entre em contato conosco pelo e-mail{' '}
              <a href="mailto:contato@meuovo.com" className="text-[#FFC928] hover:underline">contato@meuovo.com</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
