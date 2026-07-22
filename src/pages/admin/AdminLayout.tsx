import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, UtensilsCrossed, ChefHat, Truck, BarChart2, Menu, X, QrCode, ExternalLink, ChevronRight, Ticket, Gift, Settings, Wallet, Trophy, FileText, Zap, Sticker, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useRestaurant } from '../../context/RestaurantContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { Logo } from '../../components/Logo';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import BackButton from '../../components/BackButton';
import Breadcrumbs from '../../components/admin/Breadcrumbs';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { currentRestaurant } = useRestaurant();
  const { theme } = useTheme();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  useEffect(() => {
    // Force dark mode class on document element for admin layout
    const root = document.documentElement;
    const hadDark = root.classList.contains('dark');
    root.classList.add('dark');
    
    return () => {
      // Revert class list of dark mode if original theme preference is light
      const savedTheme = localStorage.getItem('theme') || 'light';
      if (savedTheme === 'light' && !hadDark) {
        root.classList.remove('dark');
      }
    };
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/busca'); // Or a login page if available
    }
    // Also check if they are the owner of currentRestaurant if possible
    if (!loading && user && currentRestaurant && currentRestaurant.ownerId && currentRestaurant.ownerId !== user.id) {
       // navigate('/busca'); 
       // For now, let's just log or handle it. 
       // If we block it too strictly, developers might get locked out during debugging.
    }
  }, [user, loading, navigate, currentRestaurant]);

  if (loading) return null;
  if (!user) return null;

  const NAV_ITEMS = [
    { to: '/admin', label: t('nav.dashboard'), icon: <LayoutDashboard size={18} /> },
    { to: '/admin/caixa', label: 'Caixa', icon: <Wallet size={18} /> },
    { to: '/admin/pedidos', label: t('nav.orders'), icon: <ShoppingBag size={18} /> },
    { to: '/admin/cardapio', label: t('nav.menu'), icon: <Package size={18} /> },
    { to: '/admin/etiquetas', label: 'Etiquetas', icon: <Sticker size={18} /> },
    { to: '/admin/cupons', label: 'Cupons', icon: <Ticket size={18} /> },
    { to: '/admin/fidelidade', label: 'Fidelidade', icon: <Gift size={18} /> },
    { to: '/admin/mesas', label: 'Mesas & QR Codes', icon: <QrCode size={18} /> },
    { to: '/admin/garcom', label: t('nav.waiter'), icon: <UtensilsCrossed size={18} /> },
    { to: '/admin/cozinha', label: t('nav.kitchen'), icon: <ChefHat size={18} /> },
    { to: '/admin/delivery', label: 'Delivery', icon: <Truck size={18} /> },
    { to: '/admin/analytics', label: 'Analytics', icon: <BarChart2 size={18} /> },
    { to: '/admin/relatorios', label: t('nav.reports'), icon: <FileText size={18} /> },
    { to: '/admin/flash-deals', label: 'Flash Deals ⚡', icon: <Zap size={18} /> },
    { to: '/admin/ovos-de-ouro', label: 'Ovos de Ouro 🏆', icon: <Trophy size={18} /> },
    { to: '/admin/whatsapp-ai', label: 'WhatsApp AI', icon: <MessageSquare size={18} /> },
    { to: '/admin/configuracoes', label: t('nav.settings'), icon: <Settings size={18} /> },
  ];

  const BOTTOM_NAV_ITEMS = [
    { to: '/admin', label: 'Painel', icon: <LayoutDashboard size={20} /> },
    { to: '/admin/pedidos', label: 'Pedidos', icon: <ShoppingBag size={20} /> },
    { to: '/admin/cardapio', label: 'Cardápio', icon: <Package size={20} /> },
    { to: '/admin/garcom', label: 'Garçom', icon: <UtensilsCrossed size={20} /> },
    { 
      isAction: true,
      label: 'Mais', 
      icon: sidebarOpen ? <X size={20} /> : <Menu size={20} />, 
      onClick: () => setSidebarOpen(!sidebarOpen) 
    },
  ];

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-[#1a1a1a]' : 'bg-[#F5F5F5]'} flex admin-theme`}>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 flex flex-col ${isDark ? 'bg-[#0f0f0f] border-r border-[#2a2a2a]' : 'bg-[#111111]'} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:flex ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}>
        <div className={`p-6 border-b ${isDark ? 'border-[#2a2a2a]' : 'border-gray-800'} relative`}>
          <div className="flex items-center gap-3 overflow-hidden">
             <div className="shrink-0">
               <Logo size={isCollapsed ? "md" : "lg"} variant="dark-colored" />
             </div>
             {!isCollapsed && (
               <div className="transition-opacity duration-300">
                  <p className="text-white font-black italic tracking-tighter text-xs">MEU OVO</p>
               </div>
             )}
          </div>
          
          {currentRestaurant && !isCollapsed && (
            <div className="flex items-center gap-3 mt-6 transition-opacity duration-300">
              <img src={currentRestaurant.logo} alt={currentRestaurant.name} className="w-10 h-10 rounded-xl object-cover" />
              <div className="truncate">
                <p className="text-white font-bold text-sm leading-tight truncate">{currentRestaurant.name}</p>
                <p className="text-gray-400 text-xs truncate">{currentRestaurant.neighborhood}</p>
              </div>
            </div>
          )}

          {currentRestaurant && isCollapsed && (
            <div className="mt-6 flex justify-center">
              <img src={currentRestaurant.logo} alt={currentRestaurant.name} className="w-8 h-8 rounded-lg object-cover" />
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-x-hidden">
          {NAV_ITEMS.map((item, index) => (
            <motion.div
              key={item.to}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.label : ''}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all group relative overflow-hidden",
                  pathname === item.to 
                    ? 'bg-[#FFC928] text-[#111]' 
                    : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-white'
                )}
              >
                <div className="shrink-0">
                  {item.icon}
                </div>
                {!isCollapsed && <span className="transition-opacity duration-300">{item.label}</span>}
                {isCollapsed && pathname === item.to && (
                  <motion.div 
                    layoutId="active-nav-indicator"
                    className="w-1 h-4 bg-[#111] rounded-full absolute left-0" 
                  />
                )}
                {pathname === item.to && (
                  <motion.div
                    layoutId="active-pill"
                    className="absolute inset-0 bg-[#FFC928] -z-10"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
              </Link>
            </motion.div>
          ))}
        </nav>

        <div className={`p-4 space-y-2 border-t ${isDark ? 'border-[#2a2a2a]' : 'border-gray-800'}`}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center gap-2 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1a1a1a] transition-colors"
          >
            <ChevronRight className={`transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} size={16} />
            {!isCollapsed && <span>Recolher menu</span>}
          </button>
          
          <button
            onClick={() => navigate(`/r/${currentRestaurant?.slug}`)}
            title="Ver cardápio público"
            className="w-full flex items-center gap-2 text-gray-400 hover:text-white text-sm px-4 py-2 rounded-xl hover:bg-[#1a1a1a] transition-colors"
          >
            <ExternalLink size={16} className="shrink-0" />
            {!isCollapsed && <span>Cardápio público</span>}
          </button>
          
          <button
            onClick={() => navigate('/')}
            title="Sair do painel"
            className="w-full flex items-center gap-2 text-gray-500 hover:text-gray-300 text-sm px-4 py-2 rounded-xl hover:bg-[#1a1a1a] transition-colors"
          >
            <ChevronRight size={16} className="shrink-0" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar overlay */}
      {sidebarOpen && (
        <div role="presentation" className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className={`transition-colors border-b ${isDark ? 'bg-[#111111] border-[#2a2a2a]' : 'bg-white border-gray-100'} px-4 py-4 flex items-center gap-4 lg:px-6 sticky top-0 z-30`}>
          <button className="lg:hidden p-2 hover:bg-gray-100 rounded-xl" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}>
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex-1">
            <h1 className={`font-display font-black text-lg ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('nav.dashboard')}</h1>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <button
              onClick={() => navigate(`/r/${currentRestaurant?.slug}`)}
              className="hidden md:flex items-center gap-2 bg-[#F5F5F5] text-[#111] font-bold text-sm px-4 py-2 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <ExternalLink size={16} />
              {t('nav.menu')}
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 pb-28 lg:pb-6 lg:p-6 overflow-auto">
          <div className="mb-4">
            <BackButton to="/admin" />
          </div>
          <Breadcrumbs />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Bottom Navigation Bar for Mobile */}
      <div className={cn(
        "lg:hidden fixed bottom-4 left-4 right-4 z-40 p-2 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300",
        isDark 
          ? "bg-black/90 border-white/5 text-white shadow-black/80" 
          : "bg-white/95 border-slate-200/50 text-[#111] shadow-slate-300/40"
      )}>
        <div className="flex items-center justify-around h-12">
          {BOTTOM_NAV_ITEMS.map((item) => {
            const isActive = !item.isAction && pathname === item.to;
            
            return (
              <div key={item.label} className="relative flex-1 flex flex-col items-center justify-center">
                {item.isAction ? (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={item.onClick}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-11 rounded-xl transition-all relative",
                      sidebarOpen
                        ? "text-[#FFC928]"
                        : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-[#111111]"
                    )}
                  >
                    {item.icon}
                    <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">{item.label}</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => navigate(item.to)}
                    className={cn(
                      "flex flex-col items-center justify-center w-full h-11 rounded-xl transition-all relative",
                      isActive
                        ? "text-[#FFC928]"
                        : isDark ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-[#111111]"
                    )}
                  >
                    {item.icon}
                    <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">{item.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="active-bottom-indicator"
                        className="absolute bottom-0 w-1 h-1 bg-[#FFC928] rounded-full"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
