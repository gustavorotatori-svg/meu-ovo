import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { RestaurantProvider } from './context/RestaurantContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/LandingPage';
import MarketplacePage from './pages/MarketplacePage';
import RestaurantMenuPage from './pages/RestaurantMenuPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import RestaurantOnboarding from './pages/RestaurantOnboarding';
import SocialImpactPage from './pages/SocialImpactPage';
import ForRestaurantsPage from './pages/ForRestaurantsPage';
import OrderHistoryPage from './pages/OrderHistoryPage';
import CustomerProfilePage from './pages/CustomerProfilePage';
import BlogPage from './pages/BlogPage';
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';

import AdminAuth from './pages/admin/Auth';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCashier from './pages/admin/AdminCashier';
import MenuManagement from './pages/admin/MenuManagement';
import AdminWaiter from './pages/admin/AdminWaiter';
import KitchenMode from './pages/admin/KitchenMode';
import WaiterMode from './pages/admin/WaiterMode';
import AdminDelivery from './pages/admin/AdminDelivery';
import AdminReports from './pages/admin/AdminReports';
import CouponManagement from './pages/admin/CouponManagement';
import LoyaltyManagement from './pages/admin/LoyaltyManagement';
import StoreSettings from './pages/admin/StoreSettings';
import OvosDeOuro from './pages/admin/OvosDeOuro';
import OvosDeOuroVotePopup from './components/OvosDeOuroVotePopup';
import OrderStatusPage from './pages/OrderStatusPage';

import PlatformDashboard from './pages/platform/PlatformDashboard';
import PlatformRestaurants from './pages/platform/PlatformRestaurants';
import PlatformIntelligence from './pages/platform/PlatformIntelligence';
import PlatformMarketReports from './pages/platform/PlatformMarketReports';
import PlatformPartners from './pages/platform/PlatformPartners';
import PlatformDonations from './pages/platform/PlatformDonations';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RestaurantProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/busca" element={<MarketplacePage />} />
                <Route path="/r/:slug" element={<RestaurantMenuPage />} />
                <Route path="/carrinho" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/cadastro-restaurante" element={<RestaurantOnboarding />} />
                <Route path="/impacto-social" element={<SocialImpactPage />} />
                <Route path="/para-restaurantes" element={<ForRestaurantsPage />} />
                <Route path="/meus-pedidos" element={<OrderHistoryPage />} />
                <Route path="/perfil" element={<CustomerProfilePage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/sobre" element={<AboutPage />} />
                <Route path="/termos" element={<TermsPage />} />
                <Route path="/privacidade" element={<PrivacyPage />} />
                <Route path="/pedido/:id" element={<OrderStatusPage />} />

                {/* Restaurant admin */}
                <Route path="/admin/entrar" element={<AdminAuth />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/admin/caixa" element={<AdminCashier />} />
                <Route path="/admin/pedidos" element={<AdminOrders />} />
                <Route path="/admin/cardapio" element={<MenuManagement />} />
                <Route path="/admin/garcom" element={<WaiterMode />} />
                <Route path="/admin/mesas" element={<AdminWaiter />} />
                <Route path="/admin/cozinha" element={<KitchenMode />} />
                <Route path="/admin/delivery" element={<AdminDelivery />} />
                <Route path="/admin/relatorios" element={<AdminReports />} />
                <Route path="/admin/cupons" element={<CouponManagement />} />
                <Route path="/admin/fidelidade" element={<LoyaltyManagement />} />
                <Route path="/admin/configuracoes" element={<StoreSettings />} />
                <Route path="/admin/ovos-de-ouro" element={<OvosDeOuro />} />

                {/* Platform admin */}
                <Route path="/plataforma" element={<PlatformDashboard />} />
                <Route path="/plataforma/restaurantes" element={<PlatformRestaurants />} />
                <Route path="/plataforma/inteligencia" element={<PlatformIntelligence />} />
                <Route path="/plataforma/relatorios" element={<PlatformMarketReports />} />
                <Route path="/plataforma/parceiros" element={<PlatformPartners />} />
                <Route path="/plataforma/doacoes" element={<PlatformDonations />} />
              </Routes>
              <Toaster position="top-right" />
              <OvosDeOuroVotePopup />
            </BrowserRouter>
          </CartProvider>
        </RestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
