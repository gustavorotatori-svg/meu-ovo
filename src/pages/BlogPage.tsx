import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import OptimizedImage from '../components/OptimizedImage';
import { Newspaper, ExternalLink, Loader2, Sparkles } from 'lucide-react';

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  imageUrl?: string;
}

interface BlogData {
  weeklySummary: string;
  news: NewsItem[];
}

const fallbackNews: NewsItem[] = [
  {
    title: 'Restaurantes independentes crescem 23% em São Paulo',
    summary: 'Levantamento aponta que consumidores estão migrando para restaurantes locais em busca de comida artesanal e atendimento personalizado.',
    url: 'https://abrasel.com.br',
    source: 'Abrasel SP',
    imageUrl: 'https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?w=400&h=300&fit=crop',
  },
  {
    title: 'Comissão de 30%: por que restaurantes estão deixando os grandes apps',
    summary: 'Taxas abusivas levam donos de restaurantes a buscar alternativas como QR Code e pedidos diretos via WhatsApp.',
    url: 'https://mercadoeconsumo.com.br',
    source: 'Mercado & Consumo',
    imageUrl: 'https://images.pexels.com/photos/1267320/pexels-photo-1267320.jpeg?w=400&h=300&fit=crop',
  },
  {
    title: 'QR Code nas mesas já é realidade em 78% dos restaurantes',
    summary: 'A tecnologia que elimina intermediários e dá autonomia ao cliente está transformando o setor de foodservice.',
    url: 'https://anrbrasil.org.br',
    source: 'ANR Brasil',
    imageUrl: 'https://images.pexels.com/photos/5900345/pexels-photo-5900345.jpeg?w=400&h=300&fit=crop',
  },
];

const fallbackSummary = 'O setor de foodservice brasileiro segue em expansão, com destaque para restaurantes independentes que investem em atendimento direto ao cliente e cardápios autorais. A tendência de pedidos via WhatsApp e QR Code continua crescendo como alternativa às plataformas tradicionais.';

export default function BlogPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<BlogData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBlog() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const response = await fetch('/api/blog/news', { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('API error');
        const json = await response.json();
        if (!json?.news || !json?.weeklySummary) throw new Error('Invalid shape');
        setData(json as BlogData);
      } catch {
        setData({ weeklySummary: fallbackSummary, news: fallbackNews });
      } finally {
        setLoading(false);
      }
    }
    fetchBlog();
  }, []);

  return (
    <div className={`min-h-screen font-sans transition-colors ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title="Blog Meu Ovo - Notícias Foodservice"
        description="Fique por dentro das últimas notícias do setor de foodservice, bares e restaurantes."
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      <main className="pt-40 pb-20 px-6 max-w-7xl mx-auto">
        <header className="mb-20 text-center space-y-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFC928] text-black rounded-full text-[10px] font-black uppercase tracking-widest"
          >
            <Sparkles size={12} /> IA Intelligence
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl lg:text-8xl font-display font-black tracking-tighter uppercase italic leading-[0.8]"
          >
            Blog <span className="text-[#FFC928]">Meu Ovo</span>
          </motion.h1>
          <p className={`text-xl font-medium max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            As notícias que importam para o seu restaurante.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 size={40} className="animate-spin text-[#FFC928]" />
            <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Minerando as melhores notícias...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Weekly Summary Card */}
            {data?.weeklySummary && (
              <motion.section 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-12"
              >
                <div className={`p-12 rounded-[3.5rem] border-2 relative overflow-hidden group ${isDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="absolute top-0 right-0 w-96 h-96 bg-[#FFC928] opacity-5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                  <div className="relative z-10 space-y-6">
                    <h2 className="text-3xl font-display font-black italic uppercase tracking-tighter">Resumo da Semana</h2>
                    <p className={`text-lg leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      {data.weeklySummary}
                    </p>
                  </div>
                </div>
              </motion.section>
            )}

            {/* News Grid */}
            <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data?.news?.map((item, index) => (
                <motion.article
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`group border-2 rounded-[2.5rem] overflow-hidden flex flex-col h-full transition-all hover:border-[#FFC928]/50 hover:shadow-2xl hover:shadow-[#FFC928]/5 ${
                    isDark ? 'bg-[#0e0e11] border-white/5' : 'bg-white border-gray-100'
                  }`}
                >
                  <div className="h-48 relative overflow-hidden bg-gray-900">
                    {item.imageUrl ? (
                      <OptimizedImage src={item.imageUrl} alt={item.title} width={400} height={192} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center opacity-20">
                        <Newspaper size={48} />
                      </div>
                    )}
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg">
                      <p className="text-[8px] font-black text-[#FFC928] uppercase tracking-widest">{item.source}</p>
                    </div>
                  </div>
                  
                  <div className="p-8 flex flex-col flex-1 gap-4">
                    <h3 className="text-xl font-display font-black leading-[1.1] uppercase italic group-hover:text-[#FFC928] transition-colors line-clamp-2">
                      {item.title}
                    </h3>
                    <p className={`text-sm leading-relaxed line-clamp-4 flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      {item.summary}
                    </p>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-[#FFC928] hover:gap-4 transition-all"
                    >
                      Ler na fonte <ExternalLink size={12} />
                    </a>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        )}

        {/* Sources Attribution */}
        <footer className="mt-20 pt-12 border-t border-white/5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
            Fontes: Abrasel SP, ANR Brasil, Mercado & Consumo Foodservice
          </p>
        </footer>
      </main>

      <Footer />
      
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
