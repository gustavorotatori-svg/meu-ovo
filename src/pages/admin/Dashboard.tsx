import { Logo } from '../../components/Logo';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  ClipboardList, 
  Settings, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  Menu as MenuIcon,
  Gift,
  Flame,
  Users,
  ShieldAlert
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRestaurant } from '../../context/RestaurantContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../../lib/utils';
import { Button } from '../../components/Button';

// Internal dashboard pages
import Overview from './Overview';
import MenuManagement from './MenuManagement';
import OrdersList from './OrdersList';
import StoreSettings from './StoreSettings';
import KitchenMode from './KitchenMode';
import WaiterMode from './WaiterMode';
import PlatformAdmin from './PlatformAdmin';

export default function AdminDashboard() {
  const { currentRestaurant: restaurant } = useRestaurant();
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { label: 'Visão Geral', path: '/admin/dashboard', icon: <LayoutDashboard size={20} />, exact: true },
    { label: 'Pedidos', path: '/admin/dashboard/orders', icon: <ClipboardList size={20} /> },
    { label: 'Cozinha', path: '/admin/dashboard/kitchen', icon: <Flame size={20} /> },
    { label: 'Garçom', path: '/admin/dashboard/waiter', icon: <Users size={20} /> },
    { label: 'Cardápio', path: '/admin/dashboard/menu', icon: <UtensilsCrossed size={20} /> },
    { label: 'Central Meu Ovo', path: '/admin/dashboard/platform', icon: <ShieldAlert size={20} /> },
    { label: 'Configurações', path: '/admin/dashboard/settings', icon: <Settings size={20} /> },
  ];

  const handleLogout = async () => {
    await signOut(auth);
  };

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path) && (path !== '/admin/dashboard' || location.pathname === '/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform lg:translate-x-0 lg:static lg:block",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full uppercase tracking-tight">
          <div className="p-5 border-b border-slate-100 italic">
            <Logo size="md" variant="colored" />
          </div>

          <nav className="flex-1 p-3 space-y-0.5">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group",
                  isActive(item.path, item.exact) 
                    ? "bg-slate-900 text-white shadow-md shadow-slate-200" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <span className={cn(
                  "transition-colors",
                  isActive(item.path, item.exact) ? "text-brand-egg" : "text-slate-400 group-hover:text-slate-600"
                )}>
                  {item.icon}
                </span>
                <span className="text-sm font-semibold tracking-wide">
                  {item.label}
                </span>
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
             <div className="p-3 bg-slate-50 rounded-lg mb-4 border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Link no Ar</p>
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <p className="text-xs font-mono font-medium text-slate-600 truncate uppercase">
                    m/{restaurant?.slug}
                  </p>
                  <a 
                    href={`/m/${restaurant?.slug}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-slate-500 hover:text-orange-600 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
             </div>
             <button 
                onClick={handleLogout}
                className="flex items-center gap-3 w-full px-3 py-2 text-slate-500 text-sm font-semibold hover:text-red-600 transition-colors"
              >
                <LogOut size={18} />
                Sair do Painel
              </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-30">
          <button 
            className="lg:hidden p-2 -ml-2 text-slate-600"
            onClick={() => setSidebarOpen(true)}
          >
            <MenuIcon size={20} />
          </button>
          <div className="flex items-center gap-3">
             <div className="hidden sm:block">
               <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">{restaurant?.name}</h2>
               <div className="flex items-center gap-1.5">
                 <div className={cn("w-1.5 h-1.5 rounded-full", restaurant?.isDeliveryOpen ? "bg-green-500 animate-pulse" : "bg-red-500")} />
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   {restaurant?.isDeliveryOpen ? 'Delivery Online' : 'Delivery Fechado'}
                 </p>
               </div>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="h-8 w-8 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs">
               {restaurant?.name?.charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        {/* Views */}
        <div className="p-6 overflow-auto bg-slate-50 flex-1">
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/orders" element={<OrdersList />} />
            <Route path="/kitchen" element={<KitchenMode />} />
            <Route path="/waiter" element={<WaiterMode />} />
            <Route path="/platform" element={<PlatformAdmin />} />
            <Route path="/settings" element={<StoreSettings />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}
