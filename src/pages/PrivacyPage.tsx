import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Database, Lock, Bot, Cookie, Trash2, Mail, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { useState } from 'react';

const sections = [
  {
    icon: Shield,
    title: '1. Dados que Coletamos',
    content: 'Coletamos as informações que você nos fornece diretamente: nome, e-mail, telefone/WhatsApp, endereço e foto de perfil. Quando você faz um pedido, registramos os itens escolhidos, valor, forma de pagamento e endereço de entrega. Restaurantes cadastrados fornecem dados adicionais como CNPJ, endereço comercial, dados bancários e informações do cardápio.'
  },
  {
    icon: Eye,
    title: '2. Como Usamos seus Dados',
    content: 'Seus dados são utilizados para: (a) processar e entregar seus pedidos; (b) comunicar status do pedido via WhatsApp; (c) melhorar a experiência na plataforma; (d) enviar comunicações relevantes (com seu consentimento); (e) gerar relatórios anônimos de uso; (f) prevenir fraudes e abusos. Seus dados nunca são vendidos para terceiros.'
  },
  {
    icon: Database,
    title: '3. Compartilhamento de Dados',
    content: 'Compartilhamos seus dados apenas com o Restaurante parceiro quando você faz um pedido (nome, telefone e endereço de entrega), e com provedores de serviços essenciais (hospedagem, analytics, envio de e-mails). Exigimos que todos os parceiros tratem seus dados com o mesmo nível de segurança e respeito.'
  },
  {
    icon: Lock,
    title: '4. Segurança dos Dados',
    content: 'Adotamos medidas técnicas e organizacionais robustas para proteger seus dados contra acesso não autorizado, alteração, divulgação ou destruição. Isso inclui criptografia em trânsito (SSL/TLS), firewalls, controles de acesso restrito e monitoramento contínuo de segurança. Nossos servidores são hospedados em provedores certificados.'
  },
  {
    icon: Bot,
    title: '5. Dados na Nuvem e Inteligência Artificial',
    content: 'Nossa plataforma é hospedada no Google Cloud (Firebase), com criptografia em trânsito (TLS 1.2+) e em repouso (AES-256). Recursos de inteligência artificial generativa (Google Gemini) são usados apenas quando você opta por usá-los: para gerar sugestões de cardápio e descrições de produtos (botão "Gerar com IA" no painel) e para responder dúvidas no atendimento via WhatsApp. Nesses casos, enviamos à IA somente as informações necessárias à tarefa (como o nome e a categoria de um produto) — nunca enviamos dados pessoais de clientes. Os resultados gerados por IA são meras sugestões e passam pela sua revisão antes de qualquer publicação. Você pode usar a plataforma normalmente sem ativar nenhum recurso de IA.'
  },
  {
    icon: Cookie,
    title: '6. Cookies e Tecnologias',
    content: 'Utilizamos cookies estritamente necessários para o funcionamento da plataforma (autenticação e preferências). Ferramentas de análise (Google Analytics) e anúncios (Meta Pixel) somente são ativadas após o seu consentimento explícito. Você pode aceitar, recusar ou alterar sua escolha a qualquer momento usando o botão "Cookies" no rodapé do site. Quando recusa os cookies de análise, nenhuma ferramenta de tracking é carregada no seu dispositivo.'
  },
  {
    icon: Trash2,
    title: '7. Seus Direitos (LGPD)',
    content: 'Nos termos da Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018), você tem direito a: (a) confirmar a existência de tratamento de dados; (b) acessar seus dados; (c) corrigir dados incompletos ou desatualizados; (d) solicitar anonimização ou eliminação; (e) revogar consentimento; (f) solicitar portabilidade. No seu perfil você encontra as opções "Baixar meus dados" e "Excluir minha conta". Para exercer qualquer outro direito, entre em contato conosco.'
  },
  {
    icon: Mail,
    title: '8. Retenção e Exclusão',
    content: 'Mantemos seus dados pelo tempo necessário para cumprir as finalidades descritas ou para cumprir obrigações legais. Ao excluir sua conta pela opção "Excluir minha conta" no seu perfil, seus dados pessoais são removidos imediatamente do nosso banco (pedidos e dados pessoais), exceto quando a lei exigir retenção por prazos maiores (como registros de transações fiscais).'
  }
];

export default function PrivacyPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [openSection, setOpenSection] = useState<number | null>(null);

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title="Política de Privacidade"
        description="Política de privacidade da plataforma Meu Ovo. Saiba como cuidamos e protegemos seus dados pessoais."
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
              Política de <span className="text-[#FFC928]">Privacidade</span>
            </h1>
            <p className="text-sm text-gray-400 font-semibold">
              Última atualização: Agosto de 2026
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
              Dúvidas sobre seus dados? Fale com a gente:{' '}
              <a href="mailto:contato@meuovo.com" className="text-[#FFC928] hover:underline">contato@meuovo.com</a>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
