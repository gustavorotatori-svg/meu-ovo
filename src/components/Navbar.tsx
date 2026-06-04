import { useState } from 'react';
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
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors ${isDark ? 'bg-black/95 backdrop-blur-md' : 'bg-white/95 backdrop-blur-md'} border-b ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-20 lg:h-24">
        <Link to="/" className="h-full flex items-center justify-center transition-all shrink-0 pr-2 lg:pr-8">
          <Logo size="md" variant={isDark ? 'dark-colored' : 'colored'} />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-4 xl:gap-8 mr-0">
          {[
            { label: "Por que existimos? 🍳", path: '/sobre' },
            { label: t('nav.order_food'), path: '/busca' }, 
            { label: t('nav.my_orders'), path: '/meus-pedidos' },
            { label: t('nav.social_impact'), path: '/impacto-social' }, 
            { label: t('nav.for_restaurants'), path: '/para-restaurantes' }
          ].map((item) => {
            return (
              <motion.div
                key={item.label}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                className="flex-shrink-0"
              >
                <Link 
                  to={item.path} 
                  className={`text-[10px] xl:text-[11px] font-display font-black uppercase tracking-[0.12em] xl:tracking-[0.2em] whitespace-nowrap transition-all hover:scale-105 active:scale-95 ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}
                >
                  {item.label}
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5 md:gap-3 lg:gap-6 flex-shrink-0">
          <div className="flex items-center gap-1 md:gap-2 lg:gap-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => navigate('/carrinho')}
              className={`relative p-3 rounded-2xl transition-all ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              <ShoppingBag size={22} />
              <AnimatePresence>
                {itemCount > 0 && (
                  <motion.span 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute -top-1 -right-1 bg-[#FFC928] text-[#111111] text-[10px] font-black rounded-lg px-1.5 py-0.5 min-w-[20px] flex items-center justify-center shadow-lg shadow-[#FFC928]/20 border-2 border-white"
                  >
                    {itemCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>

            <motion.button
              whileHover={{ rotate: 15 }}
              whileTap={{ rotate: -15 }}
              onClick={toggleTheme}
              className={`hidden sm:flex p-2.5 rounded-xl transition-colors ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              {isDark ? <Sun size={22} /> : <Moon size={22} />}
            </motion.button>

            <div className="hidden sm:block"><LanguageSwitcher /></div>

            {!user ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/perfil')}
                className={`flex items-center gap-1.5 px-2 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                  isDark 
                    ? 'border-white/10 text-white hover:border-[#FFC928] hover:text-[#FFC928]' 
                    : 'border-slate-200 text-slate-800 hover:border-black hover:text-black'
                }`}
              >
                <User size={14} />
                <span className="hidden sm:inline">Entrar</span>
              </motion.button>
            ) : (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/perfil')}
                className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isDark ? 'text-gray-300 hover:bg-white/5' : 'text-gray-700 hover:bg-gray-100'}`}
              >
                <div className="w-8 h-8 rounded-full bg-[#FFC928] flex items-center justify-center text-black font-black text-xs overflow-hidden">
                  {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} /> : (user.displayName?.charAt(0) || <User size={16} />)}
                </div>
              </motion.button>
            )}
          </div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              to="/cadastro-restaurante"
              className="hidden xl:flex bg-[#FFC928] text-[#111] font-display font-black px-6 py-4 rounded-2xl text-[11px] uppercase tracking-[0.15em] hover:bg-[#e6b520] transition-all shadow-xl shadow-[#FFC928]/10"
            >
              {t('nav.register_restaurant')}
            </Link>
          </motion.div>

          <button
            className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'bg-white/5 text-white' : 'bg-gray-100 text-[#111]'}`}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className={`lg:hidden absolute top-24 left-0 right-0 border-b z-50 overflow-hidden ${isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-white border-gray-100'}`}
          >
            <motion.div 
              initial="hidden"
              animate="show"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.05,
                    delayChildren: 0.1
                  }
                }
              }}
              className="p-8 flex flex-col gap-6"
            >
              {[
                { label: "Por que existimos? 🍳", path: '/sobre' },
                { label: t('nav.order_food'), path: '/busca' },
                { label: t('nav.my_orders'), path: '/meus-pedidos' },
                { label: t('nav.social_impact'), path: '/impacto-social' },
                { label: t('nav.for_restaurants'), path: '/para-restaurantes' }
              ].map((item) => (
                <motion.div
                  key={item.path}
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    show: { opacity: 1, x: 0 }
                  }}
                >
                  <Link 
                    onClick={() => setMenuOpen(false)} 
                    to={item.path} 
                    className={`text-lg font-black uppercase tracking-wider flex items-center justify-between group ${isDark ? 'text-white' : 'text-[#111]'}`}
                  >
                    {item.label}
                    <motion.div
                      whileHover={{ x: 5 }}
                      className="opacity-20 group-hover:opacity-100 transition-opacity"
                    >
                      <Logo size="sm" variant={isDark ? 'dark-colored' : 'colored'} />
                    </motion.div>
                  </Link>
                </motion.div>
              ))}

              {!user ? (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    show: { opacity: 1, x: 0 }
                  }}
                >
                  <Link 
                    onClick={() => setMenuOpen(false)} 
                    to="/perfil" 
                    className={`text-lg font-black uppercase tracking-wider flex items-center gap-3 ${isDark ? 'text-white' : 'text-[#111]'}`}
                  >
                    <User size={20} className="text-[#FFC928]" /> Entrar / Cadastrar
                  </Link>
                </motion.div>
              ) : (
                <motion.div
                  variants={{
                    hidden: { opacity: 0, x: -20 },
                    show: { opacity: 1, x: 0 }
                  }}
                >
                  <Link 
                    onClick={() => setMenuOpen(false)} 
                    to="/perfil" 
                    className={`text-lg font-black uppercase tracking-wider flex items-center gap-3 ${isDark ? 'text-white' : 'text-[#111]'}`}
                  >
                    <User size={20} className="text-[#FFC928]" /> Meu Perfil
                  </Link>
                </motion.div>
              )}

              <motion.div 
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  show: { opacity: 1, y: 0 }
                }}
                whileTap={{ scale: 0.95 }}
                className="mt-4"
              >
                <Link
                  onClick={() => setMenuOpen(false)}
                  to="/cadastro-restaurante"
                  className="block bg-[#FFC928] text-[#111] font-display font-black px-6 py-5 rounded-2xl text-center uppercase tracking-widest text-xs shadow-xl shadow-[#FFC928]/20"
                >
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
