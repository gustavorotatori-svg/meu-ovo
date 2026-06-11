import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, Moon, Sun, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useRestaurant } from '../context/RestaurantContext';
import { Logo } from './Logo';
import { cn } from '../lib/utils';
import LanguageSwitcher from './LanguageSwitcher';
import { motion, AnimatePresence } from 'motion/react';

export default function Navbar() {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { itemCount } = useCart();
  const { currentRestaurant } = useRestaurant();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const isDark = theme === 'dark';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors overflow-x-hidden ${isDark ? 'bg-black/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'} border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center h-20 lg:h-24">

        {/* Logo (sempre à esquerda) */}
        <Link to="/" className="flex items-center justify-center shrink-0 mr-auto pr-4 xl:pr-10">
          <Logo size="md" variant={isDark ? 'dark-colored' : 'colored'} />
        </Link>

        {/* Bloco único à direita: nav links + ícones + botão + hamburguer */}
        <div className="flex items-center gap-2 lg:gap-4 shrink-0 max-w-full">

          {/* Nav links (lg+) */}
          <div className="hidden lg:flex items-center gap-2 xl:gap-4 overflow-x-hidden">
            <Link to="/sobre" className={`text-[9px] xl:text-[11px] font-display font-black uppercase tracking-[0.06em] xl:tracking-[0.15em] whitespace-nowrap transition-all hover:scale-105 shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
              Por que existimos? 🍳
            </Link>
            <Link to="/busca" className={`text-[9px] xl:text-[11px] font-display font-black uppercase tracking-[0.06em] xl:tracking-[0.15em] whitespace-nowrap transition-all hover:scale-105 shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
              {t('nav.order_food')}
            </Link>
            <Link to="/meus-pedidos" className={`text-[9px] xl:text-[11px] font-display font-black uppercase tracking-[0.06em] xl:tracking-[0.15em] whitespace-nowrap transition-all hover:scale-105 shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
              {t('nav.my_orders')}
            </Link>
            <Link to="/impacto-social" className={`text-[9px] xl:text-[11px] font-display font-black uppercase tracking-[0.06em] xl:tracking-[0.15em] whitespace-nowrap transition-all hover:scale-105 shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
              {t('nav.social_impact')}
            </Link>
            <Link to="/para-restaurantes" className={`text-[9px] xl:text-[11px] font-display font-black uppercase tracking-[0.06em] xl:tracking-[0.15em] whitespace-nowrap transition-all hover:scale-105 shrink-0 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
              {t('nav.for_restaurants')}
            </Link>
          </div>

          {/* Ícones */}
          <button onClick={() => navigate('/carrinho')} className={`relative p-2 rounded-xl transition-all shrink-0 ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`}>
            <ShoppingBag size={20} />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FFC928] text-[#111111] text-[10px] font-black rounded-lg px-1.5 py-0.5 min-w-[20px] flex items-center justify-center shadow-lg shadow-[#FFC928]/20 border-2 border-white">
                {itemCount}
              </span>
            )}
          </button>

          <button onClick={toggleTheme} className={`hidden xl:flex p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`}>
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="hidden xl:block shrink-0"><LanguageSwitcher /></div>

          {!user ? (
            <button onClick={() => navigate('/perfil')} className={`flex items-center gap-1 px-1.5 sm:px-2 lg:px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider border-2 transition-all shrink-0 ${isDark ? 'border-white/10 text-white hover:border-[#FFC928] hover:text-[#FFC928]' : 'border-slate-200 text-slate-800 hover:border-black hover:text-black'}`}>
              <User size={12} />
              <span className="hidden xl:inline">Entrar</span>
            </button>
          ) : (
            <button onClick={() => navigate('/perfil')} className={`flex items-center gap-2 p-2 rounded-xl transition-all shrink-0 ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`}>
              <div className="w-8 h-8 rounded-full bg-[#FFC928] flex items-center justify-center text-black font-black text-xs overflow-hidden">
                {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : (user.displayName?.charAt(0) || <User size={16} />)}
              </div>
            </button>
          )}

          {/* Botão Cadastrar Restaurante (sempre visível em lg+) */}
          <Link to="/cadastro-restaurante" className="hidden lg:flex bg-[#FFC928] text-[#111] font-display font-black px-2 lg:px-3 py-2 rounded-xl text-[9px] uppercase tracking-[0.08em] hover:bg-[#e6b520] transition-all shadow-xl shadow-[#FFC928]/10 whitespace-nowrap shrink-0 items-center">
            <span className="xl:hidden">Cadastrar</span>
            <span className="hidden xl:inline">{t('nav.register_restaurant')}</span>
          </Link>

          {/* Hamburguer (mobile) */}
          <button className={`lg:hidden p-2 rounded-xl transition-colors shrink-0 ${isDark ? 'bg-white/5 text-white' : 'bg-gray-100 text-[#111]'}`} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: -10, height: 0 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className={`lg:hidden absolute top-24 left-0 right-0 border-b z-50 overflow-hidden ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100'}`}>
            <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }} className="p-8 flex flex-col gap-6">
              <MobileLink to="/sobre" isDark={isDark} onClick={() => setMenuOpen(false)} label="Por que existimos? 🍳" />
              <MobileLink to="/busca" isDark={isDark} onClick={() => setMenuOpen(false)} label={t('nav.order_food')} />
              <MobileLink to="/meus-pedidos" isDark={isDark} onClick={() => setMenuOpen(false)} label={t('nav.my_orders')} />
              <MobileLink to="/impacto-social" isDark={isDark} onClick={() => setMenuOpen(false)} label={t('nav.social_impact')} />
              <MobileLink to="/para-restaurantes" isDark={isDark} onClick={() => setMenuOpen(false)} label={t('nav.for_restaurants')} />
              <MobileLink to="/perfil" isDark={isDark} onClick={() => setMenuOpen(false)} label={user ? 'Meu Perfil' : 'Entrar / Cadastrar'} icon={<User size={20} className="text-[#FFC928]" />} />
              <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} whileTap={{ scale: 0.95 }} className="mt-4">
                <Link onClick={() => setMenuOpen(false)} to="/cadastro-restaurante" className="block bg-[#FFC928] text-[#111] font-display font-black px-6 py-5 rounded-2xl text-center uppercase tracking-widest text-xs shadow-xl shadow-[#FFC928]/20">
                  {t('nav.register_restaurant')}
                </Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function MobileLink({ to, isDark, onClick, label, icon }: { to: string; isDark: boolean; onClick: () => void; label: string; icon?: ReactNode }) {
  return (
    <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
      <Link onClick={onClick} to={to} className={`text-lg font-black uppercase tracking-wider flex items-center gap-3 ${isDark ? 'text-white' : 'text-[#111]'}`}>
        {icon ? <>{icon}<span>{label}</span></> : <>{label}<motion.div whileHover={{ x: 5 }} className="opacity-20 group-hover:opacity-100 transition-opacity ml-auto"><Logo size="sm" variant={isDark ? 'dark-colored' : 'colored'} /></motion.div></>}
      </Link>
    </motion.div>
  );
}
